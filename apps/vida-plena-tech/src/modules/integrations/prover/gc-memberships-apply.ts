import type { PrismaClient, Prisma } from "@prisma/client";
import type { ProverGcParticipant, ProverGcVisitor } from "./types";
import { normalizeGcParticipant, normalizeGcVisitor, type NormalizedGcLink } from "./normalize-gc-membership";

// ─────────────────────────────────────────────────────────────────────────
// IMPORTADOR Prover — FASE 3B — APPLY CONSERVADOR de VÍNCULOS pessoa↔GC
//
// Cria GrowthGroupMembership SOMENTE para vínculos seguros. Conflitos são
// PULADOS (SKIP), nunca resolvidos automaticamente. NUNCA: promove a MEMBER,
// altera status de pessoa, cria User/RoleAssignment, importa encontros/
// presenças/eventos/ensino. Visitante vira membership origem VISITOR (não é
// membro oficial). Idempotente via ExternalMapping (chave group:person:source).
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Operation = "CREATE" | "UPDATE" | "SKIP" | "FAILED";
type Source = "PARTICIPANT" | "VISITOR";

export interface GcMembershipsApplyReport {
  batchId: string;
  fileName: string;
  totalLinks: number; // processados (após --limit)
  totalParticipants: number;
  totalVisitors: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  activeCreated: number;
  historicalCreated: number;
  visitorCreated: number;
  participantCreated: number;
  personMappingNotFound: number;
  growthGroupMappingNotFound: number;
  multipleActiveGcsSkipped: number;
  duplicateConflictSkipped: number;
  duplicateSimpleConsolidated: number;
  dateInconsistencySkipped: number;
  alreadyImported: number;
  warnings: number;
}

const MEMBERSHIP_EXTERNAL_TYPE = "growth_group_membership";
const membershipKey = (groupExternalId: string, personUuid: string, source: Source) =>
  `${groupExternalId}:${personUuid}:${source}`;

/** Aceita yyyy-mm-dd, dd/mm/yyyy ou ISO. valid=false sinaliza data inconsistente. */
function parseProverDate(s: string | null): { date: Date | null; valid: boolean } {
  if (!s) return { date: null, valid: true }; // ausente é válido (ativo/desconhecido)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let date: Date | null = null;
  if (iso) date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`);
  else {
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) date = new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00.000Z`);
  }
  if (!date || isNaN(date.getTime())) return { date: null, valid: false };
  return { date, valid: true };
}

const sameDate = (a: Date | null, b: Date | null) =>
  (a == null && b == null) || (!!a && !!b && a.getTime() === b.getTime());

export async function runGcMembershipsApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    participantes: ProverGcParticipant[];
    visitantes: ProverGcVisitor[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
  },
): Promise<GcMembershipsApplyReport> {
  const { tenantId, fileName, participantes, visitantes, sourceFileHash, actorUserId = null } = opts;

  // links normalizados (full — conflitos são detectados sobre TODO o conjunto)
  const allLinks: NormalizedGcLink[] = [
    ...participantes.map(normalizeGcParticipant),
    ...visitantes.map(normalizeGcVisitor),
  ];

  const personUuids = new Set(allLinks.map((l) => l.personUuid).filter(Boolean));
  const groupIds = new Set(allLinks.map((l) => l.groupExternalId).filter(Boolean));
  const [personMaps, groupMaps, membershipMaps] = await Promise.all([
    prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: [...personUuids] } }, select: { externalId: true, internalId: true } }),
    prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: "growth_group", externalId: { in: [...groupIds] } }, select: { externalId: true, internalId: true } }),
    prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: MEMBERSHIP_EXTERNAL_TYPE }, select: { externalId: true, internalId: true } }),
  ]);
  const personMap = new Map(personMaps.map((m) => [m.externalId, m.internalId]));
  const groupMap = new Map(groupMaps.map((m) => [m.externalId, m.internalId]));
  const mappingByKey = new Map(membershipMaps.map((m) => [m.externalId, m.internalId])); // membership já importado

  const resolved = allLinks.map((norm) => ({
    norm,
    personId: norm.personUuid ? personMap.get(norm.personUuid) ?? null : null,
    gcId: norm.groupExternalId ? groupMap.get(norm.groupExternalId) ?? null : null,
  }));

  // múltiplos GCs ativos (só PARTICIPANT, ambos resolvidos) — igual ao dry-run
  const activeByPerson = new Map<string, Set<string>>();
  for (const r of resolved) {
    if (r.personId && r.gcId && r.norm.active && r.norm.source === "PARTICIPANT") {
      if (!activeByPerson.has(r.personId)) activeByPerson.set(r.personId, new Set());
      activeByPerson.get(r.personId)!.add(r.gcId);
    }
  }
  const multiActive = new Set([...activeByPerson].filter(([, s]) => s.size > 1).map(([p]) => p));

  // duplicidade (mesma pessoa + GC + source): SIMPLE (datas iguais) ou CONFLICT (divergentes)
  const dupGroups = new Map<string, typeof resolved>();
  for (const r of resolved) {
    if (!r.personId || !r.gcId) continue;
    const k = `${r.personId}:${r.gcId}:${r.norm.source}`;
    if (!dupGroups.has(k)) dupGroups.set(k, []);
    dupGroups.get(k)!.push(r);
  }
  const dupKeyType = new Map<string, "SIMPLE" | "CONFLICT">();
  for (const [k, arr] of dupGroups) {
    if (arr.length <= 1) continue;
    const f = arr[0].norm;
    const allSame = arr.every((x) => x.norm.joinedAt === f.joinedAt && x.norm.leftAt === f.leftAt);
    dupKeyType.set(k, allSame ? "SIMPLE" : "CONFLICT");
  }

  // aplica somente os primeiros `limit` vínculos (conflitos já calculados sobre o full)
  const toProcess = opts.limit ? resolved.slice(0, opts.limit) : resolved;

  const report: GcMembershipsApplyReport = {
    batchId: "", fileName,
    totalLinks: toProcess.length,
    totalParticipants: participantes.length, totalVisitors: visitantes.length,
    created: 0, updated: 0, skipped: 0, failed: 0,
    activeCreated: 0, historicalCreated: 0, visitorCreated: 0, participantCreated: 0,
    personMappingNotFound: 0, growthGroupMappingNotFound: 0,
    multipleActiveGcsSkipped: 0, duplicateConflictSkipped: 0, duplicateSimpleConsolidated: 0,
    dateInconsistencySkipped: 0, alreadyImported: 0, warnings: 0,
  };

  const batch = await prisma.importBatch.create({
    data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: toProcess.length },
  });
  report.batchId = batch.id;

  for (const r of toProcess) {
    const n = r.norm;
    try {
      await prisma.$transaction((tx) =>
        processOne(tx, { tenantId, batchId: batch.id, actorUserId, r, multiActive, dupKeyType, mappingByKey, report }),
      );
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({
        data: {
          tenantId, batchId: batch.id, externalType: MEMBERSHIP_EXTERNAL_TYPE,
          externalId: membershipKey(n.groupExternalId, n.personUuid, n.source),
          operation: "FAILED", matchStrategy: "NONE", severity: "ERROR",
          targetType: "GrowthGroupMembership", rawJson: n as object,
          errorsJson: [err instanceof Error ? err.message : "erro desconhecido"],
          status: "FAILED", message: `[FAILED] ${err instanceof Error ? err.message : "erro"}`,
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMPLETED", created: report.created, matched: report.updated,
      skipped: report.skipped, failed: report.failed, warnings: report.warnings,
      conflicts: report.multipleActiveGcsSkipped + report.duplicateConflictSkipped, finishedAt: new Date(),
    },
  });

  return report;
}

async function processOne(
  tx: Tx,
  ctx: {
    tenantId: string;
    batchId: string;
    actorUserId: string | null;
    r: { norm: NormalizedGcLink; personId: string | null; gcId: string | null };
    multiActive: Set<string>;
    dupKeyType: Map<string, "SIMPLE" | "CONFLICT">;
    mappingByKey: Map<string, string>;
    report: GcMembershipsApplyReport;
  },
): Promise<void> {
  const { tenantId, batchId, actorUserId, r, multiActive, dupKeyType, mappingByKey, report } = ctx;
  const n = r.norm;
  const source = n.source as Source;
  const warnings: string[] = [];
  const errors: string[] = [];
  let op: Operation = "CREATE";
  let matchStrategy: "EXTERNAL_MAPPING" | "COMPOSITE_KEY" | "NONE" = "NONE";
  let coarse: "CREATED" | "MATCHED" | "SKIPPED" | "FAILED" = "SKIPPED";
  let targetId: string | null = null;

  const key = membershipKey(n.groupExternalId, n.personUuid, source);

  if (!n.groupExternalId || !n.personUuid) {
    errors.push("vínculo sem grupo_id ou pessoa_uuid.");
    op = "FAILED"; coarse = "FAILED"; report.failed++;
  } else if (!r.personId) {
    warnings.push("PERSON_MAPPING_NOT_FOUND");
    op = "SKIP"; report.skipped++; report.personMappingNotFound++;
  } else if (!r.gcId) {
    warnings.push("GROWTH_GROUP_MAPPING_NOT_FOUND");
    op = "SKIP"; report.skipped++; report.growthGroupMappingNotFound++;
  } else {
    const dt = dupKeyType.get(`${r.personId}:${r.gcId}:${source}`);
    const jt = parseProverDate(n.joinedAt);
    const lt = parseProverDate(n.leftAt);
    const dateBad = !jt.valid || !lt.valid || (!!jt.date && !!lt.date && lt.date.getTime() < jt.date.getTime());

    if (dt === "CONFLICT") {
      warnings.push("DUPLICATE_MEMBERSHIP_CONFLICT");
      op = "SKIP"; report.skipped++; report.duplicateConflictSkipped++;
    } else if (multiActive.has(r.personId) && n.active && source === "PARTICIPANT") {
      warnings.push("MULTIPLE_ACTIVE_GCS");
      op = "SKIP"; report.skipped++; report.multipleActiveGcsSkipped++;
    } else if (dateBad) {
      warnings.push("DATE_INCONSISTENCY");
      op = "SKIP"; report.skipped++; report.dateInconsistencySkipped++;
    } else {
      const existingId = mappingByKey.get(key);
      if (existingId) {
        // já importado: consolidação de duplicidade simples OU 2ª execução (idempotência)
        const membership = await tx.growthGroupMembership.findUnique({ where: { id: existingId }, select: { id: true, leftAt: true } });
        targetId = existingId;
        matchStrategy = "EXTERNAL_MAPPING";
        if (membership && !sameDate(membership.leftAt, lt.date)) {
          // update conservador: só a data de saída (encerramento/reabertura registrada na origem)
          await tx.growthGroupMembership.update({ where: { id: existingId }, data: { leftAt: lt.date } });
          op = "UPDATE"; coarse = "MATCHED"; report.updated++;
          await writeAudit(tx, { tenantId, actorUserId, membershipId: existingId, action: "import_membership_update", batchId, source });
        } else {
          op = "SKIP"; report.skipped++;
          if (dt === "SIMPLE") { warnings.push("DUPLICATE_MEMBERSHIP_SIMPLE"); report.duplicateSimpleConsolidated++; }
          else { warnings.push("ALREADY_IMPORTED"); report.alreadyImported++; }
        }
      } else {
        // CREATE vínculo seguro
        const created = await tx.growthGroupMembership.create({
          data: {
            tenantId, gcId: r.gcId, personId: r.personId,
            joinedAt: jt.date ?? new Date(),
            leftAt: lt.date,
            source: source === "VISITOR" ? "VISITOR" : "PARTICIPANT",
            reason: `Importado do Prover (batch ${batchId})`,
          },
          select: { id: true },
        });
        targetId = created.id;
        mappingByKey.set(key, created.id);
        await tx.externalMapping.create({
          data: { tenantId, system: "PROVER", externalType: "growth_group_membership", externalId: key, internalType: "GrowthGroupMembership", internalId: created.id },
        });
        await writeAudit(tx, { tenantId, actorUserId, membershipId: created.id, action: "import_membership_create", batchId, source });
        op = "CREATE"; matchStrategy = "COMPOSITE_KEY"; coarse = "CREATED"; report.created++;
        if (n.active) report.activeCreated++; else report.historicalCreated++;
        if (source === "VISITOR") report.visitorCreated++; else report.participantCreated++;
      }
    }
  }

  const isConflict = warnings.includes("MULTIPLE_ACTIVE_GCS") || warnings.includes("DUPLICATE_MEMBERSHIP_CONFLICT");
  const severity = op === "FAILED" ? "ERROR" : isConflict ? "CONFLICT" : warnings.length > 0 ? "WARNING" : "INFO";
  if (severity === "WARNING") report.warnings++;

  await tx.importBatchItem.create({
    data: {
      tenantId, batchId, externalType: "growth_group_membership", externalId: key,
      operation: op, matchStrategy, severity,
      targetType: "GrowthGroupMembership", targetId,
      normalizedJson: { ...n, personId: r.personId, growthGroupId: r.gcId } as object,
      warningsJson: { warnings } as object,
      errorsJson: errors,
      rawJson: n as object,
      status: coarse,
      message: `[${op}] src=${n.source} active=${n.active} sev=${severity} ${warnings.join(",")}`,
    },
  });
}

async function writeAudit(
  tx: Tx,
  a: { tenantId: string; actorUserId: string | null; membershipId: string; action: string; batchId: string; source: Source },
) {
  await tx.auditLog.create({
    data: {
      tenantId: a.tenantId,
      actorUserId: a.actorUserId, // null = sistema/importador (nunca cria login)
      module: "groups",
      action: a.action,
      entityType: "GrowthGroupMembership",
      entityId: a.membershipId,
      sensitivity: "INTERNAL",
      reason: `Importação Prover (batch ${a.batchId})`,
      afterJson: { source: "PROVER", batchId: a.batchId, membershipSource: a.source },
    },
  });
}
