import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient, Prisma } from "@prisma/client";
import type { ProverPerson, ProverGcParticipant, ProverGcVisitor } from "./types";
import { normalizeProverPerson, normalizeNameKey, type CpfClass } from "./normalize";
import { normalizeGcParticipant, normalizeGcVisitor } from "./normalize-gc-membership";

// ─────────────────────────────────────────────────────────────────────────
// FASE 3A.3 — ALIAS de ExternalMapping para UUIDs DUPLICADOS do Prover
//
// A Fase 3A.2 concluiu que os PERSON_MAPPING_NOT_FOUND são aliases: o UUID
// secundário foi SKIPPED_POSSIBLE_DUPLICATE e aponta (via ImportBatchItem
// anterior) para uma Person que JÁ está mapeada a um UUID primário. Esta fase
// cria SOMENTE o ExternalMapping secundário → mesma Person. NÃO é merge, NÃO
// cria/altera Person, status, GrowthGroupMembership, User nem RoleAssignment.
// Apenas ensina o sistema que dois UUIDs do Prover são a mesma pessoa interna.
// Arquivos vão FORA do git (tmp/).
// ─────────────────────────────────────────────────────────────────────────

export type CpfStatus = "valid" | "invalid" | "placeholder" | "missing";
export type AliasConfidence = "SAFE" | "UNSAFE";
export type AliasAction = "CREATE_ALIAS_MAPPING" | "REVIEW_MANUALLY";

const CPF_STATUS: Record<CpfClass, CpfStatus> = {
  VALID: "valid",
  INVALID: "invalid",
  PLACEHOLDER: "placeholder",
  MISSING: "missing",
};

export interface AliasRow {
  pessoaUuid: string; // UUID secundário (duplicado)
  proverName: string;
  cpfStatus: CpfStatus;
  priorOperation: string | null;
  sourceImportBatchItemId: string | null;
  targetPersonId: string | null;
  targetPersonName: string | null;
  primaryProverUuid: string | null; // UUID(s) já mapeado(s) à Person
  confidence: AliasConfidence;
  recommendedAction: AliasAction;
  warnings: string[];
  linkRefs: { participant: number; visitor: number };
  raw: object;
}

export interface AliasAnalysis {
  summary: {
    referencedUuids: number;
    referencedUnmapped: number;
    inPessoasJson: number;
    safe: number; // CREATE_ALIAS_MAPPING
    reviewManually: number;
  };
  rows: AliasRow[];
}

/** Nomes compatíveis: iguais, ou os tokens do mais curto contidos no mais longo. */
function namesCompatible(a: string, b: string): boolean {
  const ka = normalizeNameKey(a);
  const kb = normalizeNameKey(b);
  if (!ka || !kb) return true;
  if (ka === kb) return true;
  const ta = ka.split(" ").filter(Boolean);
  const tb = kb.split(" ").filter(Boolean);
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const longSet = new Set(long);
  return short.every((t) => longSet.has(t));
}

export async function analyzeAliasMapping(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    pessoas: ProverPerson[];
    participantes: ProverGcParticipant[];
    visitantes: ProverGcVisitor[];
  },
): Promise<AliasAnalysis> {
  const { tenantId, pessoas, participantes, visitantes } = opts;

  // 1) uuids referenciados em vínculos de GC (+ contagem por origem)
  const partRefs = new Map<string, number>();
  const visRefs = new Map<string, number>();
  for (const raw of participantes) {
    const u = normalizeGcParticipant(raw).personUuid;
    if (u) partRefs.set(u, (partRefs.get(u) ?? 0) + 1);
  }
  for (const raw of visitantes) {
    const u = normalizeGcVisitor(raw).personUuid;
    if (u) visRefs.set(u, (visRefs.get(u) ?? 0) + 1);
  }
  const referencedUuids = new Set<string>([...partRefs.keys(), ...visRefs.keys()]);

  // 2) excluir os que já têm ExternalMapping de person (= PERSON_MAPPING_NOT_FOUND)
  const existing = await prisma.externalMapping.findMany({
    where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: [...referencedUuids] } },
    select: { externalId: true },
  });
  const mappedUuids = new Set(existing.map((m) => m.externalId));
  const unmappedUuids = [...referencedUuids].filter((u) => !mappedUuids.has(u));

  // 3) interseção com pessoas.json
  const pessoasByUuid = new Map<string, ProverPerson>();
  for (const p of pessoas) if (p?.pessoa_uuid) pessoasByUuid.set(p.pessoa_uuid, p);
  const targetUuids = unmappedUuids.filter((u) => pessoasByUuid.has(u));

  // 4) ImportBatchItem mais recente por externalId (precisa de id + targetId + operation)
  const priorItems = await prisma.importBatchItem.findMany({
    where: { tenantId, externalType: "person", externalId: { in: targetUuids } },
    orderBy: { createdAt: "desc" },
    select: { id: true, externalId: true, operation: true, targetId: true },
  });
  const priorByUuid = new Map<string, (typeof priorItems)[number]>();
  for (const it of priorItems) {
    if (it.externalId && !priorByUuid.has(it.externalId)) priorByUuid.set(it.externalId, it);
  }

  const rows: AliasRow[] = [];

  for (const uuid of targetUuids) {
    const raw = pessoasByUuid.get(uuid)!;
    const n = normalizeProverPerson(raw);
    const prior = priorByUuid.get(uuid) ?? null;
    const priorOp = prior?.operation ?? null;
    const priorTargetId = prior?.targetId ?? null;
    const warnings: string[] = [];

    let targetPersonId: string | null = null;
    let targetPersonName: string | null = null;
    let primaryProverUuid: string | null = null;
    let confidence: AliasConfidence = "UNSAFE";
    let action: AliasAction = "REVIEW_MANUALLY";

    // critério 3: evidência de importação anterior do tipo SKIP (possível duplicidade)
    const hasSkipEvidence = priorOp === "SKIP" && !!priorTargetId;
    if (!hasSkipEvidence) {
      warnings.push(priorOp ? `NO_SKIP_EVIDENCE_PRIOR_OP_${priorOp}` : "NO_PRIOR_IMPORT_ITEM");
    } else {
      // critério 4/5: targetId aponta para uma Person existente
      const person = await prisma.person.findFirst({
        where: { tenantId, id: priorTargetId! },
        select: { id: true, fullName: true },
      });
      if (!person) {
        warnings.push("TARGET_PERSON_MISSING");
      } else {
        // critério 6: a Person já tem ≥1 ExternalMapping Prover de person (UUID primário)
        const primaryMaps = await prisma.externalMapping.findMany({
          where: { tenantId, system: "PROVER", externalType: "person", internalId: person.id, externalId: { not: uuid } },
          select: { externalId: true },
        });
        // critério 8: nome compatível
        const nameOk = namesCompatible(n.fullName, person.fullName);
        // critério 9: não há OUTRA Person candidata mais segura (CPF válido ou nome+contato divergente)
        const competing = await findCompetingCandidate(prisma, tenantId, n, person.id);

        if (primaryMaps.length === 0) {
          warnings.push("TARGET_HAS_NO_PRIMARY_MAPPING"); // não é alias: seria a 1ª importação
        } else if (!nameOk) {
          warnings.push("NAME_CONFLICT");
        } else if (competing) {
          warnings.push(`COMPETING_SAFER_CANDIDATE:${competing}`);
        } else {
          // todos os critérios satisfeitos → ALIAS SEGURO
          targetPersonId = person.id;
          targetPersonName = person.fullName;
          primaryProverUuid = primaryMaps.map((m) => m.externalId).join("|");
          confidence = "SAFE";
          action = "CREATE_ALIAS_MAPPING";
        }
      }
    }

    rows.push({
      pessoaUuid: uuid,
      proverName: n.fullName,
      cpfStatus: CPF_STATUS[n.cpf.class],
      priorOperation: priorOp,
      sourceImportBatchItemId: prior?.id ?? null,
      targetPersonId,
      targetPersonName,
      primaryProverUuid,
      confidence,
      recommendedAction: action,
      warnings,
      linkRefs: { participant: partRefs.get(uuid) ?? 0, visitor: visRefs.get(uuid) ?? 0 },
      raw: raw as object,
    });
  }

  return {
    summary: {
      referencedUuids: referencedUuids.size,
      referencedUnmapped: unmappedUuids.length,
      inPessoasJson: targetUuids.length,
      safe: rows.filter((r) => r.recommendedAction === "CREATE_ALIAS_MAPPING").length,
      reviewManually: rows.filter((r) => r.recommendedAction === "REVIEW_MANUALLY").length,
    },
    rows,
  };
}

/**
 * Existe uma Person candidata DIFERENTE do alvo da evidência que seria um match
 * mais forte (CPF válido) ou um match por nome+contato apontando para outra
 * pessoa? Retorna o id da candidata divergente, ou null se não houver conflito.
 */
async function findCompetingCandidate(
  prisma: PrismaClient,
  tenantId: string,
  n: ReturnType<typeof normalizeProverPerson>,
  evidencePersonId: string,
): Promise<string | null> {
  if (n.cpf.class === "VALID" && n.cpf.clean) {
    const byCpf = await prisma.person.findFirst({ where: { tenantId, cpf: n.cpf.clean }, select: { id: true } });
    if (byCpf && byCpf.id !== evidencePersonId) return byCpf.id;
  }
  const contactValues = [n.email, n.phone].filter(Boolean) as string[];
  if (n.fullName && contactValues.length > 0) {
    const byNameContact = await prisma.person.findMany({
      where: {
        tenantId,
        fullName: { equals: n.fullName, mode: "insensitive" },
        contacts: { some: { value: { in: contactValues } } },
        ...(n.birthDate ? { birthDate: new Date(n.birthDate) } : {}),
      },
      select: { id: true },
    });
    const divergent = byNameContact.find((p) => p.id !== evidencePersonId);
    if (divergent) return divergent.id;
  }
  return null;
}

// ── escrita dos arquivos (FORA do git: tmp/) ──────────────────────────────

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeAliasReport(
  analysis: AliasAnalysis,
  outDir: string,
): { jsonPath: string; csvPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "person-alias-mapping.json");
  const csvPath = path.join(outDir, "person-alias-mapping.csv");

  writeFileSync(jsonPath, JSON.stringify({ summary: analysis.summary, rows: analysis.rows }, null, 2));

  const header = [
    "pessoaUuid", "proverName", "cpfStatus", "priorOperation", "sourceImportBatchItemId",
    "targetPersonId", "targetPersonName", "primaryProverUuid", "confidence",
    "recommendedAction", "participantRefs", "visitorRefs", "warnings",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of analysis.rows) {
    lines.push([
      r.pessoaUuid, r.proverName, r.cpfStatus, r.priorOperation ?? "", r.sourceImportBatchItemId ?? "",
      r.targetPersonId ?? "", r.targetPersonName ?? "", r.primaryProverUuid ?? "", r.confidence,
      r.recommendedAction, r.linkRefs.participant, r.linkRefs.visitor, r.warnings.join("|"),
    ].map(csvCell).join(","));
  }
  writeFileSync(csvPath, lines.join("\n"));

  return { jsonPath, csvPath };
}

// ── APPLY controlado: cria SOMENTE ExternalMapping (ALIAS), idempotente ───

type Tx = Prisma.TransactionClient;

export interface AliasApplyReport {
  batchId: string;
  analyzed: number;
  safe: number;
  created: number;
  alreadyMapped: number;
  reviewManually: number;
  conflictsAtApply: number;
  failed: number;
}

export async function applyAliasMapping(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    pessoas: ProverPerson[];
    participantes: ProverGcParticipant[];
    visitantes: ProverGcVisitor[];
    sourceFileHash?: string;
    actorUserId?: string | null;
  },
): Promise<{ report: AliasApplyReport; analysis: AliasAnalysis }> {
  const { tenantId, fileName, pessoas, participantes, visitantes, sourceFileHash, actorUserId = null } = opts;

  // re-analisa SEMPRE (idempotência: uuids já mapeados saem do alvo)
  const analysis = await analyzeAliasMapping(prisma, { tenantId, pessoas, participantes, visitantes });
  const safeRows = analysis.rows.filter((r) => r.recommendedAction === "CREATE_ALIAS_MAPPING" && r.targetPersonId);

  const batch = await prisma.importBatch.create({
    data: {
      tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING",
      fileName, sourceFileHash: sourceFileHash ?? null, total: safeRows.length,
    },
  });

  const report: AliasApplyReport = {
    batchId: batch.id,
    analyzed: analysis.rows.length,
    safe: safeRows.length,
    created: 0,
    alreadyMapped: 0,
    reviewManually: analysis.summary.reviewManually,
    conflictsAtApply: 0,
    failed: 0,
  };

  for (const row of safeRows) {
    try {
      const outcome = await prisma.$transaction((tx) =>
        applyOneAlias(tx, { tenantId, batchId: batch.id, actorUserId, row }),
      );
      if (outcome === "CREATED") report.created++;
      else if (outcome === "ALREADY_MAPPED") report.alreadyMapped++;
      else report.conflictsAtApply++;
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({
        data: {
          tenantId, batchId: batch.id, externalType: "person", externalId: row.pessoaUuid,
          operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", rawJson: row.raw,
          errorsJson: [err instanceof Error ? err.message : "erro desconhecido"],
          status: "FAILED", message: `[FAILED] alias: ${err instanceof Error ? err.message : "erro"}`,
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMPLETED",
      created: report.created,
      matched: report.alreadyMapped,
      skipped: report.conflictsAtApply,
      failed: report.failed,
      finishedAt: new Date(),
    },
  });

  return { report, analysis };
}

async function applyOneAlias(
  tx: Tx,
  ctx: { tenantId: string; batchId: string; actorUserId: string | null; row: AliasRow },
): Promise<"CREATED" | "ALREADY_MAPPED" | "CONFLICT"> {
  const { tenantId, batchId, actorUserId, row } = ctx;
  const personId = row.targetPersonId!;

  // idempotência: o UUID secundário já está mapeado?
  const existing = await tx.externalMapping.findFirst({
    where: { tenantId, system: "PROVER", externalType: "person", externalId: row.pessoaUuid },
    select: { id: true, internalId: true },
  });
  if (existing) {
    await tx.importBatchItem.create({
      data: {
        tenantId, batchId, externalType: "person", externalId: row.pessoaUuid,
        operation: "MATCHED", matchStrategy: "EXTERNAL_MAPPING", severity: "INFO",
        targetType: "Person", targetId: existing.internalId, rawJson: row.raw,
        status: "MATCHED", message: `[ALREADY_MAPPED] alias já existe → ${existing.internalId}`,
      },
    });
    return "ALREADY_MAPPED";
  }

  // re-checagem AO VIVO: a Person ainda existe e ainda tem o mapping primário?
  const person = await tx.person.findFirst({ where: { tenantId, id: personId }, select: { id: true } });
  const primary = await tx.externalMapping.findFirst({
    where: { tenantId, system: "PROVER", externalType: "person", internalId: personId, externalId: { not: row.pessoaUuid } },
    select: { externalId: true },
  });
  if (!person || !primary) {
    await tx.importBatchItem.create({
      data: {
        tenantId, batchId, externalType: "person", externalId: row.pessoaUuid,
        operation: "SKIP", matchStrategy: "COMPOSITE_KEY", severity: "CONFLICT",
        targetType: "Person", targetId: personId, rawJson: row.raw,
        warningsJson: { reason: !person ? "TARGET_PERSON_MISSING" : "PRIMARY_MAPPING_GONE" },
        status: "SKIPPED", message: `[CONFLICT] alias abortado para ${row.pessoaUuid}`,
      },
    });
    return "CONFLICT";
  }

  // cria SOMENTE o ExternalMapping secundário (não cria/altera Person, status, etc.)
  await tx.externalMapping.create({
    data: { tenantId, system: "PROVER", externalType: "person", externalId: row.pessoaUuid, internalType: "Person", internalId: personId },
  });

  const aliasMeta = {
    mappingKind: "ALIAS",
    reason: "SKIPPED_POSSIBLE_DUPLICATE",
    primaryProverUuid: primary.externalId,
    sourceImportBatchItemId: row.sourceImportBatchItemId,
    createdBy: "prover:people:alias-mapping",
  };

  await tx.auditLog.create({
    data: {
      tenantId,
      actorUserId, // null = sistema/importador (nunca cria login)
      module: "integrations",
      action: "import_alias_mapping_create",
      entityType: "ExternalMapping",
      entityId: personId,
      sensitivity: "INTERNAL",
      reason: `Alias Prover (batch ${batchId}) — ${row.pessoaUuid} → Person já mapeada a ${primary.externalId}`,
      afterJson: { source: "PROVER", batchId, externalId: row.pessoaUuid, internalId: personId, ...aliasMeta },
    },
  });

  await tx.importBatchItem.create({
    data: {
      tenantId, batchId, externalType: "person", externalId: row.pessoaUuid,
      operation: "CREATE", matchStrategy: "COMPOSITE_KEY", severity: "INFO",
      targetType: "Person", targetId: personId,
      normalizedJson: aliasMeta,
      rawJson: row.raw, status: "CREATED",
      message: `[CREATE_ALIAS_MAPPING] ${row.pessoaUuid} → ${personId} (primário ${primary.externalId})`,
    },
  });

  return "CREATED";
}
