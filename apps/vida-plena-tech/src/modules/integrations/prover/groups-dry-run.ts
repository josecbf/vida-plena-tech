import type { PrismaClient } from "@prisma/client";
import type { ProverGroup, ProverGroupFunction } from "./types";
import {
  normalizeProverGroup,
  normalizeGroupFunction,
  suggestLeadership,
  isLeaderCategory,
  type NormalizedProverGroup,
  type LeadershipSuggestion,
  type GroupFunctionCategory,
} from "./normalize-group";
import { buildProposedUnit } from "./leadership";

// ─────────────────────────────────────────────────────────────────────────
// IMPORTADOR Prover — FASE 2A.1 — GRUPOS (dry-run ENRIQUECIDO com hierarquia)
//
// Cruza `grupos.json` com `hierarquia_grupo_funcao.json` para validar a cadeia
// de liderança ANTES do apply. NÃO cria GrowthGroup/RoleAssignment/User/
// LeadershipUnit. Liderança dupla/equipe = SUGESTÃO. Pastor de área NÃO é
// inventado (não há função equivalente no export). Prover só leitura.
// ─────────────────────────────────────────────────────────────────────────

type Operation = "WOULD_CREATE" | "MATCHED" | "FAILED";

export interface GroupsDryRunReport {
  batchId: string;
  fileName: string;
  totalGroups: number;
  hierarchyLinesRead: number;
  hierarchyActive: number;
  hierarchyRemoved: number;
  wouldCreate: number;
  matchedByExternalMapping: number;
  failed: number;
  warnings: number;
  active: number;
  inactive: number;
  unknownStatus: number;
  consistentGroups: number;
  divergentGroups: number;
  groupsWithoutLeader: number;
  groupsWithoutSupervisor: number;
  groupsWithoutCoordinator: number;
  unknownFunctionRows: number;
  personsNotMapped: number; // pessoas distintas (hierarquia ativa) sem ExternalMapping
  suggestionIndividual: number;
  suggestionDual: number;
  suggestionTeam: number;
  suggestionAbsent: number;
  areaPastorAvailable: boolean;
  readyForApply: boolean;
  recommendation: string;
}

interface HierGroup {
  byCategory: Map<GroupFunctionCategory, string[]>; // category → person uuids (ativos)
  activePersons: Set<string>;
  removedCount: number;
  hasUnknown: boolean;
}

export async function runGroupsDryRun(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    grupos: ProverGroup[];
    funcoes: ProverGroupFunction[];
    sourceFileHash?: string;
  },
): Promise<GroupsDryRunReport> {
  const { tenantId, fileName, grupos, funcoes, sourceFileHash } = opts;
  const normalized = grupos.map(normalizeProverGroup);

  // ── indexa a hierarquia por grupo_id ──
  const hier = new Map<string, HierGroup>();
  let hierActive = 0;
  let hierRemoved = 0;
  for (const f of funcoes) {
    const gid = (f.grupo_id ?? "").toString().trim();
    if (!gid) continue;
    let h = hier.get(gid);
    if (!h) {
      h = { byCategory: new Map(), activePersons: new Set(), removedCount: 0, hasUnknown: false };
      hier.set(gid, h);
    }
    if ((f.removido ?? "0").toString().trim() === "1") {
      h.removedCount++;
      hierRemoved++;
      continue;
    }
    hierActive++;
    const cat = normalizeGroupFunction(f.funcao);
    if (cat === "UNKNOWN") h.hasUnknown = true;
    const uuid = (f.pessoa_uuid ?? "").toString().trim();
    if (!uuid) continue;
    if (!h.byCategory.has(cat)) h.byCategory.set(cat, []);
    h.byCategory.get(cat)!.push(uuid);
    h.activePersons.add(uuid);
  }

  // ── resolve TODAS as pessoas (grupos.json + hierarquia ativa) via ExternalMapping ──
  const personUuids = new Set<string>();
  for (const g of normalized) {
    for (const u of [g.leaderUuid, g.leader2Uuid, g.leaderInTrainingUuid, g.supervisorUuid, g.supervisor2Uuid, g.coordinatorUuid, g.coordinator2Uuid]) {
      if (u) personUuids.add(u);
    }
  }
  for (const h of hier.values()) for (const u of h.activePersons) personUuids.add(u);

  const personMappings = await prisma.externalMapping.findMany({
    where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: [...personUuids] } },
    select: { externalId: true, internalId: true },
  });
  const personMap = new Map(personMappings.map((m) => [m.externalId, m.internalId]));

  const groupMappings = await prisma.externalMapping.findMany({
    where: { tenantId, system: "PROVER", externalType: "growth_group", externalId: { in: normalized.map((g) => g.externalId).filter(Boolean) } },
    select: { externalId: true, internalId: true },
  });
  const groupMap = new Map(groupMappings.map((m) => [m.externalId, m.internalId]));

  const resolve = (uuid: string | null) => ({
    uuid,
    present: !!uuid,
    mapped: !!uuid && personMap.has(uuid),
    personId: uuid ? personMap.get(uuid) ?? null : null,
  });

  // pessoa de área? nenhuma função do export equivale a pastor de área
  const areaPastorAvailable = false;
  const notMappedPersons = new Set<string>();

  const report: GroupsDryRunReport = {
    batchId: "", fileName, totalGroups: normalized.length,
    hierarchyLinesRead: funcoes.length, hierarchyActive: hierActive, hierarchyRemoved: hierRemoved,
    wouldCreate: 0, matchedByExternalMapping: 0, failed: 0, warnings: 0,
    active: 0, inactive: 0, unknownStatus: 0,
    consistentGroups: 0, divergentGroups: 0,
    groupsWithoutLeader: 0, groupsWithoutSupervisor: 0, groupsWithoutCoordinator: 0,
    unknownFunctionRows: 0, personsNotMapped: 0,
    suggestionIndividual: 0, suggestionDual: 0, suggestionTeam: 0, suggestionAbsent: 0,
    areaPastorAvailable,
    readyForApply: false, recommendation: "",
  };

  const batch = await prisma.importBatch.create({
    data: { tenantId, mode: "DRY_RUN", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: normalized.length },
  });
  report.batchId = batch.id;

  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    const raw = grupos[i];
    try {
      if (n.status === "ACTIVE") report.active++;
      else if (n.status === "INACTIVE") report.inactive++;
      else report.unknownStatus++;

      const h = hier.get(n.externalId);
      const hierCat = (c: GroupFunctionCategory) => h?.byCategory.get(c) ?? [];

      // líderes combinados (grupos.json + hierarquia ativa)
      const leadersJson = [n.leaderUuid, n.leader2Uuid, n.leaderInTrainingUuid].filter(Boolean) as string[];
      const leadersHier: string[] = [];
      if (h) for (const [cat, uuids] of h.byCategory) if (isLeaderCategory(cat)) leadersHier.push(...uuids);
      const combinedLeaders = new Set([...leadersJson, ...leadersHier]);
      const suggestion: LeadershipSuggestion = suggestLeadership(combinedLeaders.size);
      if (suggestion === "INDIVIDUAL") report.suggestionIndividual++;
      else if (suggestion === "DUAL") report.suggestionDual++;
      else if (suggestion === "TEAM") report.suggestionTeam++;
      else report.suggestionAbsent++;

      const supervisorsHier = [...hierCat("SUPERVISOR_PRIMARY"), ...hierCat("SUPERVISOR_SECONDARY")];
      const coordinatorsHier = [...hierCat("COORDINATOR_PRIMARY"), ...hierCat("COORDINATOR_SECONDARY")];
      const hasSupervisor = supervisorsHier.length > 0 || !!n.supervisorUuid;
      const hasCoordinator = coordinatorsHier.length > 0 || !!n.coordinatorUuid;

      // ── warnings estruturados ──
      const w: string[] = [...n.warnings.filter((x) => x !== "LEADERSHIP_ABSENT")];
      if (combinedLeaders.size === 0) { report.groupsWithoutLeader++; w.push("GROUP_LEADER_MISSING"); }
      if (!hasSupervisor) { report.groupsWithoutSupervisor++; w.push("GROUP_SUPERVISOR_MISSING"); }
      if (!hasCoordinator) { report.groupsWithoutCoordinator++; w.push("GROUP_COORDINATOR_MISSING"); }
      if (h?.removedCount) w.push("GROUP_FUNCTION_REMOVED");
      if (h?.hasUnknown) { report.unknownFunctionRows++; w.push("UNKNOWN_GROUP_FUNCTION"); }

      // divergência: líder primário do grupos.json não bate com o da hierarquia
      const hierPrimary = hierCat("LEADER_PRIMARY");
      let divergent = false;
      if (n.leaderUuid && hierPrimary.length > 0 && !hierPrimary.includes(n.leaderUuid)) {
        divergent = true;
        w.push("GROUP_FUNCTION_MISMATCH");
      }
      if (divergent) report.divergentGroups++;
      else report.consistentGroups++;

      // pessoas de função (hierarquia ativa) não mapeadas
      let anyPersonNotMapped = false;
      if (h) for (const u of h.activePersons) {
        if (!personMap.has(u)) { notMappedPersons.add(u); anyPersonNotMapped = true; }
      }
      if (anyPersonNotMapped) w.push("GROUP_FUNCTION_PERSON_NOT_MAPPED");

      // pessoas repetidas em funções diferentes (informativo)
      const personFnCount = new Map<string, number>();
      if (h) for (const [, uuids] of h.byCategory) for (const u of uuids) personFnCount.set(u, (personFnCount.get(u) ?? 0) + 1);
      const personsInMultipleFunctions = [...personFnCount.entries()].filter(([, c]) => c > 1).map(([u]) => u);

      // ── PROPOSTA de unidades de liderança (dry-run, NÃO cria nada) ──
      const resolveFn = (uuid: string) => personMap.get(uuid) ?? null;
      const entriesFor = (
        cats: GroupFunctionCategory[],
        fallback: { uuid: string | null; category: GroupFunctionCategory }[],
      ): { uuid: string; category: GroupFunctionCategory }[] => {
        const out: { uuid: string; category: GroupFunctionCategory }[] = [];
        let any = false;
        if (h) for (const c of cats) for (const u of h.byCategory.get(c) ?? []) { out.push({ uuid: u, category: c }); any = true; }
        if (!any) for (const f of fallback) if (f.uuid) out.push({ uuid: f.uuid, category: f.category });
        return out;
      };
      const proposedLeadershipUnit = buildProposedUnit(n.name, entriesFor(
        ["LEADER_PRIMARY", "LEADER_SECONDARY", "LEADER_IN_TRAINING"],
        [
          { uuid: n.leaderUuid, category: "LEADER_PRIMARY" },
          { uuid: n.leader2Uuid, category: "LEADER_SECONDARY" },
          { uuid: n.leaderInTrainingUuid, category: "LEADER_IN_TRAINING" },
        ],
      ), resolveFn);
      const proposedSupervisionUnit = buildProposedUnit("Supervisão", entriesFor(
        ["SUPERVISOR_PRIMARY", "SUPERVISOR_SECONDARY"],
        [
          { uuid: n.supervisorUuid, category: "SUPERVISOR_PRIMARY" },
          { uuid: n.supervisor2Uuid, category: "SUPERVISOR_SECONDARY" },
        ],
      ), resolveFn);
      const proposedCoordinationUnit = buildProposedUnit("Coordenação", entriesFor(
        ["COORDINATOR_PRIMARY", "COORDINATOR_SECONDARY"],
        [
          { uuid: n.coordinatorUuid, category: "COORDINATOR_PRIMARY" },
          { uuid: n.coordinator2Uuid, category: "COORDINATOR_SECONDARY" },
        ],
      ), resolveFn);
      const proposedAreaPastorUnit = null; // export não traz pastor de área

      // resolução final de liderança (prefere hierarquia primária; fallback grupos.json)
      const resolvedLeadership = {
        leader1: resolve(hierPrimary[0] ?? n.leaderUuid),
        leader2: resolve(hierCat("LEADER_SECONDARY")[0] ?? hierCat("LEADER_IN_TRAINING")[0] ?? n.leader2Uuid ?? n.leaderInTrainingUuid),
        supervisor: resolve(supervisorsHier[0] ?? n.supervisorUuid),
        coordinator: resolve(coordinatorsHier[0] ?? n.coordinatorUuid),
        areaPastor: { uuid: null, present: false, mapped: false, personId: null },
      };

      // operação
      const errors: string[] = [];
      if (!n.externalId) errors.push("grupo sem grupo_id.");
      if (!n.name) errors.push("grupo sem grupo_nome.");
      let op: Operation; let coarse: "PENDING" | "MATCHED" | "FAILED"; let targetId: string | null = null;
      let matchStrategy: "EXTERNAL_MAPPING" | "NONE" = "NONE";
      if (errors.length > 0) { op = "FAILED"; coarse = "FAILED"; report.failed++; }
      else if (groupMap.has(n.externalId)) { op = "MATCHED"; coarse = "MATCHED"; matchStrategy = "EXTERNAL_MAPPING"; targetId = groupMap.get(n.externalId)!; report.matchedByExternalMapping++; }
      else { op = "WOULD_CREATE"; coarse = "PENDING"; report.wouldCreate++; }

      const severity = op === "FAILED" ? "ERROR" : w.length > 0 ? "WARNING" : "INFO";
      if (severity === "WARNING") report.warnings++;

      await prisma.importBatchItem.create({
        data: {
          tenantId, batchId: batch.id, externalType: "growth_group",
          externalId: n.externalId || `NO_ID:${i}`,
          operation: op, matchStrategy, severity,
          targetType: "GrowthGroup", targetId,
          normalizedJson: {
            group: n,
            leadershipFromGroupJson: { leader: n.leaderUuid, leader2: n.leader2Uuid, leaderInTraining: n.leaderInTrainingUuid, supervisor: n.supervisorUuid, coordinator: n.coordinatorUuid },
            leadershipFromFunctionHierarchy: h ? Object.fromEntries([...h.byCategory.entries()]) : {},
            resolvedLeadership,
            leadershipSuggestion: suggestion,
            personsInMultipleFunctions,
            // proposta de unidades (NÃO criadas no dry-run)
            proposedLeadershipUnit,
            proposedSupervisionUnit,
            proposedCoordinationUnit,
            proposedAreaPastorUnit,
            unitType: proposedLeadershipUnit?.type ?? null,
          } as object,
          warningsJson: { warnings: w, leadershipSuggestion: suggestion } as object,
          errorsJson: errors,
          rawJson: raw as object,
          status: coarse,
          message: `[${op}] status=${n.status} lead=${suggestion} mismatch=${divergent} sev=${severity}`,
        },
      });
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

  report.personsNotMapped = notMappedPersons.size;

  // recomendação
  const blockers: string[] = [];
  if (report.groupsWithoutLeader > 0) blockers.push(`${report.groupsWithoutLeader} grupos sem líder`);
  if (report.divergentGroups > 0) blockers.push(`${report.divergentGroups} grupos com divergência grupos.json×hierarquia`);
  if (report.personsNotMapped > 0) blockers.push(`${report.personsNotMapped} pessoas de função não mapeadas`);
  if (report.unknownFunctionRows > 0) blockers.push(`${report.unknownFunctionRows} grupos com função desconhecida`);
  report.readyForApply = blockers.length === 0;
  report.recommendation = report.readyForApply
    ? "Base consistente: apto a iniciar apply de GC (sem pastor de área — cadeia parcial)."
    : `CORRIGIR antes do apply: ${blockers.join("; ")}. Pastor de área indisponível no export.`;

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "COMPLETED", created: 0, matched: report.matchedByExternalMapping, skipped: 0, failed: report.failed, warnings: report.warnings, conflicts: 0, finishedAt: new Date() },
  });

  return report;
}

export type { NormalizedProverGroup };
