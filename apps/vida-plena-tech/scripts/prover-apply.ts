/**
 * CLI — Importador Prover, Fase 1B, MODO APPLY (cria/atualiza Pessoas).
 *
 *   pnpm prover:apply --file ./data/export.zip --limit 50 --confirm APPLY
 *   pnpm prover:apply --file ./samples/prover/pessoas.sample.json --confirm APPLY
 *
 * SEGURANÇA: exige --confirm APPLY (senão falha). NUNCA escreve no Prover,
 * cria login ou RoleAssignment real. Membro sem GC NÃO vira membro oficial.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverPessoas } from "../src/modules/integrations/prover/zip";
import { runPessoasApply } from "../src/modules/integrations/prover/apply";

function parseArgs(argv: string[]) {
  const out: { file?: string; tenant?: string; limit?: number; confirm?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" || a === "-f") out.file = argv[++i];
    else if (a === "--tenant" || a === "-t") out.tenant = argv[++i];
    else if (a === "--limit" || a === "-l") out.limit = parseInt(argv[++i], 10);
    else if (a === "--confirm") out.confirm = argv[++i];
    else if (!a.startsWith("-") && !out.file) out.file = a;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // ── confirmação explícita obrigatória ──
  if (args.confirm !== "APPLY") {
    console.error(
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria/atualiza pessoas).\n" +
        "  Para executar de verdade, passe --confirm APPLY.\n" +
        "  Ex.: pnpm prover:apply --file ./data/export.zip --limit 50 --confirm APPLY\n" +
        "  (Para só analisar sem escrever, use: pnpm prover:dry-run --file <...>)\n",
    );
    process.exit(2);
  }
  if (!args.file) {
    console.error("Uso: pnpm prover:apply --file <export.zip> [--limit N] --confirm APPLY");
    process.exit(2);
  }
  if (args.limit !== undefined && (!Number.isFinite(args.limit) || args.limit <= 0)) {
    console.error("--limit deve ser um inteiro positivo.");
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ APPLY — lendo export: ${args.file}`);
    const { fileName, sourceFileHash, pessoas } = loadProverPessoas(args.file);
    const planned = args.limit ? Math.min(args.limit, pessoas.length) : pessoas.length;
    console.log(`  pessoas.json: ${pessoas.length} registro(s); aplicando ${planned}${args.limit ? ` (--limit ${args.limit})` : " (TUDO)"}.`);
    console.log(`  Tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`  ⚠ MODO APPLY — vai criar/atualizar pessoas no banco.\n`);

    const before = await prisma.person.count({ where: { tenantId: tenant.id } });

    const r = await runPessoasApply(prisma, {
      tenantId: tenant.id,
      fileName,
      pessoas,
      sourceFileHash,
      limit: args.limit,
    });

    const after = await prisma.person.count({ where: { tenantId: tenant.id } });

    const line = (label: string, value: string | number) => `  ${label.padEnd(42, ".")} ${value}`;
    console.log("═".repeat(56));
    console.log("  RELATÓRIO APPLY — Prover Pessoas (Fase 1B)");
    console.log("═".repeat(56));
    console.log(line("Total lido (aplicado)", r.totalRead));
    console.log(line("Criados", r.created));
    console.log(line("Atualizados (por ExternalMapping)", r.updatedByMapping));
    console.log(line("Vinculados por CPF", r.linkedByCpf));
    console.log(line("Pulados (possível duplicidade)", r.skipped));
    console.log(line("Falhas", r.failed));
    console.log(line("Warnings", r.warnings));
    console.log(line("Conflitos", r.conflicts));
    console.log("  " + "-".repeat(52));
    console.log(line("CPF válido / placeholder / inválido", `${r.cpf.valid} / ${r.cpf.placeholder} / ${r.cpf.invalid}`));
    console.log(line("Membro sem CPF válido (pendência)", r.memberMissingValidCpf));
    console.log(line("Membro aguardando validação de GC", r.memberAwaitingGc));
    console.log("  " + "-".repeat(52));
    console.log("  Papéis pretendidos (NÃO criados):");
    console.log(line("    GC_LEADER / SUPERVISOR / COORD", `${r.intendedRoles.GC_LEADER} / ${r.intendedRoles.SUPERVISOR} / ${r.intendedRoles.COORDINATOR}`));
    console.log(line("    AREA_PASTOR / SENIOR_PASTOR", `${r.intendedRoles.AREA_PASTOR} / ${r.intendedRoles.SENIOR_PASTOR}`));
    console.log("  " + "-".repeat(52));
    console.log("  Status dos importados (SÓ deste batch):");
    const statusSum = Object.values(r.byStatus).reduce((a, b) => a + b, 0);
    for (const [st, n] of Object.entries(r.byStatus).sort((a, b) => b[1] - a[1])) {
      console.log(line(`    ${st}`, n));
    }
    const expected = r.created + r.updatedByMapping + r.linkedByCpf;
    console.log(line("    soma status = criados+atualizados+vinc.", `${statusSum} == ${expected} ${statusSum === expected ? "✓" : "✗ DIVERGE"}`));
    console.log("═".repeat(56));
    console.log(line("Person ANTES", before));
    console.log(line("Person DEPOIS", after));
    console.log(line("ImportBatch (mode APPLY)", r.batchId));
    console.log("═".repeat(56) + "\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
