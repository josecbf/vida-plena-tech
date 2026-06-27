"use server";

import { revalidatePath } from "next/cache";
import {
  EclesiasticalStatus,
  Sex,
  MaritalStatus,
  ContactType,
  FamilyRelationship,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/server/db";
import {
  requireContext,
  assertPermission,
  canViewPerson,
  can,
} from "@/server/context";
import { writeAudit, emitEvent, addTimeline } from "@/server/audit";
import { onlyDigits, isValidCpf } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────
// MÓDULO PESSOAS — server actions (deny-by-default; audit + evento + timeline)
// ─────────────────────────────────────────────────────────────────────────

export interface PersonFormInput {
  fullName: string;
  socialName?: string;
  cpf?: string;
  birthDate?: string;
  sex?: Sex | "";
  maritalStatus?: MaritalStatus | "";
  campusId?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  isBaptized?: boolean;
  baptismDate?: string;
  hasTD?: boolean;
  tdDate?: string;
  operationalNotes?: string;
  // Endereço principal (um por pessoa na demo)
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

function normalizeCpf(cpf?: string): string | null {
  if (!cpf) return null;
  const d = onlyDigits(cpf);
  if (!d) return null;
  if (!isValidCpf(d)) throw new Error("CPF inválido.");
  return d;
}

/**
 * Valida batismo no backend (não confiar só na UI):
 *  - isBaptized=true  → baptismDate obrigatória;
 *  - isBaptized=false → baptismDate deve ser nula.
 * Campos futuros pendentes: igreja, local, pastor/ministro.
 */
function resolveBaptism(input: PersonFormInput): {
  isBaptized: boolean;
  baptismDate: Date | null;
} {
  const isBaptized = !!input.isBaptized;
  if (isBaptized) {
    if (!input.baptismDate) {
      throw new Error("Data de batismo é obrigatória quando a pessoa é batizada.");
    }
    return { isBaptized: true, baptismDate: new Date(input.baptismDate) };
  }
  return { isBaptized: false, baptismDate: null };
}

type Tx = Prisma.TransactionClient;

/**
 * Sincroniza os contatos primários (e-mail/telefone/WhatsApp) da pessoa.
 * E-mail e telefone NÃO são únicos. Decisão simples de demo: valor vazio
 * remove o contato daquele tipo; valor preenchido atualiza o existente ou cria.
 */
async function syncContacts(
  tx: Tx,
  tenantId: string,
  personId: string,
  values: { email?: string; phone?: string; whatsapp?: string },
) {
  const pairs: { type: ContactType; value?: string }[] = [
    { type: "EMAIL", value: values.email },
    { type: "PHONE", value: values.phone },
    { type: "WHATSAPP", value: values.whatsapp },
  ];
  for (const { type, value } of pairs) {
    const trimmed = value?.trim() || "";
    const existing = await tx.contactMethod.findFirst({
      where: { tenantId, personId, type },
      orderBy: { createdAt: "asc" },
    });
    if (!trimmed) {
      // valor vazio → remove contatos daquele tipo (decisão de demo)
      if (existing)
        await tx.contactMethod.deleteMany({ where: { tenantId, personId, type } });
      continue;
    }
    if (existing) {
      await tx.contactMethod.update({
        where: { id: existing.id },
        data: { value: trimmed, isPrimary: true },
      });
    } else {
      await tx.contactMethod.create({
        data: { tenantId, personId, type, value: trimmed, isPrimary: true },
      });
    }
  }
}

/** Mantém um único endereço principal por pessoa (demo). Vazio → remove. */
async function syncAddress(
  tx: Tx,
  tenantId: string,
  personId: string,
  input: PersonFormInput,
) {
  const data = {
    street: input.street?.trim() || null,
    number: input.number?.trim() || null,
    complement: input.complement?.trim() || null,
    district: input.district?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    zipCode: input.zipCode?.trim() || null,
  };
  const hasAny = Object.values(data).some((v) => v);
  const existing = await tx.address.findFirst({
    where: { tenantId, personId },
    orderBy: { createdAt: "asc" },
  });
  if (!hasAny) {
    if (existing) await tx.address.deleteMany({ where: { tenantId, personId } });
    return;
  }
  if (existing) {
    await tx.address.update({ where: { id: existing.id }, data });
  } else {
    await tx.address.create({ data: { tenantId, personId, ...data } });
  }
}

/** Confere se já existe pessoa com este CPF no tenant (dedup). */
async function assertCpfUnique(
  tenantId: string,
  cpf: string,
  exceptId?: string,
) {
  const existing = await prisma.person.findFirst({
    where: { tenantId, cpf, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true, fullName: true },
  });
  if (existing) {
    throw new Error(
      `Já existe um cadastro com este CPF: ${existing.fullName}. Continue a partir do cadastro existente.`,
    );
  }
}

export async function createPerson(input: PersonFormInput) {
  const ctx = await requireContext();
  assertPermission(ctx, "people.person.create");

  const cpf = normalizeCpf(input.cpf);
  if (cpf) await assertCpfUnique(ctx.tenantId, cpf);
  const baptism = resolveBaptism(input);

  const person = await prisma.$transaction(async (tx) => {
    const p = await tx.person.create({
      data: {
        tenantId: ctx.tenantId,
        campusId: input.campusId || null,
        fullName: input.fullName.trim(),
        socialName: input.socialName?.trim() || null,
        cpf,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        sex: input.sex || null,
        maritalStatus: input.maritalStatus || null,
        status: "VISITOR",
        isBaptized: baptism.isBaptized,
        baptismDate: baptism.baptismDate,
        hasTD: !!input.hasTD,
        tdDate: input.tdDate ? new Date(input.tdDate) : null,
        operationalNotes: input.operationalNotes?.trim() || null,
        source: "ADMIN_CREATED",
      },
    });

    await syncContacts(tx, ctx.tenantId, p.id, input);
    await syncAddress(tx, ctx.tenantId, p.id, input);

    await tx.personStatusHistory.create({
      data: {
        tenantId: ctx.tenantId,
        personId: p.id,
        toStatus: "VISITOR",
        actorUserId: ctx.userId,
        reason: "Cadastro criado",
      },
    });

    await addTimeline(tx, {
      tenantId: ctx.tenantId,
      personId: p.id,
      type: "PERSON_CREATED",
      title: "Cadastro criado",
      actorUserId: ctx.userId,
    });

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "people",
      action: "create",
      entityType: "Person",
      entityId: p.id,
      sensitivity: cpf ? "CONFIDENTIAL" : "INTERNAL",
      after: { fullName: p.fullName, status: p.status, hasCpf: !!cpf },
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "person.created",
      aggregateType: "Person",
      aggregateId: p.id,
      actorUserId: ctx.userId,
      payload: { personId: p.id, status: p.status },
    });

    return p;
  });

  revalidatePath("/pessoas");
  return { ok: true as const, id: person.id };
}

export async function updatePerson(personId: string, input: PersonFormInput) {
  const ctx = await requireContext();
  assertPermission(ctx, "people.person.edit");
  if (!(await canViewPerson(ctx, personId))) {
    throw new Error("Acesso negado: pessoa fora do seu escopo.");
  }

  const before = await prisma.person.findFirstOrThrow({
    where: { id: personId, tenantId: ctx.tenantId },
  });

  // CPF é dado sensível: só quem tem people.cpf.view_full pode alterá-lo.
  // Para os demais, preservamos o valor existente (nunca apagamos por edição).
  const canEditCpf = can(ctx, "people.cpf.view_full");
  const cpf = canEditCpf ? normalizeCpf(input.cpf) : before.cpf;
  if (canEditCpf && cpf && cpf !== before.cpf) {
    await assertCpfUnique(ctx.tenantId, cpf, personId);
  }
  const baptism = resolveBaptism(input);

  await prisma.$transaction(async (tx) => {
    const after = await tx.person.update({
      where: { id: personId },
      data: {
        fullName: input.fullName.trim(),
        socialName: input.socialName?.trim() || null,
        cpf,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        sex: input.sex || null,
        maritalStatus: input.maritalStatus || null,
        campusId: input.campusId || null,
        isBaptized: baptism.isBaptized,
        baptismDate: baptism.baptismDate,
        hasTD: !!input.hasTD,
        tdDate: input.tdDate ? new Date(input.tdDate) : null,
        operationalNotes: input.operationalNotes?.trim() || null,
      },
    });

    // Atualiza contatos (e-mail/telefone/WhatsApp) e endereço principal.
    await syncContacts(tx, ctx.tenantId, personId, input);
    await syncAddress(tx, ctx.tenantId, personId, input);

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "people",
      action: "update",
      entityType: "Person",
      entityId: personId,
      sensitivity: cpf ? "CONFIDENTIAL" : "INTERNAL",
      before: { fullName: before.fullName, status: before.status },
      after: {
        fullName: after.fullName,
        status: after.status,
        contacts: { email: input.email, phone: input.phone, whatsapp: input.whatsapp },
        addressUpdated: true,
      },
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "person.updated",
      aggregateType: "Person",
      aggregateId: personId,
      actorUserId: ctx.userId,
      payload: { personId },
    });
  });

  revalidatePath(`/pessoas/${personId}`);
  revalidatePath("/pessoas");
  return { ok: true as const };
}

/**
 * Promove/altera o status eclesiástico.
 * Regra (complemento 1-3): MEMBER oficial exige GC principal E CPF.
 */
export async function changeStatus(
  personId: string,
  toStatus: EclesiasticalStatus,
  reason?: string,
) {
  const ctx = await requireContext();
  assertPermission(ctx, "people.status.promote");
  if (!(await canViewPerson(ctx, personId))) {
    throw new Error("Acesso negado: pessoa fora do seu escopo.");
  }

  const person = await prisma.person.findFirstOrThrow({
    where: { id: personId, tenantId: ctx.tenantId },
  });

  if (toStatus === "MEMBER") {
    if (!person.primaryGcId) {
      throw new Error(
        "Para se tornar MEMBRO oficial, a pessoa precisa estar vinculada a um GC.",
      );
    }
    if (!person.cpf) {
      throw new Error("Para se tornar MEMBRO oficial, o CPF é obrigatório.");
    }
  }

  if (person.status === toStatus) {
    return { ok: true as const, unchanged: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.person.update({
      where: { id: personId },
      data: { status: toStatus },
    });

    await tx.personStatusHistory.create({
      data: {
        tenantId: ctx.tenantId,
        personId,
        fromStatus: person.status,
        toStatus,
        reason: reason || null,
        actorUserId: ctx.userId,
      },
    });

    await addTimeline(tx, {
      tenantId: ctx.tenantId,
      personId,
      type: "STATUS_CHANGED",
      title: `Status: ${person.status} → ${toStatus}`,
      description: reason || undefined,
      actorUserId: ctx.userId,
    });

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "people",
      action: "status_changed",
      entityType: "Person",
      entityId: personId,
      before: { status: person.status },
      after: { status: toStatus },
      reason: reason || null,
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "person.status_changed",
      aggregateType: "Person",
      aggregateId: personId,
      actorUserId: ctx.userId,
      payload: { personId, from: person.status, to: toStatus },
    });
  });

  revalidatePath(`/pessoas/${personId}`);
  revalidatePath("/pessoas");
  return { ok: true as const };
}

/** Cria/remove vínculo familiar (auditado e preservado). */
export async function linkFamily(input: {
  personId: string;
  relativeId: string;
  relationship: FamilyRelationship;
  householdName?: string;
}) {
  const ctx = await requireContext();
  assertPermission(ctx, "people.family.manage");
  if (
    !(await canViewPerson(ctx, input.personId)) ||
    !(await canViewPerson(ctx, input.relativeId))
  ) {
    throw new Error("Acesso negado: pessoa fora do seu escopo.");
  }

  await prisma.$transaction(async (tx) => {
    // Reaproveita a família da pessoa-base, ou cria uma.
    let household = await tx.householdMember.findFirst({
      where: { tenantId: ctx.tenantId, personId: input.personId },
      include: { household: true },
    });
    let householdId: string;
    if (household) {
      householdId = household.householdId;
    } else {
      const base = await tx.person.findFirstOrThrow({
        where: { id: input.personId },
      });
      const created = await tx.household.create({
        data: {
          tenantId: ctx.tenantId,
          name: input.householdName?.trim() || `Família ${base.fullName}`,
        },
      });
      householdId = created.id;
      await tx.householdMember.create({
        data: {
          tenantId: ctx.tenantId,
          householdId,
          personId: input.personId,
          relationship: "OTHER",
        },
      });
    }

    await tx.householdMember.upsert({
      where: {
        householdId_personId: { householdId, personId: input.relativeId },
      },
      create: {
        tenantId: ctx.tenantId,
        householdId,
        personId: input.relativeId,
        relationship: input.relationship,
      },
      update: { relationship: input.relationship },
    });

    for (const pid of [input.personId, input.relativeId]) {
      await addTimeline(tx, {
        tenantId: ctx.tenantId,
        personId: pid,
        type: "FAMILY_LINKED",
        title: "Vínculo familiar registrado",
        actorUserId: ctx.userId,
      });
    }

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "people",
      action: "family_linked",
      entityType: "Household",
      entityId: householdId,
      after: {
        personId: input.personId,
        relativeId: input.relativeId,
        relationship: input.relationship,
      },
    });

    await emitEvent(tx, {
      tenantId: ctx.tenantId,
      eventType: "person.family_linked",
      aggregateType: "Person",
      aggregateId: input.personId,
      actorUserId: ctx.userId,
      payload: { personId: input.personId, relativeId: input.relativeId },
    });
  });

  revalidatePath(`/pessoas/${input.personId}`);
  return { ok: true as const };
}

/** Adiciona observação pastoral SENSÍVEL (somente pastores). */
export async function addPastoralNote(personId: string, body: string) {
  const ctx = await requireContext();
  assertPermission(ctx, "people.pastoral_note.manage");
  if (!(await canViewPerson(ctx, personId))) {
    throw new Error("Acesso negado: pessoa fora do seu escopo.");
  }
  if (!body.trim()) throw new Error("A observação não pode ficar vazia.");

  await prisma.$transaction(async (tx) => {
    const note = await tx.pastoralNote.create({
      data: {
        tenantId: ctx.tenantId,
        personId,
        body: body.trim(),
        authorUserId: ctx.userId,
      },
    });

    await addTimeline(tx, {
      tenantId: ctx.tenantId,
      personId,
      type: "PASTORAL_NOTE",
      title: "Observação pastoral registrada",
      sensitivity: "CONFIDENTIAL",
      actorUserId: ctx.userId,
    });

    await writeAudit(tx, {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorPersonId: ctx.personId,
      module: "people",
      action: "create",
      entityType: "PastoralNote",
      entityId: note.id,
      sensitivity: "CONFIDENTIAL",
    });
  });

  revalidatePath(`/pessoas/${personId}`);
  return { ok: true as const };
}
