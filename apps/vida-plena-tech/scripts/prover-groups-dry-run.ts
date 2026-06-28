/**
 * CLI — Importador Prover, Fase 2A.1, GRUPOS em DRY-RUN (enriquecido).
 *
 *   pnpm prover:groups:dry-run --file ./data/export_prover_2026-06-27.zip
 *
 * Cruza grupos.json com hierarquia_grupo_funcao.json para validar a cadeia de
 * liderança ANTES do apply. NÃO cria GrowthGroup/User/RoleAssignment/
 * LeadershipUnit. Resolve liderança via ExternalMapping de PESSOAS (Fase 1B).
 */
import { PrismaClient } from "@prisma/client";
import { loadProverGroups, loadProverGroupFunctions } from "../src/modules/integrations/prover/zip";
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
        "\n⚠ Nenhum ExternalMapping de PESSOA. O dry-run de grupos depende da Fase 1B apply.\n" +
          "  A resolução de liderança virá vazia.\n",
      );
    }

    console.log(`\n▶ GRUPOS dry-run (enriquecido) — lendo: ${args.file}`);
    const { grupos } = loadProverGroups(args.file);
    const { funcoes, sourceFileHash } = loadProverGroupFunctions(args.file);
    console.log(`  grupos.json: ${grupos.length} · hierarquia_grupo_funcao.json: ${funcoes.length} linha(s)`);
    console.log(`  Tenant: ${tenant.name} · ExternalMapping de pessoas: ${personCount}`);
    console.log(`  Modo: DRY-RUN — nenhum GrowthGroup/User/Role/LeadershipUnit será criado.\n`);

    const r = await runGroupsDryRun(prisma, { tenantId: tenant.id, fileName: "grupos+hierarquia", grupos, funcoes, sourceFileHash });

    const line = (l: string, v: string | number) => `  ${l.padEnd(46, ".")} ${v}`;
    console.log("═".repeat(60));
    console.log("  RELATÓRIO DRY-RUN — Prover Grupos + Hierarquia (Fase 2A.1)");
    console.log("═".repeat(60));
    console.log(line("Total de grupos", r.totalGroups));
    console.log(line("Linhas de hierarquia (ativas / removidas)", `${r.hierarchyLinesRead} (${r.hierarchyActive} / ${r.hierarchyRemoved})`));
    console.log(line("Seriam criados / Match mapping / Falhas", `${r.wouldCreate} / ${r.matchedByExternalMapping} / ${r.failed}`));
    console.log(line("Warnings", r.warnings));
    console.log("  " + "-".repeat(56));
    console.log(line("Ativos / Inativos / Status desconhecido", `${r.active} / ${r.inactive} / ${r.unknownStatus}`));
    console.log("  " + "-".repeat(56));
    console.log(line("Liderança CONSISTENTE (grupos×hierarquia)", r.consistentGroups));
    console.log(line("Liderança DIVERGENTE", r.divergentGroups));
    console.log(line("Grupos sem líder", r.groupsWithoutLeader));
    console.log(line("Grupos sem supervisor", r.groupsWithoutSupervisor));
    console.log(line("Grupos sem coordenador", r.groupsWithoutCoordinator));
    console.log(line("Funções desconhecidas (grupos)", r.unknownFunctionRows));
    console.log(line("Pessoas de função NÃO mapeadas", r.personsNotMapped));
    console.log("  " + "-".repeat(56));
    console.log("  Sugestões de liderança (NÃO inferência final):");
    console.log(line("    INDIVIDUAL / DUAL / TEAM / AUSENTE", `${r.suggestionIndividual} / ${r.suggestionDual} / ${r.suggestionTeam} / ${r.suggestionAbsent}`));
    console.log("  " + "-".repeat(56));
    console.log(line("Pastor de área disponível no export?", r.areaPastorAvailable ? "SIM" : "NÃO (AREA_PASTOR_NOT_AVAILABLE_IN_GROUP_EXPORT)"));
    console.log("═".repeat(60));
    console.log(`  PRONTO PARA APPLY DE GC? ${r.readyForApply ? "SIM" : "NÃO"}`);
    console.log(`  → ${r.recommendation}`);
    console.log(line("ImportBatch (DRY_RUN, growth_group)", r.batchId));
    console.log("═".repeat(60) + "\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
