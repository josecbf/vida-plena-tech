"use server";

import { ContactType } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit, emitEvent, addTimeline } from "@/server/audit";
import { onlyDigits, isValidCpf } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────
// CADASTRO PÚBLICO (sem login)
//
// Fluxo: visitante preenche dados básicos. Se vier por link de GC, já vincula
// ao GC. Status inicial sempre VISITOR. Dedup por CPF (bloqueia) e sugestão
// por nome+contato (não bloqueia) — complemento itens 18-21.
//
// Multi-tenant: em produção o tenant viria do subdomínio/domínio. Na demo,
// resolvemos pelo token do GC ou pelo único tenant seedado.
// ─────────────────────────────────────────────────────────────────────────

export interface PublicRegistrationInput {
  fullName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  birthDate?: string;
  cpf?: string;
  gcToken?: string;
}

export type PublicRegistrationResult =
  | { ok: true; personId: string; gcName?: string }
  | { ok: false; reason: "DUPLICATE_CPF" | "POSSIBLE_MATCH" | "ERROR"; message: string };

async function resolveTenantAndGc(gcToken?: string) {
  if (gcToken) {
    const link = await prisma.growthGroupInviteLink.findFirst({
      where: { token: gcToken, active: true },
      include: { gc: true },
    });
    if (link) return { tenantId: link.tenantId, gc: link.gc };
  }
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) throw new Error("Nenhum tenant configurado.");
  return { tenantId: tenant.id, gc: null };
}

export async function registerPublicPerson(
  input: PublicRegistrationInput,
): Promise<PublicRegistrationResult> {
  if (!input.fullName?.trim()) {
    return { ok: false, reason: "ERROR", message: "Informe o nome completo." };
  }

  const { tenantId, gc } = await resolveTenantAndGc(input.gcToken);

  // Dedup por CPF (bloqueia e orienta a continuar do existente)
  let cpf: string | null = null;
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
        return {
          ok: false,
          reason: "DUPLICATE_CPF",
          message:
            "Já encontramos um cadastro com este CPF. Procure a secretaria para continuar a partir do cadastro existente.",
        };
      }
    }
  }

  // Sugestão por nome + contato (não bloqueia — apenas avisa)
  if (!cpf) {
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

  const person = await prisma.$transaction(async (tx) => {
    const p = await tx.person.create({
      data: {
        tenantId,
        campusId: gc?.campusId ?? null,
        fullName: input.fullName.trim(),
        cpf,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        status: "VISITOR",
        source: gc ? "GC_INVITE_LINK" : "PUBLIC_FORM",
        primaryGcId: gc?.id ?? null,
      },
    });

    const contacts: { type: ContactType; value: string }[] = [];
    if (input.email) contacts.push({ type: "EMAIL", value: input.email.trim() });
    if (input.phone) contacts.push({ type: "PHONE", value: input.phone.trim() });
    if (input.whatsapp)
      contacts.push({ type: "WHATSAPP", value: input.whatsapp.trim() });
    for (const c of contacts) {
      await tx.contactMethod.create({
        data: { tenantId, personId: p.id, ...c },
      });
    }

    await tx.personStatusHistory.create({
      data: { tenantId, personId: p.id, toStatus: "VISITOR", reason: "Cadastro público" },
    });

    await addTimeline(tx, {
      tenantId,
      personId: p.id,
      type: "PERSON_CREATED",
      title: gc ? `Cadastro via link do GC ${gc.name}` : "Cadastro público",
    });

    if (gc) {
      await tx.growthGroupMembership.create({
        data: { tenantId, gcId: gc.id, personId: p.id },
      });
      await addTimeline(tx, {
        tenantId,
        personId: p.id,
        type: "GC_CHANGED",
        title: `Entrou no GC ${gc.name}`,
      });
    }

    await writeAudit(tx, {
      tenantId,
      actorUserId: null, // sistema (cadastro público)
      module: "people",
      action: "create",
      entityType: "Person",
      entityId: p.id,
      sensitivity: cpf ? "CONFIDENTIAL" : "INTERNAL",
      after: { fullName: p.fullName, source: p.source, gcId: gc?.id ?? null },
    });

    await emitEvent(tx, {
      tenantId,
      eventType: "person.created",
      aggregateType: "Person",
      aggregateId: p.id,
      payload: { personId: p.id, source: p.source },
    });

    return p;
  });

  return { ok: true, personId: person.id, gcName: gc?.name };
}
