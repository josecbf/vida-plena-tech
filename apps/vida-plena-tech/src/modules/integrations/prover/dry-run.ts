import type { PrismaClient } from "@prisma/client";
import type { ProverPerson } from "./types";
import {
  normalizeProverPerson,
  type IntendedRole,
  type NormalizedProverPerson,
} from "./normalize";

// ─────────────────────────────────────────────────────────────────────────
// IMPORTADOR Prover — FASE 1 (Pessoas) — MODO DRY-RUN
//
// NÃO cria/atualiza Person, contato, endereço, role, timeline nem audit de
// pessoa. SÓ grava ImportBatch + ImportBatchItem e devolve o relatório.
// Dedup é SIMULADA (apenas leitura). Sem merge automático. Sem modo apply.
//
// O schema de ImportBatchItem é "coarse" (PENDING/MATCHED/SKIPPED/FAILED).
// A classificação granular do dry-run vai em `message` (codificada). Ver a
// pendência "enriquecer schema de import" em docs/modules/prover-import-plan.md.
// ─────────────────────────────────────────────────────────────────────────

export type ItemClassification =
  | "WOULD_CREATE"
  | "MATCHED_BY_EXTERNAL_MAPPING"
  | "MATCHED_BY_CPF"
  | "POSSIBLE_DUPLICATE_REVIEW"
  | "SKIPPED"
  | "FAILED";

export interface DryRunReport {
  batchId: string;
  fileName: string;
  totalRead: number;
  wouldCreate: number;
  matchedByExternalMapping: number;
  matchedByCpf: number;
  possibleDuplicate: number;
  cpf: { valid: number; missing: number; invalid: number; placeholder: number };
  memberMissingValidCpf: number;
  memberAwaitingGc: number;
  intendedRoles: Record<IntendedRole, number>;
  failed: number;
}

const COARSE: Record<ItemClassification, "PENDING" | "MATCHED" | "SKIPPED" | "FAILED"> = {
  WOULD_CREATE: "PENDING", // dry-run: nada é criado
  MATCHED_BY_EXTERNAL_MAPPING: "MATCHED",
  MATCHED_BY_CPF: "MATCHED",
  POSSIBLE_DUPLICATE_REVIEW: "SKIPPED",
  SKIPPED: "SKIPPED",
  FAILED: "FAILED",
};

function buildMessage(
  cls: ItemClassification,
  n: NormalizedProverPerson,
): string {
  const roles = n.intendedRoles.length ? n.intendedRoles.join(",") : "-";
  const pend = n.pendencies.length ? n.pendencies.join(",") : "-";
  return [
    `[${cls}]`,
    `status=${n.candidateStatus}`,
    `cpf=${n.cpf.class}`,
    `roles=${roles}`,
    `pend=${pend}`,
    `warns=${n.warnings.length}`,
  ].join(" ");
}

/**
 * Executa o dry-run de Pessoas. `prisma` é injetado (o CLI cria a instância).
 */
export async function runPessoasDryRun(
  prisma: PrismaClient,
  opts: { tenantId: string; fileName: string; pessoas: ProverPerson[] },
): Promise<DryRunReport> {
  const { tenantId, fileName, pessoas } = opts;

  const report: DryRunReport = {
    batchId: "",
    fileName,
    totalRead: pessoas.length,
    wouldCreate: 0,
    matchedByExternalMapping: 0,
    matchedByCpf: 0,
    possibleDuplicate: 0,
    cpf: { valid: 0, missing: 0, invalid: 0, placeholder: 0 },
    memberMissingValidCpf: 0,
    memberAwaitingGc: 0,
    intendedRoles: {
      GC_LEADER: 0,
      SUPERVISOR: 0,
      COORDINATOR: 0,
      AREA_PASTOR: 0,
      SENIOR_PASTOR: 0,
    },
    failed: 0,
  };

  // 1) cria o ImportBatch (status PROCESSING)
  const batch = await prisma.importBatch.create({
    data: {
      tenantId,
      system: "PROVER",
      status: "PROCESSING",
      fileName, // este lote é DRY-RUN (modo apply ainda não existe — ver pendência)
      total: pessoas.length,
    },
  });
  report.batchId = batch.id;

  for (let i = 0; i < pessoas.length; i++) {
    const raw = pessoas[i] ?? ({} as ProverPerson);
    try {
      const n = normalizeProverPerson(raw);
      const externalId = n.externalId?.trim() || `NO_UUID:${i}`;
      if (!n.externalId?.trim()) {
        n.warnings.push("registro sem pessoa_uuid (fallback gerado).");
      }

      // contadores de CPF
      report.cpf[
        n.cpf.class.toLowerCase() as "valid" | "missing" | "invalid" | "placeholder"
      ]++;

      // contadores de pendência/papel
      if (n.pendencies.includes("MEMBER_MISSING_VALID_CPF")) report.memberMissingValidCpf++;
      if (n.pendencies.includes("MEMBER_REQUIRES_GC_CONFIRMATION")) report.memberAwaitingGc++;
      for (const role of n.intendedRoles) report.intendedRoles[role]++;

      let cls: ItemClassification;

      if (!n.fullName) {
        // registro sem nome não é importável
        cls = "FAILED";
        n.warnings.push("registro sem pessoa_nome.");
        report.failed++;
      } else {
        cls = await classify(prisma, tenantId, n);
        if (cls === "WOULD_CREATE") report.wouldCreate++;
        else if (cls === "MATCHED_BY_EXTERNAL_MAPPING") report.matchedByExternalMapping++;
        else if (cls === "MATCHED_BY_CPF") report.matchedByCpf++;
        else if (cls === "POSSIBLE_DUPLICATE_REVIEW") report.possibleDuplicate++;
      }

      await prisma.importBatchItem.create({
        data: {
          tenantId,
          batchId: batch.id,
          externalId,
          rawJson: raw as object,
          status: COARSE[cls],
          message: buildMessage(cls, n),
        },
      });
    } catch (err) {
      // erro inesperado no item: registra FAILED, não derruba o lote
      report.failed++;
      await prisma.importBatchItem.create({
        data: {
          tenantId,
          batchId: batch.id,
          externalId: (raw as ProverPerson)?.pessoa_uuid ?? `NO_UUID:${i}`,
          rawJson: (raw as object) ?? {},
          status: "FAILED",
          message: `[FAILED] ${err instanceof Error ? err.message : "erro desconhecido"}`,
        },
      });
    }
  }

  // 2) fecha o ImportBatch
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMPLETED", // erro estrutural (sem pessoas.json/JSON inválido) falha antes daqui
      created: 0, // dry-run: nada criado
      matched: report.matchedByExternalMapping + report.matchedByCpf,
      skipped: report.possibleDuplicate,
      failed: report.failed,
      finishedAt: new Date(),
    },
  });

  return report;
}

/** Deduplicação SIMULADA (somente leitura). Sem merge automático. */
async function classify(
  prisma: PrismaClient,
  tenantId: string,
  n: NormalizedProverPerson,
): Promise<ItemClassification> {
  // 1) ExternalMapping (idempotência)
  if (n.externalId?.trim()) {
    const mapped = await prisma.externalMapping.findFirst({
      where: {
        tenantId,
        system: "PROVER",
        externalType: "person",
        externalId: n.externalId,
      },
      select: { id: true },
    });
    if (mapped) return "MATCHED_BY_EXTERNAL_MAPPING";
  }

  // 2) CPF válido → match por CPF
  if (n.cpf.class === "VALID" && n.cpf.clean) {
    const byCpf = await prisma.person.findFirst({
      where: { tenantId, cpf: n.cpf.clean },
      select: { id: true },
    });
    if (byCpf) return "MATCHED_BY_CPF";
  }

  // 3) sem CPF válido → possível duplicidade por nome + contato (+ nascimento)
  if (n.cpf.class !== "VALID") {
    const contactValues = [n.email, n.phone].filter(Boolean) as string[];
    if (contactValues.length > 0) {
      const possible = await prisma.person.findFirst({
        where: {
          tenantId,
          fullName: { equals: n.fullName, mode: "insensitive" },
          contacts: { some: { value: { in: contactValues } } },
          ...(n.birthDate ? { birthDate: new Date(n.birthDate) } : {}),
        },
        select: { id: true },
      });
      if (possible) return "POSSIBLE_DUPLICATE_REVIEW";
    }
  }

  // 4) nada encontrado → seria criado
  return "WOULD_CREATE";
}
