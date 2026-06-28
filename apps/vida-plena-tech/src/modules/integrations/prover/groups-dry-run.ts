import type { PrismaClient } from "@prisma/client";
import type { ProverGroup } from "./types";
import {
  normalizeProverGroup,
  type NormalizedProverGroup,
} from "./normalize-group";

// ─────────────────────────────────────────────────────────────────────────
// IMPORTADOR Prover — FASE 2A — GRUPOS DE CRESCIMENTO — MODO DRY-RUN
//
// Lê grupos.json, normaliza, resolve liderança via ExternalMapping de PESSOAS
// (importadas na Fase 1B) e grava ImportBatch + ImportBatchItem estruturados.
// NÃO cria GrowthGroup, RoleAssignment, User nem LeadershipUnit. Sem apply.
// NUNCA escreve no Prover. Liderança dupla = SUGESTÃO, nunca inferência final.
// ─────────────────────────────────────────────────────────────────────────

type Operation = "WOULD_CREATE" | "WOULD_UPDATE" | "WOULD_SKIP" | "MATCHED" | "FAILED";
type Severity = "INFO" | "WARNING" | "CONFLICT" | "ERROR";

export interface GroupsDryRunReport {
  batchId: string;
  fileName: string;
  totalRead: number;
  wouldCreate: number;
  matchedByExternalMapping: number;
  failed: number;
  warnings: number;
  conflicts: number;
  active: number;
  inactive: number;
  unknownStatus: number;
  withLeaderMapped: number;
  withoutLeader: number;
  leaderNotFound: number;
  assistantMapped: number;
  supervisorMapped: number;
  coordinatorMapped: number;
  areaPastorMapped: number; // sempre 0: não há campo no export
  suggestionIndividual: number;
  suggestionDual: number;
  suggestionAbsent: number;
}

interface ResolvedLeadership {
  leader: Resolved;
  assistant: Resolved; // líder 2 ou líder em treinamento
  supervisor: Resolved;
  coordinator: Resolved;
  areaPastor: Resolved; // sempre não-presente (sem campo)
}
interface Resolved {
  uuid: string | null;
  present: boolean;
  mapped: boolean;
  personId: string | null;
}

export async function runGroupsDryRun(
  prisma: PrismaClient,
  opts: { tenantId: string; fileName: string; grupos: ProverGroup[]; sourceFileHash?: string },
): Promise<GroupsDryRunReport> {
  const { tenantId, fileName, grupos, sourceFileHash } = opts;
  const normalized = grupos.map(normalizeProverGroup);

  // 1) resolve TODAS as pessoas de liderança num único findMany (ExternalMapping)
  const personUuids = new Set<string>();
  for (const g of normalized) {
    for (const u of [
      g.leaderUuid, g.leader2Uuid, g.leaderInTrainingUuid,
      g.supervisorUuid, g.supervisor2Uuid, g.coordinatorUuid, g.coordinator2Uuid,
    ]) {
      if (u) personUuids.add(u);
    }
  }
  const personMappings = await prisma.externalMapping.findMany({
    where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: [...personUuids] } },
    select: { externalId: true, internalId: true },
  });
  const personMap = new Map(personMappings.map((m) => [m.externalId, m.internalId]));

  // 2) mappings de GRUPO já existentes (idempotência)
  const groupMappings = await prisma.externalMapping.findMany({
    where: { tenantId, system: "PROVER", externalType: "growth_group", externalId: { in: normalized.map((g) => g.externalId).filter(Boolean) } },
    select: { externalId: true, internalId: true },
  });
  const groupMap = new Map(groupMappings.map((m) => [m.externalId, m.internalId]));

  const resolve = (uuid: string | null): Resolved => ({
    uuid,
    present: !!uuid,
    mapped: !!uuid && personMap.has(uuid),
    personId: uuid ? personMap.get(uuid) ?? null : null,
  });

  const report: GroupsDryRunReport = {
    batchId: "", fileName, totalRead: normalized.length,
    wouldCreate: 0, matchedByExternalMapping: 0, failed: 0, warnings: 0, conflicts: 0,
    active: 0, inactive: 0, unknownStatus: 0,
    withLeaderMapped: 0, withoutLeader: 0, leaderNotFound: 0,
    assistantMapped: 0, supervisorMapped: 0, coordinatorMapped: 0, areaPastorMapped: 0,
    suggestionIndividual: 0, suggestionDual: 0, suggestionAbsent: 0,
  };

  const batch = await prisma.importBatch.create({
    data: { tenantId, mode: "DRY_RUN", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: normalized.length },
  });
  report.batchId = batch.id;

  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    const raw = grupos[i];
    try {
      // status
      if (n.status === "ACTIVE") report.active++;
      else if (n.status === "INACTIVE") report.inactive++;
      else report.unknownStatus++;

      // suggestion
      if (n.leadershipSuggestion === "INDIVIDUAL") report.suggestionIndividual++;
      else if (n.leadershipSuggestion === "DUAL") report.suggestionDual++;
      else report.suggestionAbsent++;

      // resolução de liderança
      const assistantUuid = n.leader2Uuid ?? n.leaderInTrainingUuid;
      const resolved: ResolvedLeadership = {
        leader: resolve(n.leaderUuid),
        assistant: resolve(assistantUuid),
        supervisor: resolve(n.supervisorUuid),
        coordinator: resolve(n.coordinatorUuid),
        areaPastor: { uuid: null, present: false, mapped: false, personId: null },
      };

      const extraWarnings: string[] = [];
      if (!resolved.leader.present) report.withoutLeader++;
      else if (resolved.leader.mapped) report.withLeaderMapped++;
      else {
        report.leaderNotFound++;
        extraWarnings.push("PERSON_MAPPING_NOT_FOUND:leader");
      }
      if (resolved.assistant.present) {
        if (resolved.assistant.mapped) report.assistantMapped++;
        else extraWarnings.push("PERSON_MAPPING_NOT_FOUND:assistant");
      }
      if (resolved.supervisor.present) {
        if (resolved.supervisor.mapped) report.supervisorMapped++;
        else extraWarnings.push("PERSON_MAPPING_NOT_FOUND:supervisor");
      }
      if (resolved.coordinator.present) {
        if (resolved.coordinator.mapped) report.coordinatorMapped++;
        else extraWarnings.push("PERSON_MAPPING_NOT_FOUND:coordinator");
      }

      // operação (idempotência por mapping de grupo)
      const errors: string[] = [];
      if (!n.externalId) errors.push("grupo sem grupo_id.");
      if (!n.name) errors.push("grupo sem grupo_nome.");

      let op: Operation;
      let matchStrategy: "EXTERNAL_MAPPING" | "NONE";
      let coarse: "PENDING" | "MATCHED" | "FAILED";
      let targetId: string | null = null;

      if (errors.length > 0) {
        op = "FAILED"; matchStrategy = "NONE"; coarse = "FAILED";
        report.failed++;
      } else if (groupMap.has(n.externalId)) {
        op = "MATCHED"; matchStrategy = "EXTERNAL_MAPPING"; coarse = "MATCHED";
        targetId = groupMap.get(n.externalId)!;
        report.matchedByExternalMapping++;
      } else {
        op = "WOULD_CREATE"; matchStrategy = "NONE"; coarse = "PENDING";
        report.wouldCreate++;
      }

      const allWarnings = [...n.warnings, ...extraWarnings];
      // Nesta fase grupos geram INFO/WARNING/ERROR (CONFLICT fica para o apply).
      let severity: Severity;
      if (op === "FAILED") severity = "ERROR";
      else if (allWarnings.length > 0) severity = "WARNING";
      else severity = "INFO";
      if (severity === "WARNING") report.warnings++;

      await prisma.importBatchItem.create({
        data: {
          tenantId, batchId: batch.id,
          externalType: "growth_group",
          externalId: n.externalId || `NO_ID:${i}`,
          operation: op,
          matchStrategy,
          severity,
          targetType: "GrowthGroup",
          targetId,
          normalizedJson: { ...n, resolved } as object,
          warningsJson: { warnings: allWarnings, leadershipSuggestion: n.leadershipSuggestion },
          errorsJson: errors,
          rawJson: raw as object,
          status: coarse,
          message: `[${op}] status=${n.status} lead=${n.leadershipSuggestion} leaderMapped=${resolved.leader.mapped} sev=${severity}`,
        },
      });
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({
        data: {
          tenantId, batchId: batch.id, externalType: "growth_group",
          externalId: n.externalId || `NO_ID:${i}`,
          operation: "FAILED", matchStrategy: "NONE", severity: "ERROR",
          rawJson: raw as object,
          errorsJson: [err instanceof Error ? err.message : "erro desconhecido"],
          status: "FAILED",
          message: `[FAILED] ${err instanceof Error ? err.message : "erro"}`,
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMPLETED",
      created: 0, // dry-run
      matched: report.matchedByExternalMapping,
      skipped: 0,
      failed: report.failed,
      warnings: report.warnings,
      conflicts: report.conflicts,
      finishedAt: new Date(),
    },
  });

  return report;
}

export type { NormalizedProverGroup };
