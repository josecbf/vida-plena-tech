// ─────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO de vínculos pessoa↔GC (participantes/visitantes) — PURO
//
// grupos_participantes.json: grupo_id, pessoa_uuid, cargo, data_entrada, data_saida
// grupos_visitantes.json:    grupo_id, pessoa_uuid, data_cadastro, data_saida
// Ativo = sem data_saida. NUNCA escreve nada.
// ─────────────────────────────────────────────────────────────────────────

import type { ProverGcParticipant, ProverGcVisitor } from "./types";

export type LinkSource = "PARTICIPANT" | "VISITOR";

export interface NormalizedGcLink {
  groupExternalId: string;
  personUuid: string;
  source: LinkSource;
  joinedAt: string | null;
  leftAt: string | null;
  active: boolean;
  role: string | null;
}

function clean(v?: string | null): string | null {
  const t = (v ?? "").toString().trim();
  return t.length > 0 ? t : null;
}

export function normalizeGcParticipant(raw: ProverGcParticipant): NormalizedGcLink {
  const leftAt = clean(raw.data_saida);
  return {
    groupExternalId: clean(raw.grupo_id) ?? "",
    personUuid: clean(raw.pessoa_uuid) ?? "",
    source: "PARTICIPANT",
    joinedAt: clean(raw.data_entrada),
    leftAt,
    active: !leftAt,
    role: clean(raw.cargo),
  };
}

export function normalizeGcVisitor(raw: ProverGcVisitor): NormalizedGcLink {
  const leftAt = clean(raw.data_saida);
  return {
    groupExternalId: clean(raw.grupo_id) ?? "",
    personUuid: clean(raw.pessoa_uuid) ?? "",
    source: "VISITOR",
    joinedAt: clean(raw.data_cadastro),
    leftAt,
    active: !leftAt,
    role: null,
  };
}
