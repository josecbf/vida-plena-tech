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
// pessoa. SÓ grava ImportBatch + ImportBatchItem (estruturados) e devolve o
// relatório. Dedup SIMULADA (somente leitura). Sem merge automático. Sem apply.
//
// Os campos estruturados (operation/matchStrategy/severity/normalizedJson/
// warningsJson/errorsJson) são a FONTE DA VERDADE; `message` é só resumo legível.
// ─────────────────────────────────────────────────────────────────────────

export type ItemClassification =
  | "WOULD_CREATE"
  | "MATCHED_BY_EXTERNAL_MAPPING"
  | "MATCHED_BY_CPF"
  | "POSSIBLE_DUPLICATE_REVIEW"
  | "SKIPPED"
  | "FAILED";

// Strings batem com os enums Prisma (ImportOperation/MatchStrategy/ImportSeverity).
type Operation = "WOULD_CREATE" | "WOULD_UPDATE" | "WOULD_SKIP" | "MATCHED" | "FAILED";
type Strategy = "EXTERNAL_MAPPING" | "CPF" | "NAME_CONTACT_BIRTHDATE" | "NONE";
type Severity = "INFO" | "WARNING" | "CONFLICT" | "ERROR";
type CoarseStatus = "PENDING" | "MATCHED" | "SKIPPED" | "FAILED";

export interface ItemFields {
  operation: Operation;
  matchStrategy: Strategy;
  severity: Severity;
  coarseStatus: CoarseStatus;
  externalType: string;
  targetType: string;
  message: string;
  warningsJson: { pendencies: string[]; warnings: string[] };
  errorsJson: string[];
}

export interface DryRunReport {
  batchId: string;
  fileName: string;
  totalRead: number;
  wouldCreate: number;
  matchedByExternalMapping: number;
  matchedByCpf: number;
  possibleDuplicate: number;
  warnings: number;
  conflicts: number;
  cpf: { valid: number; missing: number; invalid: number; placeholder: number };
  memberMissingValidCpf: number;
  memberAwaitingGc: number;
  intendedRoles: Record<IntendedRole, number>;
  failed: number;
}

/**
 * PURA: deriva os campos estruturados do item a partir da pessoa normalizada,
 * da classificação de dedup e de erros estruturais. Testável sem DB.
 */
export function deriveItemFields(
  n: NormalizedProverPerson,
  cls: ItemClassification,
  errors: string[] = [],
): ItemFields {
  let operation: Operation;
  let matchStrategy: Strategy;
  let coarseStatus: CoarseStatus;

  switch (cls) {
    case "MATCHED_BY_EXTERNAL_MAPPING":
      operation = "MATCHED";
      matchStrategy = "EXTERNAL_MAPPING";
      coarseStatus = "MATCHED";
      break;
    case "MATCHED_BY_CPF":
      operation = "MATCHED";
      matchStrategy = "CPF";
      coarseStatus = "MATCHED";
      break;
    case "POSSIBLE_DUPLICATE_REVIEW":
      operation = "WOULD_SKIP";
      matchStrategy = "NAME_CONTACT_BIRTHDATE";
      coarseStatus = "SKIPPED";
      break;
    case "FAILED":
      operation = "FAILED";
      matchStrategy = "NONE";
      coarseStatus = "FAILED";
      break;
    case "SKIPPED":
      operation = "WOULD_SKIP";
      matchStrategy = "NONE";
      coarseStatus = "SKIPPED";
      break;
    default: // WOULD_CREATE
      operation = "WOULD_CREATE";
      matchStrategy = "NONE";
      coarseStatus = "PENDING";
  }

  let severity: Severity;
  if (cls === "FAILED") severity = "ERROR";
  else if (cls === "POSSIBLE_DUPLICATE_REVIEW") severity = "CONFLICT";
  else if (n.warnings.length > 0 || n.pendencies.length > 0) severity = "WARNING";
  else severity = "INFO";

  const message = [
    `[${cls}]`,
    `op=${operation}`,
    `match=${matchStrategy}`,
    `sev=${severity}`,
    `status=${n.candidateStatus}`,
    `cpf=${n.cpf.class}`,
    `roles=${n.intendedRoles.join(",") || "-"}`,
    `pend=${n.pendencies.join(",") || "-"}`,
  ].join(" ");

  return {
    operation,
    matchStrategy,
    severity,
    coarseStatus,
    externalType: "person",
    targetType: "Person",
    message,
    warningsJson: { pendencies: n.pendencies, warnings: n.warnings },
    errorsJson: errors,
  };
}

/**
 * Executa o dry-run de Pessoas. `prisma` é injetado (o CLI cria a instância).
 */
export async function runPessoasDryRun(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    pessoas: ProverPerson[];
    sourceFileHash?: string;
  },
): Promise<DryRunReport> {
  const { tenantId, fileName, pessoas, sourceFileHash } = opts;

  const report: DryRunReport = {
    batchId: "",
    fileName,
    totalRead: pessoas.length,
    wouldCreate: 0,
    matchedByExternalMapping: 0,
    matchedByCpf: 0,
    possibleDuplicate: 0,
    warnings: 0,
    conflicts: 0,
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

  const batch = await prisma.importBatch.create({
    data: {
      tenantId,
      mode: "DRY_RUN",
      system: "PROVER",
      status: "PROCESSING",
      fileName,
      sourceFileHash: sourceFileHash ?? null,
      total: pessoas.length,
    },
  });
  report.batchId = batch.id;

  for (let i = 0; i < pessoas.length; i++) {
    const raw = pessoas[i] ?? ({} as ProverPerson);
    try {
      const n = normalizeProverPerson(raw);
      const externalId = n.externalId?.trim() || `NO_UUID:${i}`;
      if (!n.externalId?.trim()) n.warnings.push("registro sem pessoa_uuid (fallback gerado).");

      // contadores de CPF
      report.cpf[
        n.cpf.class.toLowerCase() as "valid" | "missing" | "invalid" | "placeholder"
      ]++;
      if (n.pendencies.includes("MEMBER_MISSING_VALID_CPF")) report.memberMissingValidCpf++;
      if (n.pendencies.includes("MEMBER_REQUIRES_GC_CONFIRMATION")) report.memberAwaitingGc++;
      for (const role of n.intendedRoles) report.intendedRoles[role]++;

      const errors: string[] = [];
      let cls: ItemClassification;
      let targetId: string | null = null;

      if (!n.fullName) {
        cls = "FAILED";
        errors.push("registro sem pessoa_nome.");
        report.failed++;
      } else {
        const r = await classify(prisma, tenantId, n);
        cls = r.cls;
        targetId = r.targetId;
        if (cls === "WOULD_CREATE") report.wouldCreate++;
        else if (cls === "MATCHED_BY_EXTERNAL_MAPPING") report.matchedByExternalMapping++;
        else if (cls === "MATCHED_BY_CPF") report.matchedByCpf++;
        else if (cls === "POSSIBLE_DUPLICATE_REVIEW") report.possibleDuplicate++;
      }

      const fields = deriveItemFields(n, cls, errors);
      if (fields.severity === "WARNING") report.warnings++;
      else if (fields.severity === "CONFLICT") report.conflicts++;

      await prisma.importBatchItem.create({
        data: {
          tenantId,
          batchId: batch.id,
          externalType: fields.externalType,
          externalId,
          operation: fields.operation,
          matchStrategy: fields.matchStrategy,
          severity: fields.severity,
          targetType: fields.targetType,
          targetId,
          normalizedJson: n as object,
          warningsJson: fields.warningsJson,
          errorsJson: fields.errorsJson,
          rawJson: raw as object,
          status: fields.coarseStatus,
          message: fields.message,
        },
      });
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({
        data: {
          tenantId,
          batchId: batch.id,
          externalType: "person",
          externalId: (raw as ProverPerson)?.pessoa_uuid ?? `NO_UUID:${i}`,
          operation: "FAILED",
          matchStrategy: "NONE",
          severity: "ERROR",
          rawJson: (raw as object) ?? {},
          errorsJson: [err instanceof Error ? err.message : "erro desconhecido"],
          status: "FAILED",
          message: `[FAILED] ${err instanceof Error ? err.message : "erro desconhecido"}`,
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMPLETED", // erro estrutural (sem pessoas.json / JSON inválido) falha antes daqui
      created: 0, // dry-run: nada criado
      matched: report.matchedByExternalMapping + report.matchedByCpf,
      skipped: report.possibleDuplicate,
      failed: report.failed,
      warnings: report.warnings,
      conflicts: report.conflicts,
      finishedAt: new Date(),
    },
  });

  return report;
}

/** Deduplicação SIMULADA (somente leitura). Devolve a estratégia e o alvo. */
async function classify(
  prisma: PrismaClient,
  tenantId: string,
  n: NormalizedProverPerson,
): Promise<{ cls: ItemClassification; targetId: string | null }> {
  // 1) ExternalMapping (idempotência)
  if (n.externalId?.trim()) {
    const mapped = await prisma.externalMapping.findFirst({
      where: { tenantId, system: "PROVER", externalType: "person", externalId: n.externalId },
      select: { internalId: true },
    });
    if (mapped) return { cls: "MATCHED_BY_EXTERNAL_MAPPING", targetId: mapped.internalId };
  }

  // 2) CPF válido → match por CPF
  if (n.cpf.class === "VALID" && n.cpf.clean) {
    const byCpf = await prisma.person.findFirst({
      where: { tenantId, cpf: n.cpf.clean },
      select: { id: true },
    });
    if (byCpf) return { cls: "MATCHED_BY_CPF", targetId: byCpf.id };
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
      if (possible) return { cls: "POSSIBLE_DUPLICATE_REVIEW", targetId: possible.id };
    }
  }

  return { cls: "WOULD_CREATE", targetId: null };
}
