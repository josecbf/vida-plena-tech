import "server-only";
import { Prisma, Sensitivity } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────
// AUDITORIA + EVENTOS DE DOMÍNIO (transacionais)
//
// writeAudit() e emitEvent() recebem o MESMO `tx` da mutação principal, de
// forma que auditoria e outbox vivem na mesma transação — ou tudo grava, ou
// nada grava. Isso implementa o padrão outbox do modelo canônico
// (ver docs/Técnico/Eventos de Dominio Auditoria e BI.md).
//
// Em demo não há publicador rodando: o outbox acumula PENDING. Em produção,
// um worker persistente lê PENDING e publica (ver ADR-0001 / Op.1.5).
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;

export interface AuditInput {
  tenantId: string;
  actorUserId?: string | null;
  actorPersonId?: string | null;
  module?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  sensitivity?: Sensitivity;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

export async function writeAudit(tx: Tx, input: AuditInput) {
  await tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      actorPersonId: input.actorPersonId ?? null,
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      sensitivity: input.sensitivity ?? "INTERNAL",
      beforeJson: toJson(input.before),
      afterJson: toJson(input.after),
      reason: input.reason ?? null,
    },
  });
}

export interface DomainEventInput {
  tenantId: string;
  eventType: string; // ex: person.created
  aggregateType: string; // ex: Person
  aggregateId: string;
  actorUserId?: string | null;
  payload: Record<string, unknown>;
  schemaVersion?: number;
  sensitivity?: Sensitivity;
}

/** Grava o evento canônico + uma linha no outbox (mesma transação). */
export async function emitEvent(tx: Tx, input: DomainEventInput) {
  const data = {
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payloadJson: input.payload as Prisma.InputJsonValue,
    schemaVersion: input.schemaVersion ?? 1,
    sensitivity: input.sensitivity ?? "INTERNAL",
  };

  await tx.domainEvent.create({
    data: { ...data, actorUserId: input.actorUserId ?? null },
  });
  await tx.domainEventOutbox.create({ data });
}

/** Adiciona uma entrada à linha do tempo da pessoa (mesma transação). */
export async function addTimeline(
  tx: Tx,
  input: {
    tenantId: string;
    personId: string;
    type: Prisma.TimelineEntryCreateInput["type"];
    title: string;
    description?: string;
    sensitivity?: Sensitivity;
    actorUserId?: string | null;
    occurredAt?: Date;
  },
) {
  await tx.timelineEntry.create({
    data: {
      tenantId: input.tenantId,
      personId: input.personId,
      type: input.type,
      title: input.title,
      description: input.description,
      sensitivity: input.sensitivity ?? "INTERNAL",
      actorUserId: input.actorUserId ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
