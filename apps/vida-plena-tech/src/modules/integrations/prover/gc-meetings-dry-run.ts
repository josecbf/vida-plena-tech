import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient, Prisma } from "@prisma/client";
import type { ProverGcMeeting, ProverGcMeetingAttendance, ProverGcMeetingVisit } from "./types";
import {
  normalizeGcMeeting,
  normalizeGcAttendance,
  type NormalizedGcAttendance,
} from "./normalize-gc-meeting";

// ─────────────────────────────────────────────────────────────────────────
// FASE 4A — DRY-RUN de ENCONTROS e PRESENÇAS de GC.
//
// Resolve GC (ExternalMapping growth_group) e pessoa (ExternalMapping person),
// verifica membership compatível na data, detecta conflitos e grava ImportBatch
// + ImportBatchItem. NÃO cria GrowthGroupMeeting/GrowthGroupAttendance reais,
// NÃO altera membership, NÃO cria User/RoleAssignment. SOMENTE LEITURA (exceto
// os registros de análise ImportBatch/ImportBatchItem).
// ─────────────────────────────────────────────────────────────────────────

const CHUNK = 1000;
const CONFLICT_CSV_CAP = 5000;

export interface GcMeetingsDryRunReport {
  batchId: string;
  // encontros
  meetingsRead: number;
  meetingsGcResolved: number;
  meetingsGcNotFound: number;
  meetingsHappened: number;
  meetingsScheduled: number;
  meetingsCancelled: number;
  meetingsDuplicateSameGcDate: number;
  meetingsInInactiveGc: number;
  meetingsWouldCreate: number;
  meetingsWouldSkip: number;
  // presenças de participantes
  participantRowsRead: number;
  participantPersonResolved: number;
  participantPersonNotFound: number;
  participantWouldCreate: number;
  participantWouldSkip: number;
  attendanceWithMembership: number;
  attendanceWithoutMembership: number;
  attendanceOutsideRange: number;
  attendanceDuplicate: number;
  // presenças de visitantes
  visitorRowsRead: number;
  visitorPersonResolved: number;
  visitorWithMappedPerson: number;
  visitorWithoutUuid: number;
  visitorWouldCreate: number;
  visitorWouldSkip: number;
  // visitas
  visitsRead: number;
  visitsSemantics: string;
  // totais
  wouldCreate: number;
  wouldSkip: number;
  failed: number;
  warnings: number;
  conflictsByWarning: Record<string, number>;
}

type MembershipCompat = "COMPATIBLE" | "OUTSIDE_RANGE" | "WITHOUT_MEMBERSHIP" | "NA";

interface ConflictSample {
  section: string;
  warning: string;
  encontroId: string;
  grupoId: string;
  personUuid: string;
  personName: string;
  date: string;
}

export async function runGcMeetingsDryRun(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    meetings: ProverGcMeeting[];
    participants: ProverGcMeetingAttendance[];
    visitors: ProverGcMeetingAttendance[];
    visits: ProverGcMeetingVisit[];
    sourceFileHash?: string;
    outDir?: string;
  },
): Promise<{ report: GcMeetingsDryRunReport; reportFiles?: { jsonPath: string; csvPath: string } }> {
  const { tenantId, fileName, sourceFileHash } = opts;

  const meetings = opts.meetings.map(normalizeGcMeeting);
  const participants = opts.participants.map((r) => normalizeGcAttendance(r, "PARTICIPANT"));
  const visitors = opts.visitors.map((r) => normalizeGcAttendance(r, "VISITOR"));

  // ── resolução: GCs (ExternalMapping growth_group) ──
  const grupoIds = new Set<string>();
  for (const m of meetings) if (m.grupoId) grupoIds.add(m.grupoId);
  for (const a of [...participants, ...visitors]) if (a.grupoId) grupoIds.add(a.grupoId);
  const gcMaps = await findManyIn(prisma, "growth_group", tenantId, [...grupoIds]);
  const gcByGrupo = new Map(gcMaps.map((m) => [m.externalId, m.internalId]));
  const gcs = await prisma.growthGroup.findMany({ where: { tenantId, id: { in: [...new Set(gcByGrupo.values())] } }, select: { id: true, active: true } });
  const gcActive = new Map(gcs.map((g) => [g.id, g.active]));

  // ── resolução: pessoas (ExternalMapping person) ──
  const personUuids = new Set<string>();
  for (const a of [...participants, ...visitors]) if (a.personUuid) personUuids.add(a.personUuid);
  const personMaps = await findManyIn(prisma, "person", tenantId, [...personUuids]);
  const personByUuid = new Map(personMaps.map((m) => [m.externalId, m.internalId]));

  // ── memberships (p/ compatibilidade de período) ──
  const memMap = new Map<string, { joinedAt: Date; leftAt: Date | null }[]>();
  const resolvedPersonIds = new Set(personByUuid.values());
  if (resolvedPersonIds.size > 0) {
    const mems = await prisma.growthGroupMembership.findMany({
      where: { tenantId, personId: { in: [...resolvedPersonIds] } },
      select: { personId: true, gcId: true, joinedAt: true, leftAt: true },
    });
    for (const m of mems) {
      const k = `${m.personId}:${m.gcId}`;
      if (!memMap.has(k)) memMap.set(k, []);
      memMap.get(k)!.push({ joinedAt: m.joinedAt, leftAt: m.leftAt });
    }
  }
  const membershipCompat = (personId: string, gcId: string, date: Date | null): MembershipCompat => {
    const list = memMap.get(`${personId}:${gcId}`);
    if (!list || list.length === 0) return "WITHOUT_MEMBERSHIP";
    if (!date) return "COMPATIBLE";
    for (const m of list) if (m.joinedAt <= date && (m.leftAt == null || date <= m.leftAt)) return "COMPATIBLE";
    return "OUTSIDE_RANGE";
  };

  const report: GcMeetingsDryRunReport = blankReport();
  report.meetingsRead = meetings.length;
  report.participantRowsRead = participants.length;
  report.visitorRowsRead = visitors.length;
  report.visitsRead = opts.visits.length;
  report.visitsSemantics =
    opts.visits.length === 0
      ? "VAZIO ([]): sem dados neste export; semântica não confirmável (provável registro de visitas pastorais/ao encontro — NÃO assumido)."
      : "PRESENTE: investigar manualmente (forma não documentada).";

  const conflicts: ConflictSample[] = [];
  const bump = (w: string) => { report.conflictsByWarning[w] = (report.conflictsByWarning[w] ?? 0) + 1; report.warnings++; };
  const addConflict = (s: ConflictSample) => { if (conflicts.length < CONFLICT_CSV_CAP) conflicts.push(s); };

  const batch = await prisma.importBatch.create({
    data: { tenantId, mode: "DRY_RUN", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: meetings.length + participants.length + visitors.length },
  });
  report.batchId = batch.id;

  const items: Prisma.ImportBatchItemCreateManyInput[] = [];
  const flush = async () => {
    if (items.length >= CHUNK) {
      await prisma.importBatchItem.createMany({ data: items.splice(0, items.length) });
    }
  };

  // ── ENCONTROS ──
  const meetingDupCount = new Map<string, number>();
  for (const m of meetings) if (m.grupoId && m.dateDay) meetingDupCount.set(`${m.grupoId}:${m.dateDay}`, (meetingDupCount.get(`${m.grupoId}:${m.dateDay}`) ?? 0) + 1);
  const meetingByEncontro = new Map<string, { gcId: string | null }>();

  for (const m of meetings) {
    const gcId = m.grupoId ? gcByGrupo.get(m.grupoId) ?? null : null;
    meetingByEncontro.set(m.encontroId, { gcId });
    if (m.happened) report.meetingsHappened++;
    else if (m.cancelled) report.meetingsCancelled++;
    else report.meetingsScheduled++;

    const warns: string[] = [];
    let op: "WOULD_CREATE" | "WOULD_SKIP" | "FAILED" = "WOULD_CREATE";
    let status: "PENDING" | "SKIPPED" | "FAILED" = "PENDING";
    if (!m.encontroId || !m.grupoId) { op = "FAILED"; status = "FAILED"; report.failed++; }
    else if (!gcId) { warns.push("GROWTH_GROUP_MAPPING_NOT_FOUND"); op = "WOULD_SKIP"; status = "SKIPPED"; report.meetingsGcNotFound++; report.meetingsWouldSkip++; bump("GROWTH_GROUP_MAPPING_NOT_FOUND"); addConflict({ section: "meeting", warning: "GROWTH_GROUP_MAPPING_NOT_FOUND", encontroId: m.encontroId, grupoId: m.grupoId, personUuid: "", personName: "", date: m.dateDay ?? "" }); }
    else {
      report.meetingsGcResolved++; report.meetingsWouldCreate++;
      if ((meetingDupCount.get(`${m.grupoId}:${m.dateDay}`) ?? 0) > 1) { warns.push("MEETING_DUPLICATE_SAME_GC_DATE"); report.meetingsDuplicateSameGcDate++; bump("MEETING_DUPLICATE_SAME_GC_DATE"); addConflict({ section: "meeting", warning: "MEETING_DUPLICATE_SAME_GC_DATE", encontroId: m.encontroId, grupoId: m.grupoId, personUuid: "", personName: "", date: m.dateDay ?? "" }); }
      if (gcActive.get(gcId) === false) { warns.push("MEETING_IN_INACTIVE_GC"); report.meetingsInInactiveGc++; bump("MEETING_IN_INACTIVE_GC"); addConflict({ section: "meeting", warning: "MEETING_IN_INACTIVE_GC", encontroId: m.encontroId, grupoId: m.grupoId, personUuid: "", personName: "", date: m.dateDay ?? "" }); }
    }

    items.push({
      tenantId, batchId: batch.id, externalType: "growth_group_meeting", externalId: m.encontroId || `NO_ID`,
      operation: op, matchStrategy: gcId ? "EXTERNAL_MAPPING" : "NONE", severity: op === "FAILED" ? "ERROR" : warns.length ? "WARNING" : "INFO",
      targetType: "GrowthGroupMeeting", normalizedJson: { encontroId: m.encontroId, grupoId: m.grupoId, gcId, date: m.dateDay, status: m.sourceStatus, statusEnum: m.statusEnum, happened: m.happened } as object,
      warningsJson: { warnings: warns } as object, rawJson: { encontroId: m.encontroId, grupoId: m.grupoId } as object,
      status: op === "WOULD_CREATE" ? "PENDING" : status, message: `[${op}] meeting gc=${!!gcId} ${warns.join(",")}`,
    });
    await flush();
  }

  // ── PRESENÇAS (participantes + visitantes) ──
  const seenAttendance = new Set<string>();
  const handleAttendance = async (a: NormalizedGcAttendance) => {
    const personId = a.personUuid ? personByUuid.get(a.personUuid) ?? null : null;
    const gcId = a.grupoId ? gcByGrupo.get(a.grupoId) ?? null : null;
    const meeting = meetingByEncontro.get(a.encontroId);
    const warns: string[] = [];
    let op: "WOULD_CREATE" | "WOULD_SKIP" = "WOULD_CREATE";
    const isPart = a.source === "PARTICIPANT";

    if (personId) { if (isPart) report.participantPersonResolved++; else report.visitorPersonResolved++; }
    else { if (isPart) report.participantPersonNotFound++; }

    // dup mesma pessoa/encontro/origem
    const dupKey = `${a.encontroId}:${a.personUuid ?? a.personName ?? "?"}:${a.source}`;
    const isDup = seenAttendance.has(dupKey);
    seenAttendance.add(dupKey);

    if (!a.personUuid && isPart) {
      warns.push("PERSON_UUID_MISSING"); op = "WOULD_SKIP"; bump("PERSON_UUID_MISSING");
    } else if (isPart && !personId) {
      warns.push("PERSON_MAPPING_NOT_FOUND"); op = "WOULD_SKIP"; bump("PERSON_MAPPING_NOT_FOUND");
      addConflict({ section: a.source.toLowerCase(), warning: "PERSON_MAPPING_NOT_FOUND", encontroId: a.encontroId, grupoId: a.grupoId, personUuid: a.personUuid ?? "", personName: a.personName ?? "", date: a.date ? a.date.toISOString().slice(0, 10) : "" });
    } else if (!gcId) {
      warns.push("GROWTH_GROUP_MAPPING_NOT_FOUND"); op = "WOULD_SKIP"; bump("GROWTH_GROUP_MAPPING_NOT_FOUND");
      addConflict({ section: a.source.toLowerCase(), warning: "GROWTH_GROUP_MAPPING_NOT_FOUND", encontroId: a.encontroId, grupoId: a.grupoId, personUuid: a.personUuid ?? "", personName: a.personName ?? "", date: a.date ? a.date.toISOString().slice(0, 10) : "" });
    } else {
      if (!meeting || meeting.gcId == null) { warns.push("ATTENDANCE_MEETING_WITHOUT_GC"); bump("ATTENDANCE_MEETING_WITHOUT_GC"); }
      if (isDup) { warns.push("ATTENDANCE_DUPLICATE"); report.attendanceDuplicate++; bump("ATTENDANCE_DUPLICATE"); }

      if (isPart) {
        // presença "real" só quando marcada (1/0). null = não registrado → skip.
        if (a.mark === "NONE") { warns.push("ATTENDANCE_NOT_RECORDED"); op = "WOULD_SKIP"; }
        else op = "WOULD_CREATE";
        // compatibilidade de membership
        const compat = membershipCompat(personId!, gcId, a.date);
        if (compat === "WITHOUT_MEMBERSHIP") { warns.push("ATTENDANCE_WITHOUT_MEMBERSHIP"); report.attendanceWithoutMembership++; bump("ATTENDANCE_WITHOUT_MEMBERSHIP"); addConflict({ section: "participant", warning: "ATTENDANCE_WITHOUT_MEMBERSHIP", encontroId: a.encontroId, grupoId: a.grupoId, personUuid: a.personUuid ?? "", personName: a.personName ?? "", date: a.date ? a.date.toISOString().slice(0, 10) : "" }); }
        else if (compat === "OUTSIDE_RANGE") { warns.push("ATTENDANCE_OUTSIDE_MEMBERSHIP_DATE_RANGE"); report.attendanceOutsideRange++; bump("ATTENDANCE_OUTSIDE_MEMBERSHIP_DATE_RANGE"); addConflict({ section: "participant", warning: "ATTENDANCE_OUTSIDE_MEMBERSHIP_DATE_RANGE", encontroId: a.encontroId, grupoId: a.grupoId, personUuid: a.personUuid ?? "", personName: a.personName ?? "", date: a.date ? a.date.toISOString().slice(0, 10) : "" }); }
        else if (compat === "COMPATIBLE") report.attendanceWithMembership++;
      } else {
        // VISITANTE
        if (personId) { warns.push("VISITOR_WITH_MAPPED_PERSON"); report.visitorWithMappedPerson++; bump("VISITOR_WITH_MAPPED_PERSON"); }
        if (!a.personUuid) { warns.push("VISITOR_WITHOUT_UUID"); report.visitorWithoutUuid++; bump("VISITOR_WITHOUT_UUID"); }
        // visitante presente → criaria attendance VISITOR; ausente/não registrado → skip
        op = a.mark === "PRESENT" ? "WOULD_CREATE" : "WOULD_SKIP";
        if (op === "WOULD_SKIP" && !warns.includes("ATTENDANCE_NOT_RECORDED") && a.mark !== "PRESENT") warns.push("VISITOR_NOT_PRESENT");
      }
    }

    // contadores would_create/skip por origem
    if (op === "WOULD_CREATE") { report.wouldCreate++; if (isPart) report.participantWouldCreate++; else report.visitorWouldCreate++; }
    else { report.wouldSkip++; if (isPart) report.participantWouldSkip++; else report.visitorWouldSkip++; }

    const attStatus = isPart ? (a.mark === "PRESENT" ? "PRESENT" : a.mark === "ABSENT" ? "ABSENT" : "NONE") : "VISITOR";
    items.push({
      tenantId, batchId: batch.id, externalType: a.source === "VISITOR" ? "growth_group_visit" : "growth_group_attendance",
      externalId: `${a.encontroId}:${a.personUuid ?? a.personName ?? "?"}:${a.source}`,
      operation: op, matchStrategy: personId && gcId ? "EXTERNAL_MAPPING" : "NONE",
      severity: warns.some((w) => w === "ATTENDANCE_DUPLICATE") ? "CONFLICT" : warns.length ? "WARNING" : "INFO",
      targetType: "GrowthGroupAttendance",
      normalizedJson: { encontroId: a.encontroId, grupoId: a.grupoId, gcId, personId, source: a.source, mark: a.mark, attStatus, date: a.date ? a.date.toISOString().slice(0, 10) : null } as object,
      warningsJson: { warnings: warns } as object, rawJson: { encontroId: a.encontroId, personUuid: a.personUuid } as object,
      status: op === "WOULD_CREATE" ? "PENDING" : "SKIPPED",
      message: `[${op}] ${a.source} mark=${a.mark} person=${!!personId} gc=${!!gcId} ${warns.join(",")}`,
    });
    await flush();
  };

  for (const a of participants) await handleAttendance(a);
  for (const a of visitors) await handleAttendance(a);

  // visitas: vazio → nada a processar (registramos a semântica no relatório)

  if (items.length > 0) {
    for (let i = 0; i < items.length; i += CHUNK) await prisma.importBatchItem.createMany({ data: items.slice(i, i + CHUNK) });
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "COMPLETED", created: 0, matched: 0, skipped: report.wouldSkip, failed: report.failed, warnings: report.warnings, conflicts: report.attendanceDuplicate + report.meetingsDuplicateSameGcDate, finishedAt: new Date() },
  });

  report.wouldCreate += report.meetingsWouldCreate;
  report.wouldSkip += report.meetingsWouldSkip;

  let reportFiles: { jsonPath: string; csvPath: string } | undefined;
  if (opts.outDir) reportFiles = writeMeetingsReport(report, conflicts, opts.outDir);

  return { report, reportFiles };
}

async function findManyIn(prisma: PrismaClient, externalType: string, tenantId: string, ids: string[]) {
  const out: { externalId: string; internalId: string }[] = [];
  for (let i = 0; i < ids.length; i += 5000) {
    const batch = await prisma.externalMapping.findMany({
      where: { tenantId, system: "PROVER", externalType, externalId: { in: ids.slice(i, i + 5000) } },
      select: { externalId: true, internalId: true },
    });
    out.push(...batch);
  }
  return out;
}

function blankReport(): GcMeetingsDryRunReport {
  return {
    batchId: "", meetingsRead: 0, meetingsGcResolved: 0, meetingsGcNotFound: 0, meetingsHappened: 0, meetingsScheduled: 0, meetingsCancelled: 0,
    meetingsDuplicateSameGcDate: 0, meetingsInInactiveGc: 0, meetingsWouldCreate: 0, meetingsWouldSkip: 0,
    participantRowsRead: 0, participantPersonResolved: 0, participantPersonNotFound: 0, participantWouldCreate: 0, participantWouldSkip: 0,
    attendanceWithMembership: 0, attendanceWithoutMembership: 0, attendanceOutsideRange: 0, attendanceDuplicate: 0,
    visitorRowsRead: 0, visitorPersonResolved: 0, visitorWithMappedPerson: 0, visitorWithoutUuid: 0, visitorWouldCreate: 0, visitorWouldSkip: 0,
    visitsRead: 0, visitsSemantics: "", wouldCreate: 0, wouldSkip: 0, failed: 0, warnings: 0, conflictsByWarning: {},
  };
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeMeetingsReport(report: GcMeetingsDryRunReport, conflicts: ConflictSample[], outDir: string): { jsonPath: string; csvPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "gc-meetings-dry-run-summary.json");
  const csvPath = path.join(outDir, "gc-meetings-dry-run-conflicts.csv");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  const header = ["section", "warning", "encontroId", "grupoId", "pessoaUuid", "pessoaNome", "data"];
  const lines = [header.join(",")];
  for (const c of conflicts) lines.push([c.section, c.warning, c.encontroId, c.grupoId, c.personUuid, c.personName, c.date].map(csvCell).join(","));
  writeFileSync(csvPath, lines.join("\n"));
  return { jsonPath, csvPath };
}
