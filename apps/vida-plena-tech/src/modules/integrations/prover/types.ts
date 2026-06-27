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

/** Forma (parcial) de uma pessoa exportada do Prover. */
export interface ProverPerson {
  id: string; // id externo (vira ExternalMapping.externalId)
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  nascimento?: string;
  // status do Prover é mapeado para EclesiasticalStatus + RoleKey na importação
  status?: string;
}

export interface ProverExportManifest {
  exportedAt: string;
  counts: { people: number };
}

/** Mapa status do Prover → status eclesiástico canônico (ver schema). */
export const PROVER_STATUS_MAP: Record<string, string> = {
  visitante: "VISITOR",
  membro: "MEMBER",
  transferido: "TRANSFERRED",
  excluido: "ARCHIVED",
  inativo: "INACTIVE",
  // líder / supervisor / coordenador / pastor são CARGOS (RoleKey), não status.
};
