import { Prisma, type PrismaClient } from "@prisma/client";
import type { ProverEventRegistration } from "./types";
import { parseProverDateTime } from "./normalize-gc-meeting";

// ─────────────────────────────────────────────────────────────────────────
// FASE 5B.2 — APPLY CONSERVADOR de INSCRIÇÕES de evento.
//
// Cria EventRegistration de evento_inscritos_eventos.json. Resolve evento
// (ExternalMapping event) e pessoa (ExternalMapping person). Idempotente via
// ExternalMapping(event_registration, chave uuidEvento:uuidPessoa) + unique
// (eventId,personId). Pagamento/lote são PRESERVADOS em sourcePaymentJson SEM
// lógica financeira. NÃO cria presença/EventAttendance, NÃO altera Event/Person/
// status/User/Role. Duplicidade conflitante (dataInscricao divergente) → SKIP.
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Op = "CREATE" | "UPDATE" | "SKIP" | "FAILED";
const META_TYPE = "event_registration";

export interface EventRegistrationsApplyReport {
  batchId: string;
  read: number; // processadas (após --limit)
  totalInFile: number;
  created: number;
  updated: number; // vinculadas a inscrição já existente (mapping criado)
  skipped: number;
  failed: number;
  eventResolved: number;
  eventNotFound: number;
  personResolved: number;
  personNotFound: number;
  duplicateSimple: number;
  duplicateConflict: number;
  alreadyImported: number;
  paymentDetected: number;
  paymentPreserved: number;
  warnings: number;
}

function clean(v?: string | null): string | null {
  const t = (v ?? "").toString().trim();
  return t.length > 0 ? t : null;
}
const keyOf = (r: ProverEventRegistration) => `${r.uuidEvento}:${r.uuidPessoa}`;

export async function runEventRegistrationsApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    registrations: ProverEventRegistration[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
  },
): Promise<EventRegistrationsApplyReport> {
  const { tenantId, fileName, sourceFileHash, actorUserId = null } = opts;
  const all = opts.registrations;

  // ── resolução em lote ──
  const findIn = async (externalType: string, ids: string[]) => {
    const out: { externalId: string; internalId: string }[] = [];
    const uniq = [...new Set(ids.filter(Boolean))];
    for (let i = 0; i < uniq.length; i += 5000) out.push(...(await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType, externalId: { in: uniq.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } })));
    return out;
  };
  const eventByUuid = new Map((await findIn("event", all.map((r) => r.uuidEvento))).map((m) => [m.externalId, m.internalId]));
  const personByUuid = new Map((await findIn("person", all.map((r) => r.uuidPessoa))).map((m) => [m.externalId, m.internalId]));

  // ── duplicidade (sobre TODO o conjunto): CONFLICT se dataInscricao divergente ──
  const dupDates = new Map<string, Set<string>>();
  for (const r of all) {
    if (!clean(r.uuidEvento) || !clean(r.uuidPessoa)) continue;
    const k = keyOf(r);
    if (!dupDates.has(k)) dupDates.set(k, new Set());
    dupDates.get(k)!.add(clean(r.dataInscricao) ?? "");
  }
  const conflictKeys = new Set([...dupDates].filter(([, dates]) => dates.size > 1).map(([k]) => k));

  const toProcess = opts.limit ? all.slice(0, opts.limit) : all;

  // ── existentes: mapping (idempotência) + EventRegistration (unique eventId,personId) ──
  const existingMaps = await findIn(META_TYPE, toProcess.map(keyOf));
  const mappingByKey = new Set(existingMaps.map((m) => m.externalId));
  const createdThisRun = new Set<string>();
  const regByPair = new Map<string, string>(); // eventId:personId → regId
  for (const rr of await prisma.eventRegistration.findMany({ where: { tenantId }, select: { id: true, eventId: true, personId: true } })) regByPair.set(`${rr.eventId}:${rr.personId}`, rr.id);

  const report: EventRegistrationsApplyReport = {
    batchId: "", read: toProcess.length, totalInFile: all.length, created: 0, updated: 0, skipped: 0, failed: 0,
    eventResolved: 0, eventNotFound: 0, personResolved: 0, personNotFound: 0, duplicateSimple: 0, duplicateConflict: 0,
    alreadyImported: 0, paymentDetected: 0, paymentPreserved: 0, warnings: 0,
  };

  const batch = await prisma.importBatch.create({ data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: toProcess.length } });
  report.batchId = batch.id;

  for (const r of toProcess) {
    try {
      await prisma.$transaction((tx) => processOne(tx, { tenantId, batchId: batch.id, actorUserId, r, eventByUuid, personByUuid, conflictKeys, mappingByKey, createdThisRun, regByPair, report }));
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({ data: { tenantId, batchId: batch.id, externalType: META_TYPE, externalId: keyOf(r), operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: "EventRegistration", rawJson: {} as object, errorsJson: [err instanceof Error ? err.message : "erro"], status: "FAILED", message: `[FAILED] ${err instanceof Error ? err.message : "erro"}` } });
    }
  }

  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", created: report.created, matched: report.updated + report.alreadyImported, skipped: report.skipped, failed: report.failed, warnings: report.warnings, conflicts: report.duplicateConflict, finishedAt: new Date() } });
  return report;
}

async function processOne(
  tx: Tx,
  ctx: {
    tenantId: string; batchId: string; actorUserId: string | null; r: ProverEventRegistration;
    eventByUuid: Map<string, string>; personByUuid: Map<string, string>; conflictKeys: Set<string>;
    mappingByKey: Set<string>; createdThisRun: Set<string>; regByPair: Map<string, string>; report: EventRegistrationsApplyReport;
  },
): Promise<void> {
  const { tenantId, batchId, actorUserId, r, eventByUuid, personByUuid, conflictKeys, mappingByKey, createdThisRun, regByPair, report } = ctx;
  const warns: string[] = [];
  let op: Op = "CREATE";
  let targetId: string | null = null;
  const key = keyOf(r);
  const eventId = clean(r.uuidEvento) ? eventByUuid.get(r.uuidEvento) ?? null : null;
  const personId = clean(r.uuidPessoa) ? personByUuid.get(r.uuidPessoa) ?? null : null;

  const hasPayment = !!(clean(r.valorTotal) || clean(r.lote) || clean(r.formaPagamento) || clean(r.valorLote));
  if (hasPayment) report.paymentDetected++;

  if (!clean(r.uuidEvento) || !clean(r.uuidPessoa)) { op = "FAILED"; report.failed++; }
  else if (!eventId) { warns.push("EVENT_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.eventNotFound++; report.warnings++; }
  else if (!personId) { warns.push("PERSON_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.personNotFound++; report.warnings++; }
  else if (conflictKeys.has(key)) { warns.push("EVENT_REGISTRATION_DUPLICATE_CONFLICT"); op = "SKIP"; report.skipped++; report.duplicateConflict++; report.warnings++; }
  else {
    report.eventResolved++; report.personResolved++;
    const pairKey = `${eventId}:${personId}`;
    if (mappingByKey.has(key)) {
      op = "SKIP"; report.skipped++; targetId = regByPair.get(pairKey) ?? null;
      if (createdThisRun.has(key)) { report.duplicateSimple++; warns.push("EVENT_REGISTRATION_DUPLICATE_SIMPLE"); }
      else { report.alreadyImported++; warns.push("ALREADY_IMPORTED"); }
    } else if (regByPair.has(pairKey)) {
      // inscrição já existe (seed/manual) sem mapping → vincula (não duplica)
      targetId = regByPair.get(pairKey)!;
      await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: META_TYPE, externalId: key, internalType: "EventRegistration", internalId: targetId } });
      mappingByKey.add(key);
      op = "UPDATE"; report.updated++; warns.push("EVENT_REGISTRATION_ALREADY_EXISTS");
    } else {
      const payment = hasPayment ? { lote: clean(r.lote), valorLote: clean(r.valorLote), valorDesconto: clean(r.valorDesconto), valorTotal: clean(r.valorTotal), formaPagamento: clean(r.formaPagamento), regraPagamento: clean(r.regraPagamento), regraPessoa: clean(r.regraPessoa) } : null;
      if (payment) { warns.push("PAYMENT_FIELDS_PRESERVED_AS_METADATA"); report.paymentPreserved++; }
      const created = await tx.eventRegistration.create({
        data: { tenantId, eventId, personId, status: "CONFIRMED", source: "PROVER", sourceRegisteredAt: parseProverDateTime(r.dataInscricao), sourcePaymentJson: (payment as Prisma.InputJsonValue) ?? Prisma.DbNull, metaJson: { idResumo: clean(r.idResumo) } as Prisma.InputJsonValue },
        select: { id: true },
      });
      targetId = created.id;
      regByPair.set(pairKey, created.id); mappingByKey.add(key); createdThisRun.add(key);
      await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: META_TYPE, externalId: key, internalType: "EventRegistration", internalId: created.id } });
      await tx.auditLog.create({ data: { tenantId, actorUserId, module: "events", action: "import_event_registration_create", entityType: "EventRegistration", entityId: created.id, sensitivity: "INTERNAL", reason: `Importação Prover (batch ${batchId})`, afterJson: { source: "PROVER", batchId, uuidEvento: r.uuidEvento, uuidPessoa: r.uuidPessoa, paymentPreserved: !!payment } as object } });
      op = "CREATE"; report.created++;
    }
  }

  await tx.importBatchItem.create({ data: {
    tenantId, batchId, externalType: META_TYPE, externalId: key, operation: op,
    matchStrategy: op === "CREATE" ? "COMPOSITE_KEY" : mappingByKey.has(key) ? "EXTERNAL_MAPPING" : "NONE",
    severity: op === "FAILED" ? "ERROR" : warns.includes("EVENT_REGISTRATION_DUPLICATE_CONFLICT") ? "CONFLICT" : warns.length ? "WARNING" : "INFO",
    targetType: "EventRegistration", targetId,
    normalizedJson: { uuidEvento: r.uuidEvento, uuidPessoa: r.uuidPessoa, eventId, personId, dataInscricao: r.dataInscricao } as object,
    warningsJson: { warnings: warns } as object, errorsJson: [], rawJson: {} as object,
    status: op === "CREATE" ? "CREATED" : op === "UPDATE" ? "MATCHED" : op === "FAILED" ? "FAILED" : "SKIPPED",
    message: `[${op}] event_registration event=${!!eventId} person=${!!personId} ${warns.join(",")}`,
  } });
}
