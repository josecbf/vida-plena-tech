import type { PrismaClient, Prisma } from "@prisma/client";
import type { ProverPerson } from "./types";
import {
  normalizeProverPerson,
  appliedStatus,
  type IntendedRole,
  type NormalizedProverPerson,
} from "./normalize";

// ─────────────────────────────────────────────────────────────────────────
// IMPORTADOR Prover — FASE 1B — APPLY CONTROLADO DE PESSOAS
//
// Cria/atualiza Person + contatos + Address + ExternalMapping, com AuditLog e
// Timeline. Idempotente (ExternalMapping → CPF → create). NUNCA: escreve no
// Prover, cria login/User, cria RoleAssignment real, promove MEMBER oficial
// sem GC, importa GC/eventos/ensino. Cada item falha isoladamente.
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Operation = "CREATE" | "UPDATE" | "MATCHED" | "SKIP" | "FAILED";
type Strategy = "EXTERNAL_MAPPING" | "CPF" | "NAME_CONTACT_BIRTHDATE" | "NONE";
type Severity = "INFO" | "WARNING" | "CONFLICT" | "ERROR";
type CoarseStatus = "CREATED" | "MATCHED" | "SKIPPED" | "FAILED";

export interface ApplyReport {
  batchId: string;
  fileName: string;
  totalRead: number;
  created: number;
  updatedByMapping: number;
  linkedByCpf: number;
  skipped: number;
  failed: number;
  warnings: number;
  conflicts: number;
  possibleDuplicateSkipped: number;
  cpf: { valid: number; missing: number; invalid: number; placeholder: number };
  memberMissingValidCpf: number;
  memberAwaitingGc: number;
  intendedRoles: Record<IntendedRole, number>;
  /** Status aplicado SÓ deste batch (CREATE/UPDATE/MATCHED). Soma = criados+atualizados+vinculados. */
  byStatus: Record<string, number>;
}

const COARSE: Record<Operation, CoarseStatus> = {
  CREATE: "CREATED",
  UPDATE: "MATCHED",
  MATCHED: "MATCHED",
  SKIP: "SKIPPED",
  FAILED: "FAILED",
};

const STRATEGY: Record<Operation, Strategy> = {
  CREATE: "NONE",
  UPDATE: "EXTERNAL_MAPPING",
  MATCHED: "CPF",
  SKIP: "NAME_CONTACT_BIRTHDATE",
  FAILED: "NONE",
};

function isoBirth(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Monta o `data` de UPDATE conservador. `isOurMapping`=pessoa criada por nós antes. */
function buildUpdateData(
  existing: {
    fullName: string;
    cpf: string | null;
    birthDate: Date | null;
    sex: string | null;
    maritalStatus: string | null;
    isBaptized: boolean;
    hasTD: boolean;
  },
  n: NormalizedProverPerson,
  isOurMapping: boolean,
): { data: Prisma.PersonUpdateInput; warnings: string[] } {
  const data: Prisma.PersonUpdateInput = {};
  const warnings: string[] = [];
  const proverCpf = n.cpf.class === "VALID" ? n.cpf.clean : null;

  const consider = (
    field: string,
    existingVal: string | null,
    proverVal: string | null,
    overwrite: boolean,
  ) => {
    if (proverVal == null) return;
    if (existingVal == null || existingVal === "") {
      (data as Record<string, unknown>)[field] = proverVal;
    } else if (existingVal !== proverVal) {
      if (overwrite) (data as Record<string, unknown>)[field] = proverVal;
      else warnings.push(`LOCAL_VALUE_DIFFERS_FROM_PROVER:${field}`);
    }
  };

  consider("fullName", existing.fullName, n.fullName || null, isOurMapping);
  consider("cpf", existing.cpf, proverCpf, false); // CPF nunca sobrescreve diferente
  // birthDate (compara em ISO)
  if (n.birthDate) {
    const exIso = isoBirth(existing.birthDate);
    if (!exIso) data.birthDate = new Date(n.birthDate);
    else if (exIso !== n.birthDate)
      warnings.push("LOCAL_VALUE_DIFFERS_FROM_PROVER:birthDate");
  }
  consider("sex", existing.sex, n.sex, isOurMapping);
  consider("maritalStatus", existing.maritalStatus, n.maritalStatus, isOurMapping);

  // status: só atualiza se for nossa própria importação (idempotente); senão preserva
  if (isOurMapping) data.status = appliedStatus(n);

  // batismo / TD: add-only (nunca rebaixa)
  if (n.isBaptized && !existing.isBaptized) data.isBaptized = true;
  if (n.hasTD && !existing.hasTD) data.hasTD = true;

  return { data, warnings };
}

async function upsertContact(
  tx: Tx,
  tenantId: string,
  personId: string,
  type: "EMAIL" | "WHATSAPP",
  value: string | null,
) {
  const v = value?.trim();
  if (!v) return;
  // idempotente por valor: não duplica o mesmo contato; não apaga contatos locais
  const exists = await tx.contactMethod.findFirst({
    where: { tenantId, personId, value: v },
    select: { id: true },
  });
  if (!exists) {
    await tx.contactMethod.create({ data: { tenantId, personId, type, value: v } });
  }
}

async function ensureAddress(
  tx: Tx,
  tenantId: string,
  personId: string,
  n: NormalizedProverPerson,
) {
  if (!n.address) return;
  const exists = await tx.address.findFirst({
    where: { tenantId, personId },
    select: { id: true },
  });
  if (!exists) {
    await tx.address.create({ data: { tenantId, personId, ...n.address } });
  }
}

export async function runPessoasApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    pessoas: ProverPerson[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
    chunkSize?: number;
  },
): Promise<ApplyReport> {
  const { tenantId, fileName, sourceFileHash, actorUserId = null } = opts;
  const all = opts.limit ? opts.pessoas.slice(0, opts.limit) : opts.pessoas;
  const chunkSize = opts.chunkSize ?? 500;

  const report: ApplyReport = {
    batchId: "",
    fileName,
    totalRead: all.length,
    created: 0,
    updatedByMapping: 0,
    linkedByCpf: 0,
    skipped: 0,
    failed: 0,
    warnings: 0,
    conflicts: 0,
    possibleDuplicateSkipped: 0,
    cpf: { valid: 0, missing: 0, invalid: 0, placeholder: 0 },
    memberMissingValidCpf: 0,
    memberAwaitingGc: 0,
    intendedRoles: { GC_LEADER: 0, SUPERVISOR: 0, COORDINATOR: 0, AREA_PASTOR: 0, SENIOR_PASTOR: 0 },
    byStatus: {},
  };

  const batch = await prisma.importBatch.create({
    data: {
      tenantId,
      mode: "APPLY",
      system: "PROVER",
      status: "PROCESSING",
      fileName,
      sourceFileHash: sourceFileHash ?? null,
      total: all.length,
    },
  });
  report.batchId = batch.id;

  for (let start = 0; start < all.length; start += chunkSize) {
    const chunk = all.slice(start, start + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      const raw = chunk[j] ?? ({} as ProverPerson);
      const n = normalizeProverPerson(raw);

      // contadores de registro (independem do sucesso da escrita)
      report.cpf[n.cpf.class.toLowerCase() as "valid" | "missing" | "invalid" | "placeholder"]++;
      if (n.pendencies.includes("MEMBER_MISSING_VALID_CPF")) report.memberMissingValidCpf++;
      if (n.pendencies.includes("MEMBER_REQUIRES_GC_CONFIRMATION")) report.memberAwaitingGc++;
      for (const role of n.intendedRoles) report.intendedRoles[role]++;

      try {
        const outcome = await prisma.$transaction((tx) =>
          processOne(tx, { tenantId, batchId: batch.id, actorUserId, n, raw }),
        );
        if (outcome.op === "CREATE") report.created++;
        else if (outcome.op === "UPDATE") report.updatedByMapping++;
        else if (outcome.op === "MATCHED") report.linkedByCpf++;
        else if (outcome.op === "SKIP") {
          report.skipped++;
          report.possibleDuplicateSkipped++;
        }
        if (outcome.severity === "WARNING") report.warnings++;
        else if (outcome.severity === "CONFLICT") report.conflicts++;
        // breakdown de status SÓ deste batch (itens efetivamente importados/vinculados)
        if (outcome.appliedStatus) {
          report.byStatus[outcome.appliedStatus] =
            (report.byStatus[outcome.appliedStatus] ?? 0) + 1;
        }
      } catch (err) {
        report.failed++;
        await prisma.importBatchItem.create({
          data: {
            tenantId,
            batchId: batch.id,
            externalType: "person",
            externalId: n.externalId?.trim() || `NO_UUID:${start + j}`,
            operation: "FAILED",
            matchStrategy: "NONE",
            severity: "ERROR",
            rawJson: raw as object,
            errorsJson: [err instanceof Error ? err.message : "erro desconhecido"],
            status: "FAILED",
            message: `[FAILED] ${err instanceof Error ? err.message : "erro"}`,
          },
        });
      }
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMPLETED",
      created: report.created,
      matched: report.updatedByMapping + report.linkedByCpf,
      skipped: report.skipped,
      failed: report.failed,
      warnings: report.warnings,
      conflicts: report.conflicts,
      finishedAt: new Date(),
    },
  });

  return report;
}

/** Processa UMA pessoa dentro de uma transação. Retorna a operação aplicada. */
async function processOne(
  tx: Tx,
  ctx: {
    tenantId: string;
    batchId: string;
    actorUserId: string | null;
    n: NormalizedProverPerson;
    raw: ProverPerson;
  },
): Promise<{ op: Operation; severity: Severity; appliedStatus: string | null }> {
  const { tenantId, batchId, actorUserId, n, raw } = ctx;
  const errors: string[] = [];
  const extraWarnings: string[] = [];

  // sem nome ou sem uuid → FAILED (não cria mapping falso)
  if (!n.fullName) errors.push("registro sem pessoa_nome.");
  if (!n.externalId?.trim()) errors.push("registro sem pessoa_uuid (não cria mapping).");

  let op: Operation = "CREATE";
  let personId: string | null = null;
  let resultStatus: string | null = null; // status do registro importado/vinculado neste batch

  if (errors.length > 0) {
    op = "FAILED";
  } else {
    const proverCpfValid = n.cpf.class === "VALID" ? n.cpf.clean : null;

    // 1) ExternalMapping (idempotência)
    const mapping = await tx.externalMapping.findFirst({
      where: { tenantId, system: "PROVER", externalType: "person", externalId: n.externalId },
      select: { internalId: true },
    });

    if (mapping) {
      op = "UPDATE";
      personId = mapping.internalId;
    } else if (proverCpfValid) {
      // 2) match por CPF válido → vincula
      const byCpf = await tx.person.findFirst({
        where: { tenantId, cpf: proverCpfValid },
        select: { id: true },
      });
      if (byCpf) {
        op = "MATCHED";
        personId = byCpf.id;
      }
    }

    // 3) sem match → possível duplicidade por nome+contato → SKIP (não mescla)
    if (op === "CREATE" && n.cpf.class !== "VALID") {
      const contactValues = [n.email, n.phone].filter(Boolean) as string[];
      if (contactValues.length > 0) {
        const possible = await tx.person.findFirst({
          where: {
            tenantId,
            fullName: { equals: n.fullName, mode: "insensitive" },
            contacts: { some: { value: { in: contactValues } } },
            ...(n.birthDate ? { birthDate: new Date(n.birthDate) } : {}),
          },
          select: { id: true },
        });
        if (possible) {
          op = "SKIP";
          personId = possible.id;
          extraWarnings.push("POSSIBLE_DUPLICATE_REVIEW");
        }
      }
    }

    // --- escrita conforme a operação ---
    if (op === "CREATE") {
      const created = await tx.person.create({
        data: {
          tenantId,
          fullName: n.fullName,
          cpf: proverCpfValid,
          birthDate: n.birthDate ? new Date(n.birthDate) : null,
          sex: n.sex,
          maritalStatus: n.maritalStatus,
          status: appliedStatus(n),
          isBaptized: n.isBaptized,
          hasTD: n.hasTD,
          source: "PROVER_IMPORT",
        },
      });
      personId = created.id;
      resultStatus = appliedStatus(n);
      await tx.externalMapping.create({
        data: {
          tenantId,
          system: "PROVER",
          externalType: "person",
          externalId: n.externalId,
          internalType: "Person",
          internalId: personId,
        },
      });
      await tx.personStatusHistory.create({
        data: { tenantId, personId, toStatus: appliedStatus(n), reason: "Importado do Prover" },
      });
      await upsertContact(tx, tenantId, personId, "EMAIL", n.email);
      await upsertContact(tx, tenantId, personId, "WHATSAPP", n.phone);
      await ensureAddress(tx, tenantId, personId, n);
      await tx.timelineEntry.create({
        data: { tenantId, personId, type: "IMPORTED_FROM_PROVER", title: "Importado do Prover", description: `batch ${batchId}` },
      });
      await writeImportAudit(tx, { tenantId, actorUserId, personId, action: "import_create", hasCpf: !!proverCpfValid, batchId });
    } else if (op === "UPDATE" || op === "MATCHED") {
      const existing = await tx.person.findUniqueOrThrow({ where: { id: personId! } });
      const { data, warnings } = buildUpdateData(existing, n, op === "UPDATE");
      extraWarnings.push(...warnings);
      if (Object.keys(data).length > 0) {
        await tx.person.update({ where: { id: personId! }, data });
      }
      // UPDATE (nossa importação) aplica appliedStatus; MATCHED preserva o status local
      resultStatus = op === "UPDATE" ? appliedStatus(n) : existing.status;
      if (op === "MATCHED") {
        // primeira vinculação: cria o mapping
        await tx.externalMapping.create({
          data: { tenantId, system: "PROVER", externalType: "person", externalId: n.externalId, internalType: "Person", internalId: personId! },
        });
        await tx.timelineEntry.create({
          data: { tenantId, personId: personId!, type: "IMPORTED_FROM_PROVER", title: "Vinculado ao Prover (por CPF)", description: `batch ${batchId}` },
        });
      }
      await upsertContact(tx, tenantId, personId!, "EMAIL", n.email);
      await upsertContact(tx, tenantId, personId!, "WHATSAPP", n.phone);
      await ensureAddress(tx, tenantId, personId!, n);
      await writeImportAudit(tx, { tenantId, actorUserId, personId: personId!, action: "import_update", hasCpf: n.cpf.class === "VALID", batchId });
    }
    // op === "SKIP": nenhuma escrita em Person (não mescla)
  }

  // severidade
  let severity: Severity;
  if (op === "FAILED") severity = "ERROR";
  else if (op === "SKIP") severity = "CONFLICT";
  else if (n.warnings.length > 0 || n.pendencies.length > 0 || extraWarnings.length > 0)
    severity = "WARNING";
  else severity = "INFO";

  await tx.importBatchItem.create({
    data: {
      tenantId,
      batchId,
      externalType: "person",
      externalId: n.externalId?.trim() || "NO_UUID",
      operation: op,
      matchStrategy: STRATEGY[op],
      severity,
      targetType: "Person",
      targetId: personId,
      normalizedJson: n as object,
      warningsJson: { pendencies: n.pendencies, warnings: [...n.warnings, ...extraWarnings] },
      errorsJson: errors,
      rawJson: raw as object,
      status: COARSE[op],
      message: `[${op}] match=${STRATEGY[op]} sev=${severity} status=${n.candidateStatus} cpf=${n.cpf.class} roles=${n.intendedRoles.join(",") || "-"}`,
    },
  });

  return { op, severity, appliedStatus: resultStatus };
}

async function writeImportAudit(
  tx: Tx,
  a: { tenantId: string; actorUserId: string | null; personId: string; action: string; hasCpf: boolean; batchId: string },
) {
  await tx.auditLog.create({
    data: {
      tenantId: a.tenantId,
      actorUserId: a.actorUserId, // null = sistema/importador (nunca cria login)
      module: "people",
      action: a.action,
      entityType: "Person",
      entityId: a.personId,
      sensitivity: a.hasCpf ? "CONFIDENTIAL" : "INTERNAL",
      reason: `Importação Prover (batch ${a.batchId})`,
      afterJson: { source: "PROVER", batchId: a.batchId },
    },
  });
}
