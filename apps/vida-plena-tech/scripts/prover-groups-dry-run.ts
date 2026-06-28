/**
 * CLI — Importador Prover, Fase 2A, GRUPOS em DRY-RUN.
 *
 *   pnpm prover:groups:dry-run --file ./data/export_prover_2026-06-27.zip
 *
 * NÃO cria GrowthGroup/User/RoleAssignment/LeadershipUnit. Resolve liderança
 * via ExternalMapping de PESSOAS (Fase 1B precisa ter rodado). Só leitura.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverGroups } from "../src/modules/integrations/prover/zip";
import { runGroupsDryRun } from "../src/modules/integrations/prover/groups-dry-run";

function parseArgs(argv: string[]) {
  const out: { file?: string; tenant?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" || a === "-f") out.file = argv[++i];
    else if (a === "--tenant" || a === "-t") out.tenant = argv[++i];
    else if (!a.startsWith("-") && !out.file) out.file = a;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("Uso: pnpm prover:groups:dry-run --file <export.zip>");
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    const personCount = await prisma.externalMapping.count({
      where: { tenantId: tenant.id, system: "PROVER", externalType: "person" },
    });
    if (personCount === 0) {
      console.warn(
        "\n⚠ Nenhum ExternalMapping de PESSOA encontrado. O dry-run de grupos depende\n" +
          "  das pessoas importadas (Fase 1B apply). A resolução de liderança virá vazia.\n",
      );
    }

    console.log(`\n▶ GRUPOS dry-run — lendo: ${args.file}`);
    const { fileName, sourceFileHash, grupos } = loadProverGroups(args.file);
    console.log(`  grupos.json: ${grupos.length} grupo(s) · sha256 ${sourceFileHash.slice(0, 12)}…`);
    console.log(`  Tenant: ${tenant.name} · ExternalMapping de pessoas: ${personCount}`);
    console.log(`  Modo: DRY-RUN — nenhum GrowthGroup/User/Role será criado.\n`);

    const r = await runGroupsDryRun(prisma, { tenantId: tenant.id, fileName, grupos, sourceFileHash });

    const line = (l: string, v: string | number) => `  ${l.padEnd(44, ".")} ${v}`;
    console.log("═".repeat(58));
    console.log("  RELATÓRIO DRY-RUN — Prover Grupos (Fase 2A)");
    console.log("═".repeat(58));
    console.log(line("Total de grupos lidos", r.totalRead));
    console.log(line("Seriam criados (WOULD_CREATE)", r.wouldCreate));
    console.log(line("Match por ExternalMapping (would update)", r.matchedByExternalMapping));
    console.log(line("Falhas", r.failed));
    console.log(line("Warnings / Conflicts", `${r.warnings} / ${r.conflicts}`));
    console.log("  " + "-".repeat(54));
    console.log(line("Ativos / Inativos / Status desconhecido", `${r.active} / ${r.inactive} / ${r.unknownStatus}`));
    console.log("  " + "-".repeat(54));
    console.log("  Liderança:");
    console.log(line("    com líder mapeado", r.withLeaderMapped));
    console.log(line("    sem líder", r.withoutLeader));
    console.log(line("    líder NÃO encontrado no mapping", r.leaderNotFound));
    console.log(line("    líder auxiliar mapeado", r.assistantMapped));
    console.log(line("    supervisor mapeado", r.supervisorMapped));
    console.log(line("    coordenador mapeado", r.coordinatorMapped));
    console.log(line("    pastor de área mapeado", `${r.areaPastorMapped} (sem campo no export)`));
    console.log("  " + "-".repeat(54));
    console.log("  Sugestões de liderança (NÃO inferência final):");
    console.log(line("    INDIVIDUAL", r.suggestionIndividual));
    console.log(line("    DUAL (casal/casa/equipe?)", r.suggestionDual));
    console.log(line("    AUSENTE", r.suggestionAbsent));
    console.log("═".repeat(58));
    console.log(line("ImportBatch (mode DRY_RUN, growth_group)", r.batchId));
    console.log("═".repeat(58) + "\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
