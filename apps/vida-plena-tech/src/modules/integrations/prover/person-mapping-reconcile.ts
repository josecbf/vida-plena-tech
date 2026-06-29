import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient, Prisma } from "@prisma/client";
import type { ProverPerson, ProverGcParticipant, ProverGcVisitor } from "./types";
import { normalizeProverPerson, normalizeNameKey, type CpfClass } from "./normalize";
import { normalizeGcParticipant, normalizeGcVisitor } from "./normalize-gc-membership";

// ─────────────────────────────────────────────────────────────────────────
// FASE 3A.2 — RECONCILIAR ExternalMapping AUSENTE de Pessoas
//
// Pessoas que (1) aparecem em grupos_participantes/visitantes, (2) existem em
// pessoas.json, mas (3) NÃO têm ExternalMapping de person. Diagnostica POR QUE
// ficaram sem mapping (via ImportBatchItem anterior) e, quando há match SEGURO,
// SUGERE criar apenas o ExternalMapping. NUNCA cria/altera Person, status, User,
// RoleAssignment, nem GrowthGroupMembership. Os arquivos vão FORA do git (tmp/).
// ─────────────────────────────────────────────────────────────────────────

export type CpfStatus = "valid" | "invalid" | "placeholder" | "missing";
export type Confidence = "SAFE" | "POSSIBLE" | "UNSAFE";
export type RecommendedAction = "CREATE_MAPPING" | "REVIEW_MANUALLY" | "SKIP";
export type CandidateVia = "CPF" | "PRIOR_EVIDENCE" | "NAME_BIRTH_CONTACT";

const CPF_STATUS: Record<CpfClass, CpfStatus> = {
  VALID: "valid",
  INVALID: "invalid",
  PLACEHOLDER: "placeholder",
  MISSING: "missing",
};

export interface CandidateInternal {
  personId: string;
  fullName: string;
  cpf: string | null;
  via: CandidateVia[];
  mappedToOtherUuid: boolean;
  otherUuid: string | null;
  nameMatches: boolean;
}

export interface ReconcileRow {
  pessoaUuid: string;
  proverName: string;
  cpfStatus: CpfStatus;
  probableReason: string;
  priorOperation: string | null;
  priorTargetId: string | null;
  candidates: CandidateInternal[];
  confidence: Confidence;
  recommendedAction: RecommendedAction;
  targetPersonId: string | null;
  resolvedVia: CandidateVia | null;
  warnings: string[];
  linkRefs: { participant: number; visitor: number };
  raw: object;
}

export interface ReconcileAnalysis {
  summary: {
    referencedUuids: number; // uuids distintos referenciados em vínculos de GC
    referencedUnmapped: number; // …sem ExternalMapping de person
    inPessoasJson: number; // …e presentes em pessoas.json (alvo da reconciliação)
    cpfValid: number;
    cpfInvalid: number;
    cpfPlaceholder: number;
    cpfMissing: number;
    safe: number;
    possible: number;
    unsafe: number;
    createMapping: number;
    reviewManually: number;
    skip: number;
  };
  rows: ReconcileRow[];
}

/** Nomes compatíveis: iguais, ou os tokens do mais curto contidos no mais longo. */
function namesCompatible(a: string, b: string): boolean {
  const ka = normalizeNameKey(a);
  const kb = normalizeNameKey(b);
  if (!ka || !kb) return true; // sem base para julgar → não trata como conflito
  if (ka === kb) return true;
  const ta = ka.split(" ").filter(Boolean);
  const tb = kb.split(" ").filter(Boolean);
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const longSet = new Set(long);
  return short.every((t) => longSet.has(t));
}

function deriveProbableReason(
  priorOp: string | null,
  priorErrors: unknown,
  cpfClass: CpfClass,
): string {
  if (!priorOp) {
    // nunca processada por um apply anterior sob este externalId
    return "NO_PRIOR_IMPORT_ITEM";
  }
  if (priorOp === "SKIP") return "SKIPPED_POSSIBLE_DUPLICATE";
  if (priorOp === "FAILED") {
    const errs = Array.isArray(priorErrors) ? (priorErrors as string[]) : [];
    if (errs.some((e) => /pessoa_nome|pessoa_uuid/i.test(String(e)))) return "MISSING_REQUIRED_FIELD";
    if (errs.some((e) => /cpf/i.test(String(e)))) return "DUPLICATE_CPF_CONFLICT";
    return "IMPORT_FAILED";
  }
  // CREATE/UPDATE/MATCHED mas ainda sem mapping é inesperado (registra para revisão)
  if (cpfClass === "PLACEHOLDER") return `CPF_PLACEHOLDER_AFTER_${priorOp}`;
  if (cpfClass === "INVALID") return `INVALID_CPF_AFTER_${priorOp}`;
  return `UNEXPECTED_${priorOp}`;
}

export async function analyzePersonMappingReconcile(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    pessoas: ProverPerson[];
    participantes: ProverGcParticipant[];
    visitantes: ProverGcVisitor[];
  },
): Promise<ReconcileAnalysis> {
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

  // 2) quais desses já têm ExternalMapping de person → excluir
  const existingPersonMaps = await prisma.externalMapping.findMany({
    where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: [...referencedUuids] } },
    select: { externalId: true },
  });
  const mappedUuids = new Set(existingPersonMaps.map((m) => m.externalId));
  const unmappedUuids = [...referencedUuids].filter((u) => !mappedUuids.has(u));

  // 3) interseção com pessoas.json (alvo da reconciliação)
  const pessoasByUuid = new Map<string, ProverPerson>();
  for (const p of pessoas) if (p?.pessoa_uuid) pessoasByUuid.set(p.pessoa_uuid, p);
  const targetUuids = unmappedUuids.filter((u) => pessoasByUuid.has(u));

  // 4) ImportBatchItem mais recente por externalId (motivo provável)
  const priorItems = await prisma.importBatchItem.findMany({
    where: { tenantId, externalType: "person", externalId: { in: targetUuids } },
    orderBy: { createdAt: "desc" },
    select: { externalId: true, operation: true, targetId: true, errorsJson: true, createdAt: true },
  });
  const priorByUuid = new Map<string, (typeof priorItems)[number]>();
  for (const it of priorItems) {
    if (it.externalId && !priorByUuid.has(it.externalId)) priorByUuid.set(it.externalId, it);
  }

  const rows: ReconcileRow[] = [];

  for (const uuid of targetUuids) {
    const raw = pessoasByUuid.get(uuid)!;
    const n = normalizeProverPerson(raw);
    const cpfStatus = CPF_STATUS[n.cpf.class];
    const prior = priorByUuid.get(uuid) ?? null;
    const priorOp = prior?.operation ?? null;
    const priorTargetId = prior?.targetId ?? null;
    const warnings: string[] = [];
    const probableReason = deriveProbableReason(priorOp, prior?.errorsJson, n.cpf.class);

    // ── coletar candidatos internos ──
    const byId = new Map<string, CandidateInternal>();
    const addCandidate = (
      p: { id: string; fullName: string; cpf: string | null },
      via: CandidateVia,
    ) => {
      const c = byId.get(p.id);
      if (c) {
        if (!c.via.includes(via)) c.via.push(via);
      } else {
        byId.set(p.id, {
          personId: p.id,
          fullName: p.fullName,
          cpf: p.cpf,
          via: [via],
          mappedToOtherUuid: false,
          otherUuid: null,
          nameMatches: namesCompatible(n.fullName, p.fullName),
        });
      }
    };

    // (a) CPF válido único
    if (n.cpf.class === "VALID" && n.cpf.clean) {
      const ppl = await prisma.person.findMany({
        where: { tenantId, cpf: n.cpf.clean },
        select: { id: true, fullName: true, cpf: true },
      });
      for (const p of ppl) addCandidate(p, "CPF");
    }
    // (b) evidência: targetId de ImportBatchItem anterior
    if (priorTargetId) {
      const p = await prisma.person.findFirst({
        where: { tenantId, id: priorTargetId },
        select: { id: true, fullName: true, cpf: true },
      });
      if (p) addCandidate(p, "PRIOR_EVIDENCE");
    }
    // (c) conservador: nome igual + contato compartilhado (+ nascimento, se houver)
    const contactValues = [n.email, n.phone].filter(Boolean) as string[];
    if (n.fullName && contactValues.length > 0) {
      const ppl = await prisma.person.findMany({
        where: {
          tenantId,
          fullName: { equals: n.fullName, mode: "insensitive" },
          contacts: { some: { value: { in: contactValues } } },
          ...(n.birthDate ? { birthDate: new Date(n.birthDate) } : {}),
        },
        select: { id: true, fullName: true, cpf: true },
      });
      for (const p of ppl) addCandidate(p, "NAME_BIRTH_CONTACT");
    }

    const candidates = [...byId.values()];

    // ── enriquecer: candidato já mapeado para OUTRO uuid? ──
    if (candidates.length > 0) {
      const maps = await prisma.externalMapping.findMany({
        where: {
          tenantId,
          system: "PROVER",
          externalType: "person",
          internalId: { in: candidates.map((c) => c.personId) },
        },
        select: { internalId: true, externalId: true },
      });
      const otherByPerson = new Map<string, string>();
      for (const m of maps) if (m.externalId !== uuid) otherByPerson.set(m.internalId, m.externalId);
      for (const c of candidates) {
        const other = otherByPerson.get(c.personId);
        if (other) {
          c.mappedToOtherUuid = true;
          c.otherUuid = other;
        }
      }
    }

    // ── decisão ──
    const decision = decide(n.cpf.class, candidates, warnings);

    rows.push({
      pessoaUuid: uuid,
      proverName: n.fullName,
      cpfStatus,
      probableReason,
      priorOperation: priorOp,
      priorTargetId,
      candidates,
      confidence: decision.confidence,
      recommendedAction: decision.action,
      targetPersonId: decision.targetPersonId,
      resolvedVia: decision.resolvedVia,
      warnings,
      linkRefs: { participant: partRefs.get(uuid) ?? 0, visitor: visRefs.get(uuid) ?? 0 },
      raw: raw as object,
    });
  }

  const summary = {
    referencedUuids: referencedUuids.size,
    referencedUnmapped: unmappedUuids.length,
    inPessoasJson: targetUuids.length,
    cpfValid: rows.filter((r) => r.cpfStatus === "valid").length,
    cpfInvalid: rows.filter((r) => r.cpfStatus === "invalid").length,
    cpfPlaceholder: rows.filter((r) => r.cpfStatus === "placeholder").length,
    cpfMissing: rows.filter((r) => r.cpfStatus === "missing").length,
    safe: rows.filter((r) => r.confidence === "SAFE").length,
    possible: rows.filter((r) => r.confidence === "POSSIBLE").length,
    unsafe: rows.filter((r) => r.confidence === "UNSAFE").length,
    createMapping: rows.filter((r) => r.recommendedAction === "CREATE_MAPPING").length,
    reviewManually: rows.filter((r) => r.recommendedAction === "REVIEW_MANUALLY").length,
    skip: rows.filter((r) => r.recommendedAction === "SKIP").length,
  };

  return { summary, rows };
}

/** Regra de confiança/ação a partir dos candidatos coletados. */
function decide(
  cpfClass: CpfClass,
  candidates: CandidateInternal[],
  warnings: string[],
): { confidence: Confidence; action: RecommendedAction; targetPersonId: string | null; resolvedVia: CandidateVia | null } {
  const cpfCands = candidates.filter((c) => c.via.includes("CPF"));
  const evidenceCands = candidates.filter((c) => c.via.includes("PRIOR_EVIDENCE"));
  const nameCands = candidates.filter((c) => c.via.includes("NAME_BIRTH_CONTACT"));

  // conflito entre fontes fortes (CPF aponta um, evidência aponta outro)
  if (cpfCands.length && evidenceCands.length) {
    const cpfIds = new Set(cpfCands.map((c) => c.personId));
    if (!evidenceCands.every((c) => cpfIds.has(c.personId))) {
      warnings.push("CPF_VS_EVIDENCE_CONFLICT");
      return { confidence: "UNSAFE", action: "REVIEW_MANUALLY", targetPersonId: null, resolvedVia: null };
    }
  }

  // candidatos utilizáveis = não mapeados para outro uuid e nome compatível
  const usable = candidates.filter((c) => !c.mappedToOtherUuid && c.nameMatches);
  const blockedByMapping = candidates.some((c) => c.mappedToOtherUuid);
  const nameConflict = candidates.some((c) => !c.nameMatches);

  // ── fonte FORTE (CPF válido único OU evidência de batch anterior) ──
  const strongUsable = usable.filter((c) => c.via.includes("CPF") || c.via.includes("PRIOR_EVIDENCE"));
  const strongIds = new Set(strongUsable.map((c) => c.personId));
  if (strongIds.size === 1) {
    const target = strongUsable[0];
    // CPF é mais forte; senão evidência
    const resolvedVia: CandidateVia = target.via.includes("CPF") && cpfClass === "VALID" ? "CPF" : "PRIOR_EVIDENCE";
    return { confidence: "SAFE", action: "CREATE_MAPPING", targetPersonId: target.personId, resolvedVia };
  }
  if (strongIds.size > 1) {
    warnings.push("MULTIPLE_STRONG_CANDIDATES");
    return { confidence: "UNSAFE", action: "REVIEW_MANUALLY", targetPersonId: null, resolvedVia: null };
  }

  // ── fonte FRACA (apenas nome+nascimento+contato) → no máximo SUGESTÃO ──
  const weakIds = new Set(usable.filter((c) => c.via.includes("NAME_BIRTH_CONTACT")).map((c) => c.personId));
  if (weakIds.size === 1) {
    warnings.push("WEAK_MATCH_NAME_BIRTH_CONTACT");
    return { confidence: "POSSIBLE", action: "REVIEW_MANUALLY", targetPersonId: [...weakIds][0], resolvedVia: null };
  }
  if (weakIds.size > 1) {
    warnings.push("MULTIPLE_WEAK_CANDIDATES");
    return { confidence: "UNSAFE", action: "REVIEW_MANUALLY", targetPersonId: null, resolvedVia: null };
  }

  // ── sem candidato utilizável ──
  if (nameCands.length || cpfCands.length || evidenceCands.length) {
    if (blockedByMapping) warnings.push("CANDIDATE_ALREADY_MAPPED_TO_OTHER_UUID");
    if (nameConflict) warnings.push("NAME_CONFLICT");
    return { confidence: "UNSAFE", action: "REVIEW_MANUALLY", targetPersonId: null, resolvedVia: null };
  }
  warnings.push("NO_INTERNAL_PERSON_FOUND");
  return { confidence: "UNSAFE", action: "SKIP", targetPersonId: null, resolvedVia: null };
}

// ── escrita dos arquivos (FORA do git: tmp/) ──────────────────────────────

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeReconcileReport(
  analysis: ReconcileAnalysis,
  outDir: string,
): { jsonPath: string; csvPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "person-mapping-reconcile.json");
  const csvPath = path.join(outDir, "person-mapping-reconcile.csv");

  writeFileSync(jsonPath, JSON.stringify({ summary: analysis.summary, rows: analysis.rows }, null, 2));

  const header = [
    "pessoaUuid", "proverName", "cpfStatus", "probableReason", "priorOperation",
    "candidatesCount", "candidateIds", "confidence", "recommendedAction",
    "targetPersonId", "resolvedVia", "participantRefs", "visitorRefs", "warnings",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of analysis.rows) {
    lines.push([
      r.pessoaUuid, r.proverName, r.cpfStatus, r.probableReason, r.priorOperation ?? "",
      r.candidates.length, r.candidates.map((c) => c.personId).join("|"),
      r.confidence, r.recommendedAction, r.targetPersonId ?? "", r.resolvedVia ?? "",
      r.linkRefs.participant, r.linkRefs.visitor, r.warnings.join("|"),
    ].map(csvCell).join(","));
  }
  writeFileSync(csvPath, lines.join("\n"));

  return { jsonPath, csvPath };
}

// ── APPLY controlado: cria SOMENTE ExternalMapping (SAFE), idempotente ────

type Tx = Prisma.TransactionClient;

export interface ReconcileApplyReport {
  batchId: string;
  analyzed: number;
  safe: number;
  created: number;
  alreadyMapped: number;
  skippedUnsafe: number;
  conflictsAtApply: number;
  failed: number;
}

export async function applyPersonMappingReconcile(
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
): Promise<{ report: ReconcileApplyReport; analysis: ReconcileAnalysis }> {
  const { tenantId, fileName, pessoas, participantes, visitantes, sourceFileHash, actorUserId = null } = opts;

  // re-analisa SEMPRE (idempotência: uuids já mapeados saem do alvo)
  const analysis = await analyzePersonMappingReconcile(prisma, { tenantId, pessoas, participantes, visitantes });
  const safeRows = analysis.rows.filter((r) => r.recommendedAction === "CREATE_MAPPING" && r.targetPersonId);

  const batch = await prisma.importBatch.create({
    data: {
      tenantId,
      mode: "APPLY",
      system: "PROVER",
      status: "PROCESSING",
      fileName,
      sourceFileHash: sourceFileHash ?? null,
      total: safeRows.length,
    },
  });

  const report: ReconcileApplyReport = {
    batchId: batch.id,
    analyzed: analysis.rows.length,
    safe: safeRows.length,
    created: 0,
    alreadyMapped: 0,
    skippedUnsafe: analysis.rows.length - safeRows.length,
    conflictsAtApply: 0,
    failed: 0,
  };

  // pessoas alvo já usadas nesta execução (não mapear 2 uuids → mesma Person)
  const usedPersonIds = new Set<string>();

  for (const row of safeRows) {
    try {
      const outcome = await prisma.$transaction((tx) =>
        applyOne(tx, { tenantId, batchId: batch.id, actorUserId, row, usedPersonIds }),
      );
      if (outcome === "CREATED") report.created++;
      else if (outcome === "ALREADY_MAPPED") report.alreadyMapped++;
      else report.conflictsAtApply++;
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({
        data: {
          tenantId,
          batchId: batch.id,
          externalType: "person",
          externalId: row.pessoaUuid,
          operation: "FAILED",
          matchStrategy: "NONE",
          severity: "ERROR",
          rawJson: row.raw,
          errorsJson: [err instanceof Error ? err.message : "erro desconhecido"],
          status: "FAILED",
          message: `[FAILED] reconcile: ${err instanceof Error ? err.message : "erro"}`,
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

async function applyOne(
  tx: Tx,
  ctx: {
    tenantId: string;
    batchId: string;
    actorUserId: string | null;
    row: ReconcileRow;
    usedPersonIds: Set<string>;
  },
): Promise<"CREATED" | "ALREADY_MAPPED" | "CONFLICT"> {
  const { tenantId, batchId, actorUserId, row, usedPersonIds } = ctx;
  const personId = row.targetPersonId!;

  // idempotência: mapping para este uuid já existe?
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
        status: "MATCHED", message: `[ALREADY_MAPPED] já existe mapping → ${existing.internalId}`,
      },
    });
    return "ALREADY_MAPPED";
  }

  // re-checagem de segurança AO VIVO: a Person não pode estar mapeada a outro uuid,
  // nem ter sido usada por outra linha desta mesma execução.
  const otherMapping = await tx.externalMapping.findFirst({
    where: { tenantId, system: "PROVER", externalType: "person", internalId: personId, externalId: { not: row.pessoaUuid } },
    select: { externalId: true },
  });
  const person = await tx.person.findFirst({ where: { tenantId, id: personId }, select: { id: true } });
  if (!person || otherMapping || usedPersonIds.has(personId)) {
    await tx.importBatchItem.create({
      data: {
        tenantId, batchId, externalType: "person", externalId: row.pessoaUuid,
        operation: "SKIP", matchStrategy: "COMPOSITE_KEY", severity: "CONFLICT",
        targetType: "Person", targetId: personId, rawJson: row.raw,
        warningsJson: { reason: !person ? "TARGET_PERSON_MISSING" : otherMapping ? `TARGET_ALREADY_MAPPED:${otherMapping.externalId}` : "TARGET_USED_THIS_RUN" },
        status: "SKIPPED", message: `[CONFLICT] reconcile abortado para ${row.pessoaUuid}`,
      },
    });
    return "CONFLICT";
  }

  // cria SOMENTE o ExternalMapping (não cria/altera Person, status, User, Role)
  await tx.externalMapping.create({
    data: { tenantId, system: "PROVER", externalType: "person", externalId: row.pessoaUuid, internalType: "Person", internalId: personId },
  });
  usedPersonIds.add(personId);

  await tx.auditLog.create({
    data: {
      tenantId,
      actorUserId, // null = sistema/importador (nunca cria login)
      module: "integrations",
      action: "import_mapping_reconcile",
      entityType: "ExternalMapping",
      entityId: personId,
      sensitivity: "INTERNAL",
      reason: `Reconciliação Prover (batch ${batchId}) — ${row.resolvedVia ?? "STRONG"}`,
      afterJson: { source: "PROVER", batchId, externalId: row.pessoaUuid, internalId: personId, resolvedVia: row.resolvedVia, probableReason: row.probableReason },
    },
  });

  await tx.importBatchItem.create({
    data: {
      tenantId, batchId, externalType: "person", externalId: row.pessoaUuid,
      operation: "CREATE", matchStrategy: row.resolvedVia === "CPF" ? "CPF" : "COMPOSITE_KEY",
      severity: "INFO", targetType: "Person", targetId: personId,
      normalizedJson: { resolvedVia: row.resolvedVia, probableReason: row.probableReason },
      rawJson: row.raw, status: "CREATED",
      message: `[CREATE_MAPPING] ${row.pessoaUuid} → ${personId} (via ${row.resolvedVia})`,
    },
  });

  return "CREATED";
}
