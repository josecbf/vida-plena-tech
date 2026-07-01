import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient, Prisma } from "@prisma/client";
import type { ProverEvent, ProverEventSession, ProverEventRegistration, ProverEventAttendance } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// FASE 5A — DRY-RUN de EVENTOS do Prover (evento pai + sessão + inscrição +
// presença). SOMENTE LEITURA: resolve pessoa por ExternalMapping(person),
// entende a relação entre os arquivos, detecta conflitos e grava ImportBatch +
// ImportBatchItem. NÃO cria Event/EventSession/EventRegistration/EventAttendance
// reais, NÃO cria ExternalMapping(event), NÃO altera Person/User/Role. Campos de
// pagamento/lote são apenas documentados e ignorados.
// ─────────────────────────────────────────────────────────────────────────

const CHUNK = 1000;
const CSV_CAP = 5000;

export interface EventsDryRunReport {
  batchId: string;
  totalEvents: number;
  totalSessions: number;
  totalRegistrations: number;
  totalAttendances: number;
  personsResolvedRows: number;
  personsNotFoundRows: number;
  personUuidsDistinct: number;
  personUuidsResolvedDistinct: number;
  eventsWithoutTitle: number;
  eventsWithoutDate: number;
  eventsStatusUnknown: number; // export não tem campo de status → todos
  sessionsWithoutParent: number;
  registrationsPersonResolved: number;
  registrationsPersonNotFound: number;
  registrationsEventNotFound: number;
  registrationDuplicates: number;
  attendancesPersonResolved: number;
  attendancesPersonNotFound: number;
  attendancesSessionNotFound: number;
  attendanceDuplicates: number;
  attendancesWithoutRegistration: number;
  attendancesAbsent: number;
  eventsCanceledOrInactive: number; // 0 — sem campo de status no export
  registrationsInCanceledEvent: number; // 0 — idem
  paymentFieldsDetected: number; // inscrições com valor/lote/formaPagamento
  wouldCreate: number;
  wouldSkip: number;
  failed: number;
  conflictsByWarning: Record<string, number>;
  auxFiles: Record<string, number>; // documentação (encarregados/regras/resumos)
  modelInterpretation: string;
}

interface Conflict { section: string; warning: string; key: string; pessoaUuid: string; extra: string }

function clean(v?: string | null): string | null {
  const t = (v ?? "").toString().trim();
  return t.length > 0 ? t : null;
}

export async function runEventsDryRun(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    events: ProverEvent[];
    sessions: ProverEventSession[];
    registrations: ProverEventRegistration[];
    attendances: ProverEventAttendance[];
    sourceFileHash?: string;
    auxFiles?: Record<string, number>;
    outDir?: string;
  },
): Promise<{ report: EventsDryRunReport; reportFiles?: { jsonPath: string; csvPath: string } }> {
  const { tenantId, fileName, events, sessions, registrations, attendances, sourceFileHash } = opts;

  // ── índices ──
  const eventByUuid = new Map<string, ProverEvent>();
  for (const e of events) if (clean(e.uuid)) eventByUuid.set(e.uuid, e);
  const sessionToEvent = new Map<string, string>(); // idEncontro → uuidEvento
  for (const s of sessions) if (clean(s.idEncontro)) sessionToEvent.set(s.idEncontro, s.uuidEvento);

  // registro: chave (evento:pessoa) — inscrição é a nível de EVENTO (sem sessão)
  const regKeyCount = new Map<string, number>();
  const regSet = new Set<string>();
  for (const r of registrations) {
    if (!clean(r.uuidEvento) || !clean(r.uuidPessoa)) continue;
    const k = `${r.uuidEvento}:${r.uuidPessoa}`;
    regKeyCount.set(k, (regKeyCount.get(k) ?? 0) + 1);
    regSet.add(k);
  }

  // resolução de pessoa (ExternalMapping person)
  const personUuids = new Set<string>();
  for (const r of registrations) if (clean(r.uuidPessoa)) personUuids.add(r.uuidPessoa);
  for (const a of attendances) if (clean(a.uuidPessoa)) personUuids.add(a.uuidPessoa);
  const personMap = new Map<string, string>();
  const uuidArr = [...personUuids];
  for (let i = 0; i < uuidArr.length; i += 5000) {
    const rows = await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: uuidArr.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } });
    for (const m of rows) personMap.set(m.externalId, m.internalId);
  }

  const report = blank();
  report.totalEvents = events.length;
  report.totalSessions = sessions.length;
  report.totalRegistrations = registrations.length;
  report.totalAttendances = attendances.length;
  report.personUuidsDistinct = personUuids.size;
  report.personUuidsResolvedDistinct = personMap.size;
  report.auxFiles = opts.auxFiles ?? {};
  report.modelInterpretation =
    "evento pai (evento_eventos.uuid) → sessões (evento_encontros_eventos.idEncontro, pai=uuidEvento). " +
    "Inscrição (evento_inscritos) é a NÍVEL DE EVENTO (uuidEvento+uuidPessoa), sem sessão, com campos de pagamento/lote. " +
    "Presença (evento_presenca) é a NÍVEL DE SESSÃO (idEncontro) + inscrição (idEventoInscricao). " +
    "Eventos e sessões NÃO têm campo de status/cancelamento neste export.";

  const conflicts: Conflict[] = [];
  const bump = (w: string) => { report.conflictsByWarning[w] = (report.conflictsByWarning[w] ?? 0) + 1; };
  const addC = (c: Conflict) => { if (conflicts.length < CSV_CAP) conflicts.push(c); };

  const batch = await prisma.importBatch.create({ data: { tenantId, mode: "DRY_RUN", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: events.length + sessions.length + registrations.length + attendances.length } });
  report.batchId = batch.id;

  const items: Prisma.ImportBatchItemCreateManyInput[] = [];
  const push = (it: Prisma.ImportBatchItemCreateManyInput) => items.push(it);
  const flush = async (force = false) => { if (items.length >= CHUNK || (force && items.length)) await prisma.importBatchItem.createMany({ data: items.splice(0, items.length) }); };

  // ── EVENTOS ──
  for (const e of events) {
    const warns: string[] = [];
    let op: "WOULD_CREATE" | "FAILED" = "WOULD_CREATE";
    if (!clean(e.uuid)) { op = "FAILED"; report.failed++; }
    else {
      if (!clean(e.tema)) { warns.push("EVENT_WITHOUT_TITLE"); report.eventsWithoutTitle++; bump("EVENT_WITHOUT_TITLE"); addC({ section: "event", warning: "EVENT_WITHOUT_TITLE", key: e.uuid, pessoaUuid: "", extra: e.tipo ?? "" }); }
      if (!clean(e.dataInicio)) { warns.push("EVENT_WITHOUT_DATE"); report.eventsWithoutDate++; bump("EVENT_WITHOUT_DATE"); addC({ section: "event", warning: "EVENT_WITHOUT_DATE", key: e.uuid, pessoaUuid: "", extra: e.tema ?? "" }); }
      // export não traz status → status desconhecido para todos
      warns.push("EVENT_STATUS_UNKNOWN"); report.eventsStatusUnknown++;
      report.wouldCreate++;
    }
    push(itemData(tenantId, batch.id, "event", e.uuid || "NO_ID", op, warns, { uuid: e.uuid, tipo: e.tipo, tema: e.tema, dataInicio: e.dataInicio }));
    await flush();
  }

  // ── SESSÕES ──
  for (const s of sessions) {
    const warns: string[] = [];
    let op: "WOULD_CREATE" | "WOULD_SKIP" | "FAILED" = "WOULD_CREATE";
    if (!clean(s.idEncontro)) { op = "FAILED"; report.failed++; }
    else if (!clean(s.uuidEvento) || !eventByUuid.has(s.uuidEvento)) { warns.push("SESSION_WITHOUT_PARENT_EVENT"); op = "WOULD_SKIP"; report.sessionsWithoutParent++; report.wouldSkip++; bump("SESSION_WITHOUT_PARENT_EVENT"); addC({ section: "session", warning: "SESSION_WITHOUT_PARENT_EVENT", key: s.idEncontro, pessoaUuid: "", extra: s.uuidEvento ?? "" }); }
    else report.wouldCreate++;
    push(itemData(tenantId, batch.id, "event_session", s.idEncontro || "NO_ID", op, warns, { idEncontro: s.idEncontro, uuidEvento: s.uuidEvento, tema: s.tema, dataInicio: s.dataInicio }));
    await flush();
  }

  // ── INSCRIÇÕES ──
  const seenReg = new Set<string>();
  for (const r of registrations) {
    const warns: string[] = [];
    let op: "WOULD_CREATE" | "WOULD_SKIP" | "FAILED" = "WOULD_CREATE";
    const uuidPessoa = clean(r.uuidPessoa);
    const personId = uuidPessoa ? personMap.get(uuidPessoa) ?? null : null;
    const key = `${r.uuidEvento}:${r.uuidPessoa}`;
    const hasPayment = !!(clean(r.valorTotal) || clean(r.lote) || clean(r.formaPagamento));
    if (hasPayment) { report.paymentFieldsDetected++; warns.push("PAYMENT_FIELDS_IGNORED"); }

    if (!clean(r.uuidEvento) || !clean(r.uuidPessoa)) { op = "FAILED"; report.failed++; }
    else {
      if (personId) report.registrationsPersonResolved++;
      else { warns.push("PERSON_MAPPING_NOT_FOUND"); report.registrationsPersonNotFound++; op = "WOULD_SKIP"; bump("PERSON_MAPPING_NOT_FOUND"); addC({ section: "registration", warning: "PERSON_MAPPING_NOT_FOUND", key, pessoaUuid: r.uuidPessoa, extra: "" }); }
      if (!eventByUuid.has(r.uuidEvento)) { warns.push("REGISTRATION_EVENT_NOT_FOUND"); report.registrationsEventNotFound++; op = "WOULD_SKIP"; bump("REGISTRATION_EVENT_NOT_FOUND"); }
      if (seenReg.has(key)) { warns.push("REGISTRATION_DUPLICATE"); report.registrationDuplicates++; op = "WOULD_SKIP"; bump("REGISTRATION_DUPLICATE"); addC({ section: "registration", warning: "REGISTRATION_DUPLICATE", key, pessoaUuid: r.uuidPessoa, extra: "" }); }
      seenReg.add(key);
      if (op === "WOULD_CREATE") report.wouldCreate++; else if (op === "WOULD_SKIP") report.wouldSkip++;
    }
    push(itemData(tenantId, batch.id, "event_registration", key, op, warns, { uuidEvento: r.uuidEvento, uuidPessoa: r.uuidPessoa, personId, dataInscricao: r.dataInscricao, lote: r.lote, valorTotal: r.valorTotal, formaPagamento: r.formaPagamento }));
    await flush();
  }

  // ── PRESENÇAS ──
  const seenAtt = new Set<string>();
  for (const a of attendances) {
    const warns: string[] = [];
    let op: "WOULD_CREATE" | "WOULD_SKIP" | "FAILED" = "WOULD_CREATE";
    const uuidPessoa = clean(a.uuidPessoa);
    const personId = uuidPessoa ? personMap.get(uuidPessoa) ?? null : null;
    const eventOfSession = clean(a.idEncontro) ? sessionToEvent.get(a.idEncontro) ?? null : null;
    const dupKey = `${a.idEncontro}:${a.uuidPessoa}`;
    if (clean(a.presenca) === "0") report.attendancesAbsent++;

    if (!clean(a.idEncontro) || !clean(a.uuidPessoa)) { op = "FAILED"; report.failed++; }
    else {
      if (personId) report.attendancesPersonResolved++;
      else { warns.push("PERSON_MAPPING_NOT_FOUND"); report.attendancesPersonNotFound++; op = "WOULD_SKIP"; bump("PERSON_MAPPING_NOT_FOUND"); }
      if (!sessionToEvent.has(a.idEncontro)) { warns.push("ATTENDANCE_SESSION_NOT_FOUND"); report.attendancesSessionNotFound++; op = "WOULD_SKIP"; bump("ATTENDANCE_SESSION_NOT_FOUND"); addC({ section: "attendance", warning: "ATTENDANCE_SESSION_NOT_FOUND", key: a.id, pessoaUuid: a.uuidPessoa, extra: a.idEncontro }); }
      else if (eventOfSession && !regSet.has(`${eventOfSession}:${a.uuidPessoa}`)) { warns.push("ATTENDANCE_WITHOUT_REGISTRATION"); report.attendancesWithoutRegistration++; bump("ATTENDANCE_WITHOUT_REGISTRATION"); addC({ section: "attendance", warning: "ATTENDANCE_WITHOUT_REGISTRATION", key: a.id, pessoaUuid: a.uuidPessoa, extra: eventOfSession }); }
      if (seenAtt.has(dupKey)) { warns.push("ATTENDANCE_DUPLICATE"); report.attendanceDuplicates++; op = "WOULD_SKIP"; bump("ATTENDANCE_DUPLICATE"); addC({ section: "attendance", warning: "ATTENDANCE_DUPLICATE", key: a.id, pessoaUuid: a.uuidPessoa, extra: a.idEncontro }); }
      seenAtt.add(dupKey);
      if (op === "WOULD_CREATE") report.wouldCreate++; else if (op === "WOULD_SKIP") report.wouldSkip++;
    }
    push(itemData(tenantId, batch.id, "event_attendance", a.id || dupKey, op, warns, { id: a.id, idEncontro: a.idEncontro, uuidEvento: eventOfSession, uuidPessoa: a.uuidPessoa, personId, presenca: a.presenca, idEventoInscricao: a.idEventoInscricao }));
    await flush();
  }

  await flush(true);
  report.personsResolvedRows = report.registrationsPersonResolved + report.attendancesPersonResolved;
  report.personsNotFoundRows = report.registrationsPersonNotFound + report.attendancesPersonNotFound;

  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", created: 0, matched: 0, skipped: report.wouldSkip, failed: report.failed, warnings: Object.values(report.conflictsByWarning).reduce((a, b) => a + b, 0), conflicts: report.registrationDuplicates + report.attendanceDuplicates, finishedAt: new Date() } });

  let reportFiles: { jsonPath: string; csvPath: string } | undefined;
  if (opts.outDir) reportFiles = writeEventsReport(report, conflicts, opts.outDir);
  return { report, reportFiles };
}

function itemData(tenantId: string, batchId: string, externalType: string, externalId: string, op: string, warns: string[], norm: object): Prisma.ImportBatchItemCreateManyInput {
  const isConflict = warns.some((w) => w.includes("DUPLICATE"));
  return {
    tenantId, batchId, externalType, externalId,
    operation: op as never, matchStrategy: "NONE", severity: op === "FAILED" ? "ERROR" : isConflict ? "CONFLICT" : warns.length ? "WARNING" : "INFO",
    targetType: externalType, normalizedJson: norm as object, warningsJson: { warnings: warns } as object, rawJson: {} as object,
    status: op === "WOULD_CREATE" ? "PENDING" : op === "FAILED" ? "FAILED" : "SKIPPED",
    message: `[${op}] ${externalType} ${warns.join(",")}`,
  };
}

function blank(): EventsDryRunReport {
  return {
    batchId: "", totalEvents: 0, totalSessions: 0, totalRegistrations: 0, totalAttendances: 0,
    personsResolvedRows: 0, personsNotFoundRows: 0, personUuidsDistinct: 0, personUuidsResolvedDistinct: 0,
    eventsWithoutTitle: 0, eventsWithoutDate: 0, eventsStatusUnknown: 0, sessionsWithoutParent: 0,
    registrationsPersonResolved: 0, registrationsPersonNotFound: 0, registrationsEventNotFound: 0, registrationDuplicates: 0,
    attendancesPersonResolved: 0, attendancesPersonNotFound: 0, attendancesSessionNotFound: 0, attendanceDuplicates: 0,
    attendancesWithoutRegistration: 0, attendancesAbsent: 0, eventsCanceledOrInactive: 0, registrationsInCanceledEvent: 0,
    paymentFieldsDetected: 0, wouldCreate: 0, wouldSkip: 0, failed: 0, conflictsByWarning: {}, auxFiles: {}, modelInterpretation: "",
  };
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeEventsReport(report: EventsDryRunReport, conflicts: Conflict[], outDir: string): { jsonPath: string; csvPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "events-dry-run-summary.json");
  const csvPath = path.join(outDir, "events-dry-run-conflicts.csv");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  const lines = [["section", "warning", "key", "pessoaUuid", "extra"].join(",")];
  for (const c of conflicts) lines.push([c.section, c.warning, c.key, c.pessoaUuid, c.extra].map(csvCell).join(","));
  writeFileSync(csvPath, lines.join("\n"));
  return { jsonPath, csvPath };
}
