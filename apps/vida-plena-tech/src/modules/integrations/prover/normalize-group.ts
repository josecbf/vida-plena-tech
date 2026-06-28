// ─────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO Prover → Vida Plena Tech (Grupos) — FUNÇÃO PURA
//
// Sem dependências externas (testável). Não resolve pessoas (isso depende do
// banco; fica no engine). NUNCA escreve em lugar nenhum. Ambiguidades viram
// warning, não invenção. Ver docs/modules/prover-import-plan.md.
// ─────────────────────────────────────────────────────────────────────────

import type { ProverGroup } from "./types";
import { labelKey } from "./normalize";

export type GroupStatus = "ACTIVE" | "INACTIVE" | "UNKNOWN";
export type LeadershipSuggestion = "INDIVIDUAL" | "DUAL" | "ABSENT";

export type GroupWarning =
  | "UNKNOWN_GROUP_STATUS"
  | "LEADERSHIP_ABSENT"
  | "NAME_SUGGESTS_COUPLE" // nome com "A | B"
  | "AREA_PASTOR_FIELD_NOT_IN_EXPORT" // não há campo de pastor de área
  | "SCHEDULE_FIELDS_NOT_IN_EXPORT"; // não há dia/horário

export interface NormalizedProverGroup {
  externalId: string;
  name: string;
  status: GroupStatus;
  groupType: string | null;
  createdAt: string | null;
  capacity: number | null;
  location: string | null;
  redeName: string | null;
  // UUIDs de liderança (resolução de pessoa fica no engine)
  leaderUuid: string | null;
  leader2Uuid: string | null;
  leaderInTrainingUuid: string | null;
  supervisorUuid: string | null;
  supervisor2Uuid: string | null;
  coordinatorUuid: string | null;
  coordinator2Uuid: string | null;
  leadershipSuggestion: LeadershipSuggestion;
  warnings: GroupWarning[];
}

function clean(v?: string | null): string | null {
  const t = (v ?? "").toString().trim();
  return t.length > 0 ? t : null;
}

function buildLocation(raw: ProverGroup): string | null {
  const parts = [
    [clean(raw.endereco_logradouro), clean(raw.endereco_numero)].filter(Boolean).join(", "),
    clean(raw.endereco_bairro),
    clean(raw.endereco_cidade),
    clean(raw.endereco_estado),
    clean(raw.endereco_cep),
  ].filter((p) => p && p.length > 0);
  return parts.length ? parts.join(" · ") : null;
}

export function normalizeProverGroup(raw: ProverGroup): NormalizedProverGroup {
  const warnings: GroupWarning[] = [];

  // status
  const statusK = labelKey(raw.grupo_status);
  let status: GroupStatus;
  if (statusK === "ATIVO") status = "ACTIVE";
  else if (statusK === "INATIVO") status = "INACTIVE";
  else {
    status = "UNKNOWN";
    warnings.push("UNKNOWN_GROUP_STATUS");
  }

  const leaderUuid = clean(raw.pessoa_uuid_lider_1);
  const rawLeader2 = clean(raw.pessoa_uuid_lider_2);
  const rawInTraining = clean(raw.pessoa_uuid_lider_em_treinamento);
  // segundo líder só conta se for pessoa DIFERENTE do líder principal
  const leader2Uuid = rawLeader2 && rawLeader2 !== leaderUuid ? rawLeader2 : null;
  const leaderInTrainingUuid =
    rawInTraining && rawInTraining !== leaderUuid ? rawInTraining : null;

  // sugestão de liderança (NUNCA inferência final)
  let leadershipSuggestion: LeadershipSuggestion;
  if (!leaderUuid) {
    leadershipSuggestion = "ABSENT";
    warnings.push("LEADERSHIP_ABSENT");
  } else if (leader2Uuid || leaderInTrainingUuid) {
    leadershipSuggestion = "DUAL";
  } else {
    leadershipSuggestion = "INDIVIDUAL";
  }

  // nome com "A | B" reforça (apenas) sugestão de casal
  const name = clean(raw.grupo_nome) ?? "";
  if (name.includes("|") && leadershipSuggestion === "DUAL") {
    warnings.push("NAME_SUGGESTS_COUPLE");
  }

  // campos ausentes no export (documentados como pendência por grupo)
  warnings.push("AREA_PASTOR_FIELD_NOT_IN_EXPORT");
  warnings.push("SCHEDULE_FIELDS_NOT_IN_EXPORT");

  const capacityRaw = clean(raw.grupo_limite_pessoas);
  const capacity = capacityRaw && /^\d+$/.test(capacityRaw) ? parseInt(capacityRaw, 10) : null;

  return {
    externalId: clean(raw.grupo_id) ?? "",
    name,
    status,
    groupType: clean(raw.grupo_tipo),
    createdAt: clean(raw.grupo_data_criacao),
    capacity: capacity && capacity > 0 ? capacity : null,
    location: buildLocation(raw),
    redeName: clean(raw.rede_nome),
    leaderUuid,
    leader2Uuid,
    leaderInTrainingUuid,
    supervisorUuid: clean(raw.pessoa_uuid_supervisor_1),
    supervisor2Uuid: clean(raw.pessoa_uuid_supervisor_2),
    coordinatorUuid: clean(raw.pessoa_uuid_coordenador_a__1),
    coordinator2Uuid: clean(raw.pessoa_uuid_coordenador_a__2),
    leadershipSuggestion,
    warnings,
  };
}
