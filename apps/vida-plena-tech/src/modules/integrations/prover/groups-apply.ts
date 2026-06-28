import type { PrismaClient, Prisma } from "@prisma/client";
import type { ProverGroup, ProverGroupFunction } from "./types";
import { normalizeProverGroup, type NormalizedProverGroup } from "./normalize-group";
import { indexHierarchy, groupLeadershipEntries, collectPersonUuids, type RoleEntry } from "./groups-common";
import { inferUnitType, buildUnitName, functionCategoryToMemberRole, type UnitType, type MemberRole } from "./leadership";

// ─────────────────────────────────────────────────────────────────────────
// IMPORTADOR Prover — FASE 2B — APPLY CONTROLADO DE GRUPOS DE CRESCIMENTO
//
// Cria/atualiza GrowthGroup + LeadershipUnit (liderança/supervisão/coordenação)
// + LeadershipUnitMember + ExternalMapping(growth_group), com AuditLog. Resolve
// pessoas via ExternalMapping (Fase 1B). Idempotente. NUNCA: cria User,
// RoleAssignment, participantes, encontros, presenças, eventos, ensino; nem
// inventa pastor de área; nem escreve no Prover. Grupo sem líder → inativo + warning.
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Operation = "CREATE" | "UPDATE" | "SKIP" | "FAILED";

export interface GroupsApplyReport {
  batchId: string;
  fileName: string;
  totalRead: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  warnings: number;
  active: number;
  inactive: number;
  unknownStatus: number;
  groupsWithoutLeader: number;
  groupsWithoutSupervisor: number;
  groupsWithoutCoordinator: number;
  leadershipUnitsCreated: number;
  supervisionUnitsCreated: number;
  coordinationUnitsCreated: number;
  typeIndividual: number;
  typeDual: number;
  typeTeam: number;
  typeAbsent: number;
  areaPastorAvailable: boolean;
}

interface ResolvedMember {
  personId: string;
  role: MemberRole;
  name: string;
}

export async function runGroupsApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    grupos: ProverGroup[];
    funcoes: ProverGroupFunction[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
  },
): Promise<GroupsApplyReport> {
  const { tenantId, fileName, funcoes, sourceFileHash, actorUserId = null } = opts;
  const all = opts.limit ? opts.grupos.slice(0, opts.limit) : opts.grupos;
  const normalized = all.map(normalizeProverGroup);
  const { hier } = indexHierarchy(funcoes);
  const entriesByIndex = normalized.map((n) => groupLeadershipEntries(n, hier.get(n.externalId)));

  // resolve pessoas (uuid → personId) e nomes
  const uuids = collectPersonUuids(entriesByIndex);
  const personMappings = await prisma.externalMapping.findMany({
    where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: [...uuids] } },
    select: { externalId: true, internalId: true },
  });
  const personMap = new Map(personMappings.map((m) => [m.externalId, m.internalId]));
  const persons = await prisma.person.findMany({
    where: { tenantId, id: { in: [...new Set([...personMap.values()])] } },
    select: { id: true, fullName: true },
  });
  const nameMap = new Map(persons.map((p) => [p.id, p.fullName]));

  const groupMappings = await prisma.externalMapping.findMany({
    where: { tenantId, system: "PROVER", externalType: "growth_group", externalId: { in: normalized.map((g) => g.externalId).filter(Boolean) } },
    select: { externalId: true, internalId: true },
  });
  const groupMap = new Map(groupMappings.map((m) => [m.externalId, m.internalId]));

  const defaultCampus = await prisma.campus.findFirst({ where: { tenantId, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true } });

  const report: GroupsApplyReport = {
    batchId: "", fileName, totalRead: normalized.length,
    created: 0, updated: 0, skipped: 0, failed: 0, warnings: 0,
    active: 0, inactive: 0, unknownStatus: 0,
    groupsWithoutLeader: 0, groupsWithoutSupervisor: 0, groupsWithoutCoordinator: 0,
    leadershipUnitsCreated: 0, supervisionUnitsCreated: 0, coordinationUnitsCreated: 0,
    typeIndividual: 0, typeDual: 0, typeTeam: 0, typeAbsent: 0,
    areaPastorAvailable: false,
  };

  const batch = await prisma.importBatch.create({
    data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: normalized.length },
  });
  report.batchId = batch.id;

  // mapeia entradas → membros resolvidos (apenas pessoas MAPEADAS entram na unidade)
  const toMembers = (entries: RoleEntry[], warnings: string[]): ResolvedMember[] => {
    const seen = new Set<string>();
    const out: ResolvedMember[] = [];
    for (const e of entries) {
      if (seen.has(e.uuid)) continue;
      seen.add(e.uuid);
      const personId = personMap.get(e.uuid);
      if (!personId) { warnings.push("GROUP_FUNCTION_PERSON_NOT_MAPPED"); continue; }
      out.push({ personId, role: functionCategoryToMemberRole(e.category), name: nameMap.get(personId) ?? "" });
    }
    return out;
  };

  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    const raw = all[i];
    const entries = entriesByIndex[i];

    // contadores de status/tipo (independem da escrita)
    if (n.status === "ACTIVE") report.active++;
    else if (n.status === "INACTIVE") report.inactive++;
    else report.unknownStatus++;

    try {
      const outcome = await prisma.$transaction((tx) =>
        processGroup(tx, { tenantId, batchId: batch.id, actorUserId, n, raw, entries, groupMap, defaultCampusId: defaultCampus?.id ?? null, toMembers }),
      );
      if (outcome.op === "CREATE") report.created++;
      else if (outcome.op === "UPDATE") report.updated++;
      else if (outcome.op === "SKIP") report.skipped++;
      if (outcome.severity === "WARNING") report.warnings++;
      if (outcome.noLeader) report.groupsWithoutLeader++;
      if (outcome.noSupervisor) report.groupsWithoutSupervisor++;
      if (outcome.noCoordinator) report.groupsWithoutCoordinator++;
      report.leadershipUnitsCreated += outcome.leadershipUnitCreated ? 1 : 0;
      report.supervisionUnitsCreated += outcome.supervisionUnitCreated ? 1 : 0;
      report.coordinationUnitsCreated += outcome.coordinationUnitCreated ? 1 : 0;
      if (outcome.unitType === "INDIVIDUAL") report.typeIndividual++;
      else if (outcome.unitType === "DUAL") report.typeDual++;
      else if (outcome.unitType === "TEAM") report.typeTeam++;
      else report.typeAbsent++;
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({
        data: {
          tenantId, batchId: batch.id, externalType: "growth_group", externalId: n.externalId || `NO_ID:${i}`,
          operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", rawJson: raw as object,
          errorsJson: [err instanceof Error ? err.message : "erro desconhecido"], status: "FAILED",
          message: `[FAILED] ${err instanceof Error ? err.message : "erro"}`,
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "COMPLETED", created: report.created, matched: report.updated, skipped: report.skipped, failed: report.failed, warnings: report.warnings, conflicts: 0, finishedAt: new Date() },
  });

  return report;
}

interface Outcome {
  op: Operation;
  severity: "INFO" | "WARNING" | "ERROR";
  noLeader: boolean;
  noSupervisor: boolean;
  noCoordinator: boolean;
  leadershipUnitCreated: boolean;
  supervisionUnitCreated: boolean;
  coordinationUnitCreated: boolean;
  unitType: UnitType | "ABSENT";
}

async function processGroup(
  tx: Tx,
  ctx: {
    tenantId: string; batchId: string; actorUserId: string | null;
    n: NormalizedProverGroup; raw: ProverGroup; entries: ReturnType<typeof groupLeadershipEntries>;
    groupMap: Map<string, string>; defaultCampusId: string | null;
    toMembers: (entries: RoleEntry[], warnings: string[]) => ResolvedMember[];
  },
): Promise<Outcome> {
  const { tenantId, batchId, actorUserId, n, raw, entries, groupMap, defaultCampusId, toMembers } = ctx;
  const warnings: string[] = [...n.warnings.filter((w) => w !== "LEADERSHIP_ABSENT")];
  const errors: string[] = [];

  if (!n.externalId) errors.push("grupo sem grupo_id.");
  if (!n.name) errors.push("grupo sem grupo_nome.");

  if (errors.length > 0) {
    await tx.importBatchItem.create({
      data: {
        tenantId, batchId, externalType: "growth_group", externalId: n.externalId || "NO_ID",
        operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: "GrowthGroup",
        rawJson: raw as object, errorsJson: errors, status: "FAILED",
        message: `[FAILED] ${errors.join(" ")}`,
      },
    });
    return { op: "FAILED", severity: "ERROR", noLeader: true, noSupervisor: true, noCoordinator: true, leadershipUnitCreated: false, supervisionUnitCreated: false, coordinationUnitCreated: false, unitType: "ABSENT" };
  }

  const leaderMembers = toMembers(entries.leaders, warnings);
  const supervisorMembers = toMembers(entries.supervisors, warnings);
  const coordinatorMembers = toMembers(entries.coordinators, warnings);

  const noLeader = leaderMembers.length === 0;
  const noSupervisor = supervisorMembers.length === 0;
  const noCoordinator = coordinatorMembers.length === 0;
  if (noLeader) warnings.push("GROUP_LEADER_MISSING");
  if (noSupervisor) warnings.push("GROUP_SUPERVISOR_MISSING");
  if (noCoordinator) warnings.push("GROUP_COORDINATOR_MISSING");
  warnings.push("AREA_PASTOR_NOT_AVAILABLE_IN_GROUP_EXPORT");

  // status do grupo: ativo só se status confiável ATIVO e tiver líder
  const active = n.status === "ACTIVE" && !noLeader;

  // legado: leaderId = Líder 1, assistantId = Líder 2 (somente pessoas mapeadas)
  const leader1 = leaderMembers.find((m) => m.role === "PRIMARY") ?? leaderMembers[0] ?? null;
  const leader2 = leaderMembers.find((m) => m.role === "SECONDARY") ?? (leaderMembers[1] ?? null);

  const isUpdate = groupMap.has(n.externalId);
  let groupId = groupMap.get(n.externalId) ?? null;

  // unidades existentes (em UPDATE, reaproveita as do grupo)
  let existing: { leadershipUnitId: string | null; supervisionUnitId: string | null; coordinationUnitId: string | null } | null = null;
  if (isUpdate && groupId) {
    existing = await tx.growthGroup.findUnique({ where: { id: groupId }, select: { leadershipUnitId: true, supervisionUnitId: true, coordinationUnitId: true } });
  }

  const lead = await ensureUnit(tx, tenantId, actorUserId, batchId, existing?.leadershipUnitId ?? null, n.name, leaderMembers, "leadership");
  const sup = await ensureUnit(tx, tenantId, actorUserId, batchId, existing?.supervisionUnitId ?? null, `Supervisão · ${n.name}`, supervisorMembers, "supervision");
  const coord = await ensureUnit(tx, tenantId, actorUserId, batchId, existing?.coordinationUnitId ?? null, `Coordenação · ${n.name}`, coordinatorMembers, "coordination");

  const groupData = {
    name: n.name,
    active,
    location: n.location,
    campusId: defaultCampusId,
    // legado (compatibilidade): Líder 1 / Líder 2 como Person; supervisor/coord
    // legados ficam null (são membershipId; importados não têm membership/User).
    leaderId: leader1?.personId ?? null,
    assistantId: leader2?.personId ?? null,
    supervisorId: null,
    coordinatorId: null,
    areaPastorId: null,
    // novas unidades
    leadershipUnitId: lead.unitId,
    supervisionUnitId: sup.unitId,
    coordinationUnitId: coord.unitId,
    areaPastorUnitId: null,
  };

  let op: Operation;
  if (isUpdate && groupId) {
    await tx.growthGroup.update({ where: { id: groupId }, data: groupData });
    op = "UPDATE";
    await writeGroupAudit(tx, { tenantId, actorUserId, groupId, action: "import_update", batchId });
  } else {
    const created = await tx.growthGroup.create({ data: { tenantId, ...groupData } });
    groupId = created.id;
    await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: "growth_group", externalId: n.externalId, internalType: "GrowthGroup", internalId: groupId } });
    op = "CREATE";
    await writeGroupAudit(tx, { tenantId, actorUserId, groupId, action: "import_create", batchId });
    await emitGroupEvent(tx, { tenantId, groupId, eventType: "gc.imported" });
  }

  const unitType: UnitType | "ABSENT" = leaderMembers.length === 0 ? "ABSENT" : inferUnitType(leaderMembers.length);
  const severity = warnings.length > 0 ? "WARNING" : "INFO";

  await tx.importBatchItem.create({
    data: {
      tenantId, batchId, externalType: "growth_group", externalId: n.externalId,
      operation: op, matchStrategy: isUpdate ? "EXTERNAL_MAPPING" : "NONE", severity,
      targetType: "GrowthGroup", targetId: groupId,
      normalizedJson: { group: n, leaderMembers, supervisorMembers, coordinatorMembers, unitType, active } as object,
      warningsJson: { warnings } as object,
      errorsJson: [],
      rawJson: raw as object,
      status: op === "CREATE" ? "CREATED" : "MATCHED",
      message: `[${op}] status=${n.status} active=${active} type=${unitType} leader=${leaderMembers.length} sev=${severity}`,
    },
  });

  return {
    op, severity, noLeader, noSupervisor, noCoordinator,
    leadershipUnitCreated: lead.created, supervisionUnitCreated: sup.created, coordinationUnitCreated: coord.created,
    unitType,
  };
}

/** Cria ou atualiza uma unidade + membros (idempotente). Sem membros → null. */
async function ensureUnit(
  tx: Tx, tenantId: string, actorUserId: string | null, batchId: string,
  existingUnitId: string | null, baseName: string, members: ResolvedMember[],
  kind: "leadership" | "supervision" | "coordination",
): Promise<{ unitId: string | null; created: boolean }> {
  if (members.length === 0) return { unitId: null, created: false };
  const type = inferUnitType(members.length);
  const name =
    members.length <= 2 ? buildUnitName(members.map((m) => m.name)) : `Equipe ${baseName.trim()}`;

  let unitId = existingUnitId;
  let created = false;
  if (unitId) {
    await tx.leadershipUnit.update({ where: { id: unitId }, data: { name, type } });
    await tx.leadershipUnitMember.deleteMany({ where: { leadershipUnitId: unitId } });
    await writeUnitAudit(tx, { tenantId, actorUserId, unitId, action: "import_update", batchId });
  } else {
    const u = await tx.leadershipUnit.create({ data: { tenantId, name, type } });
    unitId = u.id;
    created = true;
    await writeUnitAudit(tx, { tenantId, actorUserId, unitId, action: "import_create", batchId });
    await emitUnitEvent(tx, { tenantId, unitId });
  }
  for (const m of members) {
    await tx.leadershipUnitMember.create({ data: { tenantId, leadershipUnitId: unitId, personId: m.personId, role: m.role } });
  }
  return { unitId, created };
}

async function writeGroupAudit(tx: Tx, a: { tenantId: string; actorUserId: string | null; groupId: string; action: string; batchId: string }) {
  await tx.auditLog.create({
    data: { tenantId: a.tenantId, actorUserId: a.actorUserId, module: "groups", action: a.action, entityType: "GrowthGroup", entityId: a.groupId, sensitivity: "INTERNAL", reason: `Importação Prover (batch ${a.batchId})`, afterJson: { source: "PROVER", batchId: a.batchId } },
  });
}
async function writeUnitAudit(tx: Tx, a: { tenantId: string; actorUserId: string | null; unitId: string; action: string; batchId: string }) {
  await tx.auditLog.create({
    data: { tenantId: a.tenantId, actorUserId: a.actorUserId, module: "leadership", action: a.action, entityType: "LeadershipUnit", entityId: a.unitId, sensitivity: "INTERNAL", reason: `Importação Prover (batch ${a.batchId})`, afterJson: { source: "PROVER", batchId: a.batchId } },
  });
}
async function emitGroupEvent(tx: Tx, e: { tenantId: string; groupId: string; eventType: string }) {
  const payload = { groupId: e.groupId };
  await tx.domainEvent.create({ data: { tenantId: e.tenantId, eventType: e.eventType, aggregateType: "GrowthGroup", aggregateId: e.groupId, payloadJson: payload } });
  await tx.domainEventOutbox.create({ data: { tenantId: e.tenantId, eventType: e.eventType, aggregateType: "GrowthGroup", aggregateId: e.groupId, payloadJson: payload } });
}
async function emitUnitEvent(tx: Tx, e: { tenantId: string; unitId: string }) {
  const payload = { leadershipUnitId: e.unitId };
  await tx.domainEvent.create({ data: { tenantId: e.tenantId, eventType: "leadership_unit.imported", aggregateType: "LeadershipUnit", aggregateId: e.unitId, payloadJson: payload } });
  await tx.domainEventOutbox.create({ data: { tenantId: e.tenantId, eventType: "leadership_unit.imported", aggregateType: "LeadershipUnit", aggregateId: e.unitId, payloadJson: payload } });
}
