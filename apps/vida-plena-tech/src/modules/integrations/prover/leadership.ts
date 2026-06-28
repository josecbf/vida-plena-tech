// ─────────────────────────────────────────────────────────────────────────
// LEADERSHIP UNIT — helpers PUROS (sem dependências, testáveis)
//
// Suporta liderança por pessoa, dupla/casal/casa ou equipe. Tipos batem com
// os enums Prisma (LeadershipUnitType / LeadershipMemberRole).
// REGRA: NÃO inferir COUPLE automaticamente nesta rodada → usar DUAL p/ 2.
// Permissão é POR PESSOA (membro ativo da unidade), nunca pela família.
// ─────────────────────────────────────────────────────────────────────────

import type { GroupFunctionCategory } from "./normalize-group";

export type UnitType = "INDIVIDUAL" | "DUAL" | "COUPLE" | "HOUSEHOLD" | "TEAM";
export type MemberRole =
  | "PRIMARY"
  | "SECONDARY"
  | "SPOUSE"
  | "ASSISTANT"
  | "IN_TRAINING"
  | "TEAM_MEMBER";

/** 1 pessoa → INDIVIDUAL · 2 → DUAL · 3+ → TEAM. (COUPLE não é inferido aqui.) */
export function inferUnitType(memberCount: number): UnitType {
  if (memberCount <= 1) return "INDIVIDUAL";
  if (memberCount === 2) return "DUAL";
  return "TEAM";
}

/** Nome público da unidade: "A | B" (até 2) ou "Equipe <primeiro>" (3+). */
export function buildUnitName(names: string[]): string {
  const clean = names.map((n) => (n ?? "").trim()).filter(Boolean);
  if (clean.length === 0) return "Liderança";
  if (clean.length <= 2) return clean.join(" | ");
  return `Equipe ${clean[0]}`;
}

/** Função do Prover (categoria) → papel dentro da unidade. */
export function functionCategoryToMemberRole(cat: GroupFunctionCategory): MemberRole {
  switch (cat) {
    case "LEADER_PRIMARY":
    case "SUPERVISOR_PRIMARY":
    case "COORDINATOR_PRIMARY":
      return "PRIMARY";
    case "LEADER_SECONDARY":
    case "SUPERVISOR_SECONDARY":
    case "COORDINATOR_SECONDARY":
      return "SECONDARY";
    case "LEADER_IN_TRAINING":
      return "IN_TRAINING";
    default:
      return "TEAM_MEMBER";
  }
}

export interface ProposedUnitMember {
  personUuid: string;
  role: MemberRole;
  mapped: boolean;
  personId: string | null;
}
export interface ProposedUnit {
  type: UnitType;
  nameHint: string;
  members: ProposedUnitMember[];
}

/**
 * Monta a PROPOSTA de unidade (dry-run): tipo + membros com papel resolvido.
 * `entries` = pares (uuid, categoria). `resolve` mapeia uuid → personId|null.
 * Não cria nada.
 */
export function buildProposedUnit(
  nameHint: string,
  entries: { uuid: string; category: GroupFunctionCategory }[],
  resolve: (uuid: string) => string | null,
): ProposedUnit | null {
  // dedup por uuid (mantém o primeiro papel visto)
  const seen = new Map<string, GroupFunctionCategory>();
  for (const e of entries) if (e.uuid && !seen.has(e.uuid)) seen.set(e.uuid, e.category);
  if (seen.size === 0) return null;
  const members: ProposedUnitMember[] = [...seen.entries()].map(([uuid, cat]) => {
    const personId = resolve(uuid);
    return { personUuid: uuid, role: functionCategoryToMemberRole(cat), mapped: !!personId, personId };
  });
  return { type: inferUnitType(members.length), nameHint, members };
}
