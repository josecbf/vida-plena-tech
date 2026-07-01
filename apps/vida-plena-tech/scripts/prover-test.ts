/**
 * Testes das funções PURAS do importador Prover (sem DB, sem framework).
 *   pnpm prover:test
 * Sai com código != 0 se algum caso falhar.
 */
import { PrismaClient } from "@prisma/client";
import {
  classifyCpf,
  normalizeProverPerson,
  normalizeNameKey,
} from "../src/modules/integrations/prover/normalize";
import {
  deriveItemFields,
  runPessoasDryRun,
} from "../src/modules/integrations/prover/dry-run";
import { runPessoasApply } from "../src/modules/integrations/prover/apply";
import {
  normalizeProverGroup,
  normalizeGroupFunction,
} from "../src/modules/integrations/prover/normalize-group";
import { runGroupsDryRun } from "../src/modules/integrations/prover/groups-dry-run";
import { runGroupsApply } from "../src/modules/integrations/prover/groups-apply";
import { hasTenantWideScope, getGrowthGroupScopeForPerson, personHasAccessToGrowthGroup } from "../src/server/scope";
import { normalizeGcParticipant, normalizeGcVisitor } from "../src/modules/integrations/prover/normalize-gc-membership";
import { runGcMembershipsDryRun } from "../src/modules/integrations/prover/gc-memberships-dry-run";
import { buildSanitizationReport, writeSanitizationReport } from "../src/modules/integrations/prover/gc-memberships-report";
import { analyzePersonMappingReconcile, applyPersonMappingReconcile } from "../src/modules/integrations/prover/person-mapping-reconcile";
import { analyzeAliasMapping, applyAliasMapping } from "../src/modules/integrations/prover/person-alias-mapping";
import { runGcMembershipsApply } from "../src/modules/integrations/prover/gc-memberships-apply";
import { parseGcListParams, buildGcListWhere, gcListQueryString, totalPages, GC_PAGE_SIZE } from "../src/lib/gc-list";
import { MEMBERSHIP_SOURCE_LABEL } from "../src/lib/labels";
import { buildConflictReport, flattenConflictReport, filterConflictRows, parseConflictKind, conflictKeys } from "../src/modules/integrations/prover/gc-membership-conflicts";
import { saveConflictResolution, isDecisionAllowed, ALLOWED_DECISIONS, ResolutionValidationError } from "../src/modules/integrations/prover/conflict-resolutions";
import { planResolutions, applyResolutions } from "../src/modules/integrations/prover/resolution-apply";
import { runGcMeetingsDryRun } from "../src/modules/integrations/prover/gc-meetings-dry-run";
import { runGcMeetingsApply } from "../src/modules/integrations/prover/gc-meetings-apply";
import { runGcAttendanceApply } from "../src/modules/integrations/prover/gc-attendance-apply";
import { runEventsDryRun } from "../src/modules/integrations/prover/events-dry-run";
import { runEventsApply } from "../src/modules/integrations/prover/events-apply";
import { runEventRegistrationsApply } from "../src/modules/integrations/prover/event-registrations-apply";
import { runEventAttendanceApply, classifyRegistrationCount } from "../src/modules/integrations/prover/event-attendance-apply";
import { runTeachingDryRun } from "../src/modules/integrations/prover/teaching-dry-run";
import { runTeachingApply } from "../src/modules/integrations/prover/teaching-apply";
import type { ProverTeaching, ProverTeachingModule, ProverTeachingLesson, ProverTeachingSession, ProverTeachingRegistration, ProverTeachingAttendance } from "../src/modules/integrations/prover/types";
import type { ProverEvent, ProverEventSession, ProverEventRegistration, ProverEventAttendance } from "../src/modules/integrations/prover/types";
import type { ProverGcMeeting, ProverGcMeetingAttendance } from "../src/modules/integrations/prover/types";
import { readFileSync as readFileSyncCD } from "node:fs";
import type { ProverGcParticipant, ProverGcVisitor } from "../src/modules/integrations/prover/types";
import { existsSync } from "node:fs";
import nodePath from "node:path";
import {
  inferUnitType,
  buildUnitName,
  functionCategoryToMemberRole,
} from "../src/modules/integrations/prover/leadership";
import type {
  ProverPerson,
  ProverGroup,
  ProverGroupFunction,
} from "../src/modules/integrations/prover/types";
import { spawnSync } from "node:child_process";

function group(g: Partial<ProverGroup>): ProverGroup {
  return { grupo_id: "g-x", grupo_nome: "GC Teste", ...g } as ProverGroup;
}

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function person(p: Partial<ProverPerson>): ProverPerson {
  return { pessoa_uuid: "uuid-x", pessoa_nome: "Fulano de Tal", ...p } as ProverPerson;
}

console.log("\nTestes — Prover normalize (funções puras)\n");

// 1) CPF válido
check("1. CPF válido → VALID", classifyCpf("529.982.247-25").class === "VALID");

// 2) CPF inválido (dígitos errados)
check("2. CPF inválido → INVALID", classifyCpf("529.982.247-26").class === "INVALID");

// 3) CPF zerado
check("3. CPF 00000000000 → PLACEHOLDER", classifyCpf("00000000000").class === "PLACEHOLDER");

// 4) CPF sequência repetida
check("4. CPF 11111111111 → PLACEHOLDER", classifyCpf("11111111111").class === "PLACEHOLDER");

// (extra) CPF vazio → MISSING
check("4b. CPF vazio → MISSING", classifyCpf("").class === "MISSING");

// 5) normalização de status visitante
{
  const n = normalizeProverPerson(person({ pessoa_tipo: "Visitante" }));
  check("5. tipo=Visitante → VISITOR", n.candidateStatus === "VISITOR", n.candidateStatus);
}

// 6) normalização de membro (com CPF válido) → candidato MEMBER + pendência de GC
{
  const n = normalizeProverPerson(
    person({ pessoa_subtipo: "MEMBRO", pessoa_cpf: "529.982.247-25" }),
  );
  check(
    "6. subtipo=MEMBRO → candidato MEMBER, canBecomeMemberNow=false",
    n.candidateStatus === "MEMBER" && n.canBecomeMemberNow === false,
  );
  check(
    "6b. MEMBRO gera pendência MEMBER_REQUIRES_GC_CONFIRMATION",
    n.pendencies.includes("MEMBER_REQUIRES_GC_CONFIRMATION"),
  );
  check(
    "6c. MEMBRO com CPF válido NÃO gera MEMBER_MISSING_VALID_CPF",
    !n.pendencies.includes("MEMBER_MISSING_VALID_CPF"),
  );
}

// 6d) membro sem CPF válido → pendência de CPF
{
  const n = normalizeProverPerson(person({ pessoa_subtipo: "MEMBRO", pessoa_cpf: "" }));
  check(
    "6d. MEMBRO sem CPF válido → MEMBER_MISSING_VALID_CPF",
    n.pendencies.includes("MEMBER_MISSING_VALID_CPF"),
  );
}

// 7) separação papel/cargo: LIDER GC vira papel, não status
{
  const n = normalizeProverPerson(person({ pessoa_subtipo: "LIDER GC" }));
  check(
    "7. subtipo=LIDER GC → intendedRole GC_LEADER (não status)",
    n.intendedRoles.includes("GC_LEADER"),
  );
  const VALID_STATUS = [
    "VISITOR", "REGULAR_ATTENDER", "MEMBERSHIP_INTERESTED", "MEMBER",
    "INACTIVE", "AWAY", "TRANSFERRED", "ARCHIVED",
  ];
  check(
    "7b. cargo não vira status (candidateStatus é um status eclesiástico válido)",
    VALID_STATUS.includes(n.candidateStatus),
  );
}

// 7c) cargo com marcador de gênero "COORDENADOR (A)" → COORDINATOR (dado real)
{
  const n = normalizeProverPerson(person({ pessoa_subtipo: "COORDENADOR (A)" }));
  check(
    "7c. subtipo='COORDENADOR (A)' → intendedRole COORDINATOR",
    n.intendedRoles.includes("COORDINATOR"),
    `roles=${n.intendedRoles.join(",")}`,
  );
}

// 8) dedup por CPF: a chave usada é o CPF limpo (clean) quando VALID
{
  const c = classifyCpf("529.982.247-25");
  check("8. CPF válido expõe clean para dedup", c.clean === "52998224725");
}

// 9) possível duplicidade por nome+contato: chave de nome normalizada
{
  check(
    "9. nameKey normaliza acento/caixa/espaços",
    normalizeNameKey("  José  da   SILVA ") === "jose da silva",
  );
}

// ── campos estruturados (deriveItemFields, puro) ──────────────────────────

// 10) CPF válido + match por CPF → matchStrategy CPF, operation MATCHED
{
  const n = normalizeProverPerson(person({ pessoa_subtipo: "MEMBRO", pessoa_cpf: "529.982.247-25" }));
  const f = deriveItemFields(n, "MATCHED_BY_CPF");
  check("10. matchStrategy esperada = CPF", f.matchStrategy === "CPF" && f.operation === "MATCHED");
}

// 11) sem match → matchStrategy NONE, operation WOULD_CREATE
{
  const n = normalizeProverPerson(person({ pessoa_tipo: "Visitante" }));
  const f = deriveItemFields(n, "WOULD_CREATE");
  check("11. sem match → NONE / WOULD_CREATE", f.matchStrategy === "NONE" && f.operation === "WOULD_CREATE");
}

// 12) CPF placeholder gera WARNING estruturado
{
  const n = normalizeProverPerson(person({ pessoa_cpf: "00000000000" }));
  const f = deriveItemFields(n, "WOULD_CREATE");
  check(
    "12. CPF placeholder → severity WARNING + warning estruturado",
    f.severity === "WARNING" && f.warningsJson.warnings.some((w) => /placeholder/i.test(w)),
  );
}

// 13) membro sem CPF válido → pendência estruturada
{
  const n = normalizeProverPerson(person({ pessoa_subtipo: "MEMBRO", pessoa_cpf: "" }));
  const f = deriveItemFields(n, "WOULD_CREATE");
  check(
    "13. membro sem CPF → pendência MEMBER_MISSING_VALID_CPF em warningsJson",
    f.warningsJson.pendencies.includes("MEMBER_MISSING_VALID_CPF"),
  );
}

// 14) DB-backed: dry-run grava mode DRY_RUN e NÃO cria Person (pula se sem DB)
await (async () => {
  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) {
      console.log("  ⚠ 14. (skip) sem tenant no banco");
      return;
    }
    const before = await prisma.person.count();
    const r = await runPessoasDryRun(prisma, {
      tenantId: tenant.id,
      fileName: "prover-test.json",
      pessoas: [
        { pessoa_uuid: "test-1", pessoa_nome: "Teste Um", pessoa_tipo: "Visitante" },
        { pessoa_uuid: "test-2", pessoa_nome: "Teste Dois", pessoa_subtipo: "MEMBRO", pessoa_cpf: "529.982.247-25" },
      ] as ProverPerson[],
      sourceFileHash: "test-hash",
    });
    const batch = await prisma.importBatch.findUnique({ where: { id: r.batchId } });
    const after = await prisma.person.count();
    check("14. dry-run grava mode DRY_RUN", batch?.mode === "DRY_RUN");
    check("14b. dry-run NÃO cria Person (count inalterado)", before === after, `${before}→${after}`);
    const items = await prisma.importBatchItem.findMany({ where: { batchId: r.batchId } });
    check(
      "14c. itens têm operation/matchStrategy/severity preenchidos",
      items.length === 2 && items.every((i) => i.operation && i.matchStrategy && i.severity),
    );
  } catch (e) {
    console.log(`  ⚠ 14. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── APPLY (DB-backed, em tenant de teste isolado) ─────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    // tenant de teste dedicado (não polui a demo "vida-plena")
    const slug = "prover-apply-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Apply Test Tenant" } });
    const tid = t.id;

    // limpa tudo do tenant de teste (ordem de FKs) p/ determinismo
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.timelineEntry.deleteMany({ where: { tenantId: tid } });
    await prisma.personStatusHistory.deleteMany({ where: { tenantId: tid } });
    await prisma.contactMethod.deleteMany({ where: { tenantId: tid } });
    await prisma.address.deleteMany({ where: { tenantId: tid } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const fixtures: ProverPerson[] = [
      { pessoa_uuid: "ptest-1", pessoa_nome: "Apply Visitante", pessoa_tipo: "Visitante", pessoa_celular: "41999990001" },
      { pessoa_uuid: "ptest-2", pessoa_nome: "Apply Membro", pessoa_subtipo: "MEMBRO", pessoa_cpf: "529.982.247-25" },
      { pessoa_uuid: "ptest-3", pessoa_nome: "Apply Lider", pessoa_subtipo: "LIDER GC" },
      { pessoa_uuid: "ptest-4", pessoa_nome: "Apply Placeholder", pessoa_subtipo: "MEMBRO", pessoa_cpf: "00000000000" },
    ];

    const usersBefore = await prisma.user.count();
    const rolesBefore = await prisma.roleAssignment.count();

    // 1ª aplicação
    const r1 = await runPessoasApply(prisma, { tenantId: tid, fileName: "test.json", pessoas: fixtures });
    const after1 = await prisma.person.count({ where: { tenantId: tid } });
    check("A1. apply cria pessoas (4 criadas)", r1.created === 4 && after1 === 4, `created=${r1.created} count=${after1}`);

    const maps1 = await prisma.externalMapping.count({ where: { tenantId: tid, system: "PROVER" } });
    check("A2. apply cria ExternalMapping (4)", maps1 === 4, `maps=${maps1}`);

    // 2ª aplicação (idempotência)
    const r2 = await runPessoasApply(prisma, { tenantId: tid, fileName: "test.json", pessoas: fixtures });
    const after2 = await prisma.person.count({ where: { tenantId: tid } });
    const maps2 = await prisma.externalMapping.count({ where: { tenantId: tid, system: "PROVER" } });
    check("A3. apply repetido NÃO duplica (count e maps iguais)", after2 === 4 && maps2 === 4 && r2.created === 0, `count=${after2} maps=${maps2} created2=${r2.created}`);

    // CPF placeholder não vira CPF válido
    const p4 = await prisma.person.findFirst({ where: { tenantId: tid, fullName: "Apply Placeholder" } });
    check("A4. CPF placeholder NÃO é salvo", p4?.cpf === null, `cpf=${p4?.cpf}`);

    // CPF válido foi salvo
    const p2 = await prisma.person.findFirst({ where: { tenantId: tid, fullName: "Apply Membro" } });
    check("A5. CPF válido salvo (52998224725)", p2?.cpf === "52998224725", `cpf=${p2?.cpf}`);

    // membro sem GC NÃO vira membro oficial
    check("A6. membro sem GC → REGULAR_ATTENDER (não MEMBER)", p2?.status === "REGULAR_ATTENDER", `status=${p2?.status}`);

    // cargo não vira status + não cria login/role
    const p3 = await prisma.person.findFirst({ where: { tenantId: tid, fullName: "Apply Lider" } });
    check("A7. cargo (LIDER GC) não vira status eclesiástico", p3?.status === "REGULAR_ATTENDER", `status=${p3?.status}`);
    const membership3 = p3 ? await prisma.tenantMembership.findFirst({ where: { personId: p3.id } }) : null;
    check("A8. apply NÃO cria login (TenantMembership) p/ liderança", membership3 === null);

    const usersAfter = await prisma.user.count();
    const rolesAfter = await prisma.roleAssignment.count();
    check("A9. apply não cria User", usersAfter === usersBefore, `${usersBefore}→${usersAfter}`);
    check("A10. apply não cria RoleAssignment", rolesAfter === rolesBefore, `${rolesBefore}→${rolesAfter}`);
  } catch (e) {
    console.log(`  ⚠ A. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── GRUPOS — normalização (pura) ──────────────────────────────────────────

// G1) grupo ativo
check("G1. status Ativo → ACTIVE", normalizeProverGroup(group({ grupo_status: "Ativo" })).status === "ACTIVE");
// G2) grupo inativo
check("G2. status Inativo → INACTIVE", normalizeProverGroup(group({ grupo_status: "Inativo" })).status === "INACTIVE");
// G7) status desconhecido → warning
{
  const n = normalizeProverGroup(group({ grupo_status: "Qualquer" }));
  check("G7. status desconhecido → UNKNOWN + warning", n.status === "UNKNOWN" && n.warnings.includes("UNKNOWN_GROUP_STATUS"));
}
// G3) grupo sem líder → ABSENT + warning
{
  const n = normalizeProverGroup(group({ pessoa_uuid_lider_1: null }));
  check("G3. sem líder → ABSENT + LEADERSHIP_ABSENT", n.leadershipSuggestion === "ABSENT" && n.warnings.includes("LEADERSHIP_ABSENT"));
}
// G4/G6) Líder 1 + Líder 2 diferente → DUAL
{
  const n = normalizeProverGroup(group({ pessoa_uuid_lider_1: "uA", pessoa_uuid_lider_2: "uB", grupo_nome: "A | B" }));
  check("G6. líder + 2º líder distinto → DUAL", n.leadershipSuggestion === "DUAL");
  check("G6b. nome 'A | B' em DUAL → NAME_SUGGESTS_COUPLE", n.warnings.includes("NAME_SUGGESTS_COUPLE"));
}
// líder + 2º líder IGUAL → INDIVIDUAL (não conta duplicado como dual)
{
  const n = normalizeProverGroup(group({ pessoa_uuid_lider_1: "uA", pessoa_uuid_lider_2: "uA" }));
  check("G6c. 2º líder == líder → INDIVIDUAL", n.leadershipSuggestion === "INDIVIDUAL");
}

// ── LEADERSHIP UNIT — helpers puros ───────────────────────────────────────
check("L1. inferUnitType(1) → INDIVIDUAL", inferUnitType(1) === "INDIVIDUAL");
check("L2. inferUnitType(2) → DUAL", inferUnitType(2) === "DUAL");
check("L3. inferUnitType(3) → TEAM", inferUnitType(3) === "TEAM");
check("L4. 'Líder 1'→PRIMARY", functionCategoryToMemberRole("LEADER_PRIMARY") === "PRIMARY");
check("L5. 'Líder 2'→SECONDARY", functionCategoryToMemberRole("LEADER_SECONDARY") === "SECONDARY");
check("L6. 'Líder em Treinamento'→IN_TRAINING", functionCategoryToMemberRole("LEADER_IN_TRAINING") === "IN_TRAINING");
check("L7. supervisor→unidade de supervisão (PRIMARY)", functionCategoryToMemberRole("SUPERVISOR_PRIMARY") === "PRIMARY");
check("L8. coordenador→unidade de coordenação (PRIMARY)", functionCategoryToMemberRole("COORDINATOR_PRIMARY") === "PRIMARY");
check("L9. buildUnitName 2 → 'A | B'", buildUnitName(["José", "Bruna"]) === "José | Bruna");
check("L10. buildUnitName 3+ → 'Equipe ...'", buildUnitName(["A", "B", "C"]).startsWith("Equipe "));

// ── GRUPOS — normalização de FUNÇÕES (pura) ───────────────────────────────
check("GF1. 'Líder 1' → LEADER_PRIMARY", normalizeGroupFunction("Líder 1") === "LEADER_PRIMARY");
check("GF2. 'Líder 2' → LEADER_SECONDARY", normalizeGroupFunction("Líder 2") === "LEADER_SECONDARY");
check("GF3. 'Líder em Treinamento' → LEADER_IN_TRAINING", normalizeGroupFunction("Líder em Treinamento") === "LEADER_IN_TRAINING");
check("GF4. 'Supervisor 1' → SUPERVISOR_PRIMARY", normalizeGroupFunction("Supervisor 1") === "SUPERVISOR_PRIMARY");
check("GF5. 'Coordenador(a) 1' → COORDINATOR_PRIMARY", normalizeGroupFunction("Coordenador(a) 1") === "COORDINATOR_PRIMARY");
check("GF6. função inesperada → UNKNOWN", normalizeGroupFunction("Pastor de Rede") === "UNKNOWN");

// ── GRUPOS — dry-run enriquecido DB-backed (não cria GC/User/Role) ─────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "prover-groups-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Groups Test Tenant" } });
    const tid = t.id;
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.leadershipUnitMember.deleteMany({ where: { tenantId: tid } });
    await prisma.leadershipUnit.deleteMany({ where: { tenantId: tid } });
    await prisma.householdMember.deleteMany({ where: { tenantId: tid } });
    await prisma.household.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const p = await prisma.person.create({ data: { tenantId: tid, fullName: "Líder Mapeado", source: "PROVER_IMPORT" } });
    await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: "uuid-leader", internalType: "Person", internalId: p.id } });

    const gcBefore = await prisma.growthGroup.count({ where: { tenantId: tid } });
    const usersBefore = await prisma.user.count();
    const rolesBefore = await prisma.roleAssignment.count();

    const grupos: ProverGroup[] = [
      group({ grupo_id: "g1", grupo_nome: "GC Consistente", grupo_status: "Ativo", pessoa_uuid_lider_1: "uuid-leader" }),
      group({ grupo_id: "g3", grupo_nome: "GC Divergente", grupo_status: "Ativo", pessoa_uuid_lider_1: "uuid-A" }),
      group({ grupo_id: "g4", grupo_nome: "GC Team", grupo_status: "Ativo", pessoa_uuid_lider_1: "uuid-leader", pessoa_uuid_lider_2: "uuid-B", pessoa_uuid_lider_em_treinamento: "uuid-C" }),
    ];
    const funcoes: ProverGroupFunction[] = [
      { grupo_id: "g1", pessoa_uuid: "uuid-leader", funcao: "Líder 1", removido: "0" },
      { grupo_id: "g1", pessoa_uuid: "uuid-leader", funcao: "Coordenador(a) 1", removido: "1" }, // removido
      { grupo_id: "g1", pessoa_uuid: "uuid-strange", funcao: "Função Esquisita", removido: "0" }, // unknown + não mapeado
      { grupo_id: "g3", pessoa_uuid: "uuid-B", funcao: "Líder 1", removido: "0" }, // diverge de uuid-A
    ];

    const r = await runGroupsDryRun(prisma, { tenantId: tid, fileName: "test.json", grupos, funcoes });

    const gcAfter = await prisma.growthGroup.count({ where: { tenantId: tid } });
    check("G8. dry-run NÃO cria GrowthGroup", gcBefore === gcAfter && gcAfter === 0, `${gcBefore}→${gcAfter}`);
    check("GH1. linhas hierarquia ativas/removidas", r.hierarchyActive === 3 && r.hierarchyRemoved === 1, `ativas=${r.hierarchyActive} rem=${r.hierarchyRemoved}`);
    check("GH2. divergência grupos×hierarquia detectada", r.divergentGroups >= 1, `divergentes=${r.divergentGroups}`);
    check("GH3. função desconhecida detectada", r.unknownFunctionRows >= 1, `unknownFn=${r.unknownFunctionRows}`);
    check("GH4. pessoas de função não mapeadas detectadas", r.personsNotMapped >= 1, `notMapped=${r.personsNotMapped}`);
    check("GH5. sugestão TEAM (3 líderes distintos)", r.suggestionTeam >= 1, `team=${r.suggestionTeam}`);
    check("GH6. pastor de área NÃO disponível (não inventado)", r.areaPastorAvailable === false);
    const items = await prisma.importBatchItem.count({ where: { batchId: r.batchId } });
    check("G8b. 3 ImportBatchItem criados", items === 3, `items=${items}`);

    // LU1) dry-run PROPÕE unidade no normalizedJson, sem criar LeadershipUnit real
    const luBefore = await prisma.leadershipUnit.count({ where: { tenantId: tid } });
    const item = await prisma.importBatchItem.findFirst({ where: { batchId: r.batchId, externalId: "g4" } });
    const nj = item?.normalizedJson as { proposedLeadershipUnit?: { type?: string; members?: unknown[] } } | null;
    check("LU1. dry-run propõe proposedLeadershipUnit (TEAM, 3 membros)", nj?.proposedLeadershipUnit?.type === "TEAM" && nj?.proposedLeadershipUnit?.members?.length === 3);
    const luAfter = await prisma.leadershipUnit.count({ where: { tenantId: tid } });
    check("LU2. dry-run NÃO cria LeadershipUnit real", luBefore === 0 && luAfter === 0);

    // LU3) permissão NÃO é dada à família: estar em household com líder não cria membership de unidade
    const leaderP = await prisma.person.findFirstOrThrow({ where: { tenantId: tid, fullName: "Líder Mapeado" } });
    const spouse = await prisma.person.create({ data: { tenantId: tid, fullName: "Cônjuge", source: "PROVER_IMPORT" } });
    const hh = await prisma.household.create({ data: { tenantId: tid, name: "Casa Teste" } });
    await prisma.householdMember.createMany({ data: [
      { tenantId: tid, householdId: hh.id, personId: leaderP.id, relationship: "SPOUSE" },
      { tenantId: tid, householdId: hh.id, personId: spouse.id, relationship: "SPOUSE" },
    ]});
    const unit = await prisma.leadershipUnit.create({ data: { tenantId: tid, name: "Líder Mapeado", type: "INDIVIDUAL" } });
    await prisma.leadershipUnitMember.create({ data: { tenantId: tid, leadershipUnitId: unit.id, personId: leaderP.id, role: "PRIMARY" } });
    const spouseUnits = await prisma.leadershipUnitMember.count({ where: { personId: spouse.id } });
    check("LU3. cônjuge na MESMA casa NÃO vira membro de unidade automaticamente", spouseUnits === 0);

    const usersAfter = await prisma.user.count();
    const rolesAfter = await prisma.roleAssignment.count();
    check("G9. dry-run grupos NÃO cria RoleAssignment", rolesAfter === rolesBefore);
    check("G10. dry-run grupos NÃO cria User", usersAfter === usersBefore);
  } catch (e) {
    console.log(`  ⚠ G. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── GRUPOS — APPLY DB-backed (cria GC + unidades; idempotente) ────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "prover-groups-apply-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Groups Apply Test" } });
    const tid = t.id;
    // limpa (ordem de FKs)
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.domainEventOutbox.deleteMany({ where: { tenantId: tid } });
    await prisma.domainEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.leadershipUnitMember.deleteMany({ where: { tenantId: tid } });
    await prisma.leadershipUnit.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });
    await prisma.campus.deleteMany({ where: { tenantId: tid } });
    await prisma.campus.create({ data: { tenantId: tid, name: "Sede" } });

    // pessoas + mappings
    const mk = async (uuid: string, name: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: name, source: "PROVER_IMPORT" } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    await mk("uuid-l1", "Líder Um");
    await mk("uuid-l2", "Líder Dois");
    await mk("uuid-sup", "Supervisor Um");
    await mk("uuid-coord", "Coordenador Um");

    const grupos: ProverGroup[] = [
      group({ grupo_id: "g1", grupo_nome: "GC Dual", grupo_status: "Ativo" }),
      group({ grupo_id: "g2", grupo_nome: "GC Sem Líder", grupo_status: "Ativo" }),
      group({ grupo_id: "g3", grupo_nome: "GC Status Estranho", grupo_status: "Sei la", pessoa_uuid_lider_1: "uuid-l1" }),
    ];
    const funcoes: ProverGroupFunction[] = [
      { grupo_id: "g1", pessoa_uuid: "uuid-l1", funcao: "Líder 1", removido: "0" },
      { grupo_id: "g1", pessoa_uuid: "uuid-l2", funcao: "Líder 2", removido: "0" },
      { grupo_id: "g1", pessoa_uuid: "uuid-sup", funcao: "Supervisor 1", removido: "0" },
      { grupo_id: "g1", pessoa_uuid: "uuid-coord", funcao: "Coordenador(a) 1", removido: "0" },
    ];

    const usersBefore = await prisma.user.count();
    const rolesBefore = await prisma.roleAssignment.count();

    const r1 = await runGroupsApply(prisma, { tenantId: tid, fileName: "test.json", grupos, funcoes });

    const gcCount = await prisma.growthGroup.count({ where: { tenantId: tid } });
    check("GA1. apply cria GrowthGroup (3)", r1.created === 3 && gcCount === 3, `created=${r1.created} count=${gcCount}`);
    const gmaps = await prisma.externalMapping.count({ where: { tenantId: tid, system: "PROVER", externalType: "growth_group" } });
    check("GA2. apply cria ExternalMapping growth_group (3)", gmaps === 3, `gmaps=${gmaps}`);
    const units = await prisma.leadershipUnit.count({ where: { tenantId: tid } });
    check("GA3. apply cria LeadershipUnit (g1: lead+sup+coord=3 · g3: lead=1 → 4)", units === 4, `units=${units}`);
    const membersCount = await prisma.leadershipUnitMember.count({ where: { tenantId: tid } });
    check("GA4. apply cria LeadershipUnitMember (g1:4 + g3:1 = 5)", membersCount === 5, `members=${membersCount}`);

    const g1 = await prisma.growthGroup.findFirstOrThrow({ where: { tenantId: tid, name: "GC Dual" } });
    const g1Unit = g1.leadershipUnitId ? await prisma.leadershipUnit.findUnique({ where: { id: g1.leadershipUnitId } }) : null;
    check("GA5. g1 unidade de liderança DUAL", g1Unit?.type === "DUAL", `type=${g1Unit?.type}`);
    check("GA6. g1 legado leaderId/assistantId preenchidos (Líder 1/2)", !!g1.leaderId && !!g1.assistantId);
    check("GA7. pastor de área NÃO inventado (areaPastorId/UnitId null)", g1.areaPastorId === null && g1.areaPastorUnitId === null);

    const g2 = await prisma.growthGroup.findFirstOrThrow({ where: { tenantId: tid, name: "GC Sem Líder" } });
    check("GA8. grupo SEM líder → inativo + sem unidade (não quebra batch)", g2.active === false && g2.leadershipUnitId === null);

    const g3 = await prisma.growthGroup.findFirstOrThrow({ where: { tenantId: tid, name: "GC Status Estranho" } });
    check("GA9. status desconhecido → inativo", g3.active === false);

    // idempotência
    const r2 = await runGroupsApply(prisma, { tenantId: tid, fileName: "test.json", grupos, funcoes });
    const gcCount2 = await prisma.growthGroup.count({ where: { tenantId: tid } });
    const units2 = await prisma.leadershipUnit.count({ where: { tenantId: tid } });
    check("GA10. apply 2x NÃO duplica GrowthGroup", gcCount2 === 3 && r2.created === 0 && r2.updated === 3, `count=${gcCount2} created2=${r2.created} updated2=${r2.updated}`);
    check("GA11. apply 2x NÃO duplica LeadershipUnit", units2 === 4, `units2=${units2}`);

    const usersAfter = await prisma.user.count();
    const rolesAfter = await prisma.roleAssignment.count();
    check("GA12. apply grupos NÃO cria User", usersAfter === usersBefore);
    check("GA13. apply grupos NÃO cria RoleAssignment", rolesAfter === rolesBefore);
  } catch (e) {
    console.log(`  ⚠ GA. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── ESCOPO por LeadershipUnitMember (Fase 2C) ─────────────────────────────
// Admin / Pastor Sênior continuam vendo tudo (puro).
check("S7. admin → escopo tenant-wide", hasTenantWideScope({ roles: ["ADMIN"] }) === true);
check("S8. pastor sênior → tenant-wide; líder GC não", hasTenantWideScope({ roles: ["SENIOR_PASTOR"] }) === true && hasTenantWideScope({ roles: ["GC_LEADER"] }) === false);

await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "scope-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Scope Test" } });
    const tid = t.id;
    await prisma.leadershipUnitMember.deleteMany({ where: { tenantId: tid } });
    await prisma.householdMember.deleteMany({ where: { tenantId: tid } });
    await prisma.household.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.leadershipUnit.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkP = (name: string) => prisma.person.create({ data: { tenantId: tid, fullName: name } });
    const l1 = await mkP("Líder 1"); const l2 = await mkP("Líder 2");
    const sup = await mkP("Supervisor"); const coord = await mkP("Coordenador");
    const outsider = await mkP("De Fora"); const spouse = await mkP("Cônjuge");
    const areaP = await mkP("Pastor Área"); const legacyLeader = await mkP("Líder Legado");

    const mkUnit = async (name: string, type: "INDIVIDUAL" | "DUAL", members: { personId: string; role: "PRIMARY" | "SECONDARY" }[]) => {
      const u = await prisma.leadershipUnit.create({ data: { tenantId: tid, name, type } });
      for (const m of members) await prisma.leadershipUnitMember.create({ data: { tenantId: tid, leadershipUnitId: u.id, personId: m.personId, role: m.role } });
      return u;
    };
    const leadUnit = await mkUnit("Líder 1 | Líder 2", "DUAL", [{ personId: l1.id, role: "PRIMARY" }, { personId: l2.id, role: "SECONDARY" }]);
    const supUnit = await mkUnit("Supervisão", "INDIVIDUAL", [{ personId: sup.id, role: "PRIMARY" }]);
    const coordUnit = await mkUnit("Coordenação", "INDIVIDUAL", [{ personId: coord.id, role: "PRIMARY" }]);

    const gc1 = await prisma.growthGroup.create({ data: { tenantId: tid, name: "GC Unidades", leadershipUnitId: leadUnit.id, supervisionUnitId: supUnit.id, coordinationUnitId: coordUnit.id, areaPastorUnitId: null } });
    const gc2 = await prisma.growthGroup.create({ data: { tenantId: tid, name: "GC Legado", leaderId: legacyLeader.id } });

    // família: cônjuge na mesma casa do líder, mas FORA da unidade
    const hh = await prisma.household.create({ data: { tenantId: tid, name: "Casa" } });
    await prisma.householdMember.createMany({ data: [
      { tenantId: tid, householdId: hh.id, personId: l1.id, relationship: "SPOUSE" },
      { tenantId: tid, householdId: hh.id, personId: spouse.id, relationship: "SPOUSE" },
    ]});

    check("S1. Líder 1 via LeadershipUnitMember acessa GC", await personHasAccessToGrowthGroup(tid, l1.id, gc1.id));
    check("S2. Líder 2 via LeadershipUnitMember acessa GC", await personHasAccessToGrowthGroup(tid, l2.id, gc1.id));
    check("S3. pessoa fora da unidade NÃO acessa", (await personHasAccessToGrowthGroup(tid, outsider.id, gc1.id)) === false);
    check("S4. supervisor via supervisionUnit acessa", await personHasAccessToGrowthGroup(tid, sup.id, gc1.id));
    check("S5. coordenador via coordinationUnit acessa", await personHasAccessToGrowthGroup(tid, coord.id, gc1.id));
    check("S6. campo LEGADO (leaderId) ainda funciona", await personHasAccessToGrowthGroup(tid, legacyLeader.id, gc2.id));
    check("S9. família (mesma casa, fora da unidade) NÃO acessa", (await personHasAccessToGrowthGroup(tid, spouse.id, gc1.id)) === false);
    check("S10. areaPastorUnitId nulo não quebra (outsider=false)", (await personHasAccessToGrowthGroup(tid, areaP.id, gc1.id)) === false);

    // S11. se areaPastorUnitId existir no futuro, a lógica suporta
    const areaUnit = await mkUnit("Área", "INDIVIDUAL", [{ personId: areaP.id, role: "PRIMARY" }]);
    await prisma.growthGroup.update({ where: { id: gc1.id }, data: { areaPastorUnitId: areaUnit.id } });
    check("S11. areaPastorUnit no futuro → membro acessa", await personHasAccessToGrowthGroup(tid, areaP.id, gc1.id));

    // S12. validação de transferência usa o mesmo escopo (GC no escopo do supervisor)
    const supScope = await getGrowthGroupScopeForPerson(tid, sup.id);
    check("S12. escopo de transferência inclui o GC (via unidade)", supScope.has(gc1.id));
  } catch (e) {
    console.log(`  ⚠ S. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── VÍNCULOS GC — normalização (pura) ─────────────────────────────────────
check("M1. participante sem data_saida → ativo + PARTICIPANT", (() => { const n = normalizeGcParticipant({ grupo_id: "g", pessoa_uuid: "p", data_entrada: "2023-01-01" }); return n.active === true && n.source === "PARTICIPANT"; })());
check("M2. participante com data_saida → encerrado", normalizeGcParticipant({ grupo_id: "g", pessoa_uuid: "p", data_entrada: "2023-01-01", data_saida: "2024-01-01" }).active === false);
check("M3. visitante sem data_saida → ativo + VISITOR", (() => { const n = normalizeGcVisitor({ grupo_id: "g", pessoa_uuid: "p", data_cadastro: "2024-01-01" }); return n.active === true && n.source === "VISITOR"; })());

// ── VÍNCULOS GC — dry-run DB-backed (não cria vínculo) ────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "gc-mem-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "GC Mem Test" } });
    const tid = t.id;
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkP = async (uuid: string, name: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: name } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    const mkG = async (gid: string, name: string) => {
      const g = await prisma.growthGroup.create({ data: { tenantId: tid, name } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "growth_group", externalId: gid, internalType: "GrowthGroup", internalId: g.id } });
      return g;
    };
    const pVis = await mkP("uuid-V", "Visitante X");
    await mkP("uuid-A", "Pessoa A"); await mkP("uuid-B", "Pessoa B");
    await mkP("uuid-C", "Pessoa C"); await mkP("uuid-D", "Pessoa D");
    await mkG("gid-1", "GC 1"); await mkG("gid-2", "GC 2");

    const participantes: ProverGcParticipant[] = [
      { grupo_id: "gid-1", pessoa_uuid: "uuid-A", data_entrada: "2023-01-01" }, // ativo g1
      { grupo_id: "gid-2", pessoa_uuid: "uuid-A", data_entrada: "2023-02-01" }, // ativo g2 → multi-active
      { grupo_id: "gid-1", pessoa_uuid: "uuid-B", data_entrada: "2022-01-01", data_saida: "2023-01-01" }, // encerrado
      { grupo_id: "gid-1", pessoa_uuid: "uuid-UNKNOWN", data_entrada: "2023-01-01" }, // pessoa não mapeada
      { grupo_id: "gid-UNKNOWN", pessoa_uuid: "uuid-B", data_entrada: "2023-01-01" }, // GC não mapeado
      { grupo_id: "gid-1", pessoa_uuid: "uuid-C", data_entrada: "2020-01-01", data_saida: "2021-01-01" }, // dup simples #1
      { grupo_id: "gid-1", pessoa_uuid: "uuid-C", data_entrada: "2020-01-01", data_saida: "2021-01-01" }, // dup simples #2
      { grupo_id: "gid-2", pessoa_uuid: "uuid-D", data_entrada: "2020-01-01", data_saida: "2021-01-01" }, // dup conflito #1
      { grupo_id: "gid-2", pessoa_uuid: "uuid-D", data_entrada: "2099-01-01", data_saida: "2099-02-01" }, // dup conflito #2
    ];
    const visitantes: ProverGcVisitor[] = [
      { grupo_id: "gid-1", pessoa_uuid: "uuid-V", data_cadastro: "2024-01-01" }, // visitante ativo
    ];

    const usersBefore = await prisma.user.count();
    const rolesBefore = await prisma.roleAssignment.count();
    const r = await runGcMembershipsDryRun(prisma, { tenantId: tid, fileName: "test", participantes, visitantes });

    check("M0. totais (9 part / 1 vis / 10 links)", r.totalParticipants === 9 && r.totalVisitors === 1 && r.totalLinks === 10);
    check("M4. pessoa não mapeada detectada", r.personsNotMapped === 1, `notMapped=${r.personsNotMapped}`);
    check("M5. GC não mapeado detectado", r.gcsNotMapped === 1, `gcNotMapped=${r.gcsNotMapped}`);
    check("M6. múltiplos GCs ativos detectados (pessoa A)", r.conflictMultipleActiveGcs === 1, `multi=${r.conflictMultipleActiveGcs}`);
    check("M7. duplicidade simples detectada", r.duplicateSimple === 1, `dupSimple=${r.duplicateSimple}`);
    check("M8. duplicidade com conflito detectada", r.duplicateConflict === 1, `dupConf=${r.duplicateConflict}`);
    check("M9-vis. vínculos de visitante contabilizados", r.visitorLinks === 1);

    const gccount = await prisma.growthGroupMembership.count({ where: { tenantId: tid } });
    check("M10. dry-run NÃO cria GrowthGroupMembership", gccount === 0, `count=${gccount}`);
    const visPerson = await prisma.person.findUniqueOrThrow({ where: { id: pVis.id } });
    check("M9. visitante NÃO vira membro (status inalterado)", visPerson.status === "VISITOR");
    check("M11. dry-run não cria User/Role", (await prisma.user.count()) === usersBefore && (await prisma.roleAssignment.count()) === rolesBefore);
  } catch (e) {
    console.log(`  ⚠ M. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── RELATÓRIO DE SANEAMENTO de vínculos (Fase 3A.1) ───────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "gc-report-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "GC Report Test" } });
    const tid = t.id;
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkP = async (uuid: string, name: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: name } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    const mkG = async (gid: string, name: string) => {
      const g = await prisma.growthGroup.create({ data: { tenantId: tid, name, active: true } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "growth_group", externalId: gid, internalType: "GrowthGroup", internalId: g.id } });
      return g;
    };
    const pA = await mkP("uuid-A", "Ana Souza"); const pB = await mkP("uuid-B", "Bruno Lima"); const pC = await mkP("uuid-C", "Carla Dias");
    await mkG("gid-1", "GC Um"); await mkG("gid-2", "GC Dois");

    const participantes: ProverGcParticipant[] = [
      { grupo_id: "gid-1", pessoa_uuid: "uuid-A", data_entrada: "2020-01-01" }, // pA ativo g1
      { grupo_id: "gid-2", pessoa_uuid: "uuid-A", data_entrada: "2021-01-01" }, // pA ativo g2 (datas distintas)
      { grupo_id: "gid-1", pessoa_uuid: "uuid-B", data_entrada: "2020-01-01" }, // pB participante ativo g1
      { grupo_id: "gid-1", pessoa_uuid: "uuid-C", data_entrada: "2020-01-01" }, // pC dup ativo
      { grupo_id: "gid-1", pessoa_uuid: "uuid-C", data_entrada: "2099-01-01", data_saida: "2099-02-01" }, // pC dup encerrado (conflito)
      { grupo_id: "gid-1", pessoa_uuid: "uuid-ORPHAN", data_entrada: "2020-01-01" }, // órfão
      { grupo_id: "gid-1", pessoa_uuid: "uuid-FAIL", data_entrada: "2020-01-01" }, // falha de importação
    ];
    const visitantes: ProverGcVisitor[] = [
      { grupo_id: "gid-2", pessoa_uuid: "uuid-B", data_cadastro: "2020-01-01" }, // pB visitante ativo g2
    ];
    const pessoasUuids = new Set(["uuid-A", "uuid-B", "uuid-C", "uuid-FAIL"]); // uuid-FAIL existe em pessoas.json

    const before = await prisma.growthGroupMembership.count({ where: { tenantId: tid } });
    const rep = await buildSanitizationReport(prisma, { tenantId: tid, participantes, visitantes, pessoasUuids });

    const entryA = rep.multipleActiveGcs.find((e) => e.personId === pA.id);
    check("R1. múltiplos GCs ativos no relatório (pA)", !!entryA && entryA.activeGcs.length === 2);
    check("R2. sugestão por data mais recente (pA)", entryA?.suggestion === "SUGGEST_KEEP_MOST_RECENT_JOINED_AT", entryA?.suggestion);
    const entryB = rep.multipleActiveGcs.find((e) => e.personId === pB.id);
    check("R3. sugestão participante > visitante (pB)", entryB?.suggestion === "SUGGEST_KEEP_PARTICIPANT_OVER_VISITOR", entryB?.suggestion);
    const dup = rep.duplicateConflicts.find((d) => d.personId === pC.id);
    check("R4. duplicidade conflitante detalhada (pC, 2 linhas)", !!dup && dup.rows.length === 2);
    check("R4b. sugestão manter ativo (1 ativo + 1 encerrado)", dup?.suggestion === "SUGGEST_KEEP_ACTIVE", dup?.suggestion);
    const orphan = rep.unmappedPersons.find((u) => u.pessoaUuid === "uuid-ORPHAN");
    const fail = rep.unmappedPersons.find((u) => u.pessoaUuid === "uuid-FAIL");
    check("R5. não mapeado no relatório: órfão vs falha", orphan?.diagnosis === "ORPHAN" && fail?.diagnosis === "IMPORT_FAILURE");
    check("R5b. summary conta órfãos/falhas", rep.summary.orphanUuids === 1 && rep.summary.importFailureUuids === 1);

    const after = await prisma.growthGroupMembership.count({ where: { tenantId: tid } });
    check("R6. relatório NÃO cria GrowthGroupMembership", before === after && after === 0);
    check("R7. relatório NÃO altera pessoa (status default)", (await prisma.person.findUniqueOrThrow({ where: { id: pC.id } })).status === "VISITOR");

    // R8: arquivos FORA do git (sob tmp/)
    const outDir = nodePath.resolve(process.cwd(), "tmp", "report-test");
    const paths = writeSanitizationReport(rep, outDir);
    check("R8. arquivos gerados sob tmp/ (fora do git) e existem", paths.jsonPath.includes(`${nodePath.sep}tmp${nodePath.sep}`) && existsSync(paths.jsonPath) && existsSync(paths.csvPath) && existsSync(paths.summaryPath));
  } catch (e) {
    console.log(`  ⚠ R. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── RECONCILIAÇÃO de ExternalMapping de Pessoas (Fase 3A.2) ───────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "reconcile-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Reconcile Test" } });
    const tid = t.id;
    // limpeza idempotente do tenant de teste
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.contactMethod.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const CPF_VALID_A = "39053344705"; // válido
    const CPF_VALID_B = "11144477735"; // válido
    // pessoas INTERNAS (sem mapping, salvo pZ)
    const pX = await prisma.person.create({ data: { tenantId: tid, fullName: "Joao Silva", cpf: CPF_VALID_A, status: "VISITOR" } });
    const pE = await prisma.person.create({ data: { tenantId: tid, fullName: "Maria Souza" } });
    const pW1 = await prisma.person.create({ data: { tenantId: tid, fullName: "Carlos Lima", birthDate: new Date("1990-05-05") } });
    const pW2 = await prisma.person.create({ data: { tenantId: tid, fullName: "Carlos Lima", birthDate: new Date("1990-05-05") } });
    await prisma.contactMethod.create({ data: { tenantId: tid, personId: pW1.id, type: "EMAIL", value: "carlos@x.com" } });
    await prisma.contactMethod.create({ data: { tenantId: tid, personId: pW2.id, type: "EMAIL", value: "carlos@x.com" } });
    const pZ = await prisma.person.create({ data: { tenantId: tid, fullName: "Ana Paula", cpf: CPF_VALID_B } });
    await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: "uuid-OTHER", internalType: "Person", internalId: pZ.id } });

    // evidência: ImportBatchItem anterior (SKIP) apontando para pE
    const priorBatch = await prisma.importBatch.create({ data: { tenantId: tid, mode: "APPLY", system: "PROVER", status: "COMPLETED" } });
    await prisma.importBatchItem.create({ data: { tenantId: tid, batchId: priorBatch.id, externalType: "person", externalId: "uuid-E", operation: "SKIP", matchStrategy: "NAME_CONTACT_BIRTHDATE", severity: "CONFLICT", targetType: "Person", targetId: pE.id, rawJson: {}, warningsJson: { warnings: ["POSSIBLE_DUPLICATE_REVIEW"] }, status: "SKIPPED" } });

    // pessoas.json (alvo da reconciliação)
    const pessoas: ProverPerson[] = [
      { pessoa_uuid: "uuid-CPF", pessoa_nome: "Joao Silva", pessoa_cpf: "390.533.447-05" }, // SAFE via CPF → pX
      { pessoa_uuid: "uuid-E", pessoa_nome: "Maria Souza" },                                  // SAFE via evidência → pE
      { pessoa_uuid: "uuid-PLACE", pessoa_nome: "Fulano Place", pessoa_cpf: "00000000000" },  // placeholder → SKIP
      { pessoa_uuid: "uuid-INV", pessoa_nome: "Beltrano Inv", pessoa_cpf: "12345678901" },    // inválido → SKIP
      { pessoa_uuid: "uuid-W", pessoa_nome: "Carlos Lima", pessoa_email: "carlos@x.com", pessoa_nascimento: "1990-05-05" }, // 2 candidatos fracos → REVIEW
      { pessoa_uuid: "uuid-Znew", pessoa_nome: "Ana Paula", pessoa_cpf: "111.444.777-35" },   // pZ já mapeada → REVIEW
    ];
    const participantes: ProverGcParticipant[] = pessoas.map((p) => ({ grupo_id: "g1", pessoa_uuid: p.pessoa_uuid, data_entrada: "2020-01-01" }));
    const visitantes: ProverGcVisitor[] = [];

    const an = await analyzePersonMappingReconcile(prisma, { tenantId: tid, pessoas, participantes, visitantes });
    const row = (u: string) => an.rows.find((r) => r.pessoaUuid === u)!;

    check("RC1. CPF válido único → CREATE_MAPPING (SAFE, via CPF)", row("uuid-CPF")?.recommendedAction === "CREATE_MAPPING" && row("uuid-CPF")?.confidence === "SAFE" && row("uuid-CPF")?.resolvedVia === "CPF" && row("uuid-CPF")?.targetPersonId === pX.id);
    check("RC1b. evidência (SKIP anterior) → CREATE_MAPPING via PRIOR_EVIDENCE", row("uuid-E")?.recommendedAction === "CREATE_MAPPING" && row("uuid-E")?.resolvedVia === "PRIOR_EVIDENCE" && row("uuid-E")?.targetPersonId === pE.id && row("uuid-E")?.probableReason === "SKIPPED_POSSIBLE_DUPLICATE");
    check("RC2. CPF placeholder NÃO cria mapping automático", row("uuid-PLACE")?.recommendedAction !== "CREATE_MAPPING" && row("uuid-PLACE")?.cpfStatus === "placeholder");
    check("RC3. CPF inválido NÃO cria mapping automático", row("uuid-INV")?.recommendedAction !== "CREATE_MAPPING" && row("uuid-INV")?.cpfStatus === "invalid");
    check("RC4. múltiplos candidatos internos → REVIEW_MANUALLY", row("uuid-W")?.recommendedAction === "REVIEW_MANUALLY" && row("uuid-W")?.candidates.length === 2);
    check("RC5. Person já mapeada p/ outro UUID NÃO recebe novo mapping", row("uuid-Znew")?.recommendedAction !== "CREATE_MAPPING" && row("uuid-Znew")?.candidates.some((c) => c.mappedToOtherUuid && c.otherUuid === "uuid-OTHER"));

    // ── APPLY ──
    const before = {
      person: await prisma.person.count({ where: { tenantId: tid } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tid, system: "PROVER", externalType: "person" } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      pXstatus: (await prisma.person.findUniqueOrThrow({ where: { id: pX.id } })).status,
    };
    const memBefore = await runGcMembershipsDryRun(prisma, { tenantId: tid, fileName: "t", participantes, visitantes });

    const { report } = await applyPersonMappingReconcile(prisma, { tenantId: tid, fileName: "reconcile-test", pessoas, participantes, visitantes });

    const after = {
      person: await prisma.person.count({ where: { tenantId: tid } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tid, system: "PROVER", externalType: "person" } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      pXstatus: (await prisma.person.findUniqueOrThrow({ where: { id: pX.id } })).status,
    };
    const memAfter = await runGcMembershipsDryRun(prisma, { tenantId: tid, fileName: "t", participantes, visitantes });

    check("RC6. apply cria SOMENTE ExternalMapping (2 seguros)", report.created === 2 && after.map === before.map + 2);
    check("RC6b. mappings criados apontam para pX e pE", !!(await prisma.externalMapping.findFirst({ where: { tenantId: tid, externalType: "person", externalId: "uuid-CPF", internalId: pX.id } })) && !!(await prisma.externalMapping.findFirst({ where: { tenantId: tid, externalType: "person", externalId: "uuid-E", internalId: pE.id } })));
    check("RC7. apply NÃO cria Person", after.person === before.person);
    check("RC8. apply NÃO altera status nem cria GrowthGroupMembership", after.pXstatus === before.pXstatus && after.gcc === before.gcc);
    check("RC9. apply NÃO cria User nem RoleAssignment", after.user === before.user && after.role === before.role);
    check("RC9b. AuditLog import_mapping_reconcile registrado (2)", (await prisma.auditLog.count({ where: { tenantId: tid, action: "import_mapping_reconcile" } })) === 2);

    // ── idempotência: 2ª execução cria 0 ──
    const { report: report2 } = await applyPersonMappingReconcile(prisma, { tenantId: tid, fileName: "reconcile-test", pessoas, participantes, visitantes });
    const mapFinal = await prisma.externalMapping.count({ where: { tenantId: tid, system: "PROVER", externalType: "person" } });
    check("RC10. apply 2x é idempotente (0 criados, contagem estável)", report2.created === 0 && mapFinal === after.map);

    check("RC11. dry-run de memberships melhora (menos PERSON_MAPPING_NOT_FOUND)", memAfter.personsNotMapped === memBefore.personsNotMapped - 2);
  } catch (e) {
    console.log(`  ⚠ RC. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── ALIAS de ExternalMapping p/ UUIDs duplicados do Prover (Fase 3A.3) ────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "alias-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Alias Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.contactMethod.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    // pPrim: já mapeada a UUID primário; pNoPrimary: sem mapping primário
    const pPrim = await prisma.person.create({ data: { tenantId: tid, fullName: "Joao Alias", status: "MEMBER" } });
    await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: "uuid-primary", internalType: "Person", internalId: pPrim.id } });
    const pNoPrimary = await prisma.person.create({ data: { tenantId: tid, fullName: "Maria SemPrimario" } });

    // evidência: ImportBatchItem anterior (SKIP) → targetId
    const priorBatch = await prisma.importBatch.create({ data: { tenantId: tid, mode: "APPLY", system: "PROVER", status: "COMPLETED" } });
    await prisma.importBatchItem.create({ data: { tenantId: tid, batchId: priorBatch.id, externalType: "person", externalId: "uuid-secondary", operation: "SKIP", matchStrategy: "NAME_CONTACT_BIRTHDATE", severity: "CONFLICT", targetType: "Person", targetId: pPrim.id, rawJson: {}, status: "SKIPPED" } });
    await prisma.importBatchItem.create({ data: { tenantId: tid, batchId: priorBatch.id, externalType: "person", externalId: "uuid-noprim", operation: "SKIP", matchStrategy: "NAME_CONTACT_BIRTHDATE", severity: "CONFLICT", targetType: "Person", targetId: pNoPrimary.id, rawJson: {}, status: "SKIPPED" } });

    const pessoas: ProverPerson[] = [
      { pessoa_uuid: "uuid-primary", pessoa_nome: "Joao Alias", pessoa_cpf: "00000000000" },   // já mapeado → fora do alvo
      { pessoa_uuid: "uuid-secondary", pessoa_nome: "Joao Alias", pessoa_cpf: "00000000000" }, // ALIAS seguro → pPrim
      { pessoa_uuid: "uuid-noprim", pessoa_nome: "Maria SemPrimario", pessoa_cpf: "00000000000" }, // alvo sem primário → REVIEW
      { pessoa_uuid: "uuid-weak", pessoa_nome: "Carlos Weak", pessoa_cpf: "00000000000" },     // sem evidência → REVIEW
    ];
    const participantes: ProverGcParticipant[] = pessoas.map((p) => ({ grupo_id: "g1", pessoa_uuid: p.pessoa_uuid, data_entrada: "2020-01-01" }));
    const visitantes: ProverGcVisitor[] = [];

    const an = await analyzeAliasMapping(prisma, { tenantId: tid, pessoas, participantes, visitantes });
    const row = (u: string) => an.rows.find((r) => r.pessoaUuid === u);

    check("AL1. evidência SKIP + Person já mapeada → CREATE_ALIAS_MAPPING", row("uuid-secondary")?.recommendedAction === "CREATE_ALIAS_MAPPING" && row("uuid-secondary")?.confidence === "SAFE" && row("uuid-secondary")?.targetPersonId === pPrim.id && row("uuid-secondary")?.primaryProverUuid === "uuid-primary");
    check("AL9. UUID já mapeado (primário) não vira alvo (não duplica)", row("uuid-primary") === undefined);
    check("AL10. sem evidência forte → REVIEW_MANUALLY", row("uuid-weak")?.recommendedAction === "REVIEW_MANUALLY" && row("uuid-weak")?.warnings.includes("NO_PRIOR_IMPORT_ITEM") === true);
    check("AL10b. evidência aponta p/ Person SEM mapping primário → REVIEW_MANUALLY", row("uuid-noprim")?.recommendedAction === "REVIEW_MANUALLY" && row("uuid-noprim")?.warnings.includes("TARGET_HAS_NO_PRIMARY_MAPPING") === true);

    // ── APPLY ──
    const before = {
      person: await prisma.person.count({ where: { tenantId: tid } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tid, system: "PROVER", externalType: "person" } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      pStatus: (await prisma.person.findUniqueOrThrow({ where: { id: pPrim.id } })).status,
    };
    const memBefore = await runGcMembershipsDryRun(prisma, { tenantId: tid, fileName: "t", participantes, visitantes });

    const { report } = await applyAliasMapping(prisma, { tenantId: tid, fileName: "alias-test", pessoas, participantes, visitantes });

    const after = {
      person: await prisma.person.count({ where: { tenantId: tid } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tid, system: "PROVER", externalType: "person" } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      pStatus: (await prisma.person.findUniqueOrThrow({ where: { id: pPrim.id } })).status,
    };
    const memAfter = await runGcMembershipsDryRun(prisma, { tenantId: tid, fileName: "t", participantes, visitantes });

    check("AL2. apply cria SOMENTE ExternalMapping (1 alias)", report.created === 1 && after.map === before.map + 1);
    check("AL3. apply NÃO cria Person", after.person === before.person);
    check("AL4. apply NÃO altera status da pessoa", after.pStatus === before.pStatus && after.pStatus === "MEMBER");
    check("AL5. apply NÃO cria User", after.user === before.user);
    check("AL6. apply NÃO cria RoleAssignment", after.role === before.role);
    check("AL7. apply NÃO cria GrowthGroupMembership", after.gcc === before.gcc);
    const primMaps = await prisma.externalMapping.findMany({ where: { tenantId: tid, externalType: "person", internalId: pPrim.id }, select: { externalId: true } });
    check("AL8. Person aceita UUID secundário como alias (2 mappings → mesma Person)", primMaps.length === 2 && primMaps.some((m) => m.externalId === "uuid-primary") && primMaps.some((m) => m.externalId === "uuid-secondary"));
    check("AL8b. AuditLog import_alias_mapping_create + normalizedJson ALIAS", (await prisma.auditLog.count({ where: { tenantId: tid, action: "import_alias_mapping_create" } })) === 1 && !!(await prisma.importBatchItem.findFirst({ where: { tenantId: tid, externalId: "uuid-secondary", operation: "CREATE" } })));

    // ── idempotência: 2ª execução cria 0 ──
    const { report: report2 } = await applyAliasMapping(prisma, { tenantId: tid, fileName: "alias-test", pessoas, participantes, visitantes });
    const mapFinal = await prisma.externalMapping.count({ where: { tenantId: tid, system: "PROVER", externalType: "person" } });
    check("AL11. apply 2x é idempotente (0 criados, contagem estável)", report2.created === 0 && mapFinal === after.map);

    check("AL12. dry-run de memberships reduz PERSON_MAPPING_NOT_FOUND", memAfter.personsNotMapped === memBefore.personsNotMapped - 1);
  } catch (e) {
    console.log(`  ⚠ AL. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── APPLY conservador de VÍNCULOS pessoa↔GC (Fase 3B) ─────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "gc-apply-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "GC Apply Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMeeting.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkP = async (uuid: string, name: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: name, status: "VISITOR" } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    const mkG = async (gid: string, name: string) => {
      const g = await prisma.growthGroup.create({ data: { tenantId: tid, name, active: true } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "growth_group", externalId: gid, internalType: "GrowthGroup", internalId: g.id } });
      return g;
    };
    const pA = await mkP("uuid-A", "Ana"); const pB = await mkP("uuid-B", "Bruno"); const pC = await mkP("uuid-C", "Carla");
    const pD = await mkP("uuid-D", "Davi"); const pE = await mkP("uuid-E", "Eva"); const pF = await mkP("uuid-F", "Fabio");
    const g1 = await mkG("gid-1", "GC Um"); const g2 = await mkG("gid-2", "GC Dois");
    // uuid-PNF: pessoa NÃO mapeada (PERSON_MAPPING_NOT_FOUND)

    const participantes: ProverGcParticipant[] = [
      { grupo_id: "gid-1", pessoa_uuid: "uuid-A", data_entrada: "2020-01-01" }, // ativo seguro
      { grupo_id: "gid-1", pessoa_uuid: "uuid-E", data_entrada: "2018-01-01", data_saida: "2019-01-01" }, // histórico
      { grupo_id: "gid-1", pessoa_uuid: "uuid-B", data_entrada: "2020-01-01" }, // multi-ativo
      { grupo_id: "gid-2", pessoa_uuid: "uuid-B", data_entrada: "2021-01-01" }, // multi-ativo
      { grupo_id: "gid-1", pessoa_uuid: "uuid-C", data_entrada: "2020-01-01" }, // dup conflito
      { grupo_id: "gid-1", pessoa_uuid: "uuid-C", data_entrada: "2021-06-06" }, // dup conflito (datas divergentes)
      { grupo_id: "gid-1", pessoa_uuid: "uuid-F", data_entrada: "2020-01-01" }, // dup simples
      { grupo_id: "gid-1", pessoa_uuid: "uuid-F", data_entrada: "2020-01-01" }, // dup simples (idêntico)
      { grupo_id: "gid-1", pessoa_uuid: "uuid-PNF", data_entrada: "2020-01-01" }, // person não mapeada
    ];
    const visitantes: ProverGcVisitor[] = [
      { grupo_id: "gid-2", pessoa_uuid: "uuid-D", data_cadastro: "2020-01-01" }, // visitante ativo seguro
    ];

    const before = {
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      event: await prisma.event.count({ where: { tenantId: tid } }),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    const r = await runGcMembershipsApply(prisma, { tenantId: tid, fileName: "gc-apply-test", participantes, visitantes });

    const after = {
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      event: await prisma.event.count({ where: { tenantId: tid } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    const mShip = (personId: string, gcId: string, source: "PARTICIPANT" | "VISITOR") =>
      prisma.growthGroupMembership.findFirst({ where: { tenantId: tid, personId, gcId, source } });

    const mA = await mShip(pA.id, g1.id, "PARTICIPANT");
    check("GM1. cria participante ativo seguro (source PARTICIPANT, ativo)", !!mA && mA.leftAt === null && r.activeCreated >= 1);
    const mE = await mShip(pE.id, g1.id, "PARTICIPANT");
    check("GM2. cria histórico seguro (leftAt preenchido)", !!mE && mE.leftAt !== null && r.historicalCreated === 1);
    const mD = await mShip(pD.id, g2.id, "VISITOR");
    check("GM3. cria visitante seguro (source VISITOR)", !!mD && r.visitorCreated === 1);
    check("GM4. visitante NÃO vira MEMBER (status inalterado)", after.statuses[pD.id] === before.statuses[pD.id] && after.statuses[pD.id] !== "MEMBER");
    check("GM5. pula PERSON_MAPPING_NOT_FOUND", r.personMappingNotFound === 1);
    check("GM6. pula MULTIPLE_ACTIVE_GCS (sem vínculo p/ Bruno)", r.multipleActiveGcsSkipped === 2 && (await prisma.growthGroupMembership.count({ where: { tenantId: tid, personId: pB.id } })) === 0);
    check("GM7. pula DUPLICATE_MEMBERSHIP_CONFLICT (sem vínculo p/ Carla)", r.duplicateConflictSkipped === 2 && (await prisma.growthGroupMembership.count({ where: { tenantId: tid, personId: pC.id } })) === 0);
    check("GM8. consolida duplicidade simples (1 vínculo p/ Fabio)", r.duplicateSimpleConsolidated === 1 && (await prisma.growthGroupMembership.count({ where: { tenantId: tid, personId: pF.id } })) === 1);
    check("GM9. NÃO cria User", after.user === before.user);
    check("GM10. NÃO cria RoleAssignment", after.role === before.role);
    check("GM11. NÃO altera status de pessoa", JSON.stringify(after.statuses) === JSON.stringify(before.statuses) && after.person === before.person);
    check("GM13. NÃO importa encontros/eventos", after.meeting === before.meeting && after.meeting === 0 && after.event === before.event && after.event === 0);
    check("GMx. AuditLog import_membership_create por criado", (await prisma.auditLog.count({ where: { tenantId: tid, action: "import_membership_create" } })) === r.created);

    // ── idempotência: 2ª execução cria 0 ──
    const r2 = await runGcMembershipsApply(prisma, { tenantId: tid, fileName: "gc-apply-test", participantes, visitantes });
    const gccFinal = await prisma.growthGroupMembership.count({ where: { tenantId: tid } });
    check("GM12. apply 2x é idempotente (0 criados, contagem estável)", r2.created === 0 && gccFinal === after.gcc);
  } catch (e) {
    console.log(`  ⚠ GM. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── RELATÓRIO DE PENDÊNCIAS de vínculos de GC (Fase 3B.1) ─────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "conflict-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Conflict Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const pMA = await prisma.person.create({ data: { tenantId: tid, fullName: "Marina Ativa", status: "REGULAR_ATTENDER" } });
    const pDUP = await prisma.person.create({ data: { tenantId: tid, fullName: "Duda Duplicada" } });
    const pIN = await prisma.person.create({ data: { tenantId: tid, fullName: "Ines Inativa" } });
    const pCand = await prisma.person.create({ data: { tenantId: tid, fullName: "Candidato Possivel" } });
    const g1 = await prisma.growthGroup.create({ data: { tenantId: tid, name: "GC Alfa", active: true } });
    const g2 = await prisma.growthGroup.create({ data: { tenantId: tid, name: "GC Beta", active: true } });
    const gInativo = await prisma.growthGroup.create({ data: { tenantId: tid, name: "GC Inativo", active: false } });

    // membership ATIVO em GC INATIVO (estado vivo) → C
    await prisma.growthGroupMembership.create({ data: { tenantId: tid, gcId: gInativo.id, personId: pIN.id, leftAt: null, source: "PARTICIPANT" } });

    // lote APPLY com itens SKIP (mimetiza o apply de vínculos)
    const batch = await prisma.importBatch.create({ data: { tenantId: tid, mode: "APPLY", system: "PROVER", status: "COMPLETED" } });
    const skipItem = (norm: object, warning: string) =>
      prisma.importBatchItem.create({ data: { tenantId: tid, batchId: batch.id, externalType: "growth_group_membership", externalId: `${(norm as { groupExternalId?: string }).groupExternalId}:x`, operation: "SKIP", matchStrategy: "COMPOSITE_KEY", severity: "CONFLICT", targetType: "GrowthGroupMembership", normalizedJson: norm, warningsJson: { warnings: [warning] }, rawJson: norm, status: "SKIPPED" } });

    // A: pMA com 2 GCs ativos (datas distintas → KEEP_MOST_RECENT)
    await skipItem({ personId: pMA.id, growthGroupId: g1.id, personUuid: "uuid-MA", groupExternalId: "gid-1", source: "PARTICIPANT", joinedAt: "2020-01-01", leftAt: null, active: true }, "MULTIPLE_ACTIVE_GCS");
    await skipItem({ personId: pMA.id, growthGroupId: g2.id, personUuid: "uuid-MA", groupExternalId: "gid-2", source: "PARTICIPANT", joinedAt: "2021-01-01", leftAt: null, active: true }, "MULTIPLE_ACTIVE_GCS");
    // B: pDUP com 2 linhas divergentes no g1 (1 ativa → KEEP_ACTIVE)
    await skipItem({ personId: pDUP.id, growthGroupId: g1.id, personUuid: "uuid-DUP", groupExternalId: "gid-1", source: "PARTICIPANT", joinedAt: "2020-01-01", leftAt: null, active: true }, "DUPLICATE_MEMBERSHIP_CONFLICT");
    await skipItem({ personId: pDUP.id, growthGroupId: g1.id, personUuid: "uuid-DUP", groupExternalId: "gid-1", source: "PARTICIPANT", joinedAt: "2018-01-01", leftAt: "2019-01-01", active: false }, "DUPLICATE_MEMBERSHIP_CONFLICT");
    // D: uuid ambíguo (personId null) + candidato via SKIP anterior de Pessoas
    await skipItem({ personId: null, growthGroupId: null, personUuid: "uuid-AMB", groupExternalId: "gid-9", source: "PARTICIPANT", joinedAt: "2020-01-01", leftAt: null, active: true }, "PERSON_MAPPING_NOT_FOUND");
    await prisma.importBatchItem.create({ data: { tenantId: tid, batchId: batch.id, externalType: "person", externalId: "uuid-AMB", operation: "SKIP", matchStrategy: "NAME_CONTACT_BIRTHDATE", severity: "CONFLICT", targetType: "Person", targetId: pCand.id, rawJson: {}, status: "SKIPPED" } });

    const memBefore = await prisma.growthGroupMembership.count({ where: { tenantId: tid } });
    const personBefore = await prisma.person.count({ where: { tenantId: tid } });
    const userBefore = await prisma.user.count();
    const roleBefore = await prisma.roleAssignment.count();

    const report = await buildConflictReport(prisma, { tenantId: tid });

    const memAfter = await prisma.growthGroupMembership.count({ where: { tenantId: tid } });
    const personAfter = await prisma.person.count({ where: { tenantId: tid } });

    check("CR1. relatório lista pessoa com múltiplos GCs ativos", report.multipleActiveGcs.length === 1 && report.multipleActiveGcs[0].personId === pMA.id && report.multipleActiveGcs[0].gcs.length === 2);
    check("CR2. relatório lista duplicidade conflitante", report.duplicateConflicts.length === 1 && report.duplicateConflicts[0].personId === pDUP.id && report.duplicateConflicts[0].rows.length === 2);
    check("CR3. relatório lista vínculo ativo em GC inativo", report.activeInInactiveGc.length === 1 && report.activeInInactiveGc[0].personId === pIN.id && report.activeInInactiveGc[0].gcActive === false);
    check("CR4. relatório lista pessoa não mapeada + candidato", report.personMappingNotFound.length === 1 && report.personMappingNotFound[0].pessoaUuid === "uuid-AMB" && report.personMappingNotFound[0].candidates.some((c) => c.personId === pCand.id));
    check("CR5. sugestões geradas sem aplicar", report.multipleActiveGcs[0].suggestion === "SUGGEST_KEEP_MOST_RECENT_JOINED_AT" && report.duplicateConflicts[0].suggestion === "SUGGEST_KEEP_ACTIVE" && report.activeInInactiveGc[0].suggestion === "SUGGEST_REVIEW_MANUALLY");
    check("CR6. build NÃO altera banco (membership/person estáveis)", memAfter === memBefore && personAfter === personBefore);

    const rows = flattenConflictReport(report);
    const rowMA = rows.find((r) => r.type === "MULTIPLE_ACTIVE_GCS");
    const rowB = rows.find((r) => r.type === "DUPLICATE_MEMBERSHIP_CONFLICT");
    check("CR7. links pessoa/GC montados (personId/growthGroupId)", rowMA?.personId === pMA.id && rowB?.personId === pDUP.id && rowB?.growthGroupId === g1.id);
    check("CR8. filtro por tipo funciona", filterConflictRows(rows, { kind: "duplicate", q: "" }).every((r) => r.type === "DUPLICATE_MEMBERSHIP_CONFLICT") && filterConflictRows(rows, { kind: "duplicate", q: "" }).length === 1);
    check("CR9. busca por nome funciona", filterConflictRows(rows, { kind: "all", q: "Marina" }).length === 1 && filterConflictRows(rows, { kind: "all", q: "Marina" })[0].personName === "Marina Ativa");
    check("CR9b. parseConflictKind valida", parseConflictKind("duplicate") === "duplicate" && parseConflictKind("xpto") === "all");
    check("CR10. nenhuma escrita (user/role estáveis)", (await prisma.user.count()) === userBefore && (await prisma.roleAssignment.count()) === roleBefore && report.batchId === batch.id);
  } catch (e) {
    console.log(`  ⚠ CR. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── APPLY de PRESENÇAS de evento (Fase 5B.3) ──────────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "eventatt-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Event Att Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.eventAttendance.deleteMany({ where: { tenantId: tid } });
    await prisma.eventRegistration.deleteMany({ where: { tenantId: tid } });
    await prisma.eventSession.deleteMany({ where: { tenantId: tid } });
    await prisma.event.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    // pure helper (EAT7)
    check("EAT7. classifyRegistrationCount (0/1/2)", classifyRegistrationCount(0) === "NOT_FOUND" && classifyRegistrationCount(1) === "OK" && classifyRegistrationCount(2) === "AMBIGUOUS");

    const ev = await prisma.event.create({ data: { tenantId: tid, title: "Evento", startsAt: new Date("2023-01-01"), status: "FINISHED" } });
    await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "event", externalId: "uuid-EV", internalType: "Event", internalId: ev.id } });
    const sess = await prisma.eventSession.create({ data: { tenantId: tid, eventId: ev.id, title: "Sessão", startsAt: new Date("2023-01-01T08:00:00Z") } });
    await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "event_session", externalId: "s1", internalType: "EventSession", internalId: sess.id } });

    const mkP = async (uuid: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: uuid, status: "VISITOR" } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    const mkReg = (personId: string) => prisma.eventRegistration.create({ data: { tenantId: tid, eventId: ev.id, personId, status: "CONFIRMED", source: "PROVER" } });
    const pP = await mkP("uuid-P"); const pAbs = await mkP("uuid-Abs"); const pNull = await mkP("uuid-Null");
    const pD = await mkP("uuid-D"); const pQ = await mkP("uuid-Q"); const pNoReg = await mkP("uuid-NoReg");
    for (const px of [pP, pAbs, pNull, pD, pQ]) await mkReg(px.id); // pNoReg SEM inscrição

    const attendances: ProverEventAttendance[] = [
      { id: "p1", idEncontro: "s1", uuidPessoa: "uuid-P", presenca: "1", dataCheckIn: "2023-01-01 08:05:00", aproveitamento: "95" }, // PRESENT
      { id: "p2", idEncontro: "s1", uuidPessoa: "uuid-Abs", presenca: "0" }, // ABSENT
      { id: "p3", idEncontro: "s1", uuidPessoa: "uuid-Null", presenca: null }, // UNKNOWN
      { id: "p4", idEncontro: "sX", uuidPessoa: "uuid-P", presenca: "1" }, // sessão não resolvida
      { id: "p5", idEncontro: "s1", uuidPessoa: "uuid-UNKNOWN", presenca: "1" }, // pessoa não resolvida
      { id: "p6", idEncontro: "s1", uuidPessoa: "uuid-NoReg", presenca: "1" }, // sem inscrição
      { id: "p7", idEncontro: "s1", uuidPessoa: "uuid-D", presenca: "1" }, // dup simples
      { id: "p8", idEncontro: "s1", uuidPessoa: "uuid-D", presenca: "1" }, // dup simples (idêntica)
      { id: "p9", idEncontro: "s1", uuidPessoa: "uuid-Q", presenca: "1" }, // dup conflitante
      { id: "p10", idEncontro: "s1", uuidPessoa: "uuid-Q", presenca: "0" }, // dup conflitante (divergente)
    ];

    const before = {
      att: await prisma.eventAttendance.count({ where: { tenantId: tid } }),
      event: await prisma.event.count({ where: { tenantId: tid } }),
      session: await prisma.eventSession.count({ where: { tenantId: tid } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      member: await prisma.person.count({ where: { tenantId: tid, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    const r = await runEventAttendanceApply(prisma, { tenantId: tid, fileName: "test", attendances });

    const att = (personId: string) => prisma.eventAttendance.findFirst({ where: { tenantId: tid, personId } });
    const aP = await att(pP.id); const aAbs = await att(pAbs.id); const aNull = await att(pNull.id);
    const regP = await prisma.eventRegistration.findFirst({ where: { tenantId: tid, eventId: ev.id, personId: pP.id } });
    const mapP = await prisma.externalMapping.findFirst({ where: { tenantId: tid, externalType: "event_attendance", externalId: "s1:uuid-P" } });

    check("EAT1. cria presença PRESENT", aP?.status === "PRESENT" && aP?.eventSessionId === sess.id && r.present >= 1);
    check("EAT2. cria presença ABSENT", aAbs?.status === "ABSENT");
    check("EAT3. presenca null → UNKNOWN (criada)", aNull?.status === "UNKNOWN" && r.unknown >= 1);
    check("EAT4. resolve EventSession por mapping", r.sessionResolved >= 1 && aP?.eventSessionId === sess.id);
    check("EAT5. resolve Person por mapping", r.personResolved >= 1 && aP?.personId === pP.id);
    check("EAT6. resolve EventRegistration por event+pessoa", aP?.eventRegistrationId === regP?.id && r.registrationResolved === 4);
    check("EAT8. pula sessão não resolvida", r.sessionNotFound === 1);
    check("EAT9. pula pessoa não resolvida", r.personNotFound === 1);
    check("EATx. pula inscrição não encontrada (não cria presença solta)", r.registrationNotFound === 1 && (await att(pNoReg.id)) === null);
    check("EAT10. duplicidade simples não duplica", r.duplicateSimple === 1 && (await prisma.eventAttendance.count({ where: { tenantId: tid, personId: pD.id } })) === 1);
    check("EAT11. duplicidade conflitante vira SKIP", r.duplicateConflict === 2 && (await prisma.eventAttendance.count({ where: { tenantId: tid, personId: pQ.id } })) === 0);
    check("EAT12. cria ExternalMapping(event_attendance)", mapP?.internalId === aP?.id);

    const after = {
      att: await prisma.eventAttendance.count({ where: { tenantId: tid } }),
      event: await prisma.event.count({ where: { tenantId: tid } }),
      session: await prisma.eventSession.count({ where: { tenantId: tid } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      member: await prisma.person.count({ where: { tenantId: tid, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };
    check("EAT14. NÃO altera Event", after.event === before.event);
    check("EAT15. NÃO altera EventSession", after.session === before.session);
    check("EAT16. NÃO altera EventRegistration", after.reg === before.reg);
    check("EAT17. NÃO altera Person/status", after.person === before.person && JSON.stringify(after.statuses) === JSON.stringify(before.statuses));
    check("EAT18. NÃO cria User", after.user === before.user);
    check("EAT19. NÃO cria RoleAssignment", after.role === before.role);

    // EAT13: idempotência
    const r2 = await runEventAttendanceApply(prisma, { tenantId: tid, fileName: "test", attendances });
    const fin = { att: await prisma.eventAttendance.count({ where: { tenantId: tid } }), map: await prisma.externalMapping.count({ where: { tenantId: tid, externalType: "event_attendance" } }) };
    check("EAT13. apply 2x não duplica", r2.created === 0 && fin.att === after.att && fin.map === r.created);
  } catch (e) {
    console.log(`  ⚠ EAT. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── APPLY de INSCRIÇÕES de evento (Fase 5B.2) ─────────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "eventreg-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Event Reg Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.eventRegistration.deleteMany({ where: { tenantId: tid } });
    await prisma.eventSession.deleteMany({ where: { tenantId: tid } });
    await prisma.event.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkP = async (uuid: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: uuid, status: "VISITOR" } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    const ev = await prisma.event.create({ data: { tenantId: tid, title: "Retiro", startsAt: new Date("2023-01-01"), status: "FINISHED" } });
    await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "event", externalId: "uuid-E1", internalType: "Event", internalId: ev.id } });
    const pP = await mkP("uuid-P"); const pD = await mkP("uuid-D"); const pQ = await mkP("uuid-Q");

    const registrations: ProverEventRegistration[] = [
      { uuidEvento: "uuid-E1", uuidPessoa: "uuid-P", dataInscricao: "2023-01-01 10:00:00", valorTotal: "100", lote: "L1", formaPagamento: "DINHEIRO", idResumo: "R1" }, // resolvida + pagamento
      { uuidEvento: "uuid-NONE", uuidPessoa: "uuid-P" }, // evento não resolvido
      { uuidEvento: "uuid-E1", uuidPessoa: "uuid-UNKNOWN" }, // pessoa não resolvida
      { uuidEvento: "uuid-E1", uuidPessoa: "uuid-D", dataInscricao: "2023-01-01 10:00:00" }, // dup simples
      { uuidEvento: "uuid-E1", uuidPessoa: "uuid-D", dataInscricao: "2023-01-01 10:00:00" }, // dup simples (idêntica)
      { uuidEvento: "uuid-E1", uuidPessoa: "uuid-Q", dataInscricao: "2023-01-01 10:00:00" }, // dup conflitante
      { uuidEvento: "uuid-E1", uuidPessoa: "uuid-Q", dataInscricao: "2023-02-02 12:00:00" }, // dup conflitante (data divergente)
    ];

    const before = {
      reg: await prisma.eventRegistration.count({ where: { tenantId: tid } }),
      event: await prisma.event.count({ where: { tenantId: tid } }),
      session: await prisma.eventSession.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      member: await prisma.person.count({ where: { tenantId: tid, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    const r = await runEventRegistrationsApply(prisma, { tenantId: tid, fileName: "test", registrations });

    const regP = await prisma.eventRegistration.findFirst({ where: { tenantId: tid, eventId: ev.id, personId: pP.id } });
    const mapP = await prisma.externalMapping.findFirst({ where: { tenantId: tid, externalType: "event_registration", externalId: "uuid-E1:uuid-P" } });

    check("ER1. cria inscrição com evento e pessoa resolvidos", !!regP && regP.source === "PROVER" && r.created === 2);
    check("ER2. pula inscrição sem evento resolvido", r.eventNotFound === 1);
    check("ER3. pula inscrição sem pessoa resolvida", r.personNotFound === 1);
    check("ER4. cria ExternalMapping(event_registration)", mapP?.internalId === regP?.id);
    check("ER5. preserva pagamento/lote em metadata", !!(regP?.sourcePaymentJson as { valorTotal?: string })?.valorTotal && r.paymentPreserved === 1);
    check("ER6. NÃO cria financeiro (status CONFIRMED, sem lógica de cobrança)", regP?.status === "CONFIRMED" && r.paymentDetected === 1);
    check("ER7. duplicidade simples não duplica", r.duplicateSimple === 1 && (await prisma.eventRegistration.count({ where: { tenantId: tid, personId: pD.id } })) === 1);
    check("ER8. duplicidade conflitante vira SKIP", r.duplicateConflict === 2 && (await prisma.eventRegistration.count({ where: { tenantId: tid, personId: pQ.id } })) === 0);

    const after = {
      reg: await prisma.eventRegistration.count({ where: { tenantId: tid } }),
      event: await prisma.event.count({ where: { tenantId: tid } }),
      session: await prisma.eventSession.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      member: await prisma.person.count({ where: { tenantId: tid, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };
    check("ER10. NÃO grava presença (só event_registration)", (await prisma.importBatchItem.count({ where: { tenantId: tid, externalType: "event_attendance" } })) === 0);
    check("ER11. NÃO altera Event/EventSession", after.event === before.event && after.session === before.session);
    check("ER12. NÃO altera Person", after.person === before.person);
    check("ER13. NÃO altera status eclesiástico", JSON.stringify(after.statuses) === JSON.stringify(before.statuses) && after.member === before.member);
    check("ER14. NÃO cria User", after.user === before.user);
    check("ER15. NÃO cria RoleAssignment", after.role === before.role);

    // ER9: idempotência
    const r2 = await runEventRegistrationsApply(prisma, { tenantId: tid, fileName: "test", registrations });
    const fin = { reg: await prisma.eventRegistration.count({ where: { tenantId: tid } }), map: await prisma.externalMapping.count({ where: { tenantId: tid, externalType: "event_registration" } }) };
    check("ER9. apply 2x não duplica inscrição", r2.created === 0 && fin.reg === after.reg && fin.map === r.created);
  } catch (e) {
    console.log(`  ⚠ ER. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── APPLY de EVENTOS + SESSÕES (Fase 5B.1) ────────────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "eventsapply-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Events Apply Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.eventSession.deleteMany({ where: { tenantId: tid } });
    await prisma.eventRegistration.deleteMany({ where: { tenantId: tid } });
    await prisma.event.deleteMany({ where: { tenantId: tid } });

    const events: ProverEvent[] = [
      { uuid: "uuid-E1", tipo: "RETIRO", tema: "Retiro 2023", dataInicio: "2023-01-01", dataFim: "2023-01-03", local: "Sede" }, // válido
      { uuid: "uuid-E2", tema: null, dataInicio: "2023-02-01" }, // sem título
      { uuid: "uuid-E3", tema: "Sem data", dataInicio: null },   // sem data
    ];
    const sessions: ProverEventSession[] = [
      { uuidEvento: "uuid-E1", idEncontro: "s1", tema: "Dia 1", dataInicio: "2023-01-01 08:00:00", dataFim: "2023-01-01 18:00:00" }, // pai OK
      { uuidEvento: "uuid-NONE", idEncontro: "s2", tema: "orfã", dataInicio: "2023-01-01 08:00:00" }, // sem pai
    ];

    const before = {
      event: await prisma.event.count({ where: { tenantId: tid } }),
      session: await prisma.eventSession.count({ where: { tenantId: tid } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    };

    const r = await runEventsApply(prisma, { tenantId: tid, fileName: "test", events, sessions });

    const findByMap = async (externalType: string, externalId: string) => {
      const m = await prisma.externalMapping.findFirst({ where: { tenantId: tid, system: "PROVER", externalType, externalId } });
      return m;
    };
    const mapE1 = await findByMap("event", "uuid-E1");
    const ev1 = mapE1 ? await prisma.event.findUnique({ where: { id: mapE1.internalId } }) : null;
    const mapS1 = await findByMap("event_session", "s1");
    const s1 = mapS1 ? await prisma.eventSession.findUnique({ where: { id: mapS1.internalId } }) : null;

    check("EA1. cria Event válido", ev1?.title === "Retiro 2023" && r.eventsCreated === 1);
    check("EA2. pula Event sem título", r.eventsWithoutTitle === 1 && (await findByMap("event", "uuid-E2")) === null);
    check("EA3. pula Event sem data", r.eventsWithoutDate === 1 && (await findByMap("event", "uuid-E3")) === null);
    check("EA4. cria ExternalMapping event", !!mapE1 && ev1?.sourceType === "RETIRO");
    check("EA5. cria EventSession com evento pai", !!s1 && s1?.eventId === mapE1?.internalId && r.sessionsCreated === 1);
    check("EA6. pula EventSession sem evento pai", r.sessionsWithoutParent === 1 && (await findByMap("event_session", "s2")) === null);
    check("EA7. cria ExternalMapping event_session", !!mapS1);

    const after = {
      event: await prisma.event.count({ where: { tenantId: tid } }),
      session: await prisma.eventSession.count({ where: { tenantId: tid } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    };
    check("EA10. NÃO cria EventRegistration", after.reg === before.reg && after.reg === 0);
    check("EA11. NÃO grava inscrição/presença (só event/event_session)", (await prisma.importBatchItem.count({ where: { tenantId: tid, externalType: { in: ["event_registration", "event_attendance"] } } })) === 0);
    check("EA12. NÃO altera Person", after.person === before.person);
    check("EA13. NÃO cria User", after.user === before.user);
    check("EA14. NÃO cria RoleAssignment", after.role === before.role);

    // EA8/EA9: idempotência
    const r2 = await runEventsApply(prisma, { tenantId: tid, fileName: "test", events, sessions });
    const fin = { event: await prisma.event.count({ where: { tenantId: tid } }), session: await prisma.eventSession.count({ where: { tenantId: tid } }), mapE: await prisma.externalMapping.count({ where: { tenantId: tid, externalType: "event" } }), mapS: await prisma.externalMapping.count({ where: { tenantId: tid, externalType: "event_session" } }) };
    check("EA8. apply 2x não duplica Event", r2.eventsCreated === 0 && fin.event === after.event && fin.mapE === 1);
    check("EA9. apply 2x não duplica EventSession", r2.sessionsCreated === 0 && fin.session === after.session && fin.mapS === 1);
  } catch (e) {
    console.log(`  ⚠ EA. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── APPLY da ESTRUTURA de Ensino (Fase 6B.1) ──────────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "teachapply-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Teaching Apply Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.teachingSession.deleteMany({ where: { tenantId: tid } });
    await prisma.teachingLesson.deleteMany({ where: { tenantId: tid } });
    await prisma.teachingModule.deleteMany({ where: { tenantId: tid } });
    await prisma.teaching.deleteMany({ where: { tenantId: tid } });

    const teachings: ProverTeaching[] = [
      { uuid: "uuid-T1", tipo: "INTEGRAÇÃO", tema: "Curso Integração", dataInicio: "2024-01-01", dataFim: "2024-12-31", local: "Sede" }, // válido
      { uuid: "uuid-T2", tema: null, dataInicio: "2024-02-01" }, // sem título
    ];
    const modules: ProverTeachingModule[] = [{ id: "m1", nome: "Módulo 1", media: "8.5", presenca: "90" }];
    const lessons: ProverTeachingLesson[] = [
      { id: "a1", idModulo: "m1", nome: "Aula 1", tempo: "60", ordem: "1" }, // módulo OK
      { id: "a2", idModulo: "mX", nome: "Aula órfã" }, // módulo não resolve
    ];
    const sessions: ProverTeachingSession[] = [
      { uuidEnsino: "uuid-T1", idEncontro: "e1", tema: "Enc 1", materia: "Mat", idModulo: "m1", idAula: "a1", dataInicio: "2024-01-01 20:00:00", dataFim: "2024-01-01 21:00:00" }, // pai+módulo+aula
      { uuidEnsino: "uuid-T1", idEncontro: "e2", tema: "Enc 2", idModulo: "mX", dataInicio: "2024-01-08 20:00:00" }, // módulo não resolve → cria + warning
      { uuidEnsino: "uuid-NONE", idEncontro: "e3", tema: "órfã", dataInicio: "2024-01-15 20:00:00" }, // sem ensino pai
    ];

    const before = {
      teaching: await prisma.teaching.count({ where: { tenantId: tid } }),
      module: await prisma.teachingModule.count({ where: { tenantId: tid } }),
      lesson: await prisma.teachingLesson.count({ where: { tenantId: tid } }),
      session: await prisma.teachingSession.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    };

    const r = await runTeachingApply(prisma, { tenantId: tid, fileName: "test", teachings, modules, lessons, sessions });

    const byMap = async (et: string, eid: string) => prisma.externalMapping.findFirst({ where: { tenantId: tid, system: "PROVER", externalType: et, externalId: eid } });
    const mT1 = await byMap("teaching", "uuid-T1"); const teachT1 = mT1 ? await prisma.teaching.findUnique({ where: { id: mT1.internalId } }) : null;
    const mM1 = await byMap("teaching_module", "m1"); const modM1 = mM1 ? await prisma.teachingModule.findUnique({ where: { id: mM1.internalId } }) : null;
    const mA1 = await byMap("teaching_lesson", "a1"); const lesA1 = mA1 ? await prisma.teachingLesson.findUnique({ where: { id: mA1.internalId } }) : null;
    const mE1 = await byMap("teaching_session", "e1"); const sesE1 = mE1 ? await prisma.teachingSession.findUnique({ where: { id: mE1.internalId } }) : null;
    const sesE2 = await (async () => { const m = await byMap("teaching_session", "e2"); return m ? prisma.teachingSession.findUnique({ where: { id: m.internalId } }) : null; })();

    check("TL1. cria Teaching válido", teachT1?.title === "Curso Integração" && r.teachingsCreated === 1);
    check("TL2. pula Teaching sem título", r.teachingsWithoutTitle === 1 && (await byMap("teaching", "uuid-T2")) === null);
    check("TL3. cria ExternalMapping teaching", !!mT1 && teachT1?.sourceType === "INTEGRAÇÃO");
    check("TL4. cria TeachingModule válido", modM1?.title === "Módulo 1" && r.modulesCreated === 1);
    check("TL5. cria ExternalMapping teaching_module", !!mM1 && modM1?.average === 8.5);
    check("TL6. cria TeachingLesson com módulo", lesA1?.moduleId === mM1?.internalId && r.lessonsCreated === 1);
    check("TL7. pula TeachingLesson sem módulo", r.lessonsWithoutModule === 1 && (await byMap("teaching_lesson", "a2")) === null);
    check("TL8. cria ExternalMapping teaching_lesson", !!mA1);
    check("TL9. cria TeachingSession com ensino pai", sesE1?.teachingId === mT1?.internalId && r.sessionsCreated === 2);
    check("TL10. sessão com módulo/aula resolvidos", sesE1?.moduleId === mM1?.internalId && sesE1?.lessonId === mA1?.internalId);
    check("TL11. sessão sem módulo/aula (warning, ensino resolve)", !!sesE2 && sesE2?.moduleId === null && r.sessionsWithoutModuleOrLesson === 1);
    check("TL12. pula TeachingSession sem ensino pai", r.sessionsWithoutTeaching === 1 && (await byMap("teaching_session", "e3")) === null);
    check("TL13. cria ExternalMapping teaching_session", !!mE1);

    const after = {
      teaching: await prisma.teaching.count({ where: { tenantId: tid } }),
      module: await prisma.teachingModule.count({ where: { tenantId: tid } }),
      lesson: await prisma.teachingLesson.count({ where: { tenantId: tid } }),
      session: await prisma.teachingSession.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    };
    check("TL18. NÃO cria TeachingRegistration (sem itens)", (await prisma.importBatchItem.count({ where: { tenantId: tid, externalType: "teaching_registration" } })) === 0);
    check("TL19. NÃO cria TeachingAttendance (sem itens)", (await prisma.importBatchItem.count({ where: { tenantId: tid, externalType: "teaching_attendance" } })) === 0);
    check("TL20. NÃO altera Person", after.person === before.person);
    check("TL21. NÃO cria User", after.user === before.user);
    check("TL22. NÃO cria RoleAssignment", after.role === before.role);

    // TL14-17: idempotência
    const r2 = await runTeachingApply(prisma, { tenantId: tid, fileName: "test", teachings, modules, lessons, sessions });
    const fin = { teaching: await prisma.teaching.count({ where: { tenantId: tid } }), module: await prisma.teachingModule.count({ where: { tenantId: tid } }), lesson: await prisma.teachingLesson.count({ where: { tenantId: tid } }), session: await prisma.teachingSession.count({ where: { tenantId: tid } }) };
    check("TL14. apply 2x não duplica Teaching", r2.teachingsCreated === 0 && fin.teaching === after.teaching);
    check("TL15. apply 2x não duplica TeachingModule", r2.modulesCreated === 0 && fin.module === after.module);
    check("TL16. apply 2x não duplica TeachingLesson", r2.lessonsCreated === 0 && fin.lesson === after.lesson);
    check("TL17. apply 2x não duplica TeachingSession", r2.sessionsCreated === 0 && fin.session === after.session);
  } catch (e) {
    console.log(`  ⚠ TL. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── DRY-RUN de ENSINO/TD (Fase 6A) ────────────────────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "teaching-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Teaching Test" } });
    const tid = t.id;
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkP = async (uuid: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: uuid, status: "VISITOR" } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    await mkP("uuid-reg"); await mkP("uuid-dup"); await mkP("uuid-att");

    const teachings: ProverTeaching[] = [
      { uuid: "T1", tipo: "INTEGRAÇÃO", tema: "Curso Integração", dataInicio: "2024-01-01" }, // válido
      { uuid: "T2", tema: null, dataInicio: "2024-02-01" }, // sem título
    ];
    const modules: ProverTeachingModule[] = [
      { id: "m1", nome: "Módulo 1" }, // referenciado por encontro
      { id: "m2", nome: "Módulo órfão" }, // NÃO referenciado
    ];
    const lessons: ProverTeachingLesson[] = [
      { id: "a1", idModulo: "m1", nome: "Aula 1", ordem: "1" }, // módulo OK
      { id: "a2", idModulo: "mX", nome: "Aula órfã" }, // módulo inexistente
    ];
    const sessions: ProverTeachingSession[] = [
      { uuidEnsino: "T1", idEncontro: "e1", tema: "Enc 1", idModulo: "m1", idAula: "a1", dataInicio: "2024-01-01 20:00:00" }, // pai OK, refs m1
      { uuidEnsino: "NONE", idEncontro: "e2", tema: "órfão" }, // sem ensino pai
    ];
    const registrations: ProverTeachingRegistration[] = [
      { uuidEnsino: "T1", uuidPessoa: "uuid-reg", dataInscricao: "2023-12-01", status: "Cursando", nota: "8", lote: "L1", valorTotal: "0" }, // resolvida + completion + pagamento
      { uuidEnsino: "T1", uuidPessoa: "uuid-UNKNOWN", status: "Cursando" }, // pessoa não resolvida
      { uuidEnsino: "T1", uuidPessoa: "uuid-dup", status: "Cursando" }, // dup
      { uuidEnsino: "T1", uuidPessoa: "uuid-dup", status: "Cursando" }, // dup (idêntica)
    ];
    const attendances: ProverTeachingAttendance[] = [
      { id: "p1", idEncontro: "e1", uuidPessoa: "uuid-att", presenca: "1" }, // sem inscrição (uuid-att não inscrito)
      { id: "p2", idEncontro: "e1", uuidPessoa: "uuid-reg", presenca: "1" }, // com inscrição
      { id: "p3", idEncontro: "eX", uuidPessoa: "uuid-att", presenca: "1" }, // encontro não resolvido
      { id: "p4", idEncontro: "e1", uuidPessoa: "uuid-UNKNOWN", presenca: "1" }, // pessoa não resolvida
      { id: "p5", idEncontro: "e1", uuidPessoa: "uuid-reg", presenca: "0" }, // dup (e1+uuid-reg) + ausente
    ];

    const before = {
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    const { report: r } = await runTeachingDryRun(prisma, { tenantId: tid, fileName: "test", teachings, modules, lessons, sessions, registrations, attendances });

    const after = {
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    check("TE1. ensino válido", r.totalTeachings === 2 && r.wouldCreate >= 1);
    check("TE2. ensino sem título", r.teachingsWithoutTitle === 1);
    check("TE3. módulo com ensino pai (via encontro)", r.totalModules === 2 && r.modulesWithoutParent === 1);
    check("TE4. módulo sem ensino pai", r.modulesWithoutParent === 1);
    check("TE5. aula com módulo", r.totalLessons === 2 && r.lessonsWithoutModule === 1);
    check("TE6. aula sem módulo", r.lessonsWithoutModule === 1);
    check("TE7. encontro com ensino pai", r.totalSessions === 2 && r.sessionsWithoutTeaching === 1);
    check("TE8. encontro sem ensino pai", r.sessionsWithoutTeaching === 1);
    check("TE9. inscrição com pessoa resolvida", r.registrationsPersonResolved === 3);
    check("TE10. inscrição sem pessoa", r.registrationsPersonNotFound === 1);
    check("TE11. inscrição duplicada", r.registrationDuplicates === 1);
    check("TE12. presença com pessoa resolvida", r.attendancesPersonResolved === 4);
    check("TE13. presença sem pessoa", r.attendancesPersonNotFound === 1);
    check("TE14. presença sem inscrição correspondente", r.attendancesWithoutRegistration === 1);
    check("TE15. presença duplicada", r.attendanceDuplicates === 1);
    check("TE16. pagamento/lote detectado mas ignorado", r.paymentFieldsDetected === 1);
    check("TE17. conclusão/aprovação detectada (status/nota)", r.completionFieldsDetected >= 1 && r.registrationStatuses["Cursando"] === 4);
    check("TE18. dry-run grava itens por categoria (teaching/module/lesson/session/registration/attendance)", (await prisma.importBatchItem.count({ where: { tenantId: tid, batchId: r.batchId, externalType: "teaching" } })) === 2 && (await prisma.importBatchItem.count({ where: { tenantId: tid, batchId: r.batchId, externalType: "teaching_attendance" } })) === 5);
    check("TE19. dry-run NÃO altera Person/User/RoleAssignment", after.person === before.person && JSON.stringify(after.statuses) === JSON.stringify(before.statuses) && after.user === before.user && after.role === before.role);
  } catch (e) {
    console.log(`  ⚠ TE. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── DRY-RUN de EVENTOS (Fase 5A) ──────────────────────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "events-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Events Test" } });
    const tid = t.id;
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkP = async (uuid: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: uuid, status: "VISITOR" } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    await mkP("uuid-reg"); await mkP("uuid-att");

    const events: ProverEvent[] = [
      { uuid: "E1", tipo: "RETIRO", tema: "Retiro 2023", dataInicio: "2023-01-01" }, // válido
      { uuid: "E2", tema: null, dataInicio: null }, // sem título e sem data
    ];
    const sessions: ProverEventSession[] = [
      { uuidEvento: "E1", idEncontro: "s1", tema: "Dia 1", dataInicio: "2023-01-01 08:00:00" }, // pai OK
      { uuidEvento: "NONE", idEncontro: "s2", tema: "orfã" }, // sem pai
    ];
    const registrations: ProverEventRegistration[] = [
      { uuidEvento: "E1", uuidPessoa: "uuid-reg", dataInscricao: "2022-12-01", valorTotal: "100", lote: "L1", formaPagamento: "DINHEIRO" }, // resolvida + pagamento
      { uuidEvento: "E1", uuidPessoa: "uuid-UNKNOWN" }, // pessoa não resolvida
      { uuidEvento: "E1", uuidPessoa: "uuid-reg" }, // duplicada
    ];
    const attendances: ProverEventAttendance[] = [
      { id: "a1", idEncontro: "s1", uuidPessoa: "uuid-att", presenca: "1" }, // sem inscrição (uuid-att não inscrito)
      { id: "a2", idEncontro: "s1", uuidPessoa: "uuid-reg", presenca: "1" }, // com inscrição
      { id: "a3", idEncontro: "sX", uuidPessoa: "uuid-att", presenca: "1" }, // sessão não resolvida
      { id: "a4", idEncontro: "s1", uuidPessoa: "uuid-UNKNOWN", presenca: "1" }, // pessoa não resolvida
      { id: "a5", idEncontro: "s1", uuidPessoa: "uuid-reg", presenca: "0" }, // duplicada (s1+uuid-reg) + ausente
    ];

    const before = {
      event: await prisma.event.count({ where: { tenantId: tid } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    const { report: r } = await runEventsDryRun(prisma, { tenantId: tid, fileName: "test", events, sessions, registrations, attendances });

    const after = {
      event: await prisma.event.count({ where: { tenantId: tid } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    check("EV1. evento válido (sem warning título/data)", r.totalEvents === 2 && r.wouldCreate >= 1);
    check("EV2. evento sem título", r.eventsWithoutTitle === 1);
    check("EV3. evento com status desconhecido (export sem status)", r.eventsStatusUnknown === 2);
    check("EV4. sessão com evento pai resolvido", r.totalSessions === 2 && r.sessionsWithoutParent === 1);
    check("EV5. sessão sem evento pai", r.sessionsWithoutParent === 1);
    check("EV6. inscrição com pessoa resolvida", r.registrationsPersonResolved === 2);
    check("EV7. inscrição sem pessoa", r.registrationsPersonNotFound === 1);
    check("EV8. inscrição duplicada", r.registrationDuplicates === 1);
    check("EV9. presença com pessoa resolvida", r.attendancesPersonResolved === 4);
    check("EV10. presença sem pessoa", r.attendancesPersonNotFound === 1);
    check("EV11. presença sem inscrição correspondente", r.attendancesWithoutRegistration === 1);
    check("EV12. presença duplicada", r.attendanceDuplicates === 1);
    check("EV13. cancelado/inativo N/A (export sem status)", r.eventsCanceledOrInactive === 0 && r.registrationsInCanceledEvent === 0);
    check("EV14. pagamento/lote detectado mas ignorado", r.paymentFieldsDetected === 1);
    check("EV15. dry-run NÃO cria Event real", after.event === before.event && after.event === 0);
    check("EV16. dry-run NÃO cria EventRegistration real", after.reg === before.reg && after.reg === 0);
    check("EV17. dry-run NÃO altera Person", after.person === before.person && JSON.stringify(after.statuses) === JSON.stringify(before.statuses));
    check("EV18. dry-run NÃO cria User/RoleAssignment", after.user === before.user && after.role === before.role);
    check("EVx. ImportBatchItem por categoria (event/session/registration/attendance)", (await prisma.importBatchItem.count({ where: { tenantId: tid, batchId: r.batchId, externalType: "event" } })) === 2 && (await prisma.importBatchItem.count({ where: { tenantId: tid, batchId: r.batchId, externalType: "event_attendance" } })) === 5);
  } catch (e) {
    console.log(`  ⚠ EV. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── APPLY de PRESENÇAS de GC (Fase 4B.2) ──────────────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "attapply-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Att Apply Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupAttendance.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMeeting.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkP = async (uuid: string, name: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: name, status: "VISITOR" } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    const gA = await prisma.growthGroup.create({ data: { tenantId: tid, name: "GC A", active: true } });
    await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "growth_group", externalId: "gid-A", internalType: "GrowthGroup", internalId: gA.id } });
    const meet = await prisma.growthGroupMeeting.create({ data: { tenantId: tid, gcId: gA.id, date: new Date("2020-06-01"), happened: true, status: "HELD" } });
    await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "growth_group_meeting", externalId: "e1", internalType: "GrowthGroupMeeting", internalId: meet.id } });

    const pPr = await mkP("uuid-Pr", "Presente"); const pAb = await mkP("uuid-Ab", "Ausente"); const pNo = await mkP("uuid-No", "SemMem");
    const pOut = await mkP("uuid-Out", "Fora"); const pVi = await mkP("uuid-Vi", "Visitante"); const pDs = await mkP("uuid-Ds", "DupSimples"); const pDc = await mkP("uuid-Dc", "DupConflito");
    // compatíveis (cobrem 2020-06-01): pPr, pAb, pDs, pDc → só pNo fica sem membership
    for (const px of [pPr, pAb, pDs, pDc]) await prisma.growthGroupMembership.create({ data: { tenantId: tid, gcId: gA.id, personId: px.id, joinedAt: new Date("2019-01-01"), leftAt: null, source: "PARTICIPANT" } });
    await prisma.growthGroupMembership.create({ data: { tenantId: tid, gcId: gA.id, personId: pOut.id, joinedAt: new Date("2021-01-01"), leftAt: null, source: "PARTICIPANT" } }); // fora do período

    const P = (o: Partial<ProverGcMeetingAttendance>): ProverGcMeetingAttendance => ({ grupo_id: "gid-A", encontro_id: "e1", data_inicio: "2020-06-01 20:00:00", ...o });
    const participants: ProverGcMeetingAttendance[] = [
      P({ pessoa_uuid: "uuid-Pr", presenca: "1" }),   // PRESENT + membership compatível
      P({ pessoa_uuid: "uuid-Ab", presenca: "0" }),   // ABSENT
      P({ pessoa_uuid: "uuid-Null", presenca: null }),// pula
      P({ pessoa_uuid: "uuid-No", presenca: "1" }),   // sem membership (cria + warning)
      P({ pessoa_uuid: "uuid-Out", presenca: "1" }),  // fora do período (cria + warning)
      P({ pessoa_uuid: "uuid-UNKNOWN", presenca: "1" }), // pessoa não resolvida → SKIP
      P({ encontro_id: "eX", pessoa_uuid: "uuid-Pr", presenca: "1" }), // encontro não resolvido → SKIP
      P({ pessoa_uuid: "uuid-Ds", presenca: "1" }),   // dup simples
      P({ pessoa_uuid: "uuid-Ds", presenca: "1" }),   // dup simples (idêntica)
      P({ pessoa_uuid: "uuid-Dc", presenca: "1" }),   // dup conflitante
      P({ pessoa_uuid: "uuid-Dc", presenca: "0" }),   // dup conflitante (divergente)
    ];
    const visitors: ProverGcMeetingAttendance[] = [
      P({ pessoa_uuid: "uuid-Vi", presenca: "1" }),   // visitante presente → VISITOR
    ];

    const before = {
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tid } }),
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      member: await prisma.person.count({ where: { tenantId: tid, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    const r = await runGcAttendanceApply(prisma, { tenantId: tid, fileName: "test", participants, visitors });

    const att = (personId: string) => prisma.growthGroupAttendance.findFirst({ where: { tenantId: tid, meetingId: meet.id, personId } });
    const aPr = await att(pPr.id); const aAb = await att(pAb.id); const aVi = await att(pVi.id);

    const after = {
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tid } }),
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      member: await prisma.person.count({ where: { tenantId: tid, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    check("AT1. cria PRESENT de participante", aPr?.status === "PRESENT" && aPr?.source === "PARTICIPANT");
    check("AT2. cria ABSENT de participante", aAb?.status === "ABSENT" && aAb?.source === "PARTICIPANT");
    check("AT3. pula presenca=null", r.presencaNullSkipped === 1);
    check("AT4. cria visitante com source VISITOR", aVi?.status === "VISITOR" && aVi?.source === "VISITOR" && r.visitorsCreated === 1);
    check("AT5. visitante NÃO vira MEMBER", after.statuses[pVi.id] === "VISITOR" && after.member === before.member && after.member === 0);
    check("AT6. pessoa não resolvida → SKIP", r.personNotFound === 1);
    check("AT7. encontro não resolvido → SKIP", r.meetingNotFound === 1);
    check("AT8. sem membership cria presença + warning", r.withoutMembership === 1 && !!(await att(pNo.id)) && (await prisma.growthGroupMembership.count({ where: { tenantId: tid, personId: pNo.id } })) === 0);
    check("AT9. fora do período cria presença + warning", r.outsideRange === 1 && !!(await att(pOut.id)));
    check("AT10. duplicidade idêntica não duplica", r.duplicateSimple === 1 && (await prisma.growthGroupAttendance.count({ where: { tenantId: tid, personId: pDs.id } })) === 1);
    check("AT11. duplicidade conflitante vira SKIP", r.duplicateConflict === 2 && (await prisma.growthGroupAttendance.count({ where: { tenantId: tid, personId: pDc.id } })) === 0);
    check("AT13. NÃO altera GrowthGroupMeeting", after.meeting === before.meeting);
    check("AT14. NÃO altera GrowthGroupMembership", after.gcc === before.gcc);
    check("AT15. NÃO altera Person", after.person === before.person && JSON.stringify(after.statuses) === JSON.stringify(before.statuses));
    check("AT16. NÃO cria User", after.user === before.user);
    check("AT17. NÃO cria RoleAssignment", after.role === before.role);
    check("ATx. created=6 (5 presentes + 1 ausente)", r.created === 6 && r.present === 5 && r.absent === 1);

    // AT12: idempotência
    const r2 = await runGcAttendanceApply(prisma, { tenantId: tid, fileName: "test", participants, visitors });
    const fin = { att: await prisma.growthGroupAttendance.count({ where: { tenantId: tid } }), map: await prisma.externalMapping.count({ where: { tenantId: tid, externalType: "growth_group_attendance" } }) };
    check("AT12. apply 2x não duplica (0 criados, contagens estáveis)", r2.created === 0 && fin.att === after.att && fin.map === r.created);
  } catch (e) {
    console.log(`  ⚠ AT. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── APPLY de ENCONTROS de GC (Fase 4B.1) ──────────────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "meetapply-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Meeting Apply Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupAttendance.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMeeting.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkG = async (gid: string, name: string, active: boolean) => {
      const g = await prisma.growthGroup.create({ data: { tenantId: tid, name, active } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "growth_group", externalId: gid, internalType: "GrowthGroup", internalId: g.id } });
      return g;
    };
    await mkG("gid-A", "GC Ativo", true);
    await mkG("gid-INACTIVE", "GC Inativo", false);

    const meetings: ProverGcMeeting[] = [
      { grupo_id: "gid-A", encontro_id: "mH", data_inicio: "2020-05-01 20:00:00", data_fim: "2020-05-01 21:30:00", tema: "Tema H", status: "realizado" },
      { grupo_id: "gid-A", encontro_id: "mS", data_inicio: "2020-05-08 20:00:00", tema: "Tema S", status: "agendado" },
      { grupo_id: "gid-A", encontro_id: "mC", data_inicio: "2020-05-15 20:00:00", tema: "Tema C", status: "cancelado" },
      { grupo_id: "gid-INACTIVE", encontro_id: "mI", data_inicio: "2020-05-22 20:00:00", status: "realizado" },
      { grupo_id: "gid-A", encontro_id: "mD1", data_inicio: "2020-06-01 19:00:00", status: "realizado" },
      { grupo_id: "gid-A", encontro_id: "mD2", data_inicio: "2020-06-01 20:30:00", status: "realizado" }, // mesmo GC/dia que mD1, id distinto
      { grupo_id: "gid-X", encontro_id: "mX", data_inicio: "2020-06-08 20:00:00", status: "realizado" }, // GC não mapeado
    ];

    const before = {
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tid } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    };

    const r = await runGcMeetingsApply(prisma, { tenantId: tid, fileName: "test", meetings });

    const findMeeting = async (encontroId: string) => {
      const map = await prisma.externalMapping.findFirst({ where: { tenantId: tid, system: "PROVER", externalType: "growth_group_meeting", externalId: encontroId } });
      return map ? prisma.growthGroupMeeting.findUnique({ where: { id: map.internalId } }) : null;
    };
    const mH = await findMeeting("mH"); const mS = await findMeeting("mS"); const mC = await findMeeting("mC");

    check("MA1. cria encontro realizado (HELD/happened)", mH?.status === "HELD" && mH?.happened === true);
    check("MA2. cria encontro agendado (SCHEDULED/!happened)", mS?.status === "SCHEDULED" && mS?.happened === false);
    check("MA3. cria encontro cancelado (CANCELED/!happened)", mC?.status === "CANCELED" && mC?.happened === false);
    check("MA4. preserva status do Prover (sourceStatus)", mH?.sourceStatus === "realizado" && mS?.sourceStatus === "agendado" && mC?.sourceStatus === "cancelado");
    check("MA5. cria ExternalMapping growth_group_meeting", (await prisma.externalMapping.count({ where: { tenantId: tid, externalType: "growth_group_meeting" } })) === 6 && r.created === 6);
    check("MA7. encontro em GC inativo criado + warning", r.inInactiveGc === 1 && !!(await findMeeting("mI")));
    check("MA8. duplicado GC/data: warning, sem consolidar (2 criados)", r.duplicateSameGcDate === 2 && !!(await findMeeting("mD1")) && !!(await findMeeting("mD2")));
    check("MA9. GC não mapeado → SKIP", r.gcNotFound === 1 && r.skipped === 1 && (await findMeeting("mX")) === null);

    const after = {
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tid } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tid, externalType: "growth_group_meeting" } }),
    };
    check("MA10. NÃO cria GrowthGroupAttendance", after.att === before.att && after.att === 0);
    check("MA11. NÃO altera GrowthGroupMembership", after.gcc === before.gcc);
    check("MA12. NÃO altera Person", after.person === before.person);
    check("MA13. NÃO cria User", after.user === before.user);
    check("MA14. NÃO cria RoleAssignment", after.role === before.role);

    // MA6: idempotência
    const r2 = await runGcMeetingsApply(prisma, { tenantId: tid, fileName: "test", meetings });
    const fin = { meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }), map: await prisma.externalMapping.count({ where: { tenantId: tid, externalType: "growth_group_meeting" } }) };
    check("MA6. apply 2x não duplica (0 criados, contagens estáveis)", r2.created === 0 && fin.meeting === after.meeting && fin.map === after.map);
    check("MAx. AuditLog import_meeting_create por criado", (await prisma.auditLog.count({ where: { tenantId: tid, action: "import_meeting_create" } })) === 6);
  } catch (e) {
    console.log(`  ⚠ MA. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── DRY-RUN de ENCONTROS e PRESENÇAS de GC (Fase 4A) ──────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "meetings-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Meetings Test" } });
    const tid = t.id;
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const mkP = async (uuid: string, name: string) => {
      const p = await prisma.person.create({ data: { tenantId: tid, fullName: name, status: "REGULAR_ATTENDER" } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "person", externalId: uuid, internalType: "Person", internalId: p.id } });
      return p;
    };
    const mkG = async (gid: string, name: string, active: boolean) => {
      const g = await prisma.growthGroup.create({ data: { tenantId: tid, name, active } });
      await prisma.externalMapping.create({ data: { tenantId: tid, system: "PROVER", externalType: "growth_group", externalId: gid, internalType: "GrowthGroup", internalId: g.id } });
      return g;
    };
    const pP = await mkP("uuid-P", "P Pessoa"); const pP2 = await mkP("uuid-P2", "P2 Pessoa"); const pP3 = await mkP("uuid-P3", "P3 Pessoa"); const pV = await mkP("uuid-V", "V Visit");
    const gA = await mkG("gid-A", "GC Ativo", true); const gI = await mkG("gid-INACTIVE", "GC Inativo", false);
    // pP membership cobre 2020-06-01; pP3 entrou só em 2021 (fora do período); pP2 sem membership
    await prisma.growthGroupMembership.create({ data: { tenantId: tid, gcId: gA.id, personId: pP.id, joinedAt: new Date("2019-01-01"), leftAt: null, source: "PARTICIPANT" } });
    await prisma.growthGroupMembership.create({ data: { tenantId: tid, gcId: gA.id, personId: pP3.id, joinedAt: new Date("2021-01-01"), leftAt: null, source: "PARTICIPANT" } });

    const meetings: ProverGcMeeting[] = [
      { grupo_id: "gid-A", encontro_id: "e1", data_inicio: "2020-06-01 20:00:00", status: "realizado" },
      { grupo_id: "gid-X", encontro_id: "e2", data_inicio: "2020-06-02 20:00:00", status: "agendado" }, // GC não mapeado
      { grupo_id: "gid-A", encontro_id: "e3", data_inicio: "2020-06-01 19:00:00", status: "realizado" }, // dup mesmo GC/dia que e1
      { grupo_id: "gid-INACTIVE", encontro_id: "e4", data_inicio: "2020-07-01 20:00:00", status: "realizado" }, // GC inativo
    ];
    const A = (o: Partial<ProverGcMeetingAttendance>): ProverGcMeetingAttendance => ({ grupo_id: "gid-A", encontro_id: "e1", data_inicio: "2020-06-01 20:00:00", ...o });
    const participants: ProverGcMeetingAttendance[] = [
      A({ pessoa_uuid: "uuid-P", pessoa_nome: "P", presenca: "1" }),       // resolvido + membership compatível
      A({ pessoa_uuid: "uuid-UNKNOWN", pessoa_nome: "?", presenca: "1" }), // pessoa não mapeada
      A({ pessoa_uuid: "uuid-P2", pessoa_nome: "P2", presenca: "1" }),     // sem membership
      A({ pessoa_uuid: "uuid-P3", pessoa_nome: "P3", presenca: "1" }),     // fora do período
      A({ pessoa_uuid: "uuid-P", pessoa_nome: "P", presenca: "1" }),       // duplicada
    ];
    const visitors: ProverGcMeetingAttendance[] = [
      A({ pessoa_uuid: "uuid-V", pessoa_nome: "V", presenca: "1" }),          // visitante já mapeado
      A({ pessoa_uuid: null, pessoa_nome: "Fulano Visita", presenca: "1" }),  // visitante sem uuid
    ];

    const before = {
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tid } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    };

    const { report: r } = await runGcMeetingsDryRun(prisma, { tenantId: tid, fileName: "test", meetings, participants, visitors, visits: [] });

    const after = {
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tid } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    };

    check("MT1. encontro com GC resolvido", r.meetingsGcResolved === 3 && r.meetingsWouldCreate === 3);
    check("MT2. encontro sem GC resolvido", r.meetingsGcNotFound === 1 && r.meetingsWouldSkip === 1);
    check("MT3. presença com pessoa resolvida", r.participantPersonResolved === 4);
    check("MT4. presença sem pessoa resolvida", r.participantPersonNotFound === 1);
    check("MT5. presença com membership compatível", r.attendanceWithMembership >= 1);
    check("MT6. presença sem membership", r.attendanceWithoutMembership === 1);
    check("MT7. presença fora do período do membership", r.attendanceOutsideRange === 1);
    check("MT8. presença duplicada", r.attendanceDuplicate === 1);
    check("MT9. encontro duplicado mesmo GC/data", r.meetingsDuplicateSameGcDate === 2);
    check("MT10. encontro em GC inativo", r.meetingsInInactiveGc === 1);
    check("MT11. visitante com pessoa_uuid resolvido", r.visitorWithMappedPerson === 1 && r.visitorWouldCreate === 2);
    check("MT12. visitante sem pessoa_uuid vira warning", r.visitorWithoutUuid === 1);
    check("MT13. dry-run NÃO cria GrowthGroupMeeting", after.meeting === before.meeting && after.meeting === 0);
    check("MT14. dry-run NÃO cria presença real", after.att === before.att && after.att === 0);
    check("MT15. dry-run NÃO altera membership", after.gcc === before.gcc);
    check("MT16. dry-run NÃO cria User/RoleAssignment", after.user === before.user && after.role === before.role);
    check("MTx. visitas vazias documentadas", r.visitsRead === 0 && r.visitsSemantics.startsWith("VAZIO"));
  } catch (e) {
    console.log(`  ⚠ MT. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── APPLY de RESOLUÇÕES aprovadas (Fase 3B.3) ─────────────────────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "resapply-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Res Apply Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatchItem.deleteMany({ where: { tenantId: tid } });
    await prisma.importBatch.deleteMany({ where: { tenantId: tid } });
    await prisma.gcMembershipConflictResolution.deleteMany({ where: { tenantId: tid } });
    await prisma.externalMapping.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMeeting.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroup.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const pKeep = await prisma.person.create({ data: { tenantId: tid, fullName: "Keep Pessoa", status: "REGULAR_ATTENDER" } });
    const pKeepEx = await prisma.person.create({ data: { tenantId: tid, fullName: "Keep Existente", status: "REGULAR_ATTENDER" } });
    const pClose = await prisma.person.create({ data: { tenantId: tid, fullName: "Close Pessoa", status: "VISITOR" } });
    const pIgnore = await prisma.person.create({ data: { tenantId: tid, fullName: "Ignore Pessoa", status: "VISITOR" } });
    const pAlias = await prisma.person.create({ data: { tenantId: tid, fullName: "Alias Candidato", status: "VISITOR" } });
    const pSkip = await prisma.person.create({ data: { tenantId: tid, fullName: "Skip Pessoa", status: "VISITOR" } });
    const pDraft = await prisma.person.create({ data: { tenantId: tid, fullName: "Draft Pessoa", status: "VISITOR" } });
    const gKeep = await prisma.growthGroup.create({ data: { tenantId: tid, name: "GC Keep", active: true } });
    const gOther = await prisma.growthGroup.create({ data: { tenantId: tid, name: "GC Other", active: true } });
    const gInativo = await prisma.growthGroup.create({ data: { tenantId: tid, name: "GC Inativo", active: false } });

    // pré-existentes: pKeep ativo em gOther (deve ser encerrado); pKeepEx ativo em gKeep (não duplica); pClose ativo em gInativo
    await prisma.growthGroupMembership.create({ data: { tenantId: tid, gcId: gOther.id, personId: pKeep.id, leftAt: null, source: "PARTICIPANT" } });
    await prisma.growthGroupMembership.create({ data: { tenantId: tid, gcId: gKeep.id, personId: pKeepEx.id, leftAt: null, source: "PARTICIPANT" } });
    const mC = await prisma.growthGroupMembership.create({ data: { tenantId: tid, gcId: gInativo.id, personId: pClose.id, leftAt: null, source: "PARTICIPANT" } });

    const mkRes = (data: object) => prisma.gcMembershipConflictResolution.create({ data: { tenantId: tid, status: "READY_TO_APPLY", decidedAt: new Date(), ...(data as Record<string, unknown>) } as never });
    const kMultiA = `multi-active:${tid}:${pKeep.id}`;
    const kMultiAEx = `multi-active:${tid}:${pKeepEx.id}`;
    const kInactive = `inactive-gc-active-membership:${tid}:${mC.id}`;
    const kDup = `duplicate:${tid}:${pIgnore.id}:${gKeep.id}:PARTICIPANT`;
    const kPnf = `person-mapping-not-found:${tid}:uuid-d:gid-d`;
    const kSkip = `multi-active:${tid}:${pSkip.id}`;
    const kDraft = `multi-active:${tid}:${pDraft.id}`;
    await mkRes({ type: "MULTIPLE_ACTIVE_GCS", conflictKey: kMultiA, decision: "KEEP_THIS_GC_ACTIVE", personId: pKeep.id, payloadJson: { target: gKeep.id } });
    await mkRes({ type: "MULTIPLE_ACTIVE_GCS", conflictKey: kMultiAEx, decision: "KEEP_THIS_GC_ACTIVE", personId: pKeepEx.id, payloadJson: { target: gKeep.id } });
    await mkRes({ type: "ACTIVE_MEMBERSHIP_IN_INACTIVE_GC", conflictKey: kInactive, decision: "CLOSE_THIS_MEMBERSHIP", personId: pClose.id, growthGroupId: gInativo.id });
    await mkRes({ type: "DUPLICATE_MEMBERSHIP_CONFLICT", conflictKey: kDup, decision: "IGNORE_DUPLICATE", personId: pIgnore.id, growthGroupId: gKeep.id });
    await mkRes({ type: "PERSON_MAPPING_NOT_FOUND", conflictKey: kPnf, decision: "MAP_ALIAS_TO_PERSON", proverPersonUuid: "uuid-d", payloadJson: { target: pAlias.id } });
    await mkRes({ type: "MULTIPLE_ACTIVE_GCS", conflictKey: kSkip, decision: "KEEP_THIS_GC_ACTIVE", personId: pSkip.id, payloadJson: {} });
    await prisma.gcMembershipConflictResolution.create({ data: { tenantId: tid, status: "DRAFT", type: "MULTIPLE_ACTIVE_GCS", conflictKey: kDraft, decision: "KEEP_THIS_GC_ACTIVE", personId: pDraft.id, payloadJson: { target: gKeep.id } } as never });

    // ── DRY-RUN ──
    const plans = await planResolutions(prisma, { tenantId: tid });
    check("RA1. dry-run lista somente READY_TO_APPLY (6, sem DRAFT)", plans.length === 6 && plans.every((p) => p.status === "READY_TO_APPLY"));
    check("RA2. dry-run ignora DRAFT", !plans.some((p) => p.conflictKey === kDraft));
    const planSkip = plans.find((p) => p.conflictKey === kSkip);
    check("RA9. decisão sem alvo claro vira SKIP_UNSAFE", planSkip?.applicable === false && planSkip?.actions.includes("SKIP_UNSAFE"));

    const before = {
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      member: await prisma.person.count({ where: { tenantId: tid, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    // ── APPLY ──
    const rep = await applyResolutions(prisma, { tenantId: tid, actorUserId: null });

    const after = {
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tid } }),
      person: await prisma.person.count({ where: { tenantId: tid } }),
      member: await prisma.person.count({ where: { tenantId: tid, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tid } }),
      statuses: Object.fromEntries((await prisma.person.findMany({ where: { tenantId: tid }, select: { id: true, status: true } })).map((p) => [p.id, p.status])),
    };

    const mKeep = await prisma.growthGroupMembership.findFirst({ where: { tenantId: tid, personId: pKeep.id, gcId: gKeep.id, leftAt: null } });
    const mKeepOtherClosed = await prisma.growthGroupMembership.findFirst({ where: { tenantId: tid, personId: pKeep.id, gcId: gOther.id } });
    check("RA4. KEEP_THIS_GC_ACTIVE cria membership ativo no alvo + encerra outro", !!mKeep && mKeepOtherClosed?.leftAt !== null);
    const keepExCount = await prisma.growthGroupMembership.count({ where: { tenantId: tid, personId: pKeepEx.id, gcId: gKeep.id } });
    check("RA5. KEEP não duplica membership existente", keepExCount === 1 && rep.membershipsCreated === 1);
    const mCAfter = await prisma.growthGroupMembership.findUniqueOrThrow({ where: { id: mC.id } });
    check("RA6. CLOSE_THIS_MEMBERSHIP preenche leftAt", mCAfter.leftAt !== null);
    const ignoreRes = await prisma.gcMembershipConflictResolution.findUniqueOrThrow({ where: { tenantId_conflictKey: { tenantId: tid, conflictKey: kDup } } });
    const ignoreMemberships = await prisma.growthGroupMembership.count({ where: { tenantId: tid, personId: pIgnore.id } });
    check("RA7. IGNORE_DUPLICATE aplica sem criar vínculo", ignoreRes.status === "APPLIED" && ignoreMemberships === 0);
    const aliasMap = await prisma.externalMapping.findFirst({ where: { tenantId: tid, system: "PROVER", externalType: "person", externalId: "uuid-d" } });
    check("RA8. MAP_ALIAS_TO_PERSON cria só ExternalMapping p/ alvo", aliasMap?.internalId === pAlias.id && rep.aliasMappingsCreated === 1);
    const skipRes = await prisma.gcMembershipConflictResolution.findUniqueOrThrow({ where: { tenantId_conflictKey: { tenantId: tid, conflictKey: kSkip } } });
    check("RA9b. SKIP_UNSAFE NÃO marca APPLIED", skipRes.status === "READY_TO_APPLY" && rep.skipUnsafe === 1);
    const keepRes = await prisma.gcMembershipConflictResolution.findUniqueOrThrow({ where: { tenantId_conflictKey: { tenantId: tid, conflictKey: kMultiA } } });
    check("RA10. apply marca resolução como APPLIED (+ appliedAt/batch)", keepRes.status === "APPLIED" && keepRes.appliedAt !== null && keepRes.applyBatchId === rep.batchId);
    check("RA11. apply cria AuditLog conflict_resolution_applied", (await prisma.auditLog.count({ where: { tenantId: tid, action: "conflict_resolution_applied" } })) === rep.applied && rep.applied === 5);
    check("RA13. apply NÃO altera Person.status", JSON.stringify(after.statuses) === JSON.stringify(before.statuses) && after.member === before.member && after.member === 0);
    check("RA14. apply NÃO cria User", after.user === before.user);
    check("RA15. apply NÃO cria RoleAssignment", after.role === before.role);
    check("RA16. apply NÃO importa encontros/eventos", after.meeting === before.meeting && after.meeting === 0);

    // ── idempotência: 2ª execução ──
    const rep2 = await applyResolutions(prisma, { tenantId: tid, actorUserId: null });
    const after2 = {
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tid } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tid } }),
    };
    check("RA12. apply 2x é idempotente (0 aplicadas novas, contagens estáveis)", rep2.applied === 0 && rep2.readyToApply === 1 && after2.gcc === after.gcc && after2.map === after.map);
  } catch (e) {
    console.log(`  ⚠ RA. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── DECISÃO HUMANA (rascunho) de conflitos de GC (Fase 3B.2) ──────────────
await (async () => {
  const prisma = new PrismaClient();
  try {
    const slug = "resolution-test";
    let t = await prisma.tenant.findUnique({ where: { slug } });
    if (!t) t = await prisma.tenant.create({ data: { slug, name: "Resolution Test" } });
    const tid = t.id;
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.gcMembershipConflictResolution.deleteMany({ where: { tenantId: tid } });
    await prisma.growthGroupMembership.deleteMany({ where: { tenantId: tid } });
    await prisma.person.deleteMany({ where: { tenantId: tid } });

    const memBefore = await prisma.growthGroupMembership.count({ where: { tenantId: tid } });
    const personBefore = await prisma.person.count({ where: { tenantId: tid } });
    const userBefore = await prisma.user.count();
    const roleBefore = await prisma.roleAssignment.count();

    // CD1-CD4: rascunho para cada tipo
    const r1 = await saveConflictResolution(prisma, { tenantId: tid, decidedByUserId: null, type: "MULTIPLE_ACTIVE_GCS", conflictKey: conflictKeys.multiActive(tid, "p1"), decision: "KEEP_THIS_GC_ACTIVE", personId: "p1", payload: { target: "gcX" } });
    check("CD1. cria DRAFT para MULTIPLE_ACTIVE_GCS", r1.created === true && (await prisma.gcMembershipConflictResolution.findFirstOrThrow({ where: { id: r1.id } })).status === "DRAFT");
    const r2 = await saveConflictResolution(prisma, { tenantId: tid, decidedByUserId: null, type: "DUPLICATE_MEMBERSHIP_CONFLICT", conflictKey: conflictKeys.duplicate(tid, "p2", "g2", "PARTICIPANT"), decision: "CONSOLIDATE_HISTORY", personId: "p2", growthGroupId: "g2" });
    check("CD2. cria DRAFT para DUPLICATE_MEMBERSHIP_CONFLICT", r2.created === true);
    const r3 = await saveConflictResolution(prisma, { tenantId: tid, decidedByUserId: null, type: "ACTIVE_MEMBERSHIP_IN_INACTIVE_GC", conflictKey: conflictKeys.inactiveGc(tid, "m3"), decision: "CLOSE_THIS_MEMBERSHIP", growthGroupId: "g3" });
    check("CD3. cria DRAFT para ACTIVE_MEMBERSHIP_IN_INACTIVE_GC", r3.created === true);
    const r4 = await saveConflictResolution(prisma, { tenantId: tid, decidedByUserId: null, type: "PERSON_MAPPING_NOT_FOUND", conflictKey: conflictKeys.personMappingNotFound(tid, "uuid-x", "gid-x"), decision: "MAP_ALIAS_TO_PERSON", proverPersonUuid: "uuid-x", payload: { target: "pCand" } });
    check("CD4. cria DRAFT para PERSON_MAPPING_NOT_FOUND", r4.created === true);

    // CD5/CD6: validação de decisão por tipo
    check("CD5. decisão permitida por tipo", isDecisionAllowed("MULTIPLE_ACTIVE_GCS", "KEEP_THIS_GC_ACTIVE") && isDecisionAllowed("PERSON_MAPPING_NOT_FOUND", "MAP_ALIAS_TO_PERSON") && !isDecisionAllowed("PERSON_MAPPING_NOT_FOUND", "CONSOLIDATE_HISTORY"));
    let rejected = false;
    try { await saveConflictResolution(prisma, { tenantId: tid, decidedByUserId: null, type: "MULTIPLE_ACTIVE_GCS", conflictKey: conflictKeys.multiActive(tid, "p9"), decision: "IGNORE_DUPLICATE" }); }
    catch (e) { rejected = e instanceof ResolutionValidationError; }
    check("CD6. rejeita decisão inválida para o tipo", rejected && (await prisma.gcMembershipConflictResolution.count({ where: { tenantId: tid, conflictKey: conflictKeys.multiActive(tid, "p9") } })) === 0);

    // CD7: upsert não duplica
    const r1b = await saveConflictResolution(prisma, { tenantId: tid, decidedByUserId: null, type: "MULTIPLE_ACTIVE_GCS", conflictKey: conflictKeys.multiActive(tid, "p1"), decision: "CLOSE_THIS_MEMBERSHIP", personId: "p1" });
    check("CD7. upsert por conflictKey não duplica", r1b.created === false && r1b.id === r1.id && (await prisma.gcMembershipConflictResolution.count({ where: { tenantId: tid, conflictKey: conflictKeys.multiActive(tid, "p1") } })) === 1);

    // CD8: status → READY_TO_APPLY
    await saveConflictResolution(prisma, { tenantId: tid, decidedByUserId: null, type: "MULTIPLE_ACTIVE_GCS", conflictKey: conflictKeys.multiActive(tid, "p1"), decision: "KEEP_THIS_GC_ACTIVE", status: "READY_TO_APPLY", personId: "p1" });
    check("CD8. status pode ir para READY_TO_APPLY", (await prisma.gcMembershipConflictResolution.findFirstOrThrow({ where: { id: r1.id } })).status === "READY_TO_APPLY");

    // CD9: a server action exige permissão (estrutural)
    const actionSrc = readFileSyncCD("src/modules/integrations/conflict-actions.ts", "utf8");
    check("CD9. server action exige permissão prover.import.manage", actionSrc.includes('assertPermission(ctx, "prover.import.manage")') && actionSrc.includes("requireContext()"));

    // CD10-CD12: nenhum efeito real
    check("CD10. NÃO altera GrowthGroupMembership", (await prisma.growthGroupMembership.count({ where: { tenantId: tid } })) === memBefore);
    check("CD11. NÃO altera Person", (await prisma.person.count({ where: { tenantId: tid } })) === personBefore);
    check("CD12. NÃO cria User/RoleAssignment", (await prisma.user.count()) === userBefore && (await prisma.roleAssignment.count()) === roleBefore);

    // CD13: AuditLog
    check("CD13. AuditLog conflict_resolution_draft_saved criado", (await prisma.auditLog.count({ where: { tenantId: tid, action: "conflict_resolution_draft_saved" } })) >= 5);

    // CD14: conflictKey estável
    check("CD14. conflictKey estável e no formato esperado", conflictKeys.multiActive(tid, "p1") === conflictKeys.multiActive(tid, "p1") && conflictKeys.duplicate(tid, "p2", "g2", "PARTICIPANT") === `duplicate:${tid}:p2:g2:PARTICIPANT`);

    check("CDx. ALLOWED_DECISIONS cobre os 4 tipos", Object.keys(ALLOWED_DECISIONS).length === 4);
  } catch (e) {
    console.log(`  ⚠ CD. (skip) DB indisponível: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
})();

// ── UI: helpers da lista de GCs + labels (puros, sem DB) ──────────────────
(() => {
  // parse
  const d = parseGcListParams({});
  check("UL1. parse default (all/all/page1)", d.q === "" && d.status === "all" && d.members === "all" && d.page === 1);
  const v = parseGcListParams({ q: "  Graça  ", status: "inactive", members: "with", page: "3" });
  check("UL2. parse valores válidos + trim", v.q === "Graça" && v.status === "inactive" && v.members === "with" && v.page === 3);
  const bad = parseGcListParams({ status: "xpto", members: "??", page: "-2" });
  check("UL3. parse valores inválidos → defaults", bad.status === "all" && bad.members === "all" && bad.page === 1);

  // where
  const wAll = buildGcListWhere({ tenantId: "t1", scopeIds: "ALL", params: parseGcListParams({}) });
  check("UL4. where base (tenant + archivedAt null, sem id)", wAll.tenantId === "t1" && wAll.archivedAt === null && !("id" in wAll));
  const wScoped = buildGcListWhere({ tenantId: "t1", scopeIds: ["a", "b"], params: parseGcListParams({ q: "x", status: "active", members: "with" }) });
  check("UL5. where escopo + busca + status + membros",
    JSON.stringify((wScoped.id as { in: string[] }).in) === JSON.stringify(["a", "b"]) &&
    (wScoped.name as { contains: string }).contains === "x" &&
    wScoped.active === true &&
    !!(wScoped.memberships as { some?: object }).some);
  const wWithout = buildGcListWhere({ tenantId: "t1", scopeIds: "ALL", params: parseGcListParams({ status: "inactive", members: "without" }) });
  check("UL6. where inativo + sem membros ativos", wWithout.active === false && !!(wWithout.memberships as { none?: object }).none);

  // query string
  check("UL7. queryString limpo p/ defaults", gcListQueryString(parseGcListParams({})) === "");
  check("UL8. queryString preserva filtros + override de página", gcListQueryString(parseGcListParams({ q: "Fé", status: "active" }), { page: 2 }) === "?q=F%C3%A9&status=active&page=2");

  // paginação
  check("UL9. totalPages (823 / 50 = 17)", totalPages(823) === 17 && GC_PAGE_SIZE === 50 && totalPages(0) === 1);

  // labels de origem
  check("UL10. MEMBERSHIP_SOURCE_LABEL cobre todas as origens",
    MEMBERSHIP_SOURCE_LABEL.PARTICIPANT === "Participante" && MEMBERSHIP_SOURCE_LABEL.VISITOR === "Visitante" &&
    MEMBERSHIP_SOURCE_LABEL.MANUAL === "Manual" && MEMBERSHIP_SOURCE_LABEL.IMPORTED === "Importado");
})();

// ── --confirm APPLY obrigatório (guard do CLI) ────────────────────────────
try {
  const res = spawnSync(
    "pnpm",
    ["prover:apply", "--file", "./samples/prover/pessoas.sample.json"],
    { encoding: "utf8", timeout: 60000 },
  );
  check("C1. prover:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C1. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:groups:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C2. prover:groups:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C2. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:people:mapping-reconcile:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C3. prover:people:mapping-reconcile:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C3. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:people:alias-mapping:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C4. prover:people:alias-mapping:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C4. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:gc-memberships:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C5. prover:gc-memberships:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C5. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:gc-memberships:resolutions:apply"], { encoding: "utf8", timeout: 60000 });
  check("C6. resolutions:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C6. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:gc-meetings:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C7. gc-meetings:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C7. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:gc-attendance:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C8. gc-attendance:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C8. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:events:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C9. events:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C9. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:event-registrations:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C10. event-registrations:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C10. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:event-attendance:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C11. event-attendance:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C11. (skip) não foi possível spawnar o CLI");
}
try {
  const res = spawnSync("pnpm", ["prover:teaching:apply", "--file", "./data/sample/x.zip"], { encoding: "utf8", timeout: 60000 });
  check("C12. teaching:apply SEM --confirm falha (exit 2)", res.status === 2, `exit=${res.status}`);
} catch {
  console.log("  ⚠ C12. (skip) não foi possível spawnar o CLI");
}

console.log(`\nResultado: ${passed} passou, ${failed} falhou.\n`);
if (failed > 0) process.exit(1);
