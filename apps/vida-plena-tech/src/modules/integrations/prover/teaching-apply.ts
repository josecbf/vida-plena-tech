import { Prisma, type PrismaClient, type TeachingStatus } from "@prisma/client";
import type { ProverTeaching, ProverTeachingModule, ProverTeachingLesson, ProverTeachingSession } from "./types";
import { parseProverDateTime } from "./normalize-gc-meeting";

// ─────────────────────────────────────────────────────────────────────────
// FASE 6B.1 — APPLY CONSERVADOR da ESTRUTURA de Ensino (curso → módulo → aula →
// sessão). Idempotente via ExternalMapping (teaching/teaching_module/
// teaching_lesson/teaching_session). Exige --confirm APPLY. NÃO cria inscrição/
// presença, NÃO importa pagamento/lote, NÃO altera Person/status/User/Role.
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
type Op = "CREATE" | "UPDATE" | "SKIP" | "FAILED";

export interface TeachingApplyReport {
  batchId: string;
  teachingsRead: number; modulesRead: number; lessonsRead: number; sessionsRead: number;
  teachingsCreated: number; modulesCreated: number; lessonsCreated: number; sessionsCreated: number;
  updated: number; skipped: number; failed: number;
  teachingsWithoutTitle: number; modulesWithoutTitle: number; lessonsWithoutModule: number; sessionsWithoutTeaching: number;
  sessionsWithoutModuleOrLesson: number; warnings: number;
}

function clean(v?: string | null): string | null { const t = (v ?? "").toString().trim(); return t.length > 0 ? t : null; }
function num(v?: string | null): number | null { const t = clean(v); if (t == null) return null; const n = parseFloat(t); return isNaN(n) ? null : n; }
function int(v?: string | null): number | null { const n = num(v); return n == null ? null : Math.trunc(n); }
function teachingStatusFor(startsAt: Date | null, endsAt: Date | null, now: Date): TeachingStatus {
  const ref = endsAt ?? startsAt; return ref && ref < now ? "FINISHED" : "PUBLISHED";
}

export async function runTeachingApply(
  prisma: PrismaClient,
  opts: {
    tenantId: string; fileName: string;
    teachings: ProverTeaching[]; modules: ProverTeachingModule[]; lessons: ProverTeachingLesson[]; sessions: ProverTeachingSession[];
    sourceFileHash?: string; limit?: number; actorUserId?: string | null;
  },
): Promise<TeachingApplyReport> {
  const { tenantId, fileName, sourceFileHash, actorUserId = null } = opts;
  const lim = opts.limit;
  const teachings = lim ? opts.teachings.slice(0, lim) : opts.teachings;
  const modules = lim ? opts.modules.slice(0, lim) : opts.modules;
  const lessons = lim ? opts.lessons.slice(0, lim) : opts.lessons;
  const sessions = lim ? opts.sessions.slice(0, lim) : opts.sessions;
  const now = new Date();

  const load = async (externalType: string) => new Map((await prisma.externalMapping.findMany({ where: { tenantId, system: "PROVER", externalType }, select: { externalId: true, internalId: true } })).map((m) => [m.externalId, m.internalId]));
  const teachingByUuid = await load("teaching");
  const moduleById = await load("teaching_module");
  const lessonById = await load("teaching_lesson");
  const sessionById = await load("teaching_session");

  const report: TeachingApplyReport = {
    batchId: "", teachingsRead: teachings.length, modulesRead: modules.length, lessonsRead: lessons.length, sessionsRead: sessions.length,
    teachingsCreated: 0, modulesCreated: 0, lessonsCreated: 0, sessionsCreated: 0, updated: 0, skipped: 0, failed: 0,
    teachingsWithoutTitle: 0, modulesWithoutTitle: 0, lessonsWithoutModule: 0, sessionsWithoutTeaching: 0, sessionsWithoutModuleOrLesson: 0, warnings: 0,
  };
  const batch = await prisma.importBatch.create({ data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName, sourceFileHash: sourceFileHash ?? null, total: teachings.length + modules.length + lessons.length + sessions.length } });
  report.batchId = batch.id;

  const run = async <T>(rows: T[], externalType: string, fn: (tx: Tx, r: T) => Promise<void>, keyOf: (r: T) => string) => {
    for (const r of rows) {
      try { await prisma.$transaction((tx) => fn(tx, r)); }
      catch (err) {
        report.failed++;
        await prisma.importBatchItem.create({ data: { tenantId, batchId: batch.id, externalType, externalId: keyOf(r) || "NO_ID", operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: externalType, rawJson: {} as object, errorsJson: [err instanceof Error ? err.message : "erro"], status: "FAILED", message: `[FAILED] ${err instanceof Error ? err.message : "erro"}` } });
      }
    }
  };

  // ── ENSINOS ──
  await run(teachings, "teaching", async (tx, e) => {
    const w: string[] = []; let op: Op = "CREATE"; let targetId: string | null = null;
    const uuid = clean(e.uuid); const title = clean(e.tema);
    const startsAt = parseProverDateTime(e.dataInicio); const endsAt = parseProverDateTime(e.dataFim);
    if (!uuid) { op = "FAILED"; report.failed++; }
    else if (!title) { w.push("TEACHING_TITLE_MISSING"); op = "SKIP"; report.skipped++; report.teachingsWithoutTitle++; report.warnings++; }
    else {
      const meta = { responsavel: clean(e.responsavel), tipo: clean(e.tipo), local: clean(e.local), enderecoCidade: clean(e.enderecoCidade), enderecoEstado: clean(e.enderecoEstado), sourceStatus: null as null };
      const existingId = teachingByUuid.get(uuid);
      if (existingId) {
        const cur = await tx.teaching.findUnique({ where: { id: existingId }, select: { title: true, sourceType: true } }); targetId = existingId;
        if (cur && (cur.title !== title || (cur.sourceType ?? null) !== (clean(e.tipo) ?? null))) { await tx.teaching.update({ where: { id: existingId }, data: { title, startsAt, endsAt, location: clean(e.local), sourceType: clean(e.tipo), metaJson: meta } }); op = "UPDATE"; report.updated++; await audit(tx, tenantId, actorUserId, "import_teaching_update", "Teaching", existingId, batch.id); }
        else { op = "SKIP"; report.skipped++; w.push("ALREADY_IMPORTED"); }
      } else {
        const c = await tx.teaching.create({ data: { tenantId, title, description: null, sourceType: clean(e.tipo), status: teachingStatusFor(startsAt, endsAt, now), startsAt, endsAt, location: clean(e.local), sourceStatus: null, metaJson: meta }, select: { id: true } });
        targetId = c.id; teachingByUuid.set(uuid, c.id);
        await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: "teaching", externalId: uuid, internalType: "Teaching", internalId: c.id } });
        await audit(tx, tenantId, actorUserId, "import_teaching_create", "Teaching", c.id, batch.id); op = "CREATE"; report.teachingsCreated++;
      }
    }
    await item(tx, tenantId, batch.id, "teaching", uuid || "NO_ID", op, w, "Teaching", targetId, { uuid, title });
  }, (e) => e.uuid);

  // ── MÓDULOS ── (sem ensino pai direto)
  await run(modules, "teaching_module", async (tx, m) => {
    const w: string[] = []; let op: Op = "CREATE"; let targetId: string | null = null;
    const mid = clean(m.id); const title = clean(m.nome);
    if (!mid) { op = "FAILED"; report.failed++; }
    else if (!title) { w.push("TEACHING_MODULE_TITLE_MISSING"); op = "SKIP"; report.skipped++; report.modulesWithoutTitle++; report.warnings++; }
    else {
      const existingId = moduleById.get(mid);
      if (existingId) { targetId = existingId; op = "SKIP"; report.skipped++; w.push("ALREADY_IMPORTED"); }
      else {
        const c = await tx.teachingModule.create({ data: { tenantId, title, description: clean(m.descricao), average: num(m.media), presence: num(m.presenca), metaJson: {} as Prisma.InputJsonValue }, select: { id: true } });
        targetId = c.id; moduleById.set(mid, c.id);
        await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: "teaching_module", externalId: mid, internalType: "TeachingModule", internalId: c.id } });
        await audit(tx, tenantId, actorUserId, "import_teaching_module_create", "TeachingModule", c.id, batch.id); op = "CREATE"; report.modulesCreated++;
      }
    }
    await item(tx, tenantId, batch.id, "teaching_module", mid || "NO_ID", op, w, "TeachingModule", targetId, { id: mid, title });
  }, (m) => m.id);

  // ── AULAS ── (pai = módulo)
  await run(lessons, "teaching_lesson", async (tx, l) => {
    const w: string[] = []; let op: Op = "CREATE"; let targetId: string | null = null;
    const lid = clean(l.id); const title = clean(l.nome);
    const moduleId = clean(l.idModulo) ? moduleById.get(l.idModulo) ?? null : null;
    if (!lid) { op = "FAILED"; report.failed++; }
    else if (!moduleId) { w.push("TEACHING_MODULE_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.lessonsWithoutModule++; report.warnings++; }
    else {
      const existingId = lessonById.get(lid);
      if (existingId) { targetId = existingId; op = "SKIP"; report.skipped++; w.push("ALREADY_IMPORTED"); }
      else {
        const c = await tx.teachingLesson.create({ data: { tenantId, moduleId, title: title ?? "Aula", description: clean(l.descricao), duration: int(l.tempo), order: int(l.ordem), metaJson: {} as Prisma.InputJsonValue }, select: { id: true } });
        targetId = c.id; lessonById.set(lid, c.id);
        await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: "teaching_lesson", externalId: lid, internalType: "TeachingLesson", internalId: c.id } });
        await audit(tx, tenantId, actorUserId, "import_teaching_lesson_create", "TeachingLesson", c.id, batch.id); op = "CREATE"; report.lessonsCreated++;
      }
    }
    await item(tx, tenantId, batch.id, "teaching_lesson", lid || "NO_ID", op, w, "TeachingLesson", targetId, { id: lid, idModulo: l.idModulo, title });
  }, (l) => l.id);

  // ── ENCONTROS/SESSÕES ── (pai = ensino; módulo/aula opcionais)
  await run(sessions, "teaching_session", async (tx, s) => {
    const w: string[] = []; let op: Op = "CREATE"; let targetId: string | null = null;
    const sid = clean(s.idEncontro);
    const ensKey = clean(s.uuidEnsino); const modKey = clean(s.idModulo); const auKey = clean(s.idAula);
    const teachingId = ensKey ? teachingByUuid.get(ensKey) ?? null : null;
    const moduleId = modKey ? moduleById.get(modKey) ?? null : null;
    const lessonId = auKey ? lessonById.get(auKey) ?? null : null;
    const startsAt = parseProverDateTime(s.dataInicio);
    if (!sid) { op = "FAILED"; report.failed++; }
    else if (!teachingId) { w.push("TEACHING_PARENT_MAPPING_NOT_FOUND"); op = "SKIP"; report.skipped++; report.sessionsWithoutTeaching++; report.warnings++; }
    else if (!startsAt) { w.push("SESSION_WITHOUT_DATE"); op = "SKIP"; report.skipped++; report.warnings++; }
    else {
      if ((modKey && !moduleId) || (auKey && !lessonId)) { w.push("MODULE_OR_LESSON_MAPPING_NOT_FOUND"); report.sessionsWithoutModuleOrLesson++; report.warnings++; }
      const existingId = sessionById.get(sid);
      if (existingId) { targetId = existingId; op = "SKIP"; report.skipped++; w.push("ALREADY_IMPORTED"); }
      else {
        const c = await tx.teachingSession.create({ data: { tenantId, teachingId, moduleId, lessonId, title: clean(s.tema), subject: clean(s.materia), startsAt, endsAt: parseProverDateTime(s.dataFim), notes: clean(s.observacao), sourceStatus: null, metaJson: { uuidResponsavel: clean(s.uuidResponsavel) } as Prisma.InputJsonValue }, select: { id: true } });
        targetId = c.id; sessionById.set(sid, c.id);
        await tx.externalMapping.create({ data: { tenantId, system: "PROVER", externalType: "teaching_session", externalId: sid, internalType: "TeachingSession", internalId: c.id } });
        await audit(tx, tenantId, actorUserId, "import_teaching_session_create", "TeachingSession", c.id, batch.id); op = "CREATE"; report.sessionsCreated++;
      }
    }
    await item(tx, tenantId, batch.id, "teaching_session", sid || "NO_ID", op, w, "TeachingSession", targetId, { idEncontro: sid, uuidEnsino: s.uuidEnsino, idModulo: s.idModulo, idAula: s.idAula });
  }, (s) => s.idEncontro);

  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMPLETED", created: report.teachingsCreated + report.modulesCreated + report.lessonsCreated + report.sessionsCreated, matched: report.updated, skipped: report.skipped, failed: report.failed, warnings: report.warnings, finishedAt: new Date() } });
  return report;
}

async function audit(tx: Tx, tenantId: string, actorUserId: string | null, action: string, entityType: string, entityId: string, batchId: string) {
  await tx.auditLog.create({ data: { tenantId, actorUserId, module: "teaching", action, entityType, entityId, sensitivity: "INTERNAL", reason: `Importação Prover (batch ${batchId})`, afterJson: { source: "PROVER", batchId } as object } });
}

async function item(tx: Tx, tenantId: string, batchId: string, externalType: string, externalId: string, op: Op, w: string[], targetType: string, targetId: string | null, norm: object) {
  await tx.importBatchItem.create({ data: {
    tenantId, batchId, externalType, externalId, operation: op,
    matchStrategy: op === "CREATE" ? "COMPOSITE_KEY" : op === "UPDATE" || (targetId && op === "SKIP") ? "EXTERNAL_MAPPING" : "NONE",
    severity: op === "FAILED" ? "ERROR" : w.length ? "WARNING" : "INFO", targetType, targetId,
    normalizedJson: norm as object, warningsJson: { warnings: w } as object, errorsJson: [], rawJson: {} as object,
    status: op === "CREATE" ? "CREATED" : op === "UPDATE" ? "MATCHED" : op === "FAILED" ? "FAILED" : "SKIPPED",
    message: `[${op}] ${externalType} ${w.join(",")}`,
  } });
}
