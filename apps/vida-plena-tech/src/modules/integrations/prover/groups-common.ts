// ─────────────────────────────────────────────────────────────────────────
// GRUPOS — utilitários COMPARTILHADOS entre dry-run e apply (puros)
//
// Indexa hierarquia_grupo_funcao.json e monta as entradas de liderança de um
// grupo (preferindo a hierarquia; fallback p/ grupos.json). NUNCA escreve.
// ─────────────────────────────────────────────────────────────────────────

import type { ProverGroupFunction } from "./types";
import {
  normalizeGroupFunction,
  type GroupFunctionCategory,
  type NormalizedProverGroup,
} from "./normalize-group";

export interface HierGroup {
  byCategory: Map<GroupFunctionCategory, string[]>; // categoria → uuids (ativos)
  activePersons: Set<string>;
  removedCount: number;
  hasUnknown: boolean;
}

export interface IndexedHierarchy {
  hier: Map<string, HierGroup>;
  active: number;
  removed: number;
}

/** Indexa a hierarquia por grupo_id (ignora removido="1"). */
export function indexHierarchy(funcoes: ProverGroupFunction[]): IndexedHierarchy {
  const hier = new Map<string, HierGroup>();
  let active = 0;
  let removed = 0;
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
      removed++;
      continue;
    }
    active++;
    const cat = normalizeGroupFunction(f.funcao);
    if (cat === "UNKNOWN") h.hasUnknown = true;
    const uuid = (f.pessoa_uuid ?? "").toString().trim();
    if (!uuid) continue;
    if (!h.byCategory.has(cat)) h.byCategory.set(cat, []);
    h.byCategory.get(cat)!.push(uuid);
    h.activePersons.add(uuid);
  }
  return { hier, active, removed };
}

export interface RoleEntry {
  uuid: string;
  category: GroupFunctionCategory;
}

export interface GroupLeadershipEntries {
  leaders: RoleEntry[];
  supervisors: RoleEntry[];
  coordinators: RoleEntry[];
}

/**
 * Entradas de liderança de um grupo (uuid + categoria), preferindo a hierarquia
 * ativa; se vazia, cai para os campos do grupos.json.
 */
export function groupLeadershipEntries(
  n: NormalizedProverGroup,
  h: HierGroup | undefined,
): GroupLeadershipEntries {
  const fromHier = (cats: GroupFunctionCategory[]): RoleEntry[] => {
    const out: RoleEntry[] = [];
    if (h) for (const c of cats) for (const u of h.byCategory.get(c) ?? []) out.push({ uuid: u, category: c });
    return out;
  };
  const fallback = (pairs: [string | null, GroupFunctionCategory][]): RoleEntry[] =>
    pairs.filter(([u]) => !!u).map(([u, c]) => ({ uuid: u as string, category: c }));

  const leaders = fromHier(["LEADER_PRIMARY", "LEADER_SECONDARY", "LEADER_IN_TRAINING"]);
  const supervisors = fromHier(["SUPERVISOR_PRIMARY", "SUPERVISOR_SECONDARY"]);
  const coordinators = fromHier(["COORDINATOR_PRIMARY", "COORDINATOR_SECONDARY"]);

  return {
    leaders: leaders.length
      ? leaders
      : fallback([
          [n.leaderUuid, "LEADER_PRIMARY"],
          [n.leader2Uuid, "LEADER_SECONDARY"],
          [n.leaderInTrainingUuid, "LEADER_IN_TRAINING"],
        ]),
    supervisors: supervisors.length
      ? supervisors
      : fallback([
          [n.supervisorUuid, "SUPERVISOR_PRIMARY"],
          [n.supervisor2Uuid, "SUPERVISOR_SECONDARY"],
        ]),
    coordinators: coordinators.length
      ? coordinators
      : fallback([
          [n.coordinatorUuid, "COORDINATOR_PRIMARY"],
          [n.coordinator2Uuid, "COORDINATOR_SECONDARY"],
        ]),
  };
}

/** Coleta todos os uuids de pessoa (liderança) de uma lista de entradas. */
export function collectPersonUuids(entries: GroupLeadershipEntries[]): Set<string> {
  const set = new Set<string>();
  for (const e of entries) for (const r of [...e.leaders, ...e.supervisors, ...e.coordinators]) set.add(r.uuid);
  return set;
}
