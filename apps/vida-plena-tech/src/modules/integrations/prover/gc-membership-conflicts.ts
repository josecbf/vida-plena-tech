import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────
// FASE 3B.1 — RELATÓRIO CONSOLIDADO de pendências de vínculos de GC (READ-ONLY)
//
// Deriva os conflitos do que JÁ está persistido (ImportBatchItem do último
// APPLY de vínculos) + estado vivo do banco. NÃO lê o ZIP, NÃO escreve em
// GrowthGroupMembership/Person, NÃO cria mapping/User/Role. Apenas consolida e
// SUGERE (não-vinculante). Os arquivos vão FORA do git (tmp/).
// ─────────────────────────────────────────────────────────────────────────

export type ConflictType =
  | "MULTIPLE_ACTIVE_GCS"
  | "DUPLICATE_MEMBERSHIP_CONFLICT"
  | "ACTIVE_MEMBERSHIP_IN_INACTIVE_GC"
  | "PERSON_MAPPING_NOT_FOUND";

export interface ConflictGcRef {
  growthGroupId: string;
  gcName: string;
  gcActive: boolean;
  leadershipUnit: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  source: string;
  hasActiveMembership: boolean;
}
export interface MultiActiveEntry {
  conflictKey: string;
  personId: string;
  pessoaUuids: string[];
  name: string;
  status: string;
  gcs: ConflictGcRef[];
  reason: string;
  suggestion: string;
}
export interface DupConflictEntry {
  conflictKey: string;
  personId: string;
  name: string;
  growthGroupId: string;
  gcName: string;
  source: string;
  rows: { joinedAt: string | null; leftAt: string | null; active: boolean; raw: unknown }[];
  reason: string;
  suggestion: string;
}
export interface InactiveGcEntry {
  conflictKey: string;
  membershipId: string;
  personId: string;
  name: string;
  growthGroupId: string;
  gcName: string;
  gcActive: false;
  joinedAt: string | null;
  source: string;
  reason: string;
  suggestion: string;
}
export interface UnmappedEntry {
  conflictKey: string;
  pessoaUuid: string;
  grupoExternalId: string;
  gcName: string | null;
  source: string;
  joinedAt: string | null;
  leftAt: string | null;
  reason: string;
  candidates: { personId: string; name: string }[];
  suggestion: string;
}

// ── chave estável por conflito (idempotência das decisões) ────────────────
export const conflictKeys = {
  multiActive: (tenantId: string, personId: string) => `multi-active:${tenantId}:${personId}`,
  duplicate: (tenantId: string, personId: string, gcId: string, source: string) => `duplicate:${tenantId}:${personId}:${gcId}:${source}`,
  inactiveGc: (tenantId: string, membershipId: string) => `inactive-gc-active-membership:${tenantId}:${membershipId}`,
  personMappingNotFound: (tenantId: string, uuid: string, groupExternalId: string) => `person-mapping-not-found:${tenantId}:${uuid}:${groupExternalId}`,
};

export interface ConflictReport {
  batchId: string | null;
  summary: {
    multipleActiveGcsPersons: number;
    multipleActiveGcsLinks: number;
    duplicateConflicts: number;
    activeInInactiveGc: number;
    personMappingNotFound: number;
    total: number;
  };
  multipleActiveGcs: MultiActiveEntry[];
  duplicateConflicts: DupConflictEntry[];
  activeInInactiveGc: InactiveGcEntry[];
  personMappingNotFound: UnmappedEntry[];
}

interface NormLink {
  personId?: string | null;
  growthGroupId?: string | null;
  personUuid?: string;
  groupExternalId?: string;
  source?: string;
  joinedAt?: string | null;
  leftAt?: string | null;
  active?: boolean;
}

function warningsOf(j: unknown): string[] {
  const w = (j as { warnings?: unknown })?.warnings;
  return Array.isArray(w) ? (w as string[]) : [];
}

// ── sugestões (não-vinculantes) ───────────────────────────────────────────
export function suggestMultiActive(gcs: ConflictGcRef[]): string {
  const hasP = gcs.some((g) => g.source === "PARTICIPANT");
  const hasV = gcs.some((g) => g.source === "VISITOR");
  if (hasP && hasV) return "SUGGEST_KEEP_PARTICIPANT_OVER_VISITOR";
  const dates = gcs.map((g) => g.joinedAt).filter(Boolean) as string[];
  if (dates.length === gcs.length && new Set(dates).size === gcs.length) return "SUGGEST_KEEP_MOST_RECENT_JOINED_AT";
  return "SUGGEST_REVIEW_MANUALLY";
}
export function suggestDuplicate(activeCount: number): string {
  if (activeCount === 1) return "SUGGEST_KEEP_ACTIVE";
  if (activeCount === 0) return "SUGGEST_CONSOLIDATE_HISTORY";
  return "SUGGEST_REVIEW_MANUALLY";
}

export async function buildConflictReport(
  prisma: PrismaClient,
  opts: { tenantId: string },
): Promise<ConflictReport> {
  const { tenantId } = opts;

  // último APPLY de vínculos (os conflitos foram persistidos como SKIP)
  const batch = await prisma.importBatch.findFirst({
    where: { tenantId, mode: "APPLY", items: { some: { externalType: "growth_group_membership" } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const skipItems = batch
    ? await prisma.importBatchItem.findMany({
        where: { tenantId, batchId: batch.id, externalType: "growth_group_membership", operation: "SKIP" },
        select: { id: true, normalizedJson: true, warningsJson: true, rawJson: true },
      })
    : [];

  const maItems = skipItems.filter((i) => warningsOf(i.warningsJson).includes("MULTIPLE_ACTIVE_GCS"));
  const dupItems = skipItems.filter((i) => warningsOf(i.warningsJson).includes("DUPLICATE_MEMBERSHIP_CONFLICT"));
  const pnfItems = skipItems.filter((i) => warningsOf(i.warningsJson).includes("PERSON_MAPPING_NOT_FOUND"));

  // ── enriquecimento: pessoas e GCs envolvidos ──
  const personIds = new Set<string>();
  const gcIds = new Set<string>();
  for (const i of [...maItems, ...dupItems]) {
    const n = i.normalizedJson as NormLink;
    if (n?.personId) personIds.add(n.personId);
    if (n?.growthGroupId) gcIds.add(n.growthGroupId);
  }
  const persons = await prisma.person.findMany({ where: { tenantId, id: { in: [...personIds] } }, select: { id: true, fullName: true, status: true } });
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const gcs = await prisma.growthGroup.findMany({ where: { tenantId, id: { in: [...gcIds] } }, select: { id: true, name: true, active: true, leadershipUnitId: true } });
  const gcMap = new Map(gcs.map((g) => [g.id, g]));
  const unitIds = [...new Set(gcs.map((g) => g.leadershipUnitId).filter(Boolean) as string[])];
  const units = await prisma.leadershipUnit.findMany({ where: { tenantId, id: { in: unitIds } }, select: { id: true, name: true } });
  const unitMap = new Map(units.map((u) => [u.id, u.name]));
  // memberships ativos materializados (person+gc) — p/ flag hasActiveMembership
  const activeMems = await prisma.growthGroupMembership.findMany({ where: { tenantId, leftAt: null, personId: { in: [...personIds] } }, select: { personId: true, gcId: true } });
  const activeSet = new Set(activeMems.map((m) => `${m.personId}:${m.gcId}`));

  const gcRef = (n: NormLink): ConflictGcRef => {
    const g = n.growthGroupId ? gcMap.get(n.growthGroupId) : null;
    return {
      growthGroupId: n.growthGroupId ?? "",
      gcName: g?.name ?? "",
      gcActive: !!g?.active,
      leadershipUnit: g?.leadershipUnitId ? unitMap.get(g.leadershipUnitId) ?? null : null,
      joinedAt: n.joinedAt ?? null,
      leftAt: n.leftAt ?? null,
      source: n.source ?? "",
      hasActiveMembership: !!(n.personId && n.growthGroupId && activeSet.has(`${n.personId}:${n.growthGroupId}`)),
    };
  };

  // ── A. MULTIPLE_ACTIVE_GCS (agrupado por pessoa) ──
  const maByPerson = new Map<string, typeof maItems>();
  for (const i of maItems) {
    const n = i.normalizedJson as NormLink;
    if (!n?.personId) continue;
    if (!maByPerson.has(n.personId)) maByPerson.set(n.personId, []);
    maByPerson.get(n.personId)!.push(i);
  }
  const multipleActiveGcs: MultiActiveEntry[] = [];
  for (const [personId, items] of maByPerson) {
    const pi = personMap.get(personId);
    const gcRefs = items.map((i) => gcRef(i.normalizedJson as NormLink));
    const uuids = [...new Set(items.map((i) => (i.normalizedJson as NormLink).personUuid).filter(Boolean) as string[])];
    multipleActiveGcs.push({
      conflictKey: conflictKeys.multiActive(tenantId, personId),
      personId, pessoaUuids: uuids, name: pi?.fullName ?? "", status: pi?.status ?? "",
      gcs: gcRefs, reason: "pessoa com >1 GC ativo (PARTICIPANT) — não materializado",
      suggestion: suggestMultiActive(gcRefs),
    });
  }

  // ── B. DUPLICATE_MEMBERSHIP_CONFLICT (agrupado por pessoa+gc+source) ──
  const dupByKey = new Map<string, typeof dupItems>();
  for (const i of dupItems) {
    const n = i.normalizedJson as NormLink;
    const k = `${n.personId}:${n.growthGroupId}:${n.source}`;
    if (!dupByKey.has(k)) dupByKey.set(k, []);
    dupByKey.get(k)!.push(i);
  }
  const duplicateConflicts: DupConflictEntry[] = [];
  for (const [, items] of dupByKey) {
    const n0 = items[0].normalizedJson as NormLink;
    const pi = n0.personId ? personMap.get(n0.personId) : null;
    const g = n0.growthGroupId ? gcMap.get(n0.growthGroupId) : null;
    const rows = items.map((i) => {
      const n = i.normalizedJson as NormLink;
      return { joinedAt: n.joinedAt ?? null, leftAt: n.leftAt ?? null, active: !!n.active, raw: i.rawJson };
    });
    const activeCount = rows.filter((r) => r.active).length;
    duplicateConflicts.push({
      conflictKey: conflictKeys.duplicate(tenantId, n0.personId ?? "", n0.growthGroupId ?? "", n0.source ?? ""),
      personId: n0.personId ?? "", name: pi?.fullName ?? "", growthGroupId: n0.growthGroupId ?? "",
      gcName: g?.name ?? "", source: n0.source ?? "",
      rows, reason: "linhas da mesma pessoa/GC/origem com datas divergentes",
      suggestion: suggestDuplicate(activeCount),
    });
  }

  // ── C. ACTIVE_MEMBERSHIP_IN_INACTIVE_GC (estado vivo do banco) ──
  const activeInInactive = await prisma.growthGroupMembership.findMany({
    where: { tenantId, leftAt: null, gc: { active: false } },
    select: { id: true, personId: true, gcId: true, joinedAt: true, source: true, person: { select: { fullName: true } }, gc: { select: { name: true } } },
  });
  const activeInInactiveGc: InactiveGcEntry[] = activeInInactive.map((m) => ({
    conflictKey: conflictKeys.inactiveGc(tenantId, m.id),
    membershipId: m.id, personId: m.personId, name: m.person.fullName,
    growthGroupId: m.gcId, gcName: m.gc.name, gcActive: false,
    joinedAt: m.joinedAt ? m.joinedAt.toISOString().slice(0, 10) : null, source: m.source,
    reason: "vínculo ativo em GC inativo",
    suggestion: "SUGGEST_REVIEW_MANUALLY", // opções: encerrar vínculo | reativar GC
  }));

  // ── D. PERSON_MAPPING_NOT_FOUND (UUID ambíguo) ──
  const personMappingNotFound: UnmappedEntry[] = [];
  for (const i of pnfItems) {
    const n = i.normalizedJson as NormLink;
    const uuid = n.personUuid ?? "";
    // candidatos: targetId de SKIP anterior do apply de Pessoas (evidência)
    const priorSkips = await prisma.importBatchItem.findMany({
      where: { tenantId, externalType: "person", externalId: uuid, operation: "SKIP", NOT: { targetId: null } },
      select: { targetId: true }, take: 5,
    });
    const candIds = [...new Set(priorSkips.map((s) => s.targetId).filter(Boolean) as string[])];
    const candPersons = candIds.length ? await prisma.person.findMany({ where: { tenantId, id: { in: candIds } }, select: { id: true, fullName: true } }) : [];
    const g = n.growthGroupId ? gcMap.get(n.growthGroupId) : null;
    personMappingNotFound.push({
      conflictKey: conflictKeys.personMappingNotFound(tenantId, uuid, n.groupExternalId ?? ""),
      pessoaUuid: uuid, grupoExternalId: n.groupExternalId ?? "", gcName: g?.name ?? null,
      source: n.source ?? "", joinedAt: n.joinedAt ?? null, leftAt: n.leftAt ?? null,
      reason: "UUID secundário sem ExternalMapping (alias com candidato concorrente)",
      candidates: candPersons.map((p) => ({ personId: p.id, name: p.fullName })),
      suggestion: "SUGGEST_REVIEW_MANUALLY",
    });
  }

  return {
    batchId: batch?.id ?? null,
    summary: {
      multipleActiveGcsPersons: multipleActiveGcs.length,
      multipleActiveGcsLinks: maItems.length,
      duplicateConflicts: duplicateConflicts.length,
      activeInInactiveGc: activeInInactiveGc.length,
      personMappingNotFound: personMappingNotFound.length,
      total: multipleActiveGcs.length + duplicateConflicts.length + activeInInactiveGc.length + personMappingNotFound.length,
    },
    multipleActiveGcs,
    duplicateConflicts,
    activeInInactiveGc,
    personMappingNotFound,
  };
}

// ── flatten + filtro/busca (PURO — usado pela rota e testes) ──────────────
export interface ConflictFlatRow {
  type: ConflictType;
  conflictKey: string;
  personId: string | null;
  personName: string;
  growthGroupId: string | null;
  gcName: string | null;
  proverPersonUuid: string | null;
  detail: string;
  suggestion: string;
  /** opções de alvo: A → GCs ativos da pessoa; D → candidatos internos. */
  targets: { value: string; label: string }[];
}

export function flattenConflictReport(r: ConflictReport): ConflictFlatRow[] {
  const rows: ConflictFlatRow[] = [];
  for (const e of r.multipleActiveGcs) rows.push({ type: "MULTIPLE_ACTIVE_GCS", conflictKey: e.conflictKey, personId: e.personId, personName: e.name, growthGroupId: null, gcName: e.gcs.map((g) => g.gcName).join(" · "), proverPersonUuid: null, detail: `${e.gcs.length} GCs ativos`, suggestion: e.suggestion, targets: e.gcs.map((g) => ({ value: g.growthGroupId, label: g.gcName })) });
  for (const e of r.duplicateConflicts) rows.push({ type: "DUPLICATE_MEMBERSHIP_CONFLICT", conflictKey: e.conflictKey, personId: e.personId, personName: e.name, growthGroupId: e.growthGroupId, gcName: e.gcName, proverPersonUuid: null, detail: `${e.rows.length} linhas divergentes`, suggestion: e.suggestion, targets: [] });
  for (const e of r.activeInInactiveGc) rows.push({ type: "ACTIVE_MEMBERSHIP_IN_INACTIVE_GC", conflictKey: e.conflictKey, personId: e.personId, personName: e.name, growthGroupId: e.growthGroupId, gcName: e.gcName, proverPersonUuid: null, detail: "ativo em GC inativo", suggestion: e.suggestion, targets: [] });
  for (const e of r.personMappingNotFound) rows.push({ type: "PERSON_MAPPING_NOT_FOUND", conflictKey: e.conflictKey, personId: null, personName: e.pessoaUuid, growthGroupId: null, gcName: e.gcName, proverPersonUuid: e.pessoaUuid, detail: `${e.candidates.length} candidato(s)`, suggestion: e.suggestion, targets: e.candidates.map((c) => ({ value: c.personId, label: c.name })) });
  return rows;
}

export type ConflictKind = "all" | "multiple_active" | "duplicate" | "inactive_gc" | "unmapped";
const KIND_TO_TYPE: Record<Exclude<ConflictKind, "all">, ConflictType> = {
  multiple_active: "MULTIPLE_ACTIVE_GCS",
  duplicate: "DUPLICATE_MEMBERSHIP_CONFLICT",
  inactive_gc: "ACTIVE_MEMBERSHIP_IN_INACTIVE_GC",
  unmapped: "PERSON_MAPPING_NOT_FOUND",
};

export function parseConflictKind(v: string | undefined): ConflictKind {
  return v === "multiple_active" || v === "duplicate" || v === "inactive_gc" || v === "unmapped" ? v : "all";
}

export function filterConflictRows(rows: ConflictFlatRow[], opts: { kind: ConflictKind; q: string }): ConflictFlatRow[] {
  const q = opts.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (opts.kind !== "all" && r.type !== KIND_TO_TYPE[opts.kind]) return false;
    if (q && !r.personName.toLowerCase().includes(q) && !(r.gcName ?? "").toLowerCase().includes(q)) return false;
    return true;
  });
}

// ── escrita (FORA do git: tmp/) ───────────────────────────────────────────
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeConflictReport(report: ConflictReport, outDir: string): { jsonPath: string; csvPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "gc-membership-conflict-resolution.json");
  const csvPath = path.join(outDir, "gc-membership-conflict-resolution.csv");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const header = ["section", "personId", "name", "growthGroupId", "gcName", "gcActive", "source", "joinedAt", "leftAt", "detail", "suggestion"];
  const lines = [header.map(csvCell).join(",")];
  for (const e of report.multipleActiveGcs)
    for (const g of e.gcs)
      lines.push(["MULTIPLE_ACTIVE_GCS", e.personId, e.name, g.growthGroupId, g.gcName, g.gcActive, g.source, g.joinedAt, g.leftAt, e.reason, e.suggestion].map(csvCell).join(","));
  for (const e of report.duplicateConflicts)
    for (const r of e.rows)
      lines.push(["DUPLICATE_MEMBERSHIP_CONFLICT", e.personId, e.name, e.growthGroupId, e.gcName, "", e.source, r.joinedAt, r.leftAt, e.reason, e.suggestion].map(csvCell).join(","));
  for (const e of report.activeInInactiveGc)
    lines.push(["ACTIVE_MEMBERSHIP_IN_INACTIVE_GC", e.personId, e.name, e.growthGroupId, e.gcName, "false", e.source, e.joinedAt, "", e.reason, e.suggestion].map(csvCell).join(","));
  for (const e of report.personMappingNotFound)
    lines.push(["PERSON_MAPPING_NOT_FOUND", "", e.pessoaUuid, e.grupoExternalId, e.gcName ?? "", "", e.source, e.joinedAt, e.leftAt, e.reason, e.suggestion].map(csvCell).join(","));
  writeFileSync(csvPath, lines.join("\n"));
  return { jsonPath, csvPath };
}
