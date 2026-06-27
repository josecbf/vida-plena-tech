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
