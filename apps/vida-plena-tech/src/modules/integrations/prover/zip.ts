import { readFileSync } from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import type { ProverPerson } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// LEITURA DO EXPORT Prover (LOCAL, SOMENTE LEITURA)
//
// Lê um ZIP exportado do Prover e extrai `pessoas.json`. Para conveniência de
// teste, também aceita um caminho direto para um `.json` (não é o fluxo real).
// NUNCA escreve no Prover nem em lugar nenhum.
// ─────────────────────────────────────────────────────────────────────────

export interface LoadedPessoas {
  fileName: string;
  pessoas: ProverPerson[];
}

/** Encontra a entrada `pessoas.json` no ZIP (raiz ou subpasta). */
function findPessoasEntry(zip: AdmZip): AdmZip.IZipEntry | null {
  const entries = zip.getEntries();
  return (
    entries.find((e) => e.entryName.toLowerCase().endsWith("pessoas.json")) ?? null
  );
}

export function loadProverPessoas(filePath: string): LoadedPessoas {
  const fileName = path.basename(filePath);
  let jsonText: string;

  if (filePath.toLowerCase().endsWith(".zip")) {
    let zip: AdmZip;
    try {
      zip = new AdmZip(filePath);
    } catch {
      throw new Error(`Não foi possível abrir o ZIP: ${filePath}`);
    }
    const entry = findPessoasEntry(zip);
    if (!entry) {
      throw new Error("Arquivo `pessoas.json` não encontrado dentro do ZIP.");
    }
    jsonText = zip.readAsText(entry);
  } else if (filePath.toLowerCase().endsWith(".json")) {
    // Conveniência de teste: caminho direto para um pessoas.json
    try {
      jsonText = readFileSync(filePath, "utf8");
    } catch {
      throw new Error(`Não foi possível ler o arquivo JSON: ${filePath}`);
    }
  } else {
    throw new Error(
      "Informe um arquivo .zip do Prover (ou um .json de teste com pessoas).",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("`pessoas.json` não é um JSON válido.");
  }

  // Aceita array direto OU objeto { pessoas: [...] } / { data: [...] }
  const pessoas =
    Array.isArray(parsed)
      ? parsed
      : (parsed as { pessoas?: unknown; data?: unknown })?.pessoas ??
        (parsed as { data?: unknown })?.data;

  if (!Array.isArray(pessoas)) {
    throw new Error(
      "`pessoas.json` deve conter um array de pessoas (ou { pessoas: [...] }).",
    );
  }

  return { fileName, pessoas: pessoas as ProverPerson[] };
}
