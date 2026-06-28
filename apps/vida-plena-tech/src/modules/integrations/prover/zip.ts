import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import AdmZip from "adm-zip";
import type { ProverPerson, ProverGroup, ProverGroupFunction } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// LEITURA DO EXPORT Prover (LOCAL, SOMENTE LEITURA)
//
// Lê um ZIP exportado do Prover e extrai um JSON (pessoas.json/grupos.json).
// Para conveniência de teste, também aceita um caminho direto para um `.json`.
// NUNCA escreve no Prover nem em lugar nenhum.
// ─────────────────────────────────────────────────────────────────────────

export interface LoadedJson<T> {
  fileName: string;
  sourceFileHash: string; // sha256 do conteúdo (rastreabilidade/idempotência)
  records: T[];
}

/**
 * Lê `entryName` (ex.: "pessoas.json"/"grupos.json") de um .zip, ou um .json
 * direto. Aceita array no topo OU { <key>: [...] } / { data: [...] }.
 */
function loadEntry<T>(filePath: string, entryName: string): LoadedJson<T> {
  const fileName = path.basename(filePath);
  let jsonText: string;

  if (filePath.toLowerCase().endsWith(".zip")) {
    let zip: AdmZip;
    try {
      zip = new AdmZip(filePath);
    } catch {
      throw new Error(`Não foi possível abrir o ZIP: ${filePath}`);
    }
    const entry =
      zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith(entryName)) ?? null;
    if (!entry) throw new Error(`Arquivo \`${entryName}\` não encontrado dentro do ZIP.`);
    jsonText = zip.readAsText(entry);
  } else if (filePath.toLowerCase().endsWith(".json")) {
    try {
      jsonText = readFileSync(filePath, "utf8");
    } catch {
      throw new Error(`Não foi possível ler o arquivo JSON: ${filePath}`);
    }
  } else {
    throw new Error(`Informe um .zip do Prover (ou um .json de teste para ${entryName}).`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`\`${entryName}\` não é um JSON válido.`);
  }

  const records = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>)?.[entryName.replace(/\.json$/, "")] ??
      (parsed as { data?: unknown })?.data;

  if (!Array.isArray(records)) {
    throw new Error(`\`${entryName}\` deve conter um array (ou { ...: [...] }).`);
  }

  const sourceFileHash = createHash("sha256").update(jsonText).digest("hex");
  return { fileName, sourceFileHash, records: records as T[] };
}

export interface LoadedPessoas {
  fileName: string;
  sourceFileHash: string;
  pessoas: ProverPerson[];
}

export function loadProverPessoas(filePath: string): LoadedPessoas {
  const { fileName, sourceFileHash, records } = loadEntry<ProverPerson>(filePath, "pessoas.json");
  return { fileName, sourceFileHash, pessoas: records };
}

export interface LoadedGrupos {
  fileName: string;
  sourceFileHash: string;
  grupos: ProverGroup[];
}

export function loadProverGroups(filePath: string): LoadedGrupos {
  const { fileName, sourceFileHash, records } = loadEntry<ProverGroup>(filePath, "grupos.json");
  return { fileName, sourceFileHash, grupos: records };
}

export interface LoadedGroupFunctions {
  fileName: string;
  sourceFileHash: string;
  funcoes: ProverGroupFunction[];
}

export function loadProverGroupFunctions(filePath: string): LoadedGroupFunctions {
  const { fileName, sourceFileHash, records } = loadEntry<ProverGroupFunction>(
    filePath,
    "hierarquia_grupo_funcao.json",
  );
  return { fileName, sourceFileHash, funcoes: records };
}
