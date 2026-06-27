"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import {
  requireContext,
  assertPermission,
  visibleGcIds,
  canViewPerson,
} from "@/server/context";
import { writeAudit, emitEvent, addTimeline } from "@/server/audit";

// ─────────────────────────────────────────────────────────────────────────
// MÓDULO GRUPOS DE CRESCIMENTO — server actions
// ─────────────────────────────────────────────────────────────────────────

async function assertGcInScope(ctx: Awaited<ReturnType<typeof requireContext>>, gcId: string) {
  const scope = await visibleGcIds(ctx);
  if (scope !== "ALL" && !scope.has(gcId)) {
    throw new Error("Acesso negado: GC fora do seu escopo.");
  }
}

/**
 * Transfere/define o GC principal de uma pessoa. Fecha a participação antiga
 * (preserva histórico) e abre a nova. O líder antigo perde acesso à pessoa.
 */
export async function changePersonGc(input: {
  personId: string;
  gcId: string;
  reason?: string;
}) {
  const ctx = await requireContext();
  // Permissão mais forte do que apenas visualizar (deny-by-default).
  assertPermission(ctx, "groups.membership.manage");
  // GC de destino precisa estar no escopo do usuário…
  await assertGcInScope(ctx, input.gcId);
  // …e a pessoa transferida precisa já ser visível por ele.
  // (líder não transfere pessoa de outro GC; supervisor/coordenador/pastor só
  //  dentro do próprio escopo; admin e pastor sênior, todo o tenant.)
  if (!(await canViewPerson(ctx, input.personId))) {
    throw new Error("Acesso negado: pessoa fora do seu escopo.");
  }

  const person = await prisma.person.findFirstOrThrow({
    where: { id: input.personId, tenantId: ctx.tenantId },
  });

  await prisma.$transaction(async (tx) => {
    // Fecha vínculos ativos anteriores (preserva histórico via leftAt)
    await tx.growthGroupMembership.updateMany({
      where: { tenantId: ctx.tenantId, personId: input.personId, leftAt: null },
      data: { leftAt: new Date(), reason: input.reason || "Transferência de GC" },
    });

    await tx.growthGroupMembership.create({
      data: { tenantId: ctx.tenantId, gcId: input.gcId, personId: input.personId },
    });

    const gc = await tx.growthGroup.findUniqueOrThrow({ where: { id: input.gcId } });

    await tx.person.update({
      where: { id: input.personId },
      data: { primaryGcId: input.gcId },
    });

    await addTimeline(tx, {
      tenantId: ctx.tenantId,
      personId: input.personId,
      type: "GC_CHANGED",
      title: `GC alterado para ${gc.name}`,
      description: input.reason || undefined,
      actorUserId: ctx.userId,
    });

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "groups",
      action: "gc_changed",
      entityType: "Person",
      entityId: input.personId,
      before: { primaryGcId: person.primaryGcId },
      after: { primaryGcId: input.gcId },
      reason: input.reason || null,
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "person.gc_changed",
      aggregateType: "Person",
      aggregateId: input.personId,
      actorUserId: ctx.userId,
      payload: { personId: input.personId, gcId: input.gcId },
    });
  });

  revalidatePath(`/pessoas/${input.personId}`);
  revalidatePath(`/gcs/${input.gcId}`);
  return { ok: true as const };
}

export async function createMeeting(input: {
  gcId: string;
  date: string;
  happened: boolean;
  notes?: string;
}) {
  const ctx = await requireContext();
  assertPermission(ctx, "groups.meeting.create");
  await assertGcInScope(ctx, input.gcId);

  const meeting = await prisma.$transaction(async (tx) => {
    const m = await tx.growthGroupMeeting.create({
      data: {
        tenantId: ctx.tenantId,
        gcId: input.gcId,
        date: new Date(input.date),
        happened: input.happened,
        notes: input.notes?.trim() || null,
        actorUserId: ctx.userId,
      },
    });

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "groups",
      action: "create",
      entityType: "GrowthGroupMeeting",
      entityId: m.id,
      after: { gcId: input.gcId, date: input.date, happened: input.happened },
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "gc.meeting_created",
      aggregateType: "GrowthGroupMeeting",
      aggregateId: m.id,
      actorUserId: ctx.userId,
      payload: { gcId: input.gcId, meetingId: m.id },
    });

    return m;
  });

  revalidatePath(`/gcs/${input.gcId}`);
  return { ok: true as const, id: meeting.id };
}

/** Registra presença/falta dos membros + visitantes de um encontro. */
export async function recordAttendance(input: {
  meetingId: string;
  entries: { personId?: string; visitorName?: string; status: AttendanceStatus }[];
}) {
  const ctx = await requireContext();
  assertPermission(ctx, "groups.attendance.record");

  const meeting = await prisma.growthGroupMeeting.findFirstOrThrow({
    where: { id: input.meetingId, tenantId: ctx.tenantId },
  });
  await assertGcInScope(ctx, meeting.gcId);

  // Validação server-side: cada personId precisa pertencer ao GC do encontro
  // (vínculo ativo) ou estar no escopo do usuário. Não confiar na UI.
  const gcMembers = await prisma.growthGroupMembership.findMany({
    where: { tenantId: ctx.tenantId, gcId: meeting.gcId, leftAt: null },
    select: { personId: true },
  });
  const gcMemberSet = new Set(gcMembers.map((m) => m.personId));
  for (const e of input.entries) {
    if (!e.personId) continue; // visitante avulso (só nome) é permitido
    if (gcMemberSet.has(e.personId)) continue;
    if (!(await canViewPerson(ctx, e.personId))) {
      throw new Error(
        "Pessoa fora do GC/escopo não pode ter presença registrada neste encontro.",
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    // Substitui presenças anteriores do encontro (idempotente por registro)
    await tx.growthGroupAttendance.deleteMany({
      where: { tenantId: ctx.tenantId, meetingId: input.meetingId },
    });

    for (const e of input.entries) {
      await tx.growthGroupAttendance.create({
        data: {
          tenantId: ctx.tenantId,
          meetingId: input.meetingId,
          personId: e.personId || null,
          visitorName: e.visitorName?.trim() || null,
          status: e.status,
        },
      });

      if (e.personId && e.status === "PRESENT") {
        await addTimeline(tx, {
          tenantId: ctx.tenantId,
          personId: e.personId,
          type: "ATTENDANCE",
          title: "Presença registrada no GC",
          occurredAt: meeting.date,
          actorUserId: ctx.userId,
        });
      }
    }

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "groups",
      action: "attendance_recorded",
      entityType: "GrowthGroupMeeting",
      entityId: input.meetingId,
      after: { count: input.entries.length },
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "gc.attendance_recorded",
      aggregateType: "GrowthGroupMeeting",
      aggregateId: input.meetingId,
      actorUserId: ctx.userId,
      payload: { meetingId: input.meetingId, gcId: meeting.gcId },
    });
  });

  revalidatePath(`/gcs/${meeting.gcId}`);
  return { ok: true as const };
}

/** Gera (ou reusa) o link público de cadastro do GC. */
export async function generateInviteLink(gcId: string) {
  const ctx = await requireContext();
  assertPermission(ctx, "groups.invite.create");
  await assertGcInScope(ctx, gcId);

  const existing = await prisma.growthGroupInviteLink.findFirst({
    where: { tenantId: ctx.tenantId, gcId, active: true },
  });
  if (existing) return { ok: true as const, token: existing.token };

  const token = randomBytes(9).toString("base64url");
  await prisma.$transaction(async (tx) => {
    await tx.growthGroupInviteLink.create({
      data: { tenantId: ctx.tenantId, gcId, token },
    });
    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      module: "groups",
      action: "create",
      entityType: "GrowthGroupInviteLink",
      entityId: token,
      after: { gcId },
    });
  });

  revalidatePath(`/gcs/${gcId}`);
  return { ok: true as const, token };
}
