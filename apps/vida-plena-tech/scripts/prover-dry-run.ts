/**
 * CLI — Importador Prover, Fase 1 (Pessoas), MODO DRY-RUN.
 *
 *   pnpm prover:dry-run --file ./data/export_prover_2026-06-27.zip
 *   pnpm prover:dry-run ./data/export_prover_2026-06-27.zip      (posicional)
 *   pnpm prover:dry-run --file ./data/pessoas.json               (.json de teste)
 *
 * NÃO cria/atualiza pessoas. Só grava ImportBatch + ImportBatchItem e imprime
 * o relatório. NUNCA escreve no Prover.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverPessoas } from "../src/modules/integrations/prover/zip";
import { runPessoasDryRun } from "../src/modules/integrations/prover/dry-run";

function parseArgs(argv: string[]): { file?: string; tenant?: string } {
  const out: { file?: string; tenant?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" || a === "-f") out.file = argv[++i];
    else if (a === "--tenant" || a === "-t") out.tenant = argv[++i];
    else if (!a.startsWith("-") && !out.file) out.file = a; // posicional
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error(
      "Uso: pnpm prover:dry-run --file <export.zip>\n" +
        "     (aceita também um .json de teste com o array de pessoas)",
    );
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    // 1) tenant alvo (demo: o único; ou --tenant <slug>)
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) {
      throw new Error(
        args.tenant
          ? `Tenant com slug "${args.tenant}" não encontrado.`
          : "Nenhum tenant no banco. Rode o seed primeiro (pnpm db:seed).",
      );
    }

    // 2) carrega pessoas.json do ZIP
    console.log(`\n▶ Lendo export: ${args.file}`);
    const { fileName, sourceFileHash, pessoas } = loadProverPessoas(args.file);
    console.log(`  pessoas.json encontrado — ${pessoas.length} registro(s).`);
    console.log(`  sha256(pessoas.json): ${sourceFileHash.slice(0, 16)}…`);
    console.log(`  Tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`  Modo: DRY-RUN — nenhuma pessoa será criada/alterada.\n`);

    // 3) processa
    const r = await runPessoasDryRun(prisma, {
      tenantId: tenant.id,
      fileName,
      pessoas,
      sourceFileHash,
    });

    // 4) relatório
    const line = (label: string, value: string | number) =>
      `  ${label.padEnd(42, ".")} ${value}`;
    console.log("═".repeat(56));
    console.log("  RELATÓRIO DRY-RUN — Prover Pessoas (Fase 1)");
    console.log("═".repeat(56));
    console.log(line("Total de registros lidos", r.totalRead));
    console.log(line("Seriam criados (WOULD_CREATE)", r.wouldCreate));
    console.log(line("Match por ExternalMapping", r.matchedByExternalMapping));
    console.log(line("Match por CPF", r.matchedByCpf));
    console.log(line("Possível duplicidade (revisão)", r.possibleDuplicate));
    console.log(line("Itens com warning", r.warnings));
    console.log(line("Itens com conflito", r.conflicts));
    console.log(line("Falhas", r.failed));
    console.log("  " + "-".repeat(52));
    console.log(line("CPF válido", r.cpf.valid));
    console.log(line("CPF ausente", r.cpf.missing));
    console.log(line("CPF inválido", r.cpf.invalid));
    console.log(line("CPF placeholder", r.cpf.placeholder));
    console.log("  " + "-".repeat(52));
    console.log(line("Membro sem CPF válido (pendência)", r.memberMissingValidCpf));
    console.log(line("Membro aguardando validação de GC", r.memberAwaitingGc));
    console.log("  " + "-".repeat(52));
    console.log("  Papéis pretendidos (não criados):");
    console.log(line("    GC_LEADER", r.intendedRoles.GC_LEADER));
    console.log(line("    SUPERVISOR", r.intendedRoles.SUPERVISOR));
    console.log(line("    COORDINATOR", r.intendedRoles.COORDINATOR));
    console.log(line("    AREA_PASTOR", r.intendedRoles.AREA_PASTOR));
    console.log(line("    SENIOR_PASTOR", r.intendedRoles.SENIOR_PASTOR));
    console.log("═".repeat(56));
    console.log(`  ImportBatch criado: ${r.batchId}`);
    console.log(
      `  Consulte os itens: tela /prover (admin) ou\n` +
        `    SELECT status, message FROM "ImportBatchItem" WHERE "batchId"='${r.batchId}';`,
    );
    console.log("═".repeat(56) + "\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
