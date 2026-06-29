import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { RoleKey } from "@prisma/client";
import { prisma } from "./db";
import { readSession } from "./auth";
import {
  Permission,
  permissionsForRoles,
  highestRole,
} from "./rbac";
import {
  hasTenantWideScope,
  gcScopeOrClauses,
  getActiveLeadershipUnitIdsForPerson,
  getGrowthGroupScopeForPerson,
  personHasAccessToGrowthGroup,
} from "./scope";

// ─────────────────────────────────────────────────────────────────────────
// CONTEXTO DE REQUISIÇÃO
//
// Resolve o usuário logado em um AuthContext que carrega: tenant, membership,
// pessoa vinculada, papéis e permissões. TODO acesso a dados deve passar por
// aqui e filtrar por ctx.tenantId (isolamento multi-tenant na aplicação;
// em produção, somar Postgres RLS — ver README/arquitetura).
// ─────────────────────────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  userName: string;
  email: string;
  tenantId: string;
  tenantName: string;
  membershipId: string;
  personId: string | null;
  roles: RoleKey[];
  primaryRole: RoleKey;
  permissions: Set<Permission>;
}

/** Carrega o contexto do usuário logado (ou null). Memorizado por request. */
export const getContext = cache(async (): Promise<AuthContext | null> => {
  const session = await readSession();
  if (!session) return null;

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.userId, status: "ACTIVE" },
    include: {
      user: true,
      tenant: true,
      roleAssignments: true,
    },
  });
  if (!membership) return null;

  const roles = membership.roleAssignments.map((r) => r.role);
  if (roles.length === 0) roles.push("MEMBER");

  return {
    userId: membership.userId,
    userName: membership.user.name,
    email: membership.user.email,
    tenantId: membership.tenantId,
    tenantName: membership.tenant.name,
    membershipId: membership.id,
    personId: membership.personId,
    roles,
    primaryRole: highestRole(roles),
    permissions: permissionsForRoles(roles),
  };
});

/** Exige login; redireciona para /login se não houver. */
export async function requireContext(): Promise<AuthContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export function can(ctx: AuthContext, permission: Permission): boolean {
  return ctx.permissions.has(permission);
}

/** Guard deny-by-default para server actions. Lança se faltar permissão. */
export function assertPermission(ctx: AuthContext, permission: Permission) {
  if (!can(ctx, permission)) {
    throw new Error(`Acesso negado: falta permissão ${permission}.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// ESCOPO — quais pessoas/GCs este usuário enxerga
//
// Resolução pela cadeia de liderança do GC. Quando uma pessoa troca de GC,
// o líder antigo deixa de enxergá-la (membership antiga fica com leftAt != null
// e não entra no escopo), mas o histórico e os logs permanecem preservados.
// ─────────────────────────────────────────────────────────────────────────

// Resolução de escopo extraída para ./scope (sem "server-only" → testável).
// Re-exporta os helpers públicos (mantém imports existentes de "@/server/context").
export {
  hasTenantWideScope,
  getActiveLeadershipUnitIdsForPerson,
  getGrowthGroupScopeForPerson,
  personHasAccessToGrowthGroup,
};

/**
 * Conjunto de ids de GC que o usuário enxerga, ou "ALL".
 * Considera campos legados E LeadershipUnitMember (Líder 1/2, supervisão, coordenação).
 */
export async function visibleGcIds(
  ctx: AuthContext,
): Promise<"ALL" | Set<string>> {
  if (hasTenantWideScope(ctx)) return "ALL";

  const ors = await gcScopeOrClauses(ctx.tenantId, ctx.personId, ctx.membershipId);
  if (ors.length === 0) return new Set();

  const gcs = await prisma.growthGroup.findMany({
    where: { tenantId: ctx.tenantId, archivedAt: null, OR: ors },
    select: { id: true },
  });
  return new Set(gcs.map((g) => g.id));
}

/**
 * Conjunto de ids de pessoas visíveis, ou "ALL".
 * Inclui: a própria pessoa do usuário + membros ATIVOS dos GCs visíveis.
 */
export async function visiblePersonIds(
  ctx: AuthContext,
): Promise<"ALL" | Set<string>> {
  if (hasTenantWideScope(ctx)) return "ALL";

  const gcScope = await visibleGcIds(ctx);
  const ids = new Set<string>();
  if (ctx.personId) ids.add(ctx.personId);

  if (gcScope !== "ALL" && gcScope.size > 0) {
    const memberships = await prisma.growthGroupMembership.findMany({
      where: {
        tenantId: ctx.tenantId,
        gcId: { in: [...gcScope] },
        leftAt: null, // só vínculos ativos → líder antigo perde acesso
      },
      select: { personId: true },
    });
    for (const m of memberships) ids.add(m.personId);

    // também as pessoas cujo GC principal está no escopo
    const primaries = await prisma.person.findMany({
      where: { tenantId: ctx.tenantId, primaryGcId: { in: [...gcScope] } },
      select: { id: true },
    });
    for (const p of primaries) ids.add(p.id);
  }

  return ids;
}

/** Cláusula `where` de pessoa já filtrada por tenant + escopo. */
export async function personScopeWhere(ctx: AuthContext) {
  const scope = await visiblePersonIds(ctx);
  if (scope === "ALL") return { tenantId: ctx.tenantId };
  return { tenantId: ctx.tenantId, id: { in: [...scope] } };
}

export async function canViewPerson(
  ctx: AuthContext,
  personId: string,
): Promise<boolean> {
  const scope = await visiblePersonIds(ctx);
  if (scope === "ALL") return true;
  return scope.has(personId);
}
