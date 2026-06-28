/**
 * CLI — Importador Prover, Fase 2B, APPLY de GRUPOS de Crescimento.
 *
 *   pnpm prover:groups:apply --file ./data/export.zip --limit 50 --confirm APPLY
 *
 * Cria/atualiza GrowthGroup + LeadershipUnit a partir de grupos.json +
 * hierarquia_grupo_funcao.json, usando pessoas já importadas. Exige --confirm
 * APPLY. NUNCA cria User/RoleAssignment/participantes; não inventa pastor de área.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverGroups, loadProverGroupFunctions } from "../src/modules/integrations/prover/zip";
import { runGroupsApply } from "../src/modules/integrations/prover/groups-apply";

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
  if (args.confirm !== "APPLY") {
    console.error(
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria/atualiza grupos).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:groups:apply --file ./data/export.zip --limit 50 --confirm APPLY\n" +
        "  (Para só analisar, use: pnpm prover:groups:dry-run --file <...>)\n",
    );
    process.exit(2);
  }
  if (!args.file) {
    console.error("Uso: pnpm prover:groups:apply --file <export.zip> [--limit N] --confirm APPLY");
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

    const personCount = await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "person" } });
    if (personCount === 0) console.warn("\n⚠ Sem ExternalMapping de pessoa. A liderança não resolverá (rode a Fase 1B apply).\n");

    console.log(`\n▶ APPLY de GRUPOS — lendo: ${args.file}`);
    const { grupos } = loadProverGroups(args.file);
    const { funcoes, sourceFileHash } = loadProverGroupFunctions(args.file);
    const planned = args.limit ? Math.min(args.limit, grupos.length) : grupos.length;
    console.log(`  grupos.json: ${grupos.length} · hierarquia: ${funcoes.length} · aplicando ${planned}${args.limit ? ` (--limit ${args.limit})` : " (TUDO)"}.`);
    console.log(`  Tenant: ${tenant.name} · ExternalMapping de pessoas: ${personCount}`);
    console.log(`  ⚠ MODO APPLY — cria/atualiza GrowthGroup + LeadershipUnit.\n`);

    const before = {
      gc: await prisma.growthGroup.count({ where: { tenantId: tenant.id } }),
      unit: await prisma.leadershipUnit.count({ where: { tenantId: tenant.id } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
    };

    const r = await runGroupsApply(prisma, { tenantId: tenant.id, fileName: "grupos+hierarquia", grupos, funcoes, sourceFileHash, limit: args.limit });

    const after = {
      gc: await prisma.growthGroup.count({ where: { tenantId: tenant.id } }),
      unit: await prisma.leadershipUnit.count({ where: { tenantId: tenant.id } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
    };

    const line = (l: string, v: string | number) => `  ${l.padEnd(46, ".")} ${v}`;
    console.log("═".repeat(60));
    console.log("  RELATÓRIO APPLY — Prover Grupos (Fase 2B)");
    console.log("═".repeat(60));
    console.log(line("Total lido (aplicado)", r.totalRead));
    console.log(line("Criados / Atualizados / Pulados / Falhas", `${r.created} / ${r.updated} / ${r.skipped} / ${r.failed}`));
    console.log(line("Warnings", r.warnings));
    console.log(line("Ativos / Inativos / Status desconhecido", `${r.active} / ${r.inactive} / ${r.unknownStatus}`));
    console.log("  " + "-".repeat(56));
    console.log(line("Grupos sem líder / supervisor / coordenador", `${r.groupsWithoutLeader} / ${r.groupsWithoutSupervisor} / ${r.groupsWithoutCoordinator}`));
    console.log(line("LeadershipUnits CRIADAS (lead/sup/coord)", `${r.leadershipUnitsCreated} / ${r.supervisionUnitsCreated} / ${r.coordinationUnitsCreated}`));
    console.log(line("Tipos: INDIVIDUAL / DUAL / TEAM / AUSENTE", `${r.typeIndividual} / ${r.typeDual} / ${r.typeTeam} / ${r.typeAbsent}`));
    console.log(line("Pastor de área disponível no export?", "NÃO (AREA_PASTOR_NOT_AVAILABLE_IN_GROUP_EXPORT)"));
    console.log("═".repeat(60));
    console.log(line("GrowthGroup ANTES → DEPOIS", `${before.gc} → ${after.gc}`));
    console.log(line("LeadershipUnit ANTES → DEPOIS", `${before.unit} → ${after.unit}`));
    console.log(line("User ANTES → DEPOIS", `${before.user} → ${after.user}`));
    console.log(line("RoleAssignment ANTES → DEPOIS", `${before.role} → ${after.role}`));
    console.log(line("ImportBatch (mode APPLY, growth_group)", r.batchId));
    console.log("═".repeat(60) + "\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
