import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import type { ProverGcParticipant, ProverGcVisitor } from "./types";
import {
  normalizeGcParticipant,
  normalizeGcVisitor,
  type NormalizedGcLink,
} from "./normalize-gc-membership";

// ─────────────────────────────────────────────────────────────────────────
// FASE 3A.1 — RELATÓRIO DE SANEAMENTO de vínculos pessoa↔GC (SOMENTE LEITURA)
//
// Diagnostica conflitos de forma acionável: múltiplos GCs ativos, duplicidades
// conflitantes e vínculos com pessoa não mapeada (órfão × falha de importação).
// SUGERE resoluções, sem aplicar. NÃO cria vínculo, NÃO altera pessoa, NÃO cria
// User/RoleAssignment. Os arquivos são gravados FORA do git (tmp/, gitignored).
// ─────────────────────────────────────────────────────────────────────────

export type MultiActiveSuggestion =
  | "SUGGEST_KEEP_MOST_RECENT_JOINED_AT"
  | "SUGGEST_KEEP_PARTICIPANT_OVER_VISITOR"
  | "SUGGEST_REVIEW_MANUALLY";

export type DupSuggestion = "SUGGEST_KEEP_ACTIVE" | "SUGGEST_REVIEW_MANUALLY";

export interface ActiveGcEntry {
  growthGroupId: string;
  grupoId: string; // id do GC no Prover
  gcName: string;
  source: "PARTICIPANT" | "VISITOR";
  joinedAt: string | null;
  leftAt: string | null;
  cargo: string | null;
  gcActive: boolean;
  hasLeader1: boolean;
}
export interface MultiActiveEntry {
  personId: string;
  pessoaUuid: string;
  name: string;
  status: string;
  activeGcs: ActiveGcEntry[];
  suggestion: MultiActiveSuggestion;
}
export interface DupRow {
  joinedAt: string | null;
  leftAt: string | null;
  source: "PARTICIPANT" | "VISITOR";
  cargo: string | null;
  active: boolean;
  raw: object;
}
export interface DupConflictEntry {
  personId: string;
  name: string;
  growthGroupId: string;
  grupoId: string;
  gcName: string;
  reason: string;
  rows: DupRow[];
  suggestion: DupSuggestion;
}
export interface UnmappedEntry {
  pessoaUuid: string;
  grupoId: string;
  gcName: string | null;
  source: "PARTICIPANT" | "VISITOR";
  joinedAt: string | null;
  leftAt: string | null;
  inPessoasJson: boolean;
  diagnosis: "IMPORT_FAILURE" | "ORPHAN";
  raw: object;
}

export interface SanitizationReport {
  summary: {
    totalLinks: number;
    multipleActiveGcsPersons: number;
    duplicateConflicts: number;
    unmappedLinks: number;
    unmappedDistinctUuids: number;
    orphanUuids: number;
    importFailureUuids: number;
  };
  multipleActiveGcs: MultiActiveEntry[];
  duplicateConflicts: DupConflictEntry[];
  unmappedPersons: UnmappedEntry[];
}

interface ResolvedLink {
  norm: NormalizedGcLink;
  raw: object;
  personId: string | null;
  gcId: string | null;
}

export async function buildSanitizationReport(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    participantes: ProverGcParticipant[];
    visitantes: ProverGcVisitor[];
    pessoasUuids: Set<string>; // uuids presentes em pessoas.json (p/ órfão × falha)
  },
): Promise<SanitizationReport> {
  const { tenantId, participantes, visitantes, pessoasUuids } = opts;

  const links: ResolvedLink[] = [
    ...participantes.map((raw) => ({ norm: normalizeGcParticipant(raw), raw: raw as object })),
    ...visitantes.map((raw) => ({ norm: normalizeGcVisitor(raw), raw: raw as object })),
  ].map((l) => ({ ...l, personId: null as string | null, gcId: null as string | null }));

  const personUuids = new Set(links.map((l) => l.norm.personUuid).filter(Boolean));
  const groupIds = new Set(links.map((l) => l.norm.groupExternalId).filter(Boolean));
  const [pMaps, gMaps] = await Promise.all([
    prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: "person", externalId: { in: [...personUuids] } }, select: { externalId: true, internalId: true } }),
    prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: "growth_group", externalId: { in: [...groupIds] } }, select: { externalId: true, internalId: true } }),
  ]);
  const personMap = new Map(pMaps.map((m) => [m.externalId, m.internalId]));
  const groupMap = new Map(gMaps.map((m) => [m.externalId, m.internalId]));
  for (const l of links) {
    l.personId = l.norm.personUuid ? personMap.get(l.norm.personUuid) ?? null : null;
    l.gcId = l.norm.groupExternalId ? groupMap.get(l.norm.groupExternalId) ?? null : null;
  }

  // dados de pessoas e GCs resolvidos
  const persons = await prisma.person.findMany({
    where: { tenantId, id: { in: [...new Set(links.map((l) => l.personId).filter(Boolean) as string[])] } },
    select: { id: true, fullName: true, status: true },
  });
  const personInfo = new Map(persons.map((p) => [p.id, p]));
  const gcs = await prisma.growthGroup.findMany({
    where: { tenantId, id: { in: [...new Set(links.map((l) => l.gcId).filter(Boolean) as string[])] } },
    select: { id: true, name: true, active: true, leaderId: true, leadershipUnitId: true },
  });
  const gcInfo = new Map(gcs.map((g) => [g.id, g]));
  const grupoIdByGcId = new Map(gMaps.map((m) => [m.internalId, m.externalId]));

  // ── múltiplos GCs ativos (qualquer origem, GCs distintos) ──
  const activeByPerson = new Map<string, ResolvedLink[]>();
  for (const l of links) {
    if (l.personId && l.gcId && l.norm.active) {
      if (!activeByPerson.has(l.personId)) activeByPerson.set(l.personId, []);
      activeByPerson.get(l.personId)!.push(l);
    }
  }
  const multipleActiveGcs: MultiActiveEntry[] = [];
  for (const [personId, ls] of activeByPerson) {
    const distinctGcs = new Set(ls.map((l) => l.gcId));
    if (distinctGcs.size <= 1) continue;
    const pi = personInfo.get(personId);
    const activeGcs: ActiveGcEntry[] = ls.map((l) => {
      const g = gcInfo.get(l.gcId!);
      return {
        growthGroupId: l.gcId!, grupoId: grupoIdByGcId.get(l.gcId!) ?? "", gcName: g?.name ?? "",
        source: l.norm.source, joinedAt: l.norm.joinedAt, leftAt: l.norm.leftAt, cargo: l.norm.role,
        gcActive: !!g?.active, hasLeader1: !!(g?.leaderId || g?.leadershipUnitId),
      };
    });
    multipleActiveGcs.push({
      personId, pessoaUuid: ls[0].norm.personUuid, name: pi?.fullName ?? "", status: pi?.status ?? "",
      activeGcs, suggestion: suggestMultiActive(activeGcs),
    });
  }

  // ── duplicidades conflitantes (mesma pessoa + GC + origem, dados divergentes) ──
  const dupGroups = new Map<string, ResolvedLink[]>();
  for (const l of links) {
    if (!l.personId || !l.gcId) continue;
    const k = `${l.personId}:${l.gcId}:${l.norm.source}`;
    if (!dupGroups.has(k)) dupGroups.set(k, []);
    dupGroups.get(k)!.push(l);
  }
  const duplicateConflicts: DupConflictEntry[] = [];
  for (const [, arr] of dupGroups) {
    if (arr.length <= 1) continue;
    const f = arr[0].norm;
    const allSame = arr.every((x) => x.norm.joinedAt === f.joinedAt && x.norm.leftAt === f.leftAt);
    if (allSame) continue; // duplicidade simples não entra no relatório de conflitos
    const pi = personInfo.get(arr[0].personId!);
    const g = gcInfo.get(arr[0].gcId!);
    const rows: DupRow[] = arr.map((x) => ({ joinedAt: x.norm.joinedAt, leftAt: x.norm.leftAt, source: x.norm.source, cargo: x.norm.role, active: x.norm.active, raw: x.raw }));
    const activeCount = rows.filter((r) => r.active).length;
    duplicateConflicts.push({
      personId: arr[0].personId!, name: pi?.fullName ?? "", growthGroupId: arr[0].gcId!,
      grupoId: grupoIdByGcId.get(arr[0].gcId!) ?? "", gcName: g?.name ?? "",
      reason: "linhas da mesma pessoa/GC/origem com datas divergentes",
      rows,
      suggestion: activeCount === 1 ? "SUGGEST_KEEP_ACTIVE" : "SUGGEST_REVIEW_MANUALLY",
    });
  }

  // ── pessoa não mapeada (órfão × falha de importação) ──
  const unmappedPersons: UnmappedEntry[] = [];
  const unmappedUuids = new Set<string>();
  const orphanUuids = new Set<string>();
  const importFailureUuids = new Set<string>();
  for (const l of links) {
    if (l.personId) continue; // mapeado
    if (!l.norm.personUuid) continue; // sem uuid → cai em FAILED no dry-run, não aqui
    const uuid = l.norm.personUuid;
    unmappedUuids.add(uuid);
    const inPessoas = pessoasUuids.has(uuid);
    if (inPessoas) importFailureUuids.add(uuid);
    else orphanUuids.add(uuid);
    unmappedPersons.push({
      pessoaUuid: uuid, grupoId: l.norm.groupExternalId,
      gcName: l.gcId ? gcInfo.get(l.gcId)?.name ?? null : null,
      source: l.norm.source, joinedAt: l.norm.joinedAt, leftAt: l.norm.leftAt,
      inPessoasJson: inPessoas, diagnosis: inPessoas ? "IMPORT_FAILURE" : "ORPHAN", raw: l.raw,
    });
  }

  return {
    summary: {
      totalLinks: links.length,
      multipleActiveGcsPersons: multipleActiveGcs.length,
      duplicateConflicts: duplicateConflicts.length,
      unmappedLinks: unmappedPersons.length,
      unmappedDistinctUuids: unmappedUuids.size,
      orphanUuids: orphanUuids.size,
      importFailureUuids: importFailureUuids.size,
    },
    multipleActiveGcs,
    duplicateConflicts,
    unmappedPersons,
  };
}

function suggestMultiActive(activeGcs: ActiveGcEntry[]): MultiActiveSuggestion {
  const hasParticipant = activeGcs.some((g) => g.source === "PARTICIPANT");
  const hasVisitor = activeGcs.some((g) => g.source === "VISITOR");
  if (hasParticipant && hasVisitor) return "SUGGEST_KEEP_PARTICIPANT_OVER_VISITOR";
  const dates = activeGcs.map((g) => g.joinedAt).filter(Boolean) as string[];
  if (dates.length === activeGcs.length && new Set(dates).size === activeGcs.length) {
    return "SUGGEST_KEEP_MOST_RECENT_JOINED_AT";
  }
  return "SUGGEST_REVIEW_MANUALLY";
}

// ── escrita dos arquivos (FORA do git: tmp/) ──────────────────────────────

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeSanitizationReport(
  report: SanitizationReport,
  outDir: string,
): { jsonPath: string; csvPath: string; summaryPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "gc-memberships-conflicts.json");
  const csvPath = path.join(outDir, "gc-memberships-conflicts.csv");
  const summaryPath = path.join(outDir, "gc-memberships-summary.json");

  writeFileSync(jsonPath, JSON.stringify({ multipleActiveGcs: report.multipleActiveGcs, duplicateConflicts: report.duplicateConflicts, unmappedPersons: report.unmappedPersons }, null, 2));
  writeFileSync(summaryPath, JSON.stringify(report.summary, null, 2));

  const header = ["section", "personId", "pessoaUuid", "name", "status", "growthGroupId", "grupoId", "gcName", "source", "joinedAt", "leftAt", "cargo", "gcActive", "hasLeader1", "suggestionOrReason"];
  const rows: string[] = [header.map(csvCell).join(",")];
  for (const e of report.multipleActiveGcs) {
    for (const g of e.activeGcs) {
      rows.push([ "MULTIPLE_ACTIVE_GCS", e.personId, e.pessoaUuid, e.name, e.status, g.growthGroupId, g.grupoId, g.gcName, g.source, g.joinedAt, g.leftAt, g.cargo, g.gcActive, g.hasLeader1, e.suggestion ].map(csvCell).join(","));
    }
  }
  for (const e of report.duplicateConflicts) {
    for (const r of e.rows) {
      rows.push([ "DUPLICATE_CONFLICT", e.personId, "", e.name, "", e.growthGroupId, e.grupoId, e.gcName, r.source, r.joinedAt, r.leftAt, r.cargo, "", "", e.suggestion ].map(csvCell).join(","));
    }
  }
  for (const e of report.unmappedPersons) {
    rows.push([ "UNMAPPED_PERSON", "", e.pessoaUuid, "", "", "", e.grupoId, e.gcName ?? "", e.source, e.joinedAt, e.leftAt, "", "", "", e.diagnosis ].map(csvCell).join(","));
  }
  writeFileSync(csvPath, rows.join("\n"));

  return { jsonPath, csvPath, summaryPath };
}
