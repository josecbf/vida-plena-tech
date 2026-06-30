import type { PrismaClient, Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────
// FASE 3B.3 — APPLY CONTROLADO de resoluções APROVADAS (READY_TO_APPLY).
//
// Executa SOMENTE decisões com status READY_TO_APPLY. Idempotente (marca
// APPLIED após sucesso; não reaplica). NÃO promove a MEMBER, não altera
// Person/status, não cria User/RoleAssignment, não importa encontros/presenças/
// eventos/ensino. Cada decisão é aplicada em transação; falha isolada não quebra
// o lote. Sem alvo claro → SKIP_UNSAFE (não aplica, não marca APPLIED).
// ─────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;

export type ActionKind =
  | "CREATE_MEMBERSHIP"
  | "CLOSE_MEMBERSHIP"
  | "CREATE_EXTERNAL_MAPPING_ALIAS"
  | "IGNORE"
  | "SKIP_UNSAFE";

export interface ResolutionPlan {
  resolutionId: string;
  conflictKey: string;
  type: string;
  decision: string;
  status: string;
  personId: string | null;
  personName: string;
  targetGrowthGroupId: string | null;
  targetGcName: string | null;
  targetPersonId: string | null;
  membershipId: string | null;
  proverPersonUuid: string | null;
  actions: ActionKind[];
  applicable: boolean;
  reason: string;
  risks: string[];
}

export interface ResolutionApplyReport {
  batchId: string | null;
  readyToApply: number;
  applicable: number;
  skipUnsafe: number;
  applied: number;
  failed: number;
  membershipsCreated: number;
  membershipsClosed: number;
  aliasMappingsCreated: number;
  ignored: number;
  plans: ResolutionPlan[];
}

type ResolutionRow = {
  id: string;
  conflictKey: string;
  type: string;
  decision: string;
  status: string;
  personId: string | null;
  growthGroupId: string | null;
  proverPersonUuid: string | null;
  payloadJson: unknown;
};

function payloadOf(j: unknown): { target?: string; joinedAt?: string; leftAt?: string } {
  return (j && typeof j === "object" ? (j as Record<string, unknown>) : {}) as { target?: string; joinedAt?: string; leftAt?: string };
}

/** inactive-gc-active-membership:<tenantId>:<membershipId> → membershipId */
function membershipIdFromKey(conflictKey: string): string | null {
  const parts = conflictKey.split(":");
  return parts[0] === "inactive-gc-active-membership" && parts.length >= 3 ? parts[2] : null;
}

async function planOne(prisma: PrismaClient, tenantId: string, r: ResolutionRow): Promise<ResolutionPlan> {
  const payload = payloadOf(r.payloadJson);
  const target = payload.target || null;
  const risks: string[] = [];
  let actions: ActionKind[] = [];
  let applicable = true;
  let reason = "";
  let targetGrowthGroupId: string | null = null;
  let targetPersonId: string | null = null;
  let membershipId: string | null = null;

  const unsafe = (why: string) => {
    actions = ["SKIP_UNSAFE"];
    applicable = false;
    reason = why;
  };

  switch (r.decision) {
    case "KEEP_THIS_GC_ACTIVE": {
      if (r.type === "ACTIVE_MEMBERSHIP_IN_INACTIVE_GC") {
        unsafe("manter GC ativo exigiria reativar GC — não nesta fase (trate como REVIEW_LATER)");
        break;
      }
      // A: alvo vem do payload; B: o GC do próprio conflito
      const gcId = r.type === "MULTIPLE_ACTIVE_GCS" ? target : r.growthGroupId;
      if (!gcId) {
        unsafe("alvo (GC) não escolhido no payload");
        break;
      }
      const gc = await prisma.growthGroup.findFirst({ where: { tenantId, id: gcId }, select: { id: true } });
      if (!gc) {
        unsafe(`GC alvo (${gcId}) não existe`);
        break;
      }
      if (!r.personId) {
        unsafe("resolução sem personId");
        break;
      }
      targetGrowthGroupId = gcId;
      actions = ["CREATE_MEMBERSHIP"];
      reason = "garantir vínculo ativo no GC escolhido";
      if (r.type === "MULTIPLE_ACTIVE_GCS") {
        actions.push("CLOSE_MEMBERSHIP");
        risks.push("encerra outros vínculos ativos PARTICIPANT da pessoa (preserva histórico)");
      }
      break;
    }
    case "CLOSE_THIS_MEMBERSHIP": {
      if (r.type === "ACTIVE_MEMBERSHIP_IN_INACTIVE_GC") {
        membershipId = membershipIdFromKey(r.conflictKey);
        if (!membershipId) {
          unsafe("membershipId não derivável do conflictKey");
          break;
        }
        const m = await prisma.growthGroupMembership.findFirst({ where: { tenantId, id: membershipId }, select: { id: true, leftAt: true } });
        if (!m) {
          unsafe("membership alvo não existe");
          break;
        }
        actions = ["CLOSE_MEMBERSHIP"];
        reason = m.leftAt ? "vínculo já encerrado (idempotente)" : "encerrar vínculo ativo em GC inativo";
      } else {
        unsafe("CLOSE_THIS_MEMBERSHIP sem alvo materializado — não aplicável nesta fase");
      }
      break;
    }
    case "IGNORE_DUPLICATE": {
      actions = ["IGNORE"];
      reason = "ignorado por decisão humana (estado já seguro/idempotente)";
      break;
    }
    case "CONSOLIDATE_HISTORY": {
      if (!payload.joinedAt) {
        unsafe("consolidação requer datas explícitas no payload (inferência fraca evitada)");
        break;
      }
      if (!r.personId || !r.growthGroupId) {
        unsafe("resolução sem personId/growthGroupId");
        break;
      }
      targetGrowthGroupId = r.growthGroupId;
      actions = ["CREATE_MEMBERSHIP"];
      reason = "consolidar em 1 vínculo histórico com datas explícitas";
      break;
    }
    case "MAP_ALIAS_TO_PERSON": {
      if (!target) {
        unsafe("pessoa alvo não escolhida no payload");
        break;
      }
      const cand = await prisma.person.findFirst({ where: { tenantId, id: target }, select: { id: true } });
      if (!cand) {
        unsafe(`pessoa alvo (${target}) não existe`);
        break;
      }
      if (!r.proverPersonUuid) {
        unsafe("resolução sem proverPersonUuid");
        break;
      }
      targetPersonId = target;
      actions = ["CREATE_EXTERNAL_MAPPING_ALIAS"];
      reason = "criar alias para a pessoa escolhida";
      risks.push("membership não materializado aqui — rode gc-memberships:apply depois");
      break;
    }
    case "REVIEW_LATER":
    default:
      unsafe("REVIEW_LATER / decisão sem efeito de aplicação");
  }

  const person = r.personId ? await prisma.person.findFirst({ where: { tenantId, id: r.personId }, select: { fullName: true } }) : null;
  const gc = targetGrowthGroupId ? await prisma.growthGroup.findFirst({ where: { tenantId, id: targetGrowthGroupId }, select: { name: true } }) : null;

  return {
    resolutionId: r.id, conflictKey: r.conflictKey, type: r.type, decision: r.decision, status: r.status,
    personId: r.personId, personName: person?.fullName ?? (r.proverPersonUuid ?? "—"),
    targetGrowthGroupId, targetGcName: gc?.name ?? null, targetPersonId, membershipId,
    proverPersonUuid: r.proverPersonUuid, actions, applicable, reason, risks,
  };
}

async function loadReady(prisma: PrismaClient, opts: { tenantId: string; type?: string; conflictKey?: string; limit?: number }): Promise<ResolutionRow[]> {
  return prisma.gcMembershipConflictResolution.findMany({
    where: {
      tenantId: opts.tenantId,
      status: "READY_TO_APPLY",
      ...(opts.type ? { type: opts.type as never } : {}),
      ...(opts.conflictKey ? { conflictKey: opts.conflictKey } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: opts.limit,
    select: { id: true, conflictKey: true, type: true, decision: true, status: true, personId: true, growthGroupId: true, proverPersonUuid: true, payloadJson: true },
  });
}

export async function planResolutions(
  prisma: PrismaClient,
  opts: { tenantId: string; type?: string; conflictKey?: string; limit?: number },
): Promise<ResolutionPlan[]> {
  const rows = await loadReady(prisma, opts);
  const plans: ResolutionPlan[] = [];
  for (const r of rows) plans.push(await planOne(prisma, opts.tenantId, r));
  return plans;
}

export async function applyResolutions(
  prisma: PrismaClient,
  opts: { tenantId: string; actorUserId?: string | null; type?: string; conflictKey?: string; limit?: number },
): Promise<ResolutionApplyReport> {
  const { tenantId, actorUserId = null } = opts;
  const rows = await loadReady(prisma, opts);

  const batch = await prisma.importBatch.create({
    data: { tenantId, mode: "APPLY", system: "PROVER", status: "PROCESSING", fileName: "resolutions", total: rows.length },
  });

  const report: ResolutionApplyReport = {
    batchId: batch.id, readyToApply: rows.length, applicable: 0, skipUnsafe: 0, applied: 0, failed: 0,
    membershipsCreated: 0, membershipsClosed: 0, aliasMappingsCreated: 0, ignored: 0, plans: [],
  };

  for (const r of rows) {
    const plan = await planOne(prisma, tenantId, r);
    report.plans.push(plan);
    if (!plan.applicable) {
      report.skipUnsafe++;
      await prisma.importBatchItem.create({
        data: {
          tenantId, batchId: batch.id, externalType: "conflict_resolution", externalId: plan.conflictKey,
          operation: "SKIP", matchStrategy: "NONE", severity: "WARNING", targetType: "GcMembershipConflictResolution",
          targetId: plan.resolutionId, warningsJson: { reason: plan.reason, actions: plan.actions } as object,
          rawJson: { decision: plan.decision, type: plan.type } as object, status: "SKIPPED",
          message: `[SKIP_UNSAFE] ${plan.reason}`,
        },
      });
      continue;
    }
    report.applicable++;
    try {
      const result = await prisma.$transaction((tx) => executeOne(tx, { tenantId, batchId: batch.id, actorUserId, plan }));
      report.applied++;
      report.membershipsCreated += result.created ? 1 : 0;
      report.membershipsClosed += result.closed.length;
      report.aliasMappingsCreated += result.aliasMappingId ? 1 : 0;
      report.ignored += result.ignored ? 1 : 0;
    } catch (err) {
      report.failed++;
      await prisma.importBatchItem.create({
        data: {
          tenantId, batchId: batch.id, externalType: "conflict_resolution", externalId: plan.conflictKey,
          operation: "FAILED", matchStrategy: "NONE", severity: "ERROR", targetType: "GcMembershipConflictResolution",
          targetId: plan.resolutionId, errorsJson: [err instanceof Error ? err.message : "erro"],
          rawJson: { decision: plan.decision } as object, status: "FAILED",
          message: `[FAILED] ${err instanceof Error ? err.message : "erro"}`,
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "COMPLETED", created: report.membershipsCreated, matched: report.applied, skipped: report.skipUnsafe, failed: report.failed, finishedAt: new Date() },
  });

  return report;
}

interface ExecResult {
  actions: ActionKind[];
  created: string | null;
  ensured: boolean;
  closed: string[];
  aliasMappingId: string | null;
  ignored: boolean;
}

async function executeOne(
  tx: Tx,
  ctx: { tenantId: string; batchId: string; actorUserId: string | null; plan: ResolutionPlan },
): Promise<ExecResult> {
  const { tenantId, batchId, actorUserId, plan } = ctx;
  const res: ExecResult = { actions: plan.actions, created: null, ensured: false, closed: [], aliasMappingId: null, ignored: false };
  const reasonText = `Resolução de conflito (batch ${batchId})`;

  // CREATE_MEMBERSHIP (garante vínculo ativo no GC alvo) — idempotente por (person, gc, ativo)
  if (plan.actions.includes("CREATE_MEMBERSHIP") && plan.personId && plan.targetGrowthGroupId) {
    const existing = await tx.growthGroupMembership.findFirst({
      where: { tenantId, personId: plan.personId, gcId: plan.targetGrowthGroupId, leftAt: null },
      select: { id: true },
    });
    if (existing) res.ensured = true;
    else {
      const m = await tx.growthGroupMembership.create({
        data: { tenantId, gcId: plan.targetGrowthGroupId, personId: plan.personId, joinedAt: new Date(), leftAt: null, source: "PARTICIPANT", reason: reasonText },
        select: { id: true },
      });
      res.created = m.id;
    }
  }

  // CLOSE_MEMBERSHIP
  if (plan.actions.includes("CLOSE_MEMBERSHIP")) {
    if (plan.type === "ACTIVE_MEMBERSHIP_IN_INACTIVE_GC" && plan.membershipId) {
      const m = await tx.growthGroupMembership.findFirst({ where: { tenantId, id: plan.membershipId }, select: { id: true, leftAt: true } });
      if (m && m.leftAt === null) {
        await tx.growthGroupMembership.update({ where: { id: m.id }, data: { leftAt: new Date(), reason: reasonText } });
        res.closed.push(m.id);
      }
    } else if (plan.type === "MULTIPLE_ACTIVE_GCS" && plan.personId && plan.targetGrowthGroupId) {
      // encerra outros vínculos ativos PARTICIPANT da pessoa (preserva histórico)
      const others = await tx.growthGroupMembership.findMany({
        where: { tenantId, personId: plan.personId, leftAt: null, source: "PARTICIPANT", NOT: { gcId: plan.targetGrowthGroupId } },
        select: { id: true },
      });
      for (const o of others) {
        await tx.growthGroupMembership.update({ where: { id: o.id }, data: { leftAt: new Date(), reason: reasonText } });
        res.closed.push(o.id);
      }
    }
  }

  // CREATE_EXTERNAL_MAPPING_ALIAS — idempotente por externalId (uuid)
  if (plan.actions.includes("CREATE_EXTERNAL_MAPPING_ALIAS") && plan.proverPersonUuid && plan.targetPersonId) {
    const existing = await tx.externalMapping.findFirst({
      where: { tenantId, system: "PROVER", externalType: "person", externalId: plan.proverPersonUuid },
      select: { id: true },
    });
    if (!existing) {
      const m = await tx.externalMapping.create({
        data: { tenantId, system: "PROVER", externalType: "person", externalId: plan.proverPersonUuid, internalType: "Person", internalId: plan.targetPersonId },
        select: { id: true },
      });
      res.aliasMappingId = m.id;
    }
  }

  if (plan.actions.includes("IGNORE")) res.ignored = true;

  // marca a resolução como APPLIED (idempotente: só é selecionada se READY_TO_APPLY)
  await tx.gcMembershipConflictResolution.update({
    where: { id: plan.resolutionId },
    data: {
      status: "APPLIED",
      appliedAt: new Date(),
      appliedByUserId: actorUserId,
      applyBatchId: batchId,
      applyResultJson: { actions: res.actions, created: res.created, ensured: res.ensured, closed: res.closed, aliasMappingId: res.aliasMappingId, ignored: res.ignored, reason: plan.reason } as object,
    },
  });

  await tx.auditLog.create({
    data: {
      tenantId, actorUserId, module: "integrations", action: "conflict_resolution_applied",
      entityType: "GcMembershipConflictResolution", entityId: plan.resolutionId, sensitivity: "INTERNAL",
      reason: `Aplicação de decisão (${plan.type} · ${plan.decision})`,
      afterJson: { conflictKey: plan.conflictKey, decision: plan.decision, batchId, created: res.created, closed: res.closed, aliasMappingId: res.aliasMappingId, ignored: res.ignored } as object,
    },
  });

  await tx.importBatchItem.create({
    data: {
      tenantId, batchId, externalType: "conflict_resolution", externalId: plan.conflictKey,
      operation: res.created || res.aliasMappingId ? "CREATE" : res.closed.length ? "UPDATE" : "SKIP",
      matchStrategy: "COMPOSITE_KEY", severity: "INFO", targetType: "GcMembershipConflictResolution", targetId: plan.resolutionId,
      normalizedJson: { actions: res.actions, created: res.created, closed: res.closed, aliasMappingId: res.aliasMappingId, ignored: res.ignored } as object,
      rawJson: { decision: plan.decision, type: plan.type } as object, status: "CREATED",
      message: `[APPLIED] ${plan.decision} → ${plan.actions.join(",")}`,
    },
  });

  return res;
}
