import type { ProverPerson, ProverExportManifest } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// ProverClient — interface do cliente de LEITURA do Prover (FUTURO).
//
// IMPORTANTE: não há método de escrita por design. O Prover é fonte de
// leitura/importação apenas. Esta fase entrega só o contrato + um stub que
// recusa operar até haver configuração.
// ─────────────────────────────────────────────────────────────────────────

export interface ProverClient {
  /** Lê o manifesto do export (ZIP de JSONs). */
  readManifest(): Promise<ProverExportManifest>;
  /** Itera as pessoas exportadas (somente leitura). */
  listPeople(): Promise<ProverPerson[]>;
}

export interface ProverConfig {
  baseUrl: string;
  apiKey: string;
}

/** Lê a configuração do ambiente (NUNCA hardcode de chave). */
export function readProverConfig(): ProverConfig | null {
  const baseUrl = process.env.PROVER_API_BASE_URL;
  const apiKey = process.env.PROVER_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

/** Indica se a integração está configurada (define o estado da tela admin). */
export function isProverConfigured(): boolean {
  return readProverConfig() !== null;
}

/**
 * Stub: enquanto não houver configuração nem o ZIP do Prover, qualquer chamada
 * recusa explicitamente. O importador real (futuro) implementaria esta interface
 * lendo os JSONs do ZIP e gravando via ExternalMapping (idempotente).
 */
export function createProverClient(): ProverClient {
  return {
    async readManifest(): Promise<ProverExportManifest> {
      throw new Error(
        "Integração Prover ainda não configurada. Aguardando o ZIP de JSONs e PROVER_* no .env.local.",
      );
    },
    async listPeople(): Promise<ProverPerson[]> {
      throw new Error(
        "Integração Prover ainda não configurada. (Somente leitura — nunca escrevemos no Prover.)",
      );
    },
  };
}
