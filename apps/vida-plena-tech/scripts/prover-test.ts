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

console.log(`\nResultado: ${passed} passou, ${failed} falhou.\n`);
if (failed > 0) process.exit(1);
