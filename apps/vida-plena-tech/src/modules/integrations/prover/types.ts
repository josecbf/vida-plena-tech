// ─────────────────────────────────────────────────────────────────────────
// CONTRATO DE INTEGRAÇÃO PROVER (FUTURO)
//
// Regras já fixadas (ver README e docs/modules):
//  • Prover é SOMENTE LEITURA. NUNCA escrever no Prover.
//  • Importação deve ser idempotente (via ExternalMapping).
//  • Importação passa por deduplicação (CPF / nome+contato).
//  • Importação gera ImportBatch + ImportBatchItem.
//  • Chave de API fica em .env.local, NUNCA no código.
//
// Nesta fase NADA é chamado. Só o contrato e os tipos existem.
// O Prover virá como ZIP de JSONs; o importador real leria esses arquivos.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Forma (parcial) de uma pessoa em `pessoas.json` (nomes reais do export).
 * Ver mapeamento completo em docs/modules/prover-import-plan.md (§2).
 */
export interface ProverPerson {
  pessoa_uuid: string; // vira ExternalMapping.externalId (externalType="person")
  pessoa_nome: string;
  pessoa_cpf?: string; // só grava se válido (ver isImportableCpf)
  pessoa_nascimento?: string;
  pessoa_sexo?: string;
  estadocivil?: string;
  pessoa_email?: string;
  pessoa_celular?: string;
  pessoa_status?: string; // ATIVO/INATIVO
  pessoa_tipo?: string; // ex.: Visitante — vira status (nunca cru)
  pessoa_subtipo?: string; // ex.: MEMBRO / LIDER GC — status OU papel (nunca cru)
  // Endereço (nomes confirmados no export real)
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
  // Lista de ocorrências (string CSV: "BATISMO, TD, MEMBRO, ...")
  ocorrencias?: string;
}

/**
 * Forma (parcial) de um grupo em `grupos.json` (nomes reais do export).
 * NÃO há campo de pastor de área nem de dia/horário no export (ver plano).
 */
export interface ProverGroup {
  grupo_id: string;
  grupo_nome: string;
  grupo_status?: string; // Ativo / Inativo
  grupo_tipo?: string;
  grupo_data_criacao?: string;
  grupo_limite_pessoas?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
  endereco_cep?: string;
  rede_id?: string | null;
  rede_nome?: string | null;
  // liderança (UUIDs de pessoa do Prover → resolver via ExternalMapping)
  pessoa_uuid_lider_1?: string | null;
  pessoa_uuid_lider_2?: string | null;
  pessoa_uuid_lider_em_treinamento?: string | null;
  pessoa_uuid_supervisor_1?: string | null;
  pessoa_uuid_supervisor_2?: string | null;
  pessoa_uuid_coordenador_a__1?: string | null;
  pessoa_uuid_coordenador_a__2?: string | null;
}

/** Linha de `hierarquia_grupo_funcao.json` (função de uma pessoa num grupo). */
export interface ProverGroupFunction {
  grupo_id: string;
  pessoa_uuid: string;
  funcao_id?: string;
  funcao: string; // ex.: "Líder 1", "Supervisor 1", "Coordenador(a) 1"
  created_at?: string;
  updated_at?: string;
  removido?: string; // "0" = ativo, "1" = removido
}

/** Linha de `grupos_participantes.json` (vínculo participante↔GC). */
export interface ProverGcParticipant {
  grupo_id: string;
  pessoa_uuid: string;
  cargo?: string | null;
  data_entrada?: string | null;
  data_saida?: string | null;
}

/** Linha de `grupos_visitantes.json` (vínculo visitante↔GC). */
export interface ProverGcVisitor {
  grupo_id: string;
  pessoa_uuid: string;
  data_cadastro?: string | null;
  data_saida?: string | null;
}

/** Linha de `grupos_encontros.json` (encontro de GC). Campos reais do export. */
export interface ProverGcMeeting {
  grupo_id: string;
  grupo_nome?: string | null;
  encontro_id: string;
  tema?: string | null;
  observacao?: string | null;
  supervisao?: string | null;
  local?: string | null;
  data_inicio?: string | null; // "2026-06-08 20:00:00"
  data_fim?: string | null;
  status?: string | null; // agendado | realizado | cancelado
  oferta?: string | null;
  pauta?: string | null;
  resumo?: string | null;
  num_criancas?: string | null;
  quilos_doados?: string | null;
}

/**
 * Linha de `grupos_encontros_participantes.json` e `grupos_encontros_visitantes.json`
 * (mesma forma). presenca: "1" presente, "0" ausente, null não registrado.
 */
export interface ProverGcMeetingAttendance {
  grupo_id: string;
  grupo_nome?: string | null;
  encontro_id: string;
  tema?: string | null;
  data_inicio?: string | null;
  pessoa_uuid?: string | null;
  pessoa_nome?: string | null;
  presenca?: string | null;
  anotacao?: string | null;
}

/** `grupos_encontros_visitas.json` — VAZIO neste export; forma não confirmada. */
export type ProverGcMeetingVisit = Record<string, unknown>;

export interface ProverExportManifest {
  exportedAt: string;
  counts: { people: number };
}

/**
 * Mapa de SITUAÇÃO Prover → status eclesiástico canônico.
 * NÃO inclui cargos (líder/supervisor/pastor) — esses são papéis (ver abaixo).
 */
export const PROVER_STATUS_MAP: Record<string, string> = {
  visitante: "VISITOR",
  membro: "MEMBER",
  transferido: "TRANSFERRED",
  excluido: "ARCHIVED",
  inativo: "INACTIVE",
};

/**
 * Mapa de CARGO Prover → papel (RoleAssignment.role). Cargo NUNCA vira status.
 * Chaves normalizadas em MAIÚSCULAS sem acento.
 */
export const PROVER_ROLE_MAP: Record<string, string> = {
  "LIDER GC": "GC_LEADER",
  SUPERVISOR: "SUPERVISOR",
  "COORDENADOR": "COORDINATOR",
  "COORDENADORA": "COORDINATOR",
  "PASTOR DE AREA": "AREA_PASTOR",
  "PASTOR SENIOR": "SENIOR_PASTOR",
};

/**
 * CPF importável? Trata zerado/sequência/placeholder/vazio como AUSENTE.
 * (A validação de dígitos fica com lib/format.ts:isValidCpf na importação real.)
 */
export function isImportableCpf(raw?: string | null): boolean {
  if (!raw) return false;
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // 00000000000, 11111111111, …
  return true; // dígitos verificadores conferidos por isValidCpf na importação
}
