import { Prisma, type PrismaClient, type TeachingAttendanceStatus } from "@prisma/client";
import type { ProverTeachingAttendance } from "./types";
import { parseProverDateTime } from "./normalize-gc-meeting";

// ─────────────────────────────────────────────────────────────────────────
// FASE 6B.3 — APPLY CONSERVADOR de PRESENÇAS de Ensino.
//
// Cria TeachingAttendance de ensino_presenca_ensinos.json. Resolve sessão
// (ExternalMapping teaching_session → TeachingSession → teachingId), pessoa
// (ExternalMapping person) e inscrição (TeachingRegistration por teachingId+
// personId, unique). Idempotente via ExternalMapping(teaching_attendance).
//
// CHAVE OPERACIONAL: <idEncontro>:<uuidPessoa>. O campo `id` é único no export,
// MAS o mesmo par (sessão, pessoa) aparece em 2 linhas com `id`/idEventoInscricao
// distintos (pessoa com inscrição duplicada). Ambas resolvem para a MESMA
// TeachingRegistration (teaching+person unique), então keyar por `id` criaria
// DUAS presenças para a mesma pessoa na mesma sessão/inscrição — proibido. Por
// isso a chave é idEncontro:uuidPessoa (1 presença por sessão/pessoa); `id` e
// idEventoInscricao ficam PRESERVADOS em metaJson para rastreabilidade.
//
// presenca "1"→PRESENT, "0"→ABSENT, null→UNKNOWN (cria, preservando o dado).
// Duplicidade conflitante (presenca divergente) → SKIP. Inscrição não encontrada
// → SKIP (não cria presença solta). NÃO altera Teaching/Session/Registration/
// Person/status, NÃO cria User/Role, NÃO cria financeiro.
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Op = "CREATE" | "UPDATE" | "SKIP" | "FAILED";
const META_TYPE = "teaching_attendance";

/** ≤1 garantido por @@unique(teachingId, personId) em TeachingRegistration. */
export function classifyRegistrationCount(n: number): "OK" | "NOT_FOUND" | "AMBIGUOUS" {
  return n === 0 ? "NOT_FOUND" : n === 1 ? "OK" : "AMBIGUOUS";
}

export interface TeachingAttendanceApplyReport {
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
  scoreDetected: number;
  scorePreserved: number;
  warnings: number;
}

function clean(v?: string | null): string | null {
  const t = (v ?? "").toString().trim();
  return t.length > 0 ? t : null;
}
const keyOf = (a: ProverTeachingAttendance) => `${a.idEncontro}:${a.uuidPessoa}`;
function markStatus(presenca?: string | null): TeachingAttendanceStatus {
  const p = clean(presenca);
  return p === "1" ? "PRESENT" : p === "0" ? "ABSENT" : "UNKNOWN";
}

export async function runTeachingAttendanceApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    attendances: ProverTeachingAttendance[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
  },
): Promise<TeachingAttendanceApplyReport> {
  const { tenantId, fileName, sourceFileHash, actorUserId = null } = opts;
  const all = opts.attendances;

  const findIn = async (externalType: string, ids: string[]) => {
    const out: { externalId: string; internalId: string }[] = [];
    const uniq = [...new Set(ids.filter(Boolean))];
    for (let i = 0; i < uniq.length; i += 5000) out.push(...(await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType, externalId: { in: uniq.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } })));
    return out;
  };
  // sessão → { sessionId, teachingId }
  const sessionMaps = await findIn("teaching_session", all.map((a) => a.idEncontro));
  const sessionIds = [...new Set(sessionMaps.map((m) => m.internalId))];
  const sessionTeachingById = new Map<string, string>();
  if (sessionIds.length) for (const s of await prisma.teachingSession.findMany({ where: { tenantId, id: { in: sessionIds } }, select: { id: true, teachingId: true } })) sessionTeachingById.set(s.id, s.teachingId);
  const sessionInfo = new Map(sessionMaps.map((m) => [m.externalId, { sessionId: m.internalId, teachingId: sessionTeachingById.get(m.internalId) ?? null }]));
  // pessoa
  const personByUuid = new Map((await findIn("person", all.map((a) => a.uuidPessoa))).map((m) => [m.externalId, m.internalId]));
  // inscrição por (teachingId:personId) — ≤1 (unique)
  const regByPair = new Map<string, string>();
  for (const rr of await prisma.teachingRegistration.findMany({ where: { tenantId }, select: { id: true, teachingId: true, personId: true } })) regByPair.set(`${rr.teachingId}:${rr.personId}`, rr.id);

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

  const report: TeachingAttendanceApplyReport = {
    batchId: "", read: toProcess.length, totalInFile: all.length, created: 0, updated: 0, skipped: 0, failed: 0,
    present: 0, absent: 0, unknown: 0, sessionResolved: 0, sessionNotFound: 0, personResolved: 0, personNotFound: 0,
    registrationResolved: 0, registrationNotFound: 0, registrationAmbiguous: 0, duplicateSimple: 0, duplicateConflict: 0,
    alreadyImported: 0, scoreDetected: 0, scorePreserved: 0, warnings: 0,
  };

  const batch = await prisma.importBatch.create({ data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: toProcess.length } });
  report.batchId = batch.id;

  for (const a of toProcess) {
    try {
      await prisma.$transaction((tx) => processOne(tx, { tenantId, batchId: batch.id, actorUserId, a, sessionInfo, personByUuid, regByPair, conflictKeys, mappingByKey, createdThisRun, report }));
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({ data: { tenantId, batchId: batch.id, externalType: META_TYPE, externalId: keyOf(a), operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: "TeachingAttendance", rawJson: {} as object, errorsJson: [err instanceof Error ? err.message : "erro"], status: "FAILED", message: `[FAILED] ${err instanceof Error ? err.message : "erro"}` } });
    }
  }

  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", created: report.created, matched: report.alreadyImported, skipped: report.skipped, failed: report.failed, warnings: report.warnings, conflicts: report.duplicateConflict, finishedAt: new Date() } });
  return report;
}

async function processOne(
  tx: Tx,
  ctx: {
    tenantId: string; batchId: string; actorUserId: string | null; a: ProverTeachingAttendance;
    sessionInfo: Map<string, { sessionId: string; teachingId: string | null }>; personByUuid: Map<string, string>;
    regByPair: Map<string, string>; conflictKeys: Set<string>; mappingByKey: Set<string>; createdThisRun: Set<string>;
    report: TeachingAttendanceApplyReport;
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
  else if (!session) { warns.push("TEACHING_SESSION_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.sessionNotFound++; report.warnings++; }
  else if (!personId) { warns.push("PERSON_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.personNotFound++; report.warnings++; }
  else if (conflictKeys.has(key)) { warns.push("TEACHING_ATTENDANCE_DUPLICATE_CONFLICT"); op = "SKIP"; report.skipped++; report.duplicateConflict++; report.warnings++; }
  else {
    report.sessionResolved++; report.personResolved++;
    // inscrição por (teachingId, personId) — ≤1 (unique); ensino DERIVADO da sessão
    const regId = session.teachingId ? regByPair.get(`${session.teachingId}:${personId}`) ?? null : null;
    const regClass = classifyRegistrationCount(regId ? 1 : 0);
    if (regClass === "NOT_FOUND") { warns.push("TEACHING_REGISTRATION_NOT_FOUND"); op = "SKIP"; report.skipped++; report.registrationNotFound++; report.warnings++; }
    else if (regClass === "AMBIGUOUS") { warns.push("TEACHING_REGISTRATION_AMBIGUOUS"); op = "SKIP"; report.skipped++; report.registrationAmbiguous++; report.warnings++; }
    else if (mappingByKey.has(key)) {
      op = "SKIP"; report.skipped++; targetId = null;
      if (createdThisRun.has(key)) { report.duplicateSimple++; warns.push("TEACHING_ATTENDANCE_DUPLICATE_SIMPLE"); }
      else { report.alreadyImported++; warns.push("ALREADY_IMPORTED"); }
    } else {
      report.registrationResolved++;
      const aproveitamento = clean(a.aproveitamento);
      if (aproveitamento != null) report.scoreDetected++;
      const score = aproveitamento != null && /^-?\d+([.,]\d+)?$/.test(aproveitamento) && !isNaN(parseFloat(aproveitamento.replace(",", "."))) ? parseFloat(aproveitamento.replace(",", ".")) : null;
      if (score != null) report.scorePreserved++;
      const created = await tx.teachingAttendance.create({
        data: {
          tenantId, teachingId: session.teachingId!, teachingSessionId: session.sessionId, teachingRegistrationId: regId!, personId,
          status, source: "PROVER", checkedInAt: parseProverDateTime(a.dataCheckIn), checkedOutAt: parseProverDateTime(a.dataCheckOut),
          exitMark: clean(a.saida), score, sourceMark: clean(a.presenca),
          metaJson: { presenceId: clean(a.id), idEventoInscricao: clean(a.idEventoInscricao), idEncontroReposicao: clean(a.idEncontroReposicao), aproveitamento: score == null ? aproveitamento : null } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      targetId = created.id;
      mappingByKey.add(key); createdThisRun.add(key);
      await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: META_TYPE, externalId: key, internalType: "TeachingAttendance", internalId: created.id } });
      await tx.auditLog.create({ data: { tenantId, actorUserId, module: "teaching", action: "import_teaching_attendance_create", entityType: "TeachingAttendance", entityId: created.id, sensitivity: "INTERNAL", reason: `Importação Prover (batch ${batchId})`, afterJson: { source: "PROVER", batchId, idEncontro: a.idEncontro, uuidPessoa: a.uuidPessoa, status } as object } });
      op = "CREATE"; report.created++;
    }
  }

  await tx.importBatchItem.create({ data: {
    tenantId, batchId, externalType: META_TYPE, externalId: key, operation: op,
    matchStrategy: op === "CREATE" ? "COMPOSITE_KEY" : mappingByKey.has(key) ? "EXTERNAL_MAPPING" : "NONE",
    severity: op === "FAILED" ? "ERROR" : warns.includes("TEACHING_ATTENDANCE_DUPLICATE_CONFLICT") ? "CONFLICT" : warns.length ? "WARNING" : "INFO",
    targetType: "TeachingAttendance", targetId,
    normalizedJson: { idEncontro: a.idEncontro, uuidPessoa: a.uuidPessoa, personId, status, presenca: a.presenca } as object,
    warningsJson: { warnings: warns } as object, errorsJson: [], rawJson: {} as object,
    status: op === "CREATE" ? "CREATED" : op === "FAILED" ? "FAILED" : "SKIPPED",
    message: `[${op}] teaching_attendance session=${!!session} person=${!!personId} status=${status} ${warns.join(",")}`,
  } });
}
