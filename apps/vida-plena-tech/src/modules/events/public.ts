"use server";

import { ContactType } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit, emitEvent, addTimeline } from "@/server/audit";
import { onlyDigits, isValidCpf } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────
// INSCRIÇÃO PÚBLICA EM EVENTO (sem login)
//
// Visitante se inscreve em um evento PUBLICADO. Reaproveita ou cria um Person
// (source EVENT_PUBLIC, status VISITOR). Dedup por CPF (bloqueia) e sugestão
// por nome+contato (não bloqueia). Gera EventRegistration + Timeline + AuditLog.
// Sem pagamento, capacidade, lote ou check-in avançado.
// ─────────────────────────────────────────────────────────────────────────

export interface PublicEventRegistrationInput {
  eventId: string;
  fullName: string;
  cpf?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
}

export type PublicEventRegistrationResult =
  | { ok: true; alreadyRegistered?: boolean }
  | {
      ok: false;
      reason: "DUPLICATE_CPF" | "POSSIBLE_MATCH" | "EVENT_CLOSED" | "ERROR";
      message: string;
    };

export async function registerPublicForEvent(
  input: PublicEventRegistrationInput,
): Promise<PublicEventRegistrationResult> {
  if (!input.fullName?.trim()) {
    return { ok: false, reason: "ERROR", message: "Informe o nome completo." };
  }

  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event || event.status !== "PUBLISHED" || event.archivedAt) {
    return {
      ok: false,
      reason: "EVENT_CLOSED",
      message: "Este evento não está aberto para inscrições.",
    };
  }
  const tenantId = event.tenantId;

  // Dedup/reaproveitamento por CPF
  let cpf: string | null = null;
  let person: { id: string } | null = null;
  if (input.cpf) {
    const d = onlyDigits(input.cpf);
    if (d && !isValidCpf(d)) {
      return { ok: false, reason: "ERROR", message: "CPF inválido." };
    }
    cpf = d || null;
    if (cpf) {
      const existing = await prisma.person.findFirst({
        where: { tenantId, cpf },
        select: { id: true },
      });
      if (existing) {
        // CPF já existe → reaproveita o cadastro existente para a inscrição
        // (não cria duplicado), mas avisa para continuar pelo cadastro.
        person = existing;
      }
    }
  }

  // Sem CPF: tenta possível duplicidade por nome + contato (apenas avisa)
  if (!person && !cpf) {
    const contactValues = [input.email, input.phone, input.whatsapp]
      .filter(Boolean)
      .map((v) => v!.trim());
    if (contactValues.length > 0) {
      const possible = await prisma.person.findFirst({
        where: {
          tenantId,
          fullName: { equals: input.fullName.trim(), mode: "insensitive" },
          contacts: { some: { value: { in: contactValues } } },
        },
        select: { id: true },
      });
      if (possible) {
        return {
          ok: false,
          reason: "POSSIBLE_MATCH",
          message:
            "Encontramos um possível cadastro com seu nome e contato. Confirme com a secretaria para evitar duplicidade.",
        };
      }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Cria a pessoa se ainda não existe (visitante, origem EVENT_PUBLIC)
    let personId = person?.id;
    if (!personId) {
      const p = await tx.person.create({
        data: {
          tenantId,
          campusId: event.campusId,
          fullName: input.fullName.trim(),
          cpf,
          status: "VISITOR",
          source: "EVENT_PUBLIC",
        },
      });
      personId = p.id;

      const contacts: { type: ContactType; value: string }[] = [];
      if (input.email) contacts.push({ type: "EMAIL", value: input.email.trim() });
      if (input.phone) contacts.push({ type: "PHONE", value: input.phone.trim() });
      if (input.whatsapp)
        contacts.push({ type: "WHATSAPP", value: input.whatsapp.trim() });
      for (const c of contacts) {
        await tx.contactMethod.create({ data: { tenantId, personId, ...c } });
      }

      await tx.personStatusHistory.create({
        data: { tenantId, personId, toStatus: "VISITOR", reason: "Inscrição pública em evento" },
      });
      await addTimeline(tx, {
        tenantId,
        personId,
        type: "PERSON_CREATED",
        title: "Cadastro via inscrição pública em evento",
      });
      await emitEvent(tx, {
        tenantId,
        eventType: "person.created",
        aggregateType: "Person",
        aggregateId: personId,
        payload: { personId, source: "EVENT_PUBLIC" },
      });
    }

    // Inscrição idempotente
    const existingReg = await tx.eventRegistration.findUnique({
      where: { eventId_personId: { eventId: input.eventId, personId } },
    });
    if (existingReg && existingReg.status === "CONFIRMED") {
      return { alreadyRegistered: true };
    }

    await tx.eventRegistration.upsert({
      where: { eventId_personId: { eventId: input.eventId, personId } },
      create: { tenantId, eventId: input.eventId, personId, status: "CONFIRMED" },
      update: { status: "CONFIRMED", cancelledAt: null },
    });

    await addTimeline(tx, {
      tenantId,
      personId,
      type: "EVENT_REGISTRATION",
      title: `Inscrição (pública) em ${event.title}`,
    });

    await writeAudit(tx, {
      tenantId,
      actorUserId: null, // sistema (inscrição pública sem login)
      module: "events",
      action: "registration_created",
      entityType: "EventRegistration",
      entityId: input.eventId,
      after: { eventId: input.eventId, personId, public: true },
    });

    await emitEvent(tx, {
      tenantId,
      eventType: "event.registration_created",
      aggregateType: "Event",
      aggregateId: input.eventId,
      payload: { eventId: input.eventId, personId, public: true },
    });

    return { alreadyRegistered: false };
  });

  // Se o CPF já existia, ainda assim inscrevemos, mas sinalizamos para o visitante.
  if (person && cpf) {
    return { ok: true, alreadyRegistered: result.alreadyRegistered };
  }
  return { ok: true, alreadyRegistered: result.alreadyRegistered };
}
