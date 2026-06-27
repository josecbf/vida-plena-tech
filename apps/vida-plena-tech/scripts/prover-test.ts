/**
 * Testes das funções PURAS do importador Prover (sem DB, sem framework).
 *   pnpm prover:test
 * Sai com código != 0 se algum caso falhar.
 */
import {
  classifyCpf,
  normalizeProverPerson,
  normalizeNameKey,
} from "../src/modules/integrations/prover/normalize";
import type { ProverPerson } from "../src/modules/integrations/prover/types";

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

console.log(`\nResultado: ${passed} passou, ${failed} falhou.\n`);
if (failed > 0) process.exit(1);
