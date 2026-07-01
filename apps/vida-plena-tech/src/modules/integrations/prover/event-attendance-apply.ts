import { Prisma, type PrismaClient, type EventAttendanceStatus } from "@prisma/client";
import type { ProverEventAttendance } from "./types";
import { parseProverDateTime } from "./normalize-gc-meeting";

// ─────────────────────────────────────────────────────────────────────────
// FASE 5B.3 — APPLY CONSERVADOR de PRESENÇAS de evento.
//
// Cria EventAttendance de evento_presenca_eventos.json. Resolve sessão
// (ExternalMapping event_session), pessoa (ExternalMapping person) e inscrição
// (EventRegistration por event+person). Idempotente via ExternalMapping
// (event_attendance, chave idEncontro:uuidPessoa) — 1 presença por sessão/pessoa.
// NÃO altera Event/EventSession/EventRegistration/Person/status, NÃO cria
// User/Role, NÃO cria financeiro. Duplicidade conflitante (presenca divergente)
// → SKIP. Inscrição não encontrada → SKIP (não cria presença solta).
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Op = "CREATE" | "UPDATE" | "SKIP" | "FAILED";
const META_TYPE = "event_attendance";

/** ≤1 garantido por @@unique(eventId, personId); guarda defensiva testável. */
export function classifyRegistrationCount(n: number): "OK" | "NOT_FOUND" | "AMBIGUOUS" {
  return n === 0 ? "NOT_FOUND" : n === 1 ? "OK" : "AMBIGUOUS";
}

export interface EventAttendanceApplyReport {
  batchId: string;
  read: number;
  totalInFile: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  present: number;
  absent: number;
  unknown: number;
  sessionResolved: number;
  sessionNotFound: number;
  personResolved: number;
  personNotFound: number;
  registrationResolved: number;
  registrationNotFound: number;
  registrationAmbiguous: number;
  duplicateSimple: number;
  duplicateConflict: number;
  alreadyImported: number;
  warnings: number;
}

function clean(v?: string | null): string | null {
  const t = (v ?? "").toString().trim();
  return t.length > 0 ? t : null;
}
const keyOf = (a: ProverEventAttendance) => `${a.idEncontro}:${a.uuidPessoa}`;
function markStatus(presenca?: string | null): EventAttendanceStatus {
  const p = clean(presenca);
  return p === "1" ? "PRESENT" : p === "0" ? "ABSENT" : "UNKNOWN";
}

export async function runEventAttendanceApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    attendances: ProverEventAttendance[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
  },
): Promise<EventAttendanceApplyReport> {
  const { tenantId, fileName, sourceFileHash, actorUserId = null } = opts;
  const all = opts.attendances;

  const findIn = async (externalType: string, ids: string[]) => {
    const out: { externalId: string; internalId: string }[] = [];
    const uniq = [...new Set(ids.filter(Boolean))];
    for (let i = 0; i < uniq.length; i += 5000) out.push(...(await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType, externalId: { in: uniq.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } })));
    return out;
  };
  // sessão → { sessionId, eventId }
  const sessionMaps = await findIn("event_session", all.map((a) => a.idEncontro));
  const sessionIds = [...new Set(sessionMaps.map((m) => m.internalId))];
  const sessionEventById = new Map<string, string>();
  if (sessionIds.length) for (const s of await prisma.eventSession.findMany({ where: { tenantId, id: { in: sessionIds } }, select: { id: true, eventId: true } })) sessionEventById.set(s.id, s.eventId);
  const sessionInfo = new Map(sessionMaps.map((m) => [m.externalId, { sessionId: m.internalId, eventId: sessionEventById.get(m.internalId) ?? null }]));
  // pessoa
  const personByUuid = new Map((await findIn("person", all.map((a) => a.uuidPessoa))).map((m) => [m.externalId, m.internalId]));
  // inscrição por (eventId:personId)
  const regByPair = new Map<string, string>();
  for (const rr of await prisma.eventRegistration.findMany({ where: { tenantId }, select: { id: true, eventId: true, personId: true } })) regByPair.set(`${rr.eventId}:${rr.personId}`, rr.id);

  // duplicidade por (idEncontro:uuidPessoa): CONFLICT se presenca divergente
  const dupMarks = new Map<string, Set<string>>();
  for (const a of all) {
    if (!clean(a.idEncontro) || !clean(a.uuidPessoa)) continue;
    const k = keyOf(a);
    if (!dupMarks.has(k)) dupMarks.set(k, new Set());
    dupMarks.get(k)!.add(clean(a.presenca) ?? "null");
  }
  const conflictKeys = new Set([...dupMarks].filter(([, marks]) => marks.size > 1).map(([k]) => k));

  const toProcess = opts.limit ? all.slice(0, opts.limit) : all;
  const existingMaps = await findIn(META_TYPE, toProcess.map(keyOf));
  const mappingByKey = new Set(existingMaps.map((m) => m.externalId));
  const createdThisRun = new Set<string>();

  const report: EventAttendanceApplyReport = {
    batchId: "", read: toProcess.length, totalInFile: all.length, created: 0, updated: 0, skipped: 0, failed: 0,
    present: 0, absent: 0, unknown: 0, sessionResolved: 0, sessionNotFound: 0, personResolved: 0, personNotFound: 0,
    registrationResolved: 0, registrationNotFound: 0, registrationAmbiguous: 0, duplicateSimple: 0, duplicateConflict: 0,
    alreadyImported: 0, warnings: 0,
  };

  const batch = await prisma.importBatch.create({ data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: toProcess.length } });
  report.batchId = batch.id;

  for (const a of toProcess) {
    try {
      await prisma.$transaction((tx) => processOne(tx, { tenantId, batchId: batch.id, actorUserId, a, sessionInfo, personByUuid, regByPair, conflictKeys, mappingByKey, createdThisRun, report }));
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({ data: { tenantId, batchId: batch.id, externalType: META_TYPE, externalId: keyOf(a), operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: "EventAttendance", rawJson: {} as object, errorsJson: [err instanceof Error ? err.message : "erro"], status: "FAILED", message: `[FAILED] ${err instanceof Error ? err.message : "erro"}` } });
    }
  }

  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", created: report.created, matched: report.alreadyImported, skipped: report.skipped, failed: report.failed, warnings: report.warnings, conflicts: report.duplicateConflict, finishedAt: new Date() } });
  return report;
}

async function processOne(
  tx: Tx,
  ctx: {
    tenantId: string; batchId: string; actorUserId: string | null; a: ProverEventAttendance;
    sessionInfo: Map<string, { sessionId: string; eventId: string | null }>; personByUuid: Map<string, string>;
    regByPair: Map<string, string>; conflictKeys: Set<string>; mappingByKey: Set<string>; createdThisRun: Set<string>;
    report: EventAttendanceApplyReport;
  },
): Promise<void> {
  const { tenantId, batchId, actorUserId, a, sessionInfo, personByUuid, regByPair, conflictKeys, mappingByKey, createdThisRun, report } = ctx;
  const warns: string[] = [];
  let op: Op = "CREATE";
  let targetId: string | null = null;
  const key = keyOf(a);
  const session = clean(a.idEncontro) ? sessionInfo.get(a.idEncontro) ?? null : null;
  const personId = clean(a.uuidPessoa) ? personByUuid.get(a.uuidPessoa) ?? null : null;
  const status = markStatus(a.presenca);
  if (status === "PRESENT") report.present++; else if (status === "ABSENT") report.absent++; else report.unknown++;

  if (!clean(a.idEncontro) || !clean(a.uuidPessoa)) { op = "FAILED"; report.failed++; }
  else if (!session) { warns.push("EVENT_SESSION_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.sessionNotFound++; report.warnings++; }
  else if (!personId) { warns.push("PERSON_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.personNotFound++; report.warnings++; }
  else if (conflictKeys.has(key)) { warns.push("EVENT_ATTENDANCE_DUPLICATE_CONFLICT"); op = "SKIP"; report.skipped++; report.duplicateConflict++; report.warnings++; }
  else {
    report.sessionResolved++; report.personResolved++;
    // inscrição por (eventId, personId) — ≤1 (unique)
    const regId = session.eventId ? regByPair.get(`${session.eventId}:${personId}`) ?? null : null;
    const regClass = classifyRegistrationCount(regId ? 1 : 0);
    if (regClass === "NOT_FOUND") { warns.push("EVENT_REGISTRATION_NOT_FOUND"); op = "SKIP"; report.skipped++; report.registrationNotFound++; report.warnings++; }
    else if (regClass === "AMBIGUOUS") { warns.push("EVENT_REGISTRATION_AMBIGUOUS"); op = "SKIP"; report.skipped++; report.registrationAmbiguous++; report.warnings++; }
    else if (mappingByKey.has(key)) {
      op = "SKIP"; report.skipped++;
      if (createdThisRun.has(key)) { report.duplicateSimple++; warns.push("EVENT_ATTENDANCE_DUPLICATE_SIMPLE"); }
      else { report.alreadyImported++; warns.push("ALREADY_IMPORTED"); }
    } else {
      report.registrationResolved++;
      const score = clean(a.aproveitamento) != null && !isNaN(parseFloat(a.aproveitamento!)) ? parseFloat(a.aproveitamento!) : null;
      const created = await tx.eventAttendance.create({
        data: {
          tenantId, eventId: session.eventId!, eventSessionId: session.sessionId, eventRegistrationId: regId, personId,
          status, source: "PROVER", checkedInAt: parseProverDateTime(a.dataCheckIn), checkedOutAt: parseProverDateTime(a.dataCheckOut),
          score, sourceMark: clean(a.presenca), metaJson: { presenceId: clean(a.id), idEventoInscricao: clean(a.idEventoInscricao), idEncontroReposicao: clean(a.idEncontroReposicao) } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      targetId = created.id;
      mappingByKey.add(key); createdThisRun.add(key);
      await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: META_TYPE, externalId: key, internalType: "EventAttendance", internalId: created.id } });
      await tx.auditLog.create({ data: { tenantId, actorUserId, module: "events", action: "import_event_attendance_create", entityType: "EventAttendance", entityId: created.id, sensitivity: "INTERNAL", reason: `Importação Prover (batch ${batchId})`, afterJson: { source: "PROVER", batchId, idEncontro: a.idEncontro, uuidPessoa: a.uuidPessoa, status } as object } });
      op = "CREATE"; report.created++;
    }
  }

  await tx.importBatchItem.create({ data: {
    tenantId, batchId, externalType: META_TYPE, externalId: key, operation: op,
    matchStrategy: op === "CREATE" ? "COMPOSITE_KEY" : mappingByKey.has(key) ? "EXTERNAL_MAPPING" : "NONE",
    severity: op === "FAILED" ? "ERROR" : warns.includes("EVENT_ATTENDANCE_DUPLICATE_CONFLICT") ? "CONFLICT" : warns.length ? "WARNING" : "INFO",
    targetType: "EventAttendance", targetId,
    normalizedJson: { idEncontro: a.idEncontro, uuidPessoa: a.uuidPessoa, personId, status, presenca: a.presenca } as object,
    warningsJson: { warnings: warns } as object, errorsJson: [], rawJson: {} as object,
    status: op === "CREATE" ? "CREATED" : op === "FAILED" ? "FAILED" : "SKIPPED",
    message: `[${op}] event_attendance session=${!!session} person=${!!personId} status=${status} ${warns.join(",")}`,
  } });
}
