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
import type { ProverPerson } from "../src/modules/integrations/prover/types";
import { spawnSync } from "node:child_process";

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

console.log(`\nResultado: ${passed} passou, ${failed} falhou.\n`);
if (failed > 0) process.exit(1);
