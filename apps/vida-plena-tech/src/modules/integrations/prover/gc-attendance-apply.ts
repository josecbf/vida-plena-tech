import type { PrismaClient, Prisma, AttendanceStatus, GrowthGroupAttendanceSource } from "@prisma/client";
import type { ProverGcMeetingAttendance } from "./types";
import { normalizeGcAttendance, type NormalizedGcAttendance } from "./normalize-gc-meeting";

// ─────────────────────────────────────────────────────────────────────────
// FASE 4B.2 — APPLY CONSERVADOR de PRESENÇAS de GC.
//
// Cria GrowthGroupAttendance a partir de participantes/visitantes de encontros.
// Só linhas com marca clara (presenca "1"/"0"); null é pulado. Visitante →
// source VISITOR (NÃO vira membro). Idempotente via ExternalMapping
// (growth_group_attendance, externalId = encontro:pessoa:source). NÃO cria/altera
// GrowthGroupMembership/Person/status, NÃO altera encontro, NÃO cria User/Role.
// Presença é fato histórico: cria mesmo sem membership compatível (com warning).
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Operation = "CREATE" | "SKIP" | "FAILED";
const META_TYPE = "growth_group_attendance";

export interface GcAttendanceApplyReport {
  batchId: string;
  participantRowsRead: number; // total no arquivo
  visitorRowsRead: number;
  processed: number; // após --limit
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  present: number;
  absent: number;
  visitorsCreated: number;
  participantsCreated: number;
  presencaNullSkipped: number;
  meetingNotFound: number;
  personNotFound: number;
  withoutMembership: number;
  outsideRange: number;
  groupMismatch: number;
  duplicateSimple: number;
  duplicateConflict: number;
  alreadyImported: number;
  warnings: number;
}

type MembershipCompat = "COMPATIBLE" | "OUTSIDE_RANGE" | "WITHOUT_MEMBERSHIP";

export async function runGcAttendanceApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    participants: ProverGcMeetingAttendance[];
    visitors: ProverGcMeetingAttendance[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
  },
): Promise<GcAttendanceApplyReport> {
  const { tenantId, fileName, sourceFileHash, actorUserId = null } = opts;
  const participants = opts.participants.map((r) => normalizeGcAttendance(r, "PARTICIPANT"));
  const visitors = opts.visitors.map((r) => normalizeGcAttendance(r, "VISITOR"));
  const allRows = [...participants, ...visitors];

  // ── resolução em lote ──
  const findIn = async (externalType: string, ids: string[]) => {
    const out: { externalId: string; internalId: string }[] = [];
    for (let i = 0; i < ids.length; i += 5000) out.push(...(await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType, externalId: { in: ids.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } })));
    return out;
  };
  const encontroIds = [...new Set(allRows.map((a) => a.encontroId).filter(Boolean))];
  const grupoIds = [...new Set(allRows.map((a) => a.grupoId).filter(Boolean))];
  const personUuids = [...new Set(allRows.map((a) => a.personUuid).filter(Boolean) as string[])];
  const [meetMaps, gcMaps, personMaps] = await Promise.all([findIn("growth_group_meeting", encontroIds), findIn("growth_group", grupoIds), findIn("person", personUuids)]);
  const meetingByEncontro = new Map(meetMaps.map((m) => [m.externalId, m.internalId]));
  const gcByGrupo = new Map(gcMaps.map((m) => [m.externalId, m.internalId]));
  const personByUuid = new Map(personMaps.map((m) => [m.externalId, m.internalId]));

  // info dos encontros resolvidos (gcId, date)
  const meetingInfo = new Map<string, { gcId: string; date: Date | null }>();
  const meetingIds = [...new Set(meetingByEncontro.values())];
  if (meetingIds.length) {
    const ms = await prisma.growthGroupMeeting.findMany({ where: { tenantId, id: { in: meetingIds } }, select: { id: true, gcId: true, date: true } });
    for (const m of ms) meetingInfo.set(m.id, { gcId: m.gcId, date: m.date });
  }

  // memberships (compatibilidade)
  const memMap = new Map<string, { joinedAt: Date; leftAt: Date | null }[]>();
  const resolvedPersonIds = [...new Set(personByUuid.values())];
  if (resolvedPersonIds.length) {
    const mems = await prisma.growthGroupMembership.findMany({ where: { tenantId, personId: { in: resolvedPersonIds } }, select: { personId: true, gcId: true, joinedAt: true, leftAt: true } });
    for (const m of mems) { const k = `${m.personId}:${m.gcId}`; if (!memMap.has(k)) memMap.set(k, []); memMap.get(k)!.push({ joinedAt: m.joinedAt, leftAt: m.leftAt }); }
  }
  const compat = (personId: string, gcId: string, date: Date | null): MembershipCompat => {
    const list = memMap.get(`${personId}:${gcId}`);
    if (!list || !list.length) return "WITHOUT_MEMBERSHIP";
    if (!date) return "COMPATIBLE";
    for (const m of list) if (m.joinedAt <= date && (m.leftAt == null || date <= m.leftAt)) return "COMPATIBLE";
    return "OUTSIDE_RANGE";
  };

  const keyOf = (a: NormalizedGcAttendance) => `${a.encontroId}:${a.personUuid ?? a.personName ?? "?"}:${a.source}`;

  // duplicidade (sobre TODO o conjunto): SIMPLE (marcas iguais) ou CONFLICT (divergentes)
  const dupGroups = new Map<string, Set<string>>();
  for (const a of allRows) { const k = keyOf(a); if (!dupGroups.has(k)) dupGroups.set(k, new Set()); dupGroups.get(k)!.add(a.mark); }
  const conflictKeys = new Set([...dupGroups].filter(([, marks]) => marks.size > 1).map(([k]) => k));

  // mappings de presença já existentes (idempotência)
  const toProcess = opts.limit ? allRows.slice(0, opts.limit) : allRows;
  const existing = await findIn(META_TYPE, [...new Set(toProcess.map(keyOf))]);
  const mappingSet = new Set(existing.map((m) => m.externalId));
  const createdThisRun = new Set<string>();

  const report: GcAttendanceApplyReport = {
    batchId: "", participantRowsRead: participants.length, visitorRowsRead: visitors.length, processed: toProcess.length,
    created: 0, updated: 0, skipped: 0, failed: 0, present: 0, absent: 0, visitorsCreated: 0, participantsCreated: 0,
    presencaNullSkipped: 0, meetingNotFound: 0, personNotFound: 0, withoutMembership: 0, outsideRange: 0,
    groupMismatch: 0, duplicateSimple: 0, duplicateConflict: 0, alreadyImported: 0, warnings: 0,
  };

  const batch = await prisma.importBatch.create({ data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: toProcess.length } });
  report.batchId = batch.id;

  for (const a of toProcess) {
    try {
      await prisma.$transaction((tx) => processOne(tx, { tenantId, batchId: batch.id, actorUserId, a, meetingByEncontro, meetingInfo, gcByGrupo, personByUuid, compat, conflictKeys, mappingSet, createdThisRun, keyOf, report }));
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({ data: { tenantId, batchId: batch.id, externalType: META_TYPE, externalId: keyOf(a), operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: "GrowthGroupAttendance", rawJson: { encontroId: a.encontroId, personUuid: a.personUuid } as object, errorsJson: [err instanceof Error ? err.message : "erro"], status: "FAILED", message: `[FAILED] ${err instanceof Error ? err.message : "erro"}` } });
    }
  }

  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", created: report.created, matched: report.alreadyImported, skipped: report.skipped, failed: report.failed, warnings: report.warnings, conflicts: report.duplicateConflict, finishedAt: new Date() } });
  return report;
}

async function processOne(
  tx: Tx,
  ctx: {
    tenantId: string; batchId: string; actorUserId: string | null; a: NormalizedGcAttendance;
    meetingByEncontro: Map<string, string>; meetingInfo: Map<string, { gcId: string; date: Date | null }>;
    gcByGrupo: Map<string, string>; personByUuid: Map<string, string>;
    compat: (p: string, g: string, d: Date | null) => MembershipCompat;
    conflictKeys: Set<string>; mappingSet: Set<string>; createdThisRun: Set<string>;
    keyOf: (a: NormalizedGcAttendance) => string; report: GcAttendanceApplyReport;
  },
): Promise<void> {
  const { tenantId, batchId, actorUserId, a, meetingByEncontro, meetingInfo, gcByGrupo, personByUuid, compat, conflictKeys, mappingSet, createdThisRun, keyOf, report } = ctx;
  const warns: string[] = [];
  const errors: string[] = [];
  let op: "CREATE" | "SKIP" = "CREATE";
  let targetId: string | null = null;
  const key = keyOf(a);
  const isVisitor = a.source === "VISITOR";

  const meetingId = meetingByEncontro.get(a.encontroId) ?? null;
  const personId = a.personUuid ? personByUuid.get(a.personUuid) ?? null : null;
  const meeting = meetingId ? meetingInfo.get(meetingId) ?? null : null;

  if (a.mark === "NONE") { op = "SKIP"; report.presencaNullSkipped++; warns.push("PRESENCA_NULL"); }
  else if (!meetingId) { op = "SKIP"; report.meetingNotFound++; warns.push("GROWTH_GROUP_MEETING_MAPPING_NOT_FOUND"); report.warnings++; }
  else if (!personId && !(isVisitor && a.personName)) { op = "SKIP"; report.personNotFound++; warns.push("PERSON_MAPPING_NOT_FOUND"); report.warnings++; }
  else if (conflictKeys.has(key)) { op = "SKIP"; report.duplicateConflict++; warns.push("ATTENDANCE_DUPLICATE_CONFLICT"); report.warnings++; }
  else if (mappingSet.has(key)) {
    // já importado: consolidação de duplicidade simples (criado nesta run) OU idempotência (run anterior)
    op = "SKIP";
    if (createdThisRun.has(key)) { report.duplicateSimple++; warns.push("ATTENDANCE_DUPLICATE_SIMPLE"); }
    else { report.alreadyImported++; warns.push("ALREADY_IMPORTED"); }
  } else {
    // mismatch de GC (encontro × linha) — só warning, não corrige
    const lineGcId = a.grupoId ? gcByGrupo.get(a.grupoId) ?? null : null;
    if (meeting && lineGcId && meeting.gcId !== lineGcId) { warns.push("ATTENDANCE_GROUP_MISMATCH"); report.groupMismatch++; report.warnings++; }
    // membership compatível (participante) — fato histórico: cria mesmo assim, só warning
    if (!isVisitor && personId && meeting) {
      const c = compat(personId, meeting.gcId, meeting.date);
      if (c === "WITHOUT_MEMBERSHIP") { warns.push("ATTENDANCE_WITHOUT_MEMBERSHIP"); report.withoutMembership++; report.warnings++; }
      else if (c === "OUTSIDE_RANGE") { warns.push("ATTENDANCE_OUTSIDE_MEMBERSHIP_DATE_RANGE"); report.outsideRange++; report.warnings++; }
    }

    const status: AttendanceStatus = isVisitor ? (a.mark === "PRESENT" ? "VISITOR" : "ABSENT") : a.mark === "PRESENT" ? "PRESENT" : "ABSENT";
    const source = a.source as GrowthGroupAttendanceSource;
    const created = await tx.growthGroupAttendance.create({
      data: { tenantId, meetingId: meetingId!, personId: personId ?? null, visitorName: personId ? null : a.personName, status, source, sourceMark: a.mark === "PRESENT" ? "1" : "0" },
      select: { id: true },
    });
    targetId = created.id;
    await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: META_TYPE, externalId: key, internalType: "GrowthGroupAttendance", internalId: created.id } });
    mappingSet.add(key); createdThisRun.add(key);
    await tx.auditLog.create({ data: { tenantId, actorUserId, module: "groups", action: "import_attendance_create", entityType: "GrowthGroupAttendance", entityId: created.id, sensitivity: "INTERNAL", reason: `Importação Prover (batch ${batchId})`, afterJson: { source: "PROVER", batchId, encontroId: a.encontroId, attendanceSource: a.source, status } as object } });
    op = "CREATE"; report.created++;
    if (a.mark === "PRESENT") report.present++; else report.absent++;
    if (isVisitor) report.visitorsCreated++; else report.participantsCreated++;
  }

  if (op === "SKIP") report.skipped++;

  const severity = warns.includes("ATTENDANCE_DUPLICATE_CONFLICT") ? "CONFLICT" : warns.length ? "WARNING" : "INFO";
  await tx.importBatchItem.create({
    data: {
      tenantId, batchId, externalType: META_TYPE, externalId: key,
      operation: op, matchStrategy: op === "CREATE" ? "COMPOSITE_KEY" : mappingSet.has(key) ? "EXTERNAL_MAPPING" : "NONE",
      severity, targetType: "GrowthGroupAttendance", targetId,
      normalizedJson: { encontroId: a.encontroId, grupoId: a.grupoId, personId, source: a.source, mark: a.mark } as object,
      warningsJson: { warnings: warns } as object, errorsJson: errors,
      rawJson: { encontroId: a.encontroId, personUuid: a.personUuid } as object,
      status: op === "CREATE" ? "CREATED" : "SKIPPED",
      message: `[${op}] ${a.source} mark=${a.mark} person=${!!personId} meeting=${!!meetingId} ${warns.join(",")}`,
    },
  });
}
