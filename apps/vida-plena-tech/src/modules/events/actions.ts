"use server";

import { revalidatePath } from "next/cache";
import { EventVisibility } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireContext, assertPermission, canViewPerson } from "@/server/context";
import { writeAudit, emitEvent, addTimeline } from "@/server/audit";

// ─────────────────────────────────────────────────────────────────────────
// MÓDULO EVENTOS (básico — sem pagamento/capacidade/lote)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Quem pode inscrever/cancelar `personId`:
 *  - a própria pessoa (membro inscreve a si mesmo);
 *  - liderança, se a pessoa estiver no seu escopo (canViewPerson);
 *  - admin e pastor sênior, todo o tenant (canViewPerson → ALL).
 * Validado no backend, não só na UI.
 */
async function assertCanManageRegistration(
  ctx: Awaited<ReturnType<typeof requireContext>>,
  personId: string,
) {
  if (ctx.personId && personId === ctx.personId) return; // a si mesmo
  if (await canViewPerson(ctx, personId)) return; // dentro do escopo
  throw new Error("Acesso negado: pessoa fora do seu escopo.");
}

export async function createEvent(input: {
  title: string;
  description?: string;
  campusId?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  visibility: EventVisibility;
  publish: boolean;
}) {
  const ctx = await requireContext();
  assertPermission(ctx, "events.event.create");

  const event = await prisma.$transaction(async (tx) => {
    const e = await tx.event.create({
      data: {
        tenantId: ctx.tenantId,
        campusId: input.campusId || null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        visibility: input.visibility,
        status: input.publish ? "PUBLISHED" : "DRAFT",
        createdByUserId: ctx.userId,
      },
    });

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "events",
      action: "create",
      entityType: "Event",
      entityId: e.id,
      after: { title: e.title, status: e.status },
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "event.created",
      aggregateType: "Event",
      aggregateId: e.id,
      actorUserId: ctx.userId,
      payload: { eventId: e.id, title: e.title },
    });

    return e;
  });

  revalidatePath("/eventos");
  return { ok: true as const, id: event.id };
}

/** Inscreve uma pessoa em um evento. Gera Timeline + AuditLog. */
export async function registerForEvent(input: {
  eventId: string;
  personId: string;
}) {
  const ctx = await requireContext();
  assertPermission(ctx, "events.registration.create");
  await assertCanManageRegistration(ctx, input.personId);

  const event = await prisma.event.findFirstOrThrow({
    where: { id: input.eventId, tenantId: ctx.tenantId },
  });
  if (event.status !== "PUBLISHED") {
    throw new Error("Evento não está aberto para inscrições.");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.eventRegistration.findUnique({
      where: {
        eventId_personId: { eventId: input.eventId, personId: input.personId },
      },
    });
    if (existing && existing.status === "CONFIRMED") return;

    await tx.eventRegistration.upsert({
      where: {
        eventId_personId: { eventId: input.eventId, personId: input.personId },
      },
      create: {
        tenantId: ctx.tenantId,
        eventId: input.eventId,
        personId: input.personId,
        status: "CONFIRMED",
      },
      update: { status: "CONFIRMED", cancelledAt: null },
    });

    await addTimeline(tx, {
      tenantId: ctx.tenantId,
      personId: input.personId,
      type: "EVENT_REGISTRATION",
      title: `Inscrição em ${event.title}`,
      actorUserId: ctx.userId,
    });

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "events",
      action: "registration_created",
      entityType: "EventRegistration",
      entityId: input.eventId,
      after: { eventId: input.eventId, personId: input.personId },
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "event.registration_created",
      aggregateType: "Event",
      aggregateId: input.eventId,
      actorUserId: ctx.userId,
      payload: { eventId: input.eventId, personId: input.personId },
    });
  });

  revalidatePath(`/eventos/${input.eventId}`);
  revalidatePath("/minhas-inscricoes");
  return { ok: true as const };
}

export async function cancelRegistration(input: {
  eventId: string;
  personId: string;
}) {
  const ctx = await requireContext();
  assertPermission(ctx, "events.registration.create");
  await assertCanManageRegistration(ctx, input.personId);

  const event = await prisma.event.findFirstOrThrow({
    where: { id: input.eventId, tenantId: ctx.tenantId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.eventRegistration.update({
      where: {
        eventId_personId: { eventId: input.eventId, personId: input.personId },
      },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    await addTimeline(tx, {
      tenantId: ctx.tenantId,
      personId: input.personId,
      type: "EVENT_REGISTRATION_CANCELLED",
      title: `Inscrição cancelada em ${event.title}`,
      actorUserId: ctx.userId,
    });

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "events",
      action: "registration_cancelled",
      entityType: "EventRegistration",
      entityId: input.eventId,
      after: { eventId: input.eventId, personId: input.personId },
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "event.registration_cancelled",
      aggregateType: "Event",
      aggregateId: input.eventId,
      actorUserId: ctx.userId,
      payload: { eventId: input.eventId, personId: input.personId },
    });
  });

  revalidatePath(`/eventos/${input.eventId}`);
  revalidatePath("/minhas-inscricoes");
  return { ok: true as const };
}
