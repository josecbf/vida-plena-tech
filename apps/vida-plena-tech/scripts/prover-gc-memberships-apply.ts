/**
 * CLI — Importador Prover, Fase 3B, APPLY conservador de VÍNCULOS pessoa↔GC.
 *
 *   pnpm prover:gc-memberships:apply --file ./data/export.zip --limit 100 --confirm APPLY
 *   pnpm prover:gc-memberships:apply --file ./data/export.zip --confirm APPLY   (FULL)
 *
 * Cria GrowthGroupMembership SOMENTE para vínculos seguros; conflitos são
 * PULADOS (SKIP), nunca resolvidos automaticamente. Exige --confirm APPLY.
 * NUNCA promove a MEMBER, altera status, cria User/RoleAssignment, nem importa
 * encontros/presenças/eventos/ensino.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverGcParticipants, loadProverGcVisitors } from "../src/modules/integrations/prover/zip";
import { runGcMembershipsApply } from "../src/modules/integrations/prover/gc-memberships-apply";

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
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria GrowthGroupMembership).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:gc-memberships:apply --file ./data/export.zip --limit 100 --confirm APPLY\n" +
        "  (Para só analisar, use: pnpm prover:gc-memberships:dry-run --file <...>)\n",
    );
    process.exit(2);
  }
  if (!args.file) {
    console.error("Uso: pnpm prover:gc-memberships:apply --file <export.zip> [--limit N] --confirm APPLY");
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

    console.log(`\n▶ APPLY de VÍNCULOS pessoa↔GC — lendo: ${args.file}`);
    const { participantes } = loadProverGcParticipants(args.file);
    const { visitantes, sourceFileHash } = loadProverGcVisitors(args.file);
    const totalLinks = participantes.length + visitantes.length;
    const planned = args.limit ? Math.min(args.limit, totalLinks) : totalLinks;
    console.log(`  participantes: ${participantes.length} · visitantes: ${visitantes.length} · aplicando ${planned}${args.limit ? ` (--limit ${args.limit})` : " (TUDO)"}.`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  ⚠ MODO APPLY — cria vínculos SEGUROS; conflitos são PULADOS (não resolvidos).\n`);

    const before = {
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      gc: await prisma.growthGroup.count({ where: { tenantId: tenant.id } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
    };

    const r = await runGcMembershipsApply(prisma, {
      tenantId: tenant.id, fileName: "participantes+visitantes (apply)", participantes, visitantes, sourceFileHash, limit: args.limit,
    });

    const after = {
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      gc: await prisma.growthGroup.count({ where: { tenantId: tenant.id } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
    };

    const line = (l: string, v: string | number) => `  ${l.padEnd(48, ".")} ${v}`;
    const flag = (a: number, b: number) => (a === b ? "(inalterado ✓)" : "(ALTEROU!)");
    console.log("═".repeat(62));
    console.log("  RELATÓRIO APPLY — Vínculos pessoa↔GC (Fase 3B)");
    console.log("═".repeat(62));
    console.log(line("Vínculos processados (após --limit)", r.totalLinks));
    console.log(line("Participantes / Visitantes (no arquivo)", `${r.totalParticipants} / ${r.totalVisitors}`));
    console.log("  " + "-".repeat(58));
    console.log(line("Criados / Atualizados / Pulados / Falhas", `${r.created} / ${r.updated} / ${r.skipped} / ${r.failed}`));
    console.log(line("Ativos criados / Históricos criados", `${r.activeCreated} / ${r.historicalCreated}`));
    console.log(line("Participantes criados / Visitantes criados", `${r.participantCreated} / ${r.visitorCreated}`));
    console.log("  " + "-".repeat(58));
    console.log("  PULADOS por motivo:");
    console.log(line("    PERSON_MAPPING_NOT_FOUND", r.personMappingNotFound));
    console.log(line("    GROWTH_GROUP_MAPPING_NOT_FOUND", r.growthGroupMappingNotFound));
    console.log(line("    MULTIPLE_ACTIVE_GCS", r.multipleActiveGcsSkipped));
    console.log(line("    DUPLICATE_MEMBERSHIP_CONFLICT", r.duplicateConflictSkipped));
    console.log(line("    DATE_INCONSISTENCY", r.dateInconsistencySkipped));
    console.log(line("    Duplicidade simples consolidada", r.duplicateSimpleConsolidated));
    console.log(line("    Já importado (idempotente)", r.alreadyImported));
    console.log("═".repeat(62));
    console.log(line("Person ANTES → DEPOIS", `${before.person} → ${after.person} ${flag(before.person, after.person)}`));
    console.log(line("GrowthGroup ANTES → DEPOIS", `${before.gc} → ${after.gc} ${flag(before.gc, after.gc)}`));
    console.log(line("GrowthGroupMembership ANTES → DEPOIS", `${before.gcc} → ${after.gcc}`));
    console.log(line("User ANTES → DEPOIS", `${before.user} → ${after.user} ${flag(before.user, after.user)}`));
    console.log(line("RoleAssignment ANTES → DEPOIS", `${before.role} → ${after.role} ${flag(before.role, after.role)}`));
    console.log(line("ImportBatch (mode APPLY)", r.batchId));
    console.log("═".repeat(62) + "\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
