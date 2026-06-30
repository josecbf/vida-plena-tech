import { Prisma, type PrismaClient } from "@prisma/client";
import type { ConflictType } from "./gc-membership-conflicts";

// ─────────────────────────────────────────────────────────────────────────
// FASE 3B.2 — DECISÃO HUMANA (rascunho) de conflitos de vínculo de GC.
//
// Grava SOMENTE a decisão (GcMembershipConflictResolution) + AuditLog. NÃO
// aplica efeito real: não cria/atualiza/encerra GrowthGroupMembership, não cria
// ExternalMapping, não altera Person, não cria User/RoleAssignment. A aplicação
// fica para a Fase 3B.3. Idempotente por [tenantId, conflictKey] (upsert).
// ─────────────────────────────────────────────────────────────────────────

export type Decision =
  | "KEEP_THIS_GC_ACTIVE"
  | "CLOSE_THIS_MEMBERSHIP"
  | "IGNORE_DUPLICATE"
  | "CONSOLIDATE_HISTORY"
  | "MAP_ALIAS_TO_PERSON"
  | "REVIEW_LATER";

export type ResolutionStatus = "DRAFT" | "READY_TO_APPLY";

/** Decisões permitidas por tipo de conflito (regra de produto). */
export const ALLOWED_DECISIONS: Record<ConflictType, Decision[]> = {
  MULTIPLE_ACTIVE_GCS: ["KEEP_THIS_GC_ACTIVE", "CLOSE_THIS_MEMBERSHIP", "REVIEW_LATER"],
  DUPLICATE_MEMBERSHIP_CONFLICT: ["IGNORE_DUPLICATE", "CONSOLIDATE_HISTORY", "KEEP_THIS_GC_ACTIVE", "REVIEW_LATER"],
  ACTIVE_MEMBERSHIP_IN_INACTIVE_GC: ["CLOSE_THIS_MEMBERSHIP", "KEEP_THIS_GC_ACTIVE", "REVIEW_LATER"],
  PERSON_MAPPING_NOT_FOUND: ["MAP_ALIAS_TO_PERSON", "REVIEW_LATER"],
};

const CONFLICT_TYPES = Object.keys(ALLOWED_DECISIONS) as ConflictType[];

export function isConflictType(v: string): v is ConflictType {
  return (CONFLICT_TYPES as string[]).includes(v);
}

export function isDecisionAllowed(type: ConflictType, decision: string): decision is Decision {
  return (ALLOWED_DECISIONS[type] as string[]).includes(decision);
}

export interface SaveResolutionInput {
  tenantId: string;
  decidedByUserId: string | null;
  type: string;
  conflictKey: string;
  decision: string;
  status?: string; // DRAFT | READY_TO_APPLY
  note?: string | null;
  personId?: string | null;
  growthGroupId?: string | null;
  proverPersonUuid?: string | null;
  payload?: Record<string, unknown> | null;
}

export class ResolutionValidationError extends Error {}

/**
 * Valida e faz upsert da decisão (rascunho). Lança ResolutionValidationError
 * em entrada inválida. NÃO toca em nenhum dado real além da própria resolução +
 * AuditLog. Retorna { id, created }.
 */
export async function saveConflictResolution(
  prisma: PrismaClient,
  input: SaveResolutionInput,
): Promise<{ id: string; created: boolean }> {
  const { tenantId, decidedByUserId, conflictKey } = input;

  if (!tenantId) throw new ResolutionValidationError("tenant ausente.");
  if (!conflictKey) throw new ResolutionValidationError("conflictKey ausente.");
  if (!isConflictType(input.type)) throw new ResolutionValidationError(`tipo inválido: ${input.type}`);
  const type = input.type;
  if (!isDecisionAllowed(type, input.decision)) {
    throw new ResolutionValidationError(`decisão "${input.decision}" não permitida para ${type}.`);
  }
  const decision = input.decision as Decision;
  const status: ResolutionStatus = input.status === "READY_TO_APPLY" ? "READY_TO_APPLY" : "DRAFT";

  const existing = await prisma.gcMembershipConflictResolution.findUnique({
    where: { tenantId_conflictKey: { tenantId, conflictKey } },
    select: { id: true },
  });

  const data = {
    type,
    decision,
    status,
    note: input.note?.trim() || null,
    personId: input.personId ?? null,
    growthGroupId: input.growthGroupId ?? null,
    proverPersonUuid: input.proverPersonUuid ?? null,
    payloadJson: input.payload ? (input.payload as Prisma.InputJsonValue) : Prisma.DbNull,
    decidedByUserId: decidedByUserId ?? null,
    decidedAt: new Date(),
  };

  const result = await prisma.$transaction(async (tx) => {
    const res = existing
      ? await tx.gcMembershipConflictResolution.update({ where: { id: existing.id }, data })
      : await tx.gcMembershipConflictResolution.create({ data: { tenantId, conflictKey, ...data } });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId: decidedByUserId ?? null,
        module: "integrations",
        action: "conflict_resolution_draft_saved",
        entityType: "GcMembershipConflictResolution",
        entityId: res.id,
        sensitivity: "INTERNAL",
        reason: `Decisão de conflito (${type} · ${decision} · ${status})`,
        afterJson: { conflictKey, type, decision, status, personId: data.personId, growthGroupId: data.growthGroupId, proverPersonUuid: data.proverPersonUuid },
      },
    });
    return res;
  });

  return { id: result.id, created: !existing };
}
