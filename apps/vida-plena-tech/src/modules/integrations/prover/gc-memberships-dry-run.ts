import type { PrismaClient, Prisma } from "@prisma/client";
import type { ProverGcParticipant, ProverGcVisitor } from "./types";
import {
  normalizeGcParticipant,
  normalizeGcVisitor,
  type NormalizedGcLink,
} from "./normalize-gc-membership";

// ─────────────────────────────────────────────────────────────────────────
// IMPORTADOR Prover — FASE 3A — VÍNCULOS pessoa↔GC (participantes/visitantes)
//                              MODO DRY-RUN
//
// Resolve pessoa e GC por ExternalMapping, normaliza o vínculo, detecta
// conflitos (múltiplos GCs ativos, duplicidade) e grava ImportBatch +
// ImportBatchItem. NÃO cria GrowthGroupMembership, NÃO altera status de pessoa,
// NÃO promove a MEMBER, NÃO cria User/RoleAssignment. Visitante NÃO vira membro.
// ─────────────────────────────────────────────────────────────────────────

type Operation = "WOULD_CREATE" | "WOULD_UPDATE" | "WOULD_SKIP" | "FAILED";
type MatchStrategy = "EXTERNAL_MAPPING" | "COMPOSITE_KEY" | "NONE";
type Severity = "INFO" | "WARNING" | "CONFLICT" | "ERROR";
type Coarse = "PENDING" | "MATCHED" | "SKIPPED" | "FAILED";

export interface GcMembershipsDryRunReport {
  batchId: string;
  fileName: string;
  totalParticipants: number;
  totalVisitors: number;
  totalLinks: number;
  personsMapped: number;
  personsNotMapped: number;
  gcsMapped: number;
  gcsNotMapped: number;
  active: number;
  ended: number;
  participantLinks: number;
  visitorLinks: number;
  wouldCreate: number;
  wouldUpdate: number;
  wouldSkip: number;
  failed: number;
  warnings: number;
  conflictMultipleActiveGcs: number; // pessoas distintas com >1 GC ativo
  duplicateSimple: number;
  duplicateConflict: number;
}

export async function runGcMembershipsDryRun(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    participantes: ProverGcParticipant[];
    visitantes: ProverGcVisitor[];
    sourceFileHash?: string;
  },
): Promise<GcMembershipsDryRunReport> {
  const { tenantId, fileName, participantes, visitantes, sourceFileHash } = opts;

  const links: NormalizedGcLink[] = [
    ...participantes.map(normalizeGcParticipant),
    ...visitantes.map(normalizeGcVisitor),
  ];

  // resolução por ExternalMapping
  const personUuids = new Set(links.map((l) => l.personUuid).filter(Boolean));
  const groupIds = new Set(links.map((l) => l.groupExternalId).filter(Boolean));
  const [personMaps, groupMaps, existing] = await Promise.all([
    prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: [...personUuids] } }, select: { externalId: true, internalId: true } }),
    prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: "growth_group", externalId: { in: [...groupIds] } }, select: { externalId: true, internalId: true } }),
    prisma.growthGroupMembership.findMany({ where: { tenantId }, select: { id: true, gcId: true, personId: true } }),
  ]);
  const personMap = new Map(personMaps.map((m) => [m.externalId, m.internalId]));
  const groupMap = new Map(groupMaps.map((m) => [m.externalId, m.internalId]));
  const existingMap = new Map(existing.map((m) => [`${m.gcId}:${m.personId}`, m.id]));

  const resolved = links.map((norm) => ({
    norm,
    personId: norm.personUuid ? personMap.get(norm.personUuid) ?? null : null,
    gcId: norm.groupExternalId ? groupMap.get(norm.groupExternalId) ?? null : null,
  }));

  // múltiplos GCs ativos (só PARTICIPANT, ambos resolvidos)
  const activeByPerson = new Map<string, Set<string>>();
  for (const r of resolved) {
    if (r.personId && r.gcId && r.norm.active && r.norm.source === "PARTICIPANT") {
      if (!activeByPerson.has(r.personId)) activeByPerson.set(r.personId, new Set());
      activeByPerson.get(r.personId)!.add(r.gcId);
    }
  }
  const multiActive = new Set([...activeByPerson].filter(([, s]) => s.size > 1).map(([p]) => p));

  // duplicidade (mesma pessoa + GC + source)
  const dupGroups = new Map<string, typeof resolved>();
  for (const r of resolved) {
    if (!r.personId || !r.gcId) continue;
    const k = `${r.personId}:${r.gcId}:${r.norm.source}`;
    if (!dupGroups.has(k)) dupGroups.set(k, []);
    dupGroups.get(k)!.push(r);
  }
  const dupKeyType = new Map<string, "SIMPLE" | "CONFLICT">();
  for (const [k, arr] of dupGroups) {
    if (arr.length <= 1) continue;
    const f = arr[0].norm;
    const allSame = arr.every((x) => x.norm.joinedAt === f.joinedAt && x.norm.leftAt === f.leftAt);
    dupKeyType.set(k, allSame ? "SIMPLE" : "CONFLICT");
  }

  const report: GcMembershipsDryRunReport = {
    batchId: "", fileName,
    totalParticipants: participantes.length, totalVisitors: visitantes.length, totalLinks: links.length,
    personsMapped: 0, personsNotMapped: 0, gcsMapped: 0, gcsNotMapped: 0,
    active: 0, ended: 0, participantLinks: 0, visitorLinks: 0,
    wouldCreate: 0, wouldUpdate: 0, wouldSkip: 0, failed: 0, warnings: 0,
    conflictMultipleActiveGcs: multiActive.size,
    duplicateSimple: [...dupKeyType.values()].filter((v) => v === "SIMPLE").length,
    duplicateConflict: [...dupKeyType.values()].filter((v) => v === "CONFLICT").length,
  };

  const batch = await prisma.importBatch.create({
    data: { tenantId, mode: "DRY_RUN", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: links.length },
  });
  report.batchId = batch.id;

  const itemsData: Prisma.ImportBatchItemCreateManyInput[] = [];
  for (const r of resolved) {
    const n = r.norm;
    if (n.source === "PARTICIPANT") report.participantLinks++;
    else report.visitorLinks++;
    if (n.active) report.active++;
    else report.ended++;
    if (r.personId) report.personsMapped++;
    else report.personsNotMapped++;
    if (r.gcId) report.gcsMapped++;
    else report.gcsNotMapped++;

    const warnings: string[] = [];
    const errors: string[] = [];
    let op: Operation;
    let matchStrategy: MatchStrategy = "NONE";
    let coarse: Coarse;
    let targetId: string | null = null;

    if (!n.groupExternalId || !n.personUuid) {
      errors.push("vínculo sem grupo_id ou pessoa_uuid.");
      op = "FAILED"; coarse = "FAILED"; report.failed++;
    } else if (!r.personId) {
      warnings.push("PERSON_MAPPING_NOT_FOUND");
      op = "WOULD_SKIP"; coarse = "SKIPPED"; report.wouldSkip++;
    } else if (!r.gcId) {
      warnings.push("GROWTH_GROUP_MAPPING_NOT_FOUND");
      op = "WOULD_SKIP"; coarse = "SKIPPED"; report.wouldSkip++;
    } else {
      const existId = existingMap.get(`${r.gcId}:${r.personId}`);
      if (existId) { op = "WOULD_UPDATE"; matchStrategy = "COMPOSITE_KEY"; coarse = "MATCHED"; targetId = existId; report.wouldUpdate++; }
      else { op = "WOULD_CREATE"; coarse = "PENDING"; report.wouldCreate++; }
      // conflitos
      if (multiActive.has(r.personId) && n.active && n.source === "PARTICIPANT") {
        warnings.push("MULTIPLE_ACTIVE_GCS");
      }
      const dt = dupKeyType.get(`${r.personId}:${r.gcId}:${n.source}`);
      if (dt === "CONFLICT") warnings.push("DUPLICATE_MEMBERSHIP_CONFLICT");
      else if (dt === "SIMPLE") warnings.push("DUPLICATE_SIMPLE");
    }

    const isConflict = warnings.includes("MULTIPLE_ACTIVE_GCS") || warnings.includes("DUPLICATE_MEMBERSHIP_CONFLICT");
    const severity: Severity = op === "FAILED" ? "ERROR" : isConflict ? "CONFLICT" : warnings.length > 0 ? "WARNING" : "INFO";
    if (severity === "WARNING") report.warnings++;

    itemsData.push({
      tenantId, batchId: batch.id,
      externalType: "growth_group_membership",
      externalId: `${n.groupExternalId}:${n.personUuid}:${n.source}`,
      operation: op, matchStrategy, severity,
      targetType: "GrowthGroupMembership", targetId,
      normalizedJson: { ...n, personId: r.personId, growthGroupId: r.gcId } as object,
      warningsJson: { warnings } as object,
      errorsJson: errors,
      rawJson: n as object,
      status: coarse,
      message: `[${op}] src=${n.source} active=${n.active} person=${!!r.personId} gc=${!!r.gcId} sev=${severity}`,
    });
  }

  // grava itens em chunks (createMany — mais rápido p/ ~16k linhas)
  for (let i = 0; i < itemsData.length; i += 1000) {
    await prisma.importBatchItem.createMany({ data: itemsData.slice(i, i + 1000) });
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "COMPLETED", created: 0, matched: report.wouldUpdate, skipped: report.wouldSkip, failed: report.failed, warnings: report.warnings, conflicts: report.conflictMultipleActiveGcs + report.duplicateConflict, finishedAt: new Date() },
  });

  return report;
}
