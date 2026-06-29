import { prisma } from "./db";
import type { RoleKey } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────
// RESOLUÇÃO DE ESCOPO OPERACIONAL (sem "server-only" → testável sob tsx)
//
// Acesso a um GC vem de: campos LEGADOS (leaderId/assistantId/supervisorId/...)
// OU de ser LeadershipUnitMember ATIVO da unidade do GC (liderança/supervisão/
// coordenação/área pastoral). Acesso é SEMPRE individual — nunca por família,
// casa ou sobrenome.
// ─────────────────────────────────────────────────────────────────────────

/** true = vê o tenant inteiro (admin / pastor sênior). */
export function hasTenantWideScope(ctx: { roles: RoleKey[] }): boolean {
  return ctx.roles.includes("ADMIN") || ctx.roles.includes("SENIOR_PASTOR");
}

/**
 * IDs das LeadershipUnits em que a pessoa é MEMBRO ATIVO (acesso individual).
 */
export async function getActiveLeadershipUnitIdsForPerson(
  tenantId: string,
  personId: string,
): Promise<string[]> {
  const members = await prisma.leadershipUnitMember.findMany({
    where: {
      tenantId,
      personId,
      active: true,
      leadershipUnit: { archivedAt: null, active: true },
    },
    select: { leadershipUnitId: true },
  });
  return members.map((m) => m.leadershipUnitId);
}

/**
 * Cláusulas OR de GCs que uma pessoa enxerga: campos legados (por personId e
 * membershipId) OU unidades onde a pessoa é membro ativo.
 */
export async function gcScopeOrClauses(
  tenantId: string,
  personId: string | null,
  membershipId: string | null,
): Promise<object[]> {
  const ors: object[] = [];
  if (personId) {
    ors.push({ leaderId: personId }); // Líder 1 (legado)
    ors.push({ assistantId: personId }); // Líder 2 (legado)
  }
  if (membershipId) {
    ors.push({ supervisorId: membershipId });
    ors.push({ coordinatorId: membershipId });
    ors.push({ areaPastorId: membershipId });
  }
  if (personId) {
    const unitIds = await getActiveLeadershipUnitIdsForPerson(tenantId, personId);
    if (unitIds.length > 0) {
      ors.push({ leadershipUnitId: { in: unitIds } }); // Líder 1/2 via unidade
      ors.push({ supervisionUnitId: { in: unitIds } });
      ors.push({ coordinationUnitId: { in: unitIds } });
      ors.push({ areaPastorUnitId: { in: unitIds } }); // preparado p/ o futuro
    }
  }
  return ors;
}

/**
 * GCs que uma PESSOA acessa (por personId, sem AuthContext) — liderança,
 * supervisão, coordenação ou área pastoral, via legado OU LeadershipUnitMember.
 */
export async function getGrowthGroupScopeForPerson(
  tenantId: string,
  personId: string,
): Promise<Set<string>> {
  const membership = await prisma.tenantMembership.findFirst({
    where: { tenantId, personId },
    select: { id: true },
  });
  const ors = await gcScopeOrClauses(tenantId, personId, membership?.id ?? null);
  if (ors.length === 0) return new Set();
  const gcs = await prisma.growthGroup.findMany({
    where: { tenantId, archivedAt: null, OR: ors },
    select: { id: true },
  });
  return new Set(gcs.map((g) => g.id));
}

/** True se a pessoa tem acesso operacional ao GC (legado OU unidade). */
export async function personHasAccessToGrowthGroup(
  tenantId: string,
  personId: string,
  growthGroupId: string,
): Promise<boolean> {
  const scope = await getGrowthGroupScopeForPerson(tenantId, personId);
  return scope.has(growthGroupId);
}
