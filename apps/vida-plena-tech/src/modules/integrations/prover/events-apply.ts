import type { PrismaClient, Prisma, EventStatus } from "@prisma/client";
import type { ProverEvent, ProverEventSession } from "./types";
import { parseProverDateTime } from "./normalize-gc-meeting";

// ─────────────────────────────────────────────────────────────────────────
// FASE 5B.1 — APPLY CONSERVADOR de EVENTOS + SESSÕES.
//
// Cria/atualiza Event (evento_eventos) e EventSession (evento_encontros_eventos).
// Idempotente via ExternalMapping (event / event_session). Exige --confirm APPLY.
// NÃO cria EventRegistration/EventAttendance, NÃO importa inscrições/presenças/
// pagamento, NÃO altera Person/status, NÃO cria User/Role.
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Op = "CREATE" | "UPDATE" | "SKIP" | "FAILED";

export interface EventsApplyReport {
  batchId: string;
  eventsRead: number;
  sessionsRead: number;
  eventsCreated: number;
  sessionsCreated: number;
  updated: number;
  skipped: number;
  failed: number;
  eventsWithoutTitle: number;
  eventsWithoutDate: number;
  sessionsWithoutParent: number;
  sessionsWithoutDate: number;
  warnings: number;
}

function clean(v?: string | null): string | null {
  const t = (v ?? "").toString().trim();
  return t.length > 0 ? t : null;
}

function eventStatusFor(startsAt: Date, endsAt: Date | null, now: Date): EventStatus {
  return (endsAt ?? startsAt) < now ? "FINISHED" : "PUBLISHED";
}

export async function runEventsApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string;
    fileName: string;
    events: ProverEvent[];
    sessions: ProverEventSession[];
    sourceFileHash?: string;
    limit?: number;
    actorUserId?: string | null;
  },
): Promise<EventsApplyReport> {
  const { tenantId, fileName, sourceFileHash, actorUserId = null } = opts;
  const eventsToProcess = opts.limit ? opts.events.slice(0, opts.limit) : opts.events;
  const sessionsToProcess = opts.limit ? opts.sessions.slice(0, opts.limit) : opts.sessions;
  const now = new Date();

  // mapeamentos existentes (idempotência) — event por uuid, session por idEncontro
  const parentUuids = new Set<string>();
  for (const e of eventsToProcess) if (clean(e.uuid)) parentUuids.add(e.uuid);
  for (const s of sessionsToProcess) if (clean(s.uuidEvento)) parentUuids.add(s.uuidEvento);
  const eventMaps = await findIn(prisma, tenantId, "event", [...parentUuids]);
  const eventIdByUuid = new Map(eventMaps.map((m) => [m.externalId, m.internalId]));
  const sessionMaps = await findIn(prisma, tenantId, "event_session", sessionsToProcess.map((s) => s.idEncontro).filter(Boolean));
  const sessionIdByEncontro = new Map(sessionMaps.map((m) => [m.externalId, m.internalId]));

  const report: EventsApplyReport = {
    batchId: "", eventsRead: eventsToProcess.length, sessionsRead: sessionsToProcess.length,
    eventsCreated: 0, sessionsCreated: 0, updated: 0, skipped: 0, failed: 0,
    eventsWithoutTitle: 0, eventsWithoutDate: 0, sessionsWithoutParent: 0, sessionsWithoutDate: 0, warnings: 0,
  };

  const batch = await prisma.importBatch.create({ data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: eventsToProcess.length + sessionsToProcess.length } });
  report.batchId = batch.id;

  // ── EVENTOS ──
  for (const e of eventsToProcess) {
    try {
      await prisma.$transaction((tx) => applyEvent(tx, { tenantId, batchId: batch.id, actorUserId, e, now, eventIdByUuid, report }));
    } catch (err) { await failItem(prisma, tenantId, batch.id, "event", e.uuid || "NO_ID", err, report); }
  }
  // ── SESSÕES ──
  for (const s of sessionsToProcess) {
    try {
      await prisma.$transaction((tx) => applySession(tx, { tenantId, batchId: batch.id, actorUserId, s, eventIdByUuid, sessionIdByEncontro, report }));
    } catch (err) { await failItem(prisma, tenantId, batch.id, "event_session", s.idEncontro || "NO_ID", err, report); }
  }

  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", created: report.eventsCreated + report.sessionsCreated, matched: report.updated, skipped: report.skipped, failed: report.failed, warnings: report.warnings, finishedAt: new Date() } });
  return report;
}

async function applyEvent(
  tx: Tx,
  ctx: { tenantId: string; batchId: string; actorUserId: string | null; e: ProverEvent; now: Date; eventIdByUuid: Map<string, string>; report: EventsApplyReport },
): Promise<void> {
  const { tenantId, batchId, actorUserId, e, now, eventIdByUuid, report } = ctx;
  const warns: string[] = [];
  let op: Op = "CREATE";
  let targetId: string | null = null;
  const uuid = clean(e.uuid);
  const title = clean(e.tema);
  const startsAt = parseProverDateTime(e.dataInicio);
  const endsAt = parseProverDateTime(e.dataFim);

  if (!uuid) { op = "FAILED"; report.failed++; }
  else if (!title) { warns.push("EVENT_WITHOUT_TITLE"); op = "SKIP"; report.skipped++; report.eventsWithoutTitle++; report.warnings++; }
  else if (!startsAt) { warns.push("EVENT_WITHOUT_DATE"); op = "SKIP"; report.skipped++; report.eventsWithoutDate++; report.warnings++; }
  else {
    const meta = { tipo: clean(e.tipo), responsavel: clean(e.responsavel), local: clean(e.local), enderecoCidade: clean(e.enderecoCidade), enderecoEstado: clean(e.enderecoEstado), sourceStatus: null as null };
    const existingId = eventIdByUuid.get(uuid);
    if (existingId) {
      const cur = await tx.event.findUnique({ where: { id: existingId }, select: { title: true, startsAt: true, sourceType: true } });
      targetId = existingId;
      const changed = !!cur && (cur.title !== title || cur.startsAt.getTime() !== startsAt.getTime() || (cur.sourceType ?? null) !== (clean(e.tipo) ?? null));
      if (changed) {
        await tx.event.update({ where: { id: existingId }, data: { title, startsAt, endsAt, location: clean(e.local), sourceType: clean(e.tipo), metaJson: meta } });
        op = "UPDATE"; report.updated++;
        await audit(tx, tenantId, actorUserId, "import_event_update", "Event", existingId, batchId, uuid);
      } else { op = "SKIP"; report.skipped++; warns.push("ALREADY_IMPORTED"); }
    } else {
      const created = await tx.event.create({
        data: { tenantId, title, startsAt, endsAt, location: clean(e.local), status: eventStatusFor(startsAt, endsAt, now), sourceType: clean(e.tipo), metaJson: meta, createdByUserId: actorUserId },
        select: { id: true },
      });
      targetId = created.id;
      eventIdByUuid.set(uuid, created.id);
      await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: "event", externalId: uuid, internalType: "Event", internalId: created.id } });
      await audit(tx, tenantId, actorUserId, "import_event_create", "Event", created.id, batchId, uuid);
      op = "CREATE"; report.eventsCreated++;
    }
  }
  await item(tx, tenantId, batchId, "event", uuid || "NO_ID", op, warns, "Event", targetId, { uuid, title, startsAt: e.dataInicio });
}

async function applySession(
  tx: Tx,
  ctx: { tenantId: string; batchId: string; actorUserId: string | null; s: ProverEventSession; eventIdByUuid: Map<string, string>; sessionIdByEncontro: Map<string, string>; report: EventsApplyReport },
): Promise<void> {
  const { tenantId, batchId, actorUserId, s, eventIdByUuid, sessionIdByEncontro, report } = ctx;
  const warns: string[] = [];
  let op: Op = "CREATE";
  let targetId: string | null = null;
  const idEncontro = clean(s.idEncontro);
  const eventId = clean(s.uuidEvento) ? eventIdByUuid.get(s.uuidEvento) ?? null : null;
  const startsAt = parseProverDateTime(s.dataInicio);
  const endsAt = parseProverDateTime(s.dataFim);
  const title = clean(s.tema) ?? clean(s.materia);

  if (!idEncontro) { op = "FAILED"; report.failed++; }
  else if (!eventId) { warns.push("EVENT_PARENT_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.sessionsWithoutParent++; report.warnings++; }
  else if (!startsAt) { warns.push("SESSION_WITHOUT_DATE"); op = "SKIP"; report.skipped++; report.sessionsWithoutDate++; report.warnings++; }
  else {
    const notes = clean(s.materia); // observacao/pauta/resumo não vêm no tipo mínimo; materia guardada aqui
    const meta = { uuidResponsavel: clean(s.uuidResponsavel), materia: clean(s.materia), sourceStatus: null as null };
    const existingId = sessionIdByEncontro.get(idEncontro);
    if (existingId) {
      const cur = await tx.eventSession.findUnique({ where: { id: existingId }, select: { title: true, startsAt: true } });
      targetId = existingId;
      const changed = !!cur && ((cur.title ?? null) !== (title ?? null) || cur.startsAt.getTime() !== startsAt.getTime());
      if (changed) {
        await tx.eventSession.update({ where: { id: existingId }, data: { title, startsAt, endsAt, notes, metaJson: meta } });
        op = "UPDATE"; report.updated++;
        await audit(tx, tenantId, actorUserId, "import_event_session_update", "EventSession", existingId, batchId, idEncontro);
      } else { op = "SKIP"; report.skipped++; warns.push("ALREADY_IMPORTED"); }
    } else {
      const created = await tx.eventSession.create({ data: { tenantId, eventId, title, startsAt, endsAt, notes, sourceStatus: null, metaJson: meta }, select: { id: true } });
      targetId = created.id;
      sessionIdByEncontro.set(idEncontro, created.id);
      await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: "event_session", externalId: idEncontro, internalType: "EventSession", internalId: created.id } });
      await audit(tx, tenantId, actorUserId, "import_event_session_create", "EventSession", created.id, batchId, idEncontro);
      op = "CREATE"; report.sessionsCreated++;
    }
  }
  await item(tx, tenantId, batchId, "event_session", idEncontro || "NO_ID", op, warns, "EventSession", targetId, { idEncontro, uuidEvento: s.uuidEvento, title, startsAt: s.dataInicio });
}

async function findIn(prisma: PrismaClient, tenantId: string, externalType: string, ids: string[]) {
  const out: { externalId: string; internalId: string }[] = [];
  const uniq = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += 5000) out.push(...(await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType, externalId: { in: uniq.slice(i, i + 5000) } }, select: { externalId: true, internalId: true } })));
  return out;
}

async function audit(tx: Tx, tenantId: string, actorUserId: string | null, action: string, entityType: string, entityId: string, batchId: string, externalId: string) {
  await tx.auditLog.create({ data: { tenantId, actorUserId, module: "events", action, entityType, entityId, sensitivity: "INTERNAL", reason: `Importação Prover (batch ${batchId})`, afterJson: { source: "PROVER", batchId, externalId } as object } });
}

async function item(tx: Tx, tenantId: string, batchId: string, externalType: string, externalId: string, op: Op, warns: string[], targetType: string, targetId: string | null, norm: object) {
  await tx.importBatchItem.create({ data: {
    tenantId, batchId, externalType, externalId, operation: op, matchStrategy: op === "CREATE" ? "COMPOSITE_KEY" : op === "UPDATE" || (targetId && op === "SKIP") ? "EXTERNAL_MAPPING" : "NONE",
    severity: op === "FAILED" ? "ERROR" : warns.length ? "WARNING" : "INFO", targetType, targetId,
    normalizedJson: norm as object, warningsJson: { warnings: warns } as object, errorsJson: [],
    rawJson: {} as object, status: op === "CREATE" ? "CREATED" : op === "UPDATE" ? "MATCHED" : op === "FAILED" ? "FAILED" : "SKIPPED",
    message: `[${op}] ${externalType} ${warns.join(",")}`,
  } });
}

async function failItem(prisma: PrismaClient, tenantId: string, batchId: string, externalType: string, externalId: string, err: unknown, report: EventsApplyReport) {
  report.failed++;
  await prisma.importBatchItem.create({ data: { tenantId, batchId, externalType, externalId, operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: externalType === "event" ? "Event" : "EventSession", rawJson: {} as object, errorsJson: [err instanceof Error ? err.message : "erro"], status: "FAILED", message: `[FAILED] ${err instanceof Error ? err.message : "erro"}` } });
}
