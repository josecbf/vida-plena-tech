import type { PrismaClient, Prisma } from "@prisma/client";
import type { ProverGcMeeting } from "./types";
import { normalizeGcMeeting, type NormalizedGcMeeting } from "./normalize-gc-meeting";

// ─────────────────────────────────────────────────────────────────────────
// FASE 4B.1 — APPLY CONSERVADOR de ENCONTROS de GC (somente encontros).
//
// Cria/atualiza GrowthGroupMeeting a partir de grupos_encontros.json. Preserva o
// status do Prover (agendado/realizado/cancelado). Idempotente via ExternalMapping
// (externalType growth_group_meeting, externalId = encontro_id). NÃO cria
// GrowthGroupAttendance, NÃO altera membership/Person/status, NÃO cria User/Role.
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Operation = "CREATE" | "UPDATE" | "SKIP" | "FAILED";

export interface GcMeetingsApplyReport {
  batchId: string;
  totalRead: number; // processados (após --limit)
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  held: number;
  scheduled: number;
  canceled: number;
  unknown: number;
  gcResolved: number;
  gcNotFound: number;
  inInactiveGc: number;
  duplicateSameGcDate: number;
  warnings: number;
}

const META_TYPE = "growth_group_meeting";

export async function runGcMeetingsApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    meetings: ProverGcMeeting[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
  },
): Promise<GcMeetingsApplyReport> {
  const { tenantId, fileName, sourceFileHash, actorUserId = null } = opts;
  const all = opts.meetings.map(normalizeGcMeeting);

  // resolução de GC (ExternalMapping growth_group)
  const grupoIds = [...new Set(all.map((m) => m.grupoId).filter(Boolean))];
  const gcMaps: { externalId: string; internalId: string }[] = [];
  for (let i = 0; i < grupoIds.length; i += 5000) {
    gcMaps.push(...(await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: "growth_group", externalId: { in: grupoIds.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } })));
  }
  const gcByGrupo = new Map(gcMaps.map((m) => [m.externalId, m.internalId]));
  const gcs = await prisma.growthGroup.findMany({ where: { tenantId, id: { in: [...new Set(gcByGrupo.values())] } }, select: { id: true, active: true } });
  const gcActive = new Map(gcs.map((g) => [g.id, g.active]));

  // duplicidade por GC/dia (sobre TODO o conjunto)
  const dupCount = new Map<string, number>();
  for (const m of all) if (m.grupoId && m.dateDay) dupCount.set(`${m.grupoId}:${m.dateDay}`, (dupCount.get(`${m.grupoId}:${m.dateDay}`) ?? 0) + 1);

  // mapas de encontro já importados (idempotência)
  const toProcess = opts.limit ? all.slice(0, opts.limit) : all;
  const encontroIds = [...new Set(toProcess.map((m) => m.encontroId).filter(Boolean))];
  const existingMaps: { externalId: string; internalId: string }[] = [];
  for (let i = 0; i < encontroIds.length; i += 5000) {
    existingMaps.push(...(await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType: META_TYPE, externalId: { in: encontroIds.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } })));
  }
  const mappingByEncontro = new Map(existingMaps.map((m) => [m.externalId, m.internalId]));

  const report: GcMeetingsApplyReport = {
    batchId: "", totalRead: toProcess.length, created: 0, updated: 0, skipped: 0, failed: 0,
    held: 0, scheduled: 0, canceled: 0, unknown: 0, gcResolved: 0, gcNotFound: 0,
    inInactiveGc: 0, duplicateSameGcDate: 0, warnings: 0,
  };

  const batch = await prisma.importBatch.create({
    data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: toProcess.length },
  });
  report.batchId = batch.id;

  for (const m of toProcess) {
    if (m.statusEnum === "HELD") report.held++;
    else if (m.statusEnum === "SCHEDULED") report.scheduled++;
    else if (m.statusEnum === "CANCELED") report.canceled++;
    else report.unknown++;

    try {
      await prisma.$transaction((tx) => processOne(tx, { tenantId, batchId: batch.id, actorUserId, m, gcByGrupo, gcActive, dupCount, mappingByEncontro, report }));
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({
        data: {
          tenantId, batchId: batch.id, externalType: META_TYPE, externalId: m.encontroId || "NO_ID",
          operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: "GrowthGroupMeeting",
          rawJson: { encontroId: m.encontroId, grupoId: m.grupoId } as object,
          errorsJson: [err instanceof Error ? err.message : "erro"], status: "FAILED",
          message: `[FAILED] ${err instanceof Error ? err.message : "erro"}`,
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "COMPLETED", created: report.created, matched: report.updated, skipped: report.skipped, failed: report.failed, warnings: report.warnings, conflicts: report.duplicateSameGcDate, finishedAt: new Date() },
  });

  return report;
}

async function processOne(
  tx: Tx,
  ctx: {
    tenantId: string; batchId: string; actorUserId: string | null; m: NormalizedGcMeeting;
    gcByGrupo: Map<string, string>; gcActive: Map<string, boolean>; dupCount: Map<string, number>;
    mappingByEncontro: Map<string, string>; report: GcMeetingsApplyReport;
  },
): Promise<void> {
  const { tenantId, batchId, actorUserId, m, gcByGrupo, gcActive, dupCount, mappingByEncontro, report } = ctx;
  const warns: string[] = [];
  const errors: string[] = [];
  let op: Operation = "CREATE";
  let targetId: string | null = null;

  if (!m.encontroId || !m.grupoId) {
    errors.push("encontro sem encontro_id ou grupo_id.");
    op = "FAILED"; report.failed++;
  } else {
    const gcId = gcByGrupo.get(m.grupoId) ?? null;
    if (!gcId) {
      warns.push("GROWTH_GROUP_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.gcNotFound++; report.warnings++;
    } else {
      report.gcResolved++;
      if (m.unknownStatus) { warns.push("STATUS_UNKNOWN"); report.warnings++; }
      if ((dupCount.get(`${m.grupoId}:${m.dateDay}`) ?? 0) > 1) { warns.push("MEETING_DUPLICATE_SAME_GC_DATE"); report.duplicateSameGcDate++; report.warnings++; }
      if (gcActive.get(gcId) === false) { warns.push("MEETING_IN_INACTIVE_GC"); report.inInactiveGc++; report.warnings++; }

      const meta = (m.meta.oferta || m.meta.numCriancas || m.meta.quilosDoados)
        ? { oferta: m.meta.oferta, numCriancas: m.meta.numCriancas, quilosDoados: m.meta.quilosDoados }
        : null;

      const existingId = mappingByEncontro.get(m.encontroId);
      if (existingId) {
        // idempotente: já importado. Atualiza só se o status/título mudou (conservador).
        const existing = await tx.growthGroupMeeting.findUnique({ where: { id: existingId }, select: { status: true, happened: true, sourceStatus: true, title: true } });
        targetId = existingId;
        const changed = !!existing && (existing.status !== m.statusEnum || existing.happened !== m.happened || existing.sourceStatus !== m.sourceStatus || (existing.title ?? null) !== (m.tema ?? null));
        if (changed) {
          await tx.growthGroupMeeting.update({ where: { id: existingId }, data: { status: m.statusEnum, happened: m.happened, sourceStatus: m.sourceStatus, title: m.tema } });
          op = "UPDATE"; report.updated++;
          await writeAudit(tx, { tenantId, actorUserId, meetingId: existingId, action: "import_meeting_update", batchId, m });
        } else {
          op = "SKIP"; report.skipped++; warns.push("ALREADY_IMPORTED");
        }
      } else {
        const created = await tx.growthGroupMeeting.create({
          data: {
            tenantId, gcId, date: m.date ?? new Date(), endAt: m.endAt,
            happened: m.happened, status: m.statusEnum, sourceStatus: m.sourceStatus,
            title: m.tema, notes: m.notes, metaJson: meta ?? undefined,
            actorUserId, // null = importador (não cria login)
          },
          select: { id: true },
        });
        targetId = created.id;
        mappingByEncontro.set(m.encontroId, created.id);
        await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: META_TYPE, externalId: m.encontroId, internalType: "GrowthGroupMeeting", internalId: created.id } });
        await writeAudit(tx, { tenantId, actorUserId, meetingId: created.id, action: "import_meeting_create", batchId, m });
        op = "CREATE"; report.created++;
      }
    }
  }

  const severity = op === "FAILED" ? "ERROR" : warns.includes("MEETING_DUPLICATE_SAME_GC_DATE") ? "CONFLICT" : warns.length ? "WARNING" : "INFO";
  await tx.importBatchItem.create({
    data: {
      tenantId, batchId, externalType: META_TYPE, externalId: m.encontroId || "NO_ID",
      operation: op, matchStrategy: op === "CREATE" ? "COMPOSITE_KEY" : op === "UPDATE" || (targetId && op === "SKIP") ? "EXTERNAL_MAPPING" : "NONE",
      severity, targetType: "GrowthGroupMeeting", targetId,
      normalizedJson: { encontroId: m.encontroId, grupoId: m.grupoId, date: m.dateDay, statusEnum: m.statusEnum, sourceStatus: m.sourceStatus, happened: m.happened } as object,
      warningsJson: { warnings: warns } as object, errorsJson: errors,
      rawJson: { encontroId: m.encontroId, grupoId: m.grupoId } as object,
      status: op === "CREATE" ? "CREATED" : op === "UPDATE" ? "MATCHED" : op === "FAILED" ? "FAILED" : "SKIPPED",
      message: `[${op}] status=${m.statusEnum} ${warns.join(",")}`,
    },
  });
}

async function writeAudit(
  tx: Tx,
  a: { tenantId: string; actorUserId: string | null; meetingId: string; action: string; batchId: string; m: NormalizedGcMeeting },
) {
  await tx.auditLog.create({
    data: {
      tenantId: a.tenantId, actorUserId: a.actorUserId, module: "groups", action: a.action,
      entityType: "GrowthGroupMeeting", entityId: a.meetingId, sensitivity: "INTERNAL",
      reason: `Importação Prover (batch ${a.batchId})`,
      afterJson: { source: "PROVER", batchId: a.batchId, encontroId: a.m.encontroId, status: a.m.statusEnum, sourceStatus: a.m.sourceStatus } as object,
    },
  });
}
