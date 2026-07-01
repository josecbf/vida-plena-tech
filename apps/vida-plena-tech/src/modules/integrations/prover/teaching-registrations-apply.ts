import { Prisma, type PrismaClient, type TeachingRegistrationStatus } from "@prisma/client";
import type { ProverTeachingRegistration } from "./types";
import { parseProverDateTime } from "./normalize-gc-meeting";

// ─────────────────────────────────────────────────────────────────────────
// FASE 6B.2 — APPLY CONSERVADOR de INSCRIÇÕES de Ensino.
//
// Cria TeachingRegistration de ensino_inscritos_ensinos.json. Resolve ensino
// (ExternalMapping teaching) e pessoa (ExternalMapping person). Idempotente via
// ExternalMapping(teaching_registration) + unique (teachingId,personId).
//
// CHAVE OPERACIONAL: <uuidEnsino>:<uuidPessoa>. O export tem 2 idResumo distintos
// para o MESMO ensino+pessoa (duplicidade), então idResumo NÃO é confiável como
// discriminador de unicidade — usá-lo na chave produziria colisão no unique
// (teachingId,personId) e viraria FAILED. idResumo é PRESERVADO em metaJson.
//
// status "Cursando" → IN_PROGRESS; texto original em sourceStatus. nota numérica
// → grade; nota não-numérica → sourceGrade. Pagamento/lote PRESERVADOS em
// sourcePaymentJson SEM lógica financeira. Duplicidade conflitante (status/nota
// divergente) → SKIP. NÃO cria presença/TeachingAttendance, NÃO altera Teaching/
// Module/Lesson/Session/Person/status/User/Role.
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Op = "CREATE" | "UPDATE" | "SKIP" | "FAILED";
const META_TYPE = "teaching_registration";

export interface TeachingRegistrationsApplyReport {
  batchId: string;
  read: number; // processadas (após --limit)
  totalInFile: number;
  created: number;
  updated: number; // vinculadas a inscrição já existente (mapping criado)
  skipped: number;
  failed: number;
  teachingResolved: number;
  teachingNotFound: number;
  personResolved: number;
  personNotFound: number;
  duplicateSimple: number;
  duplicateConflict: number;
  alreadyImported: number;
  statusCounts: Record<string, number>;
  gradeNumeric: number;
  gradePreserved: number; // nota não-numérica preservada em sourceGrade
  paymentDetected: number;
  paymentPreserved: number;
  warnings: number;
}

function clean(v?: string | null): string | null {
  const t = (v ?? "").toString().trim();
  return t.length > 0 ? t : null;
}
const keyOf = (r: ProverTeachingRegistration) => `${r.uuidEnsino}:${r.uuidPessoa}`;

// status Prover → enum canônico (sempre preserva o texto original em sourceStatus).
function mapStatus(raw?: string | null): { status: TeachingRegistrationStatus; sourceStatus: string | null } {
  const sourceStatus = clean(raw);
  const norm = (sourceStatus ?? "").toLowerCase();
  let status: TeachingRegistrationStatus = "UNKNOWN";
  if (norm === "cursando") status = "IN_PROGRESS";
  else if (["concluido", "concluído", "aprovado", "formado", "finalizado"].includes(norm)) status = "COMPLETED";
  else if (["cancelado", "desistente", "reprovado", "trancado"].includes(norm)) status = "CANCELLED";
  return { status, sourceStatus };
}

// nota numérica → grade; caso contrário preserva o texto em sourceGrade.
function parseGrade(raw?: string | null): { grade: number | null; sourceGrade: string | null } {
  const t = clean(raw);
  if (t == null) return { grade: null, sourceGrade: null };
  if (/^-?\d+([.,]\d+)?$/.test(t)) {
    const n = parseFloat(t.replace(",", "."));
    if (!isNaN(n)) return { grade: n, sourceGrade: null };
  }
  return { grade: null, sourceGrade: t };
}

// assinatura de conteúdo p/ decidir duplicidade simples × conflitante.
const sigOf = (r: ProverTeachingRegistration) => `${clean(r.status) ?? ""}|${clean(r.nota) ?? ""}`;

export async function runTeachingRegistrationsApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    registrations: ProverTeachingRegistration[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
  },
): Promise<TeachingRegistrationsApplyReport> {
  const { tenantId, fileName, sourceFileHash, actorUserId = null } = opts;
  const all = opts.registrations;

  // ── resolução em lote ──
  const findIn = async (externalType: string, ids: string[]) => {
    const out: { externalId: string; internalId: string }[] = [];
    const uniq = [...new Set(ids.filter(Boolean))];
    for (let i = 0; i < uniq.length; i += 5000) out.push(...(await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType, externalId: { in: uniq.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } })));
    return out;
  };
  const teachingByUuid = new Map((await findIn("teaching", all.map((r) => r.uuidEnsino))).map((m) => [m.externalId, m.internalId]));
  const personByUuid = new Map((await findIn("person", all.map((r) => r.uuidPessoa))).map((m) => [m.externalId, m.internalId]));

  // ── duplicidade (sobre TODO o conjunto): CONFLICT se assinatura (status/nota) divergente ──
  const dupSigs = new Map<string, Set<string>>();
  for (const r of all) {
    if (!clean(r.uuidEnsino) || !clean(r.uuidPessoa)) continue;
    const k = keyOf(r);
    if (!dupSigs.has(k)) dupSigs.set(k, new Set());
    dupSigs.get(k)!.add(sigOf(r));
  }
  const conflictKeys = new Set([...dupSigs].filter(([, sigs]) => sigs.size > 1).map(([k]) => k));

  const toProcess = opts.limit ? all.slice(0, opts.limit) : all;

  // ── existentes: mapping (idempotência) + TeachingRegistration (unique teachingId,personId) ──
  const existingMaps = await findIn(META_TYPE, toProcess.map(keyOf));
  const mappingByKey = new Set(existingMaps.map((m) => m.externalId));
  const createdThisRun = new Set<string>();
  const regByPair = new Map<string, string>(); // teachingId:personId → regId
  for (const rr of await prisma.teachingRegistration.findMany({ where: { tenantId }, select: { id: true, teachingId: true, personId: true } })) regByPair.set(`${rr.teachingId}:${rr.personId}`, rr.id);

  const report: TeachingRegistrationsApplyReport = {
    batchId: "", read: toProcess.length, totalInFile: all.length, created: 0, updated: 0, skipped: 0, failed: 0,
    teachingResolved: 0, teachingNotFound: 0, personResolved: 0, personNotFound: 0, duplicateSimple: 0, duplicateConflict: 0,
    alreadyImported: 0, statusCounts: {}, gradeNumeric: 0, gradePreserved: 0, paymentDetected: 0, paymentPreserved: 0, warnings: 0,
  };

  const batch = await prisma.importBatch.create({ data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: toProcess.length } });
  report.batchId = batch.id;

  for (const r of toProcess) {
    try {
      await prisma.$transaction((tx) => processOne(tx, { tenantId, batchId: batch.id, actorUserId, r, teachingByUuid, personByUuid, conflictKeys, mappingByKey, createdThisRun, regByPair, report }));
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({ data: { tenantId, batchId: batch.id, externalType: META_TYPE, externalId: keyOf(r), operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: "TeachingRegistration", rawJson: {} as object, errorsJson: [err instanceof Error ? err.message : "erro"], status: "FAILED", message: `[FAILED] ${err instanceof Error ? err.message : "erro"}` } });
    }
  }

  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", created: report.created, matched: report.updated + report.alreadyImported, skipped: report.skipped, failed: report.failed, warnings: report.warnings, conflicts: report.duplicateConflict, finishedAt: new Date() } });
  return report;
}

async function processOne(
  tx: Tx,
  ctx: {
    tenantId: string; batchId: string; actorUserId: string | null; r: ProverTeachingRegistration;
    teachingByUuid: Map<string, string>; personByUuid: Map<string, string>; conflictKeys: Set<string>;
    mappingByKey: Set<string>; createdThisRun: Set<string>; regByPair: Map<string, string>; report: TeachingRegistrationsApplyReport;
  },
): Promise<void> {
  const { tenantId, batchId, actorUserId, r, teachingByUuid, personByUuid, conflictKeys, mappingByKey, createdThisRun, regByPair, report } = ctx;
  const warns: string[] = [];
  let op: Op = "CREATE";
  let targetId: string | null = null;
  const key = keyOf(r);
  const teachingId = clean(r.uuidEnsino) ? teachingByUuid.get(r.uuidEnsino) ?? null : null;
  const personId = clean(r.uuidPessoa) ? personByUuid.get(r.uuidPessoa) ?? null : null;

  const { status, sourceStatus } = mapStatus(r.status);
  const { grade, sourceGrade } = parseGrade(r.nota);
  const hasPayment = !!(clean(r.valorTotal) || clean(r.lote) || clean(r.formaPagamento) || clean(r.valorLote));
  if (hasPayment) report.paymentDetected++;

  if (!clean(r.uuidEnsino) || !clean(r.uuidPessoa)) { op = "FAILED"; report.failed++; }
  else if (!teachingId) { warns.push("TEACHING_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.teachingNotFound++; report.warnings++; }
  else if (!personId) { warns.push("PERSON_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.personNotFound++; report.warnings++; }
  else if (conflictKeys.has(key)) { warns.push("TEACHING_REGISTRATION_DUPLICATE_CONFLICT"); op = "SKIP"; report.skipped++; report.duplicateConflict++; report.warnings++; }
  else {
    report.teachingResolved++; report.personResolved++;
    const pairKey = `${teachingId}:${personId}`;
    if (mappingByKey.has(key)) {
      op = "SKIP"; report.skipped++; targetId = regByPair.get(pairKey) ?? null;
      if (createdThisRun.has(key)) { report.duplicateSimple++; warns.push("TEACHING_REGISTRATION_DUPLICATE_SIMPLE"); }
      else { report.alreadyImported++; warns.push("ALREADY_IMPORTED"); }
    } else if (regByPair.has(pairKey)) {
      // inscrição já existe (seed/manual) sem mapping → vincula (não duplica)
      targetId = regByPair.get(pairKey)!;
      await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: META_TYPE, externalId: key, internalType: "TeachingRegistration", internalId: targetId } });
      mappingByKey.add(key);
      op = "UPDATE"; report.updated++; warns.push("TEACHING_REGISTRATION_ALREADY_EXISTS");
    } else {
      report.statusCounts[sourceStatus ?? "(null)"] = (report.statusCounts[sourceStatus ?? "(null)"] ?? 0) + 1;
      if (grade != null) report.gradeNumeric++;
      if (sourceGrade != null) { report.gradePreserved++; warns.push("GRADE_PRESERVED_AS_TEXT"); }
      const payment = hasPayment ? { lote: clean(r.lote), valorLote: clean(r.valorLote), valorDesconto: clean(r.valorDesconto), valorTotal: clean(r.valorTotal), formaPagamento: clean(r.formaPagamento) } : null;
      if (payment) { warns.push("PAYMENT_FIELDS_PRESERVED_AS_METADATA"); report.paymentPreserved++; }
      const created = await tx.teachingRegistration.create({
        data: {
          tenantId, teachingId, personId, status, source: "PROVER", sourceStatus,
          sourceRegisteredAt: parseProverDateTime(r.dataInscricao), grade, sourceGrade,
          sourcePaymentJson: (payment as Prisma.InputJsonValue) ?? Prisma.DbNull,
          metaJson: { idResumo: clean(r.idResumo) } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      targetId = created.id;
      regByPair.set(pairKey, created.id); mappingByKey.add(key); createdThisRun.add(key);
      await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: META_TYPE, externalId: key, internalType: "TeachingRegistration", internalId: created.id } });
      await tx.auditLog.create({ data: { tenantId, actorUserId, module: "teaching", action: "import_teaching_registration_create", entityType: "TeachingRegistration", entityId: created.id, sensitivity: "INTERNAL", reason: `Importação Prover (batch ${batchId})`, afterJson: { source: "PROVER", batchId, uuidEnsino: r.uuidEnsino, uuidPessoa: r.uuidPessoa, status, paymentPreserved: !!payment } as object } });
      op = "CREATE"; report.created++;
    }
  }

  await tx.importBatchItem.create({ data: {
    tenantId, batchId, externalType: META_TYPE, externalId: key, operation: op,
    matchStrategy: op === "CREATE" ? "COMPOSITE_KEY" : mappingByKey.has(key) ? "EXTERNAL_MAPPING" : "NONE",
    severity: op === "FAILED" ? "ERROR" : warns.includes("TEACHING_REGISTRATION_DUPLICATE_CONFLICT") ? "CONFLICT" : warns.length ? "WARNING" : "INFO",
    targetType: "TeachingRegistration", targetId,
    normalizedJson: { uuidEnsino: r.uuidEnsino, uuidPessoa: r.uuidPessoa, teachingId, personId, status, sourceStatus, grade, dataInscricao: r.dataInscricao } as object,
    warningsJson: { warnings: warns } as object, errorsJson: [], rawJson: {} as object,
    status: op === "CREATE" ? "CREATED" : op === "UPDATE" ? "MATCHED" : op === "FAILED" ? "FAILED" : "SKIPPED",
    message: `[${op}] teaching_registration teaching=${!!teachingId} person=${!!personId} ${warns.join(",")}`,
  } });
}
