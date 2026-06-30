"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireContext, assertPermission } from "@/server/context";
import { saveConflictResolution, ResolutionValidationError } from "@/modules/integrations/prover/conflict-resolutions";

// ─────────────────────────────────────────────────────────────────────────
// FASE 3B.2 — server action: salvar decisão (rascunho) de conflito de GC.
//
// SOMENTE registra GcMembershipConflictResolution + AuditLog. NÃO aplica efeito
// real (nenhuma escrita em GrowthGroupMembership/Person/ExternalMapping/User/Role).
// ─────────────────────────────────────────────────────────────────────────

export async function saveConflictResolutionAction(formData: FormData) {
  const ctx = await requireContext();
  assertPermission(ctx, "prover.import.manage");

  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.length > 0 ? v : null;
  };

  const type = str("type") ?? "";
  const conflictKey = str("conflictKey") ?? "";
  const decision = str("decision") ?? "";
  const status = str("status") ?? "DRAFT";
  const note = str("note");
  const personId = str("personId");
  const growthGroupId = str("growthGroupId");
  const proverPersonUuid = str("proverPersonUuid");
  const target = str("target"); // A: GC a manter · D: pessoa alvo

  try {
    await saveConflictResolution(prisma, {
      tenantId: ctx.tenantId,
      decidedByUserId: ctx.userId ?? null,
      type,
      conflictKey,
      decision,
      status,
      note,
      personId,
      growthGroupId,
      proverPersonUuid,
      payload: { target, suggestion: str("suggestion") },
    });
  } catch (err) {
    if (err instanceof ResolutionValidationError) {
      // erro de validação → não aplica; propaga mensagem amigável
      throw new Error(`Decisão inválida: ${err.message}`);
    }
    throw err;
  }

  revalidatePath("/prover/gc-memberships/conflicts");
}
