import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  ProverTeaching, ProverTeachingModule, ProverTeachingLesson,
  ProverTeachingSession, ProverTeachingRegistration, ProverTeachingAttendance,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// FASE 6A — DRY-RUN de ENSINO/TD do Prover (curso → módulo → aula → encontro →
// inscrição → presença). SOMENTE LEITURA: resolve pessoa por
// ExternalMapping(person), entende a relação entre os arquivos, detecta
// conflitos e grava ImportBatch + ImportBatchItem. NÃO cria dados reais de
// ensino, NÃO cria ExternalMapping(teaching), NÃO altera Person/User/Role.
// Pagamento/lote/financeiro apenas documentados. Conclusão/nota detectadas.
// ─────────────────────────────────────────────────────────────────────────

const CHUNK = 1000;
const CSV_CAP = 5000;

export interface TeachingDryRunReport {
  batchId: string;
  totalTeachings: number;
  totalModules: number;
  totalLessons: number;
  totalSessions: number;
  totalRegistrations: number;
  totalAttendances: number;
  personUuidsDistinct: number;
  personUuidsResolved: number;
  personsResolvedRows: number;
  personsNotFoundRows: number;
  teachingsWithoutTitle: number;
  teachingsWithoutDate: number;
  modulesWithoutParent: number; // não referenciados por nenhum encontro (idModulo)
  lessonsWithoutModule: number;
  sessionsWithoutTeaching: number;
  registrationsPersonResolved: number;
  registrationsPersonNotFound: number;
  registrationsTeachingNotFound: number;
  registrationDuplicates: number;
  attendancesPersonResolved: number;
  attendancesPersonNotFound: number;
  attendancesSessionNotFound: number;
  attendancesWithoutRegistration: number;
  attendanceDuplicates: number;
  attendancesAbsent: number;
  paymentFieldsDetected: number;
  completionFieldsDetected: number; // status/nota/aproveitamento
  wouldCreate: number;
  wouldSkip: number;
  failed: number;
  registrationStatuses: Record<string, number>;
  conflictsByWarning: Record<string, number>;
  auxFiles: Record<string, number>;
  modelInterpretation: string;
}

interface Conflict { section: string; warning: string; key: string; pessoaUuid: string; extra: string }
function clean(v?: string | null): string | null { const t = (v ?? "").toString().trim(); return t.length > 0 ? t : null; }

export async function runTeachingDryRun(
  prisma: PrismaClient,
  opts: {
    tenantId: string; fileName: string;
    teachings: ProverTeaching[]; modules: ProverTeachingModule[]; lessons: ProverTeachingLesson[];
    sessions: ProverTeachingSession[]; registrations: ProverTeachingRegistration[]; attendances: ProverTeachingAttendance[];
    sourceFileHash?: string; auxFiles?: Record<string, number>; outDir?: string;
  },
): Promise<{ report: TeachingDryRunReport; reportFiles?: { jsonPath: string; csvPath: string } }> {
  const { tenantId, fileName, teachings, modules, lessons, sessions, registrations, attendances, sourceFileHash } = opts;

  // índices
  const teachingByUuid = new Map<string, ProverTeaching>();
  for (const e of teachings) if (clean(e.uuid)) teachingByUuid.set(e.uuid, e);
  const moduleById = new Set(modules.map((m) => m.id).filter(Boolean));
  const sessionByEncontro = new Map<string, ProverTeachingSession>();
  const modulesRefBySession = new Set<string>();
  for (const s of sessions) { if (clean(s.idEncontro)) sessionByEncontro.set(s.idEncontro, s); if (clean(s.idModulo)) modulesRefBySession.add(s.idModulo!); }
  // inscrição: chave (ensino:pessoa)
  const regSet = new Set<string>();
  const regKeyCount = new Map<string, number>();
  for (const r of registrations) { if (!clean(r.uuidEnsino) || !clean(r.uuidPessoa)) continue; const k = `${r.uuidEnsino}:${r.uuidPessoa}`; regSet.add(k); regKeyCount.set(k, (regKeyCount.get(k) ?? 0) + 1); }

  // resolução de pessoa
  const personUuids = new Set<string>();
  for (const r of registrations) if (clean(r.uuidPessoa)) personUuids.add(r.uuidPessoa);
  for (const a of attendances) if (clean(a.uuidPessoa)) personUuids.add(a.uuidPessoa);
  const personMap = new Map<string, string>();
  const arr = [...personUuids];
  for (let i = 0; i < arr.length; i += 5000) {
    for (const m of await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: arr.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } })) personMap.set(m.externalId, m.internalId);
  }

  const report = blank();
  report.totalTeachings = teachings.length; report.totalModules = modules.length; report.totalLessons = lessons.length;
  report.totalSessions = sessions.length; report.totalRegistrations = registrations.length; report.totalAttendances = attendances.length;
  report.personUuidsDistinct = personUuids.size; report.personUuidsResolved = personMap.size;
  report.auxFiles = opts.auxFiles ?? {};
  report.modelInterpretation =
    "Curso pai = ensino_ensinos.uuid (sem status). Módulo = ensino_modulos.id (NÃO referencia ensino diretamente; " +
    "liga-se via encontros.idModulo). Aula = ensino_aulas.id (pai = idModulo). Encontro (ensino_encontros_ensinos) " +
    "é a SESSÃO REALIZADA que amarra ensino (uuidEnsino) + módulo (idModulo) + aula (idAula) + data. " +
    "Inscrição é a NÍVEL DE ENSINO (uuidEnsino+uuidPessoa) com status ('Cursando') + nota + pagamento/lote. " +
    "Presença é a NÍVEL DE ENCONTRO (idEncontro) + inscrição (idEventoInscricao). Sem flag TD explícito; o 'tipo' " +
    "categoriza o curso. Campos de conclusão/aprovação: inscrição.status + inscrição.nota + presença.aproveitamento.";

  const conflicts: Conflict[] = [];
  const bump = (w: string) => { report.conflictsByWarning[w] = (report.conflictsByWarning[w] ?? 0) + 1; };
  const addC = (c: Conflict) => { if (conflicts.length < CSV_CAP) conflicts.push(c); };

  const batch = await prisma.importBatch.create({ data: { tenantId, mode: "DRY_RUN", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: teachings.length + modules.length + lessons.length + sessions.length + registrations.length + attendances.length } });
  report.batchId = batch.id;
  const items: Prisma.ImportBatchItemCreateManyInput[] = [];
  const flush = async (force = false) => { if (items.length >= CHUNK || (force && items.length)) await prisma.importBatchItem.createMany({ data: items.splice(0, items.length) }); };

  // ── ENSINOS ──
  for (const e of teachings) {
    const w: string[] = []; let op: "WOULD_CREATE" | "FAILED" = "WOULD_CREATE";
    if (!clean(e.uuid)) { op = "FAILED"; report.failed++; }
    else {
      if (!clean(e.tema)) { w.push("TEACHING_WITHOUT_TITLE"); report.teachingsWithoutTitle++; bump("TEACHING_WITHOUT_TITLE"); addC({ section: "teaching", warning: "TEACHING_WITHOUT_TITLE", key: e.uuid, pessoaUuid: "", extra: e.tipo ?? "" }); }
      if (!clean(e.dataInicio)) { w.push("TEACHING_WITHOUT_DATE"); report.teachingsWithoutDate++; bump("TEACHING_WITHOUT_DATE"); }
      w.push("TEACHING_STATUS_ABSENT"); report.wouldCreate++;
    }
    items.push(item(tenantId, batch.id, "teaching", e.uuid || "NO_ID", op, w, { uuid: e.uuid, tipo: e.tipo, tema: e.tema })); await flush();
  }
  // ── MÓDULOS ── (sem ensino pai direto → órfão se nenhum encontro referencia)
  for (const m of modules) {
    const w: string[] = []; let op: "WOULD_CREATE" | "WOULD_SKIP" | "FAILED" = "WOULD_CREATE";
    if (!clean(m.id)) { op = "FAILED"; report.failed++; }
    else if (!modulesRefBySession.has(m.id)) { w.push("MODULE_WITHOUT_PARENT_TEACHING"); op = "WOULD_SKIP"; report.modulesWithoutParent++; report.wouldSkip++; bump("MODULE_WITHOUT_PARENT_TEACHING"); addC({ section: "module", warning: "MODULE_WITHOUT_PARENT_TEACHING", key: m.id, pessoaUuid: "", extra: m.nome ?? "" }); }
    else report.wouldCreate++;
    items.push(item(tenantId, batch.id, "teaching_module", m.id || "NO_ID", op, w, { id: m.id, nome: m.nome })); await flush();
  }
  // ── AULAS ── (pai = módulo)
  for (const l of lessons) {
    const w: string[] = []; let op: "WOULD_CREATE" | "WOULD_SKIP" | "FAILED" = "WOULD_CREATE";
    if (!clean(l.id)) { op = "FAILED"; report.failed++; }
    else if (!clean(l.idModulo) || !moduleById.has(l.idModulo)) { w.push("LESSON_WITHOUT_MODULE"); op = "WOULD_SKIP"; report.lessonsWithoutModule++; report.wouldSkip++; bump("LESSON_WITHOUT_MODULE"); addC({ section: "lesson", warning: "LESSON_WITHOUT_MODULE", key: l.id, pessoaUuid: "", extra: l.idModulo ?? "" }); }
    else report.wouldCreate++;
    items.push(item(tenantId, batch.id, "teaching_lesson", l.id || "NO_ID", op, w, { id: l.id, idModulo: l.idModulo, nome: l.nome })); await flush();
  }
  // ── ENCONTROS ── (pai = ensino)
  for (const s of sessions) {
    const w: string[] = []; let op: "WOULD_CREATE" | "WOULD_SKIP" | "FAILED" = "WOULD_CREATE";
    if (!clean(s.idEncontro)) { op = "FAILED"; report.failed++; }
    else if (!clean(s.uuidEnsino) || !teachingByUuid.has(s.uuidEnsino)) { w.push("SESSION_WITHOUT_PARENT_TEACHING"); op = "WOULD_SKIP"; report.sessionsWithoutTeaching++; report.wouldSkip++; bump("SESSION_WITHOUT_PARENT_TEACHING"); addC({ section: "session", warning: "SESSION_WITHOUT_PARENT_TEACHING", key: s.idEncontro, pessoaUuid: "", extra: s.uuidEnsino ?? "" }); }
    else report.wouldCreate++;
    items.push(item(tenantId, batch.id, "teaching_session", s.idEncontro || "NO_ID", op, w, { idEncontro: s.idEncontro, uuidEnsino: s.uuidEnsino, idModulo: s.idModulo, idAula: s.idAula })); await flush();
  }
  // ── INSCRIÇÕES ──
  const seenReg = new Set<string>();
  for (const r of registrations) {
    const w: string[] = []; let op: "WOULD_CREATE" | "WOULD_SKIP" | "FAILED" = "WOULD_CREATE";
    const uuidP = clean(r.uuidPessoa); const personId = uuidP ? personMap.get(uuidP) ?? null : null;
    const key = `${r.uuidEnsino}:${r.uuidPessoa}`;
    const st = clean(r.status); if (st) report.registrationStatuses[st] = (report.registrationStatuses[st] ?? 0) + 1;
    if (clean(r.valorTotal) || clean(r.lote) || clean(r.formaPagamento)) { report.paymentFieldsDetected++; w.push("PAYMENT_FIELDS_IGNORED"); }
    if (st || clean(r.nota)) { report.completionFieldsDetected++; w.push("COMPLETION_FIELDS_DETECTED"); }
    if (!clean(r.uuidEnsino) || !clean(r.uuidPessoa)) { op = "FAILED"; report.failed++; }
    else {
      if (personId) report.registrationsPersonResolved++;
      else { w.push("PERSON_MAPPING_NOT_FOUND"); report.registrationsPersonNotFound++; op = "WOULD_SKIP"; bump("PERSON_MAPPING_NOT_FOUND"); addC({ section: "registration", warning: "PERSON_MAPPING_NOT_FOUND", key, pessoaUuid: r.uuidPessoa, extra: "" }); }
      if (!teachingByUuid.has(r.uuidEnsino)) { w.push("REGISTRATION_TEACHING_NOT_FOUND"); report.registrationsTeachingNotFound++; op = "WOULD_SKIP"; bump("REGISTRATION_TEACHING_NOT_FOUND"); }
      if (seenReg.has(key)) { w.push("REGISTRATION_DUPLICATE"); report.registrationDuplicates++; op = "WOULD_SKIP"; bump("REGISTRATION_DUPLICATE"); addC({ section: "registration", warning: "REGISTRATION_DUPLICATE", key, pessoaUuid: r.uuidPessoa, extra: st ?? "" }); }
      seenReg.add(key);
      if (op === "WOULD_CREATE") report.wouldCreate++; else if (op === "WOULD_SKIP") report.wouldSkip++;
    }
    items.push(item(tenantId, batch.id, "teaching_registration", key, op, w, { uuidEnsino: r.uuidEnsino, uuidPessoa: r.uuidPessoa, personId, status: r.status, nota: r.nota })); await flush();
  }
  // ── PRESENÇAS ──
  const seenAtt = new Set<string>();
  for (const a of attendances) {
    const w: string[] = []; let op: "WOULD_CREATE" | "WOULD_SKIP" | "FAILED" = "WOULD_CREATE";
    const uuidP = clean(a.uuidPessoa); const personId = uuidP ? personMap.get(uuidP) ?? null : null;
    const session = clean(a.idEncontro) ? sessionByEncontro.get(a.idEncontro) ?? null : null;
    const dupKey = `${a.idEncontro}:${a.uuidPessoa}`;
    if (clean(a.presenca) === "0") report.attendancesAbsent++;
    if (clean(a.aproveitamento)) { report.completionFieldsDetected++; if (!w.includes("COMPLETION_FIELDS_DETECTED")) w.push("COMPLETION_FIELDS_DETECTED"); }
    if (!clean(a.idEncontro) || !clean(a.uuidPessoa)) { op = "FAILED"; report.failed++; }
    else {
      if (personId) report.attendancesPersonResolved++;
      else { w.push("PERSON_MAPPING_NOT_FOUND"); report.attendancesPersonNotFound++; op = "WOULD_SKIP"; bump("PERSON_MAPPING_NOT_FOUND"); }
      if (!session) { w.push("ATTENDANCE_SESSION_NOT_FOUND"); report.attendancesSessionNotFound++; op = "WOULD_SKIP"; bump("ATTENDANCE_SESSION_NOT_FOUND"); addC({ section: "attendance", warning: "ATTENDANCE_SESSION_NOT_FOUND", key: a.id, pessoaUuid: a.uuidPessoa, extra: a.idEncontro }); }
      else if (clean(session.uuidEnsino) && !regSet.has(`${session.uuidEnsino}:${a.uuidPessoa}`)) { w.push("ATTENDANCE_WITHOUT_REGISTRATION"); report.attendancesWithoutRegistration++; bump("ATTENDANCE_WITHOUT_REGISTRATION"); addC({ section: "attendance", warning: "ATTENDANCE_WITHOUT_REGISTRATION", key: a.id, pessoaUuid: a.uuidPessoa, extra: session.uuidEnsino }); }
      if (seenAtt.has(dupKey)) { w.push("ATTENDANCE_DUPLICATE"); report.attendanceDuplicates++; op = "WOULD_SKIP"; bump("ATTENDANCE_DUPLICATE"); addC({ section: "attendance", warning: "ATTENDANCE_DUPLICATE", key: a.id, pessoaUuid: a.uuidPessoa, extra: a.idEncontro }); }
      seenAtt.add(dupKey);
      if (op === "WOULD_CREATE") report.wouldCreate++; else if (op === "WOULD_SKIP") report.wouldSkip++;
    }
    items.push(item(tenantId, batch.id, "teaching_attendance", a.id || dupKey, op, w, { id: a.id, idEncontro: a.idEncontro, uuidPessoa: a.uuidPessoa, personId, presenca: a.presenca, aproveitamento: a.aproveitamento })); await flush();
  }

  await flush(true);
  report.personsResolvedRows = report.registrationsPersonResolved + report.attendancesPersonResolved;
  report.personsNotFoundRows = report.registrationsPersonNotFound + report.attendancesPersonNotFound;
  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", created: 0, matched: 0, skipped: report.wouldSkip, failed: report.failed, warnings: Object.values(report.conflictsByWarning).reduce((a, b) => a + b, 0), conflicts: report.registrationDuplicates + report.attendanceDuplicates, finishedAt: new Date() } });

  let reportFiles: { jsonPath: string; csvPath: string } | undefined;
  if (opts.outDir) reportFiles = writeTeachingReport(report, conflicts, opts.outDir);
  return { report, reportFiles };
}

function item(tenantId: string, batchId: string, externalType: string, externalId: string, op: string, w: string[], norm: object): Prisma.ImportBatchItemCreateManyInput {
  return {
    tenantId, batchId, externalType, externalId, operation: op as never, matchStrategy: "NONE",
    severity: op === "FAILED" ? "ERROR" : w.some((x) => x.includes("DUPLICATE")) ? "CONFLICT" : w.length ? "WARNING" : "INFO",
    targetType: externalType, normalizedJson: norm as object, warningsJson: { warnings: w } as object, rawJson: {} as object,
    status: op === "WOULD_CREATE" ? "PENDING" : op === "FAILED" ? "FAILED" : "SKIPPED", message: `[${op}] ${externalType} ${w.join(",")}`,
  };
}

function blank(): TeachingDryRunReport {
  return {
    batchId: "", totalTeachings: 0, totalModules: 0, totalLessons: 0, totalSessions: 0, totalRegistrations: 0, totalAttendances: 0,
    personUuidsDistinct: 0, personUuidsResolved: 0, personsResolvedRows: 0, personsNotFoundRows: 0,
    teachingsWithoutTitle: 0, teachingsWithoutDate: 0, modulesWithoutParent: 0, lessonsWithoutModule: 0, sessionsWithoutTeaching: 0,
    registrationsPersonResolved: 0, registrationsPersonNotFound: 0, registrationsTeachingNotFound: 0, registrationDuplicates: 0,
    attendancesPersonResolved: 0, attendancesPersonNotFound: 0, attendancesSessionNotFound: 0, attendancesWithoutRegistration: 0,
    attendanceDuplicates: 0, attendancesAbsent: 0, paymentFieldsDetected: 0, completionFieldsDetected: 0,
    wouldCreate: 0, wouldSkip: 0, failed: 0, registrationStatuses: {}, conflictsByWarning: {}, auxFiles: {}, modelInterpretation: "",
  };
}

function csvCell(v: unknown): string { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
export function writeTeachingReport(report: TeachingDryRunReport, conflicts: Conflict[], outDir: string): { jsonPath: string; csvPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "teaching-dry-run-summary.json");
  const csvPath = path.join(outDir, "teaching-dry-run-conflicts.csv");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  const lines = [["section", "warning", "key", "pessoaUuid", "extra"].join(",")];
  for (const c of conflicts) lines.push([c.section, c.warning, c.key, c.pessoaUuid, c.extra].map(csvCell).join(","));
  writeFileSync(csvPath, lines.join("\n"));
  return { jsonPath, csvPath };
}
