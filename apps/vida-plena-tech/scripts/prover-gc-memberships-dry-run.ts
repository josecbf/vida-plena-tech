/**
 * CLI — Importador Prover, Fase 3A, VÍNCULOS pessoa↔GC em DRY-RUN.
 *
 *   pnpm prover:gc-memberships:dry-run --file ./data/export_prover_2026-06-27.zip
 *
 * Lê grupos_participantes.json + grupos_visitantes.json, resolve pessoa/GC via
 * ExternalMapping e analisa. NÃO cria GrowthGroupMembership, NÃO altera status,
 * NÃO promove a MEMBER, NÃO cria User/Role. Visitante não vira membro.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverGcParticipants, loadProverGcVisitors } from "../src/modules/integrations/prover/zip";
import { runGcMembershipsDryRun } from "../src/modules/integrations/prover/gc-memberships-dry-run";

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
    console.error("Uso: pnpm prover:gc-memberships:dry-run --file <export.zip>");
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ Vínculos GC dry-run — lendo: ${args.file}`);
    const { participantes } = loadProverGcParticipants(args.file);
    const { visitantes, sourceFileHash } = loadProverGcVisitors(args.file);
    console.log(`  participantes: ${participantes.length} · visitantes: ${visitantes.length}`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  Modo: DRY-RUN — nenhum vínculo será criado; nenhum status alterado.\n`);

    const gccBefore = await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } });
    const r = await runGcMembershipsDryRun(prisma, { tenantId: tenant.id, fileName: "participantes+visitantes", participantes, visitantes, sourceFileHash });
    const gccAfter = await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } });

    const line = (l: string, v: string | number) => `  ${l.padEnd(46, ".")} ${v}`;
    console.log("═".repeat(60));
    console.log("  RELATÓRIO DRY-RUN — Vínculos pessoa↔GC (Fase 3A)");
    console.log("═".repeat(60));
    console.log(line("Linhas participantes / visitantes", `${r.totalParticipants} / ${r.totalVisitors}`));
    console.log(line("Total de vínculos analisados", r.totalLinks));
    console.log("  " + "-".repeat(56));
    console.log(line("Pessoas mapeadas / NÃO mapeadas", `${r.personsMapped} / ${r.personsNotMapped}`));
    console.log(line("GCs mapeados / NÃO mapeados", `${r.gcsMapped} / ${r.gcsNotMapped}`));
    console.log(line("Vínculos ativos / encerrados", `${r.active} / ${r.ended}`));
    console.log(line("Participantes / Visitantes", `${r.participantLinks} / ${r.visitorLinks}`));
    console.log("  " + "-".repeat(56));
    console.log(line("Seriam criados (WOULD_CREATE)", r.wouldCreate));
    console.log(line("Seriam atualizados (WOULD_UPDATE)", r.wouldUpdate));
    console.log(line("Pulados (WOULD_SKIP)", r.wouldSkip));
    console.log(line("Falhas", r.failed));
    console.log("  " + "-".repeat(56));
    console.log("  CONFLITOS:");
    console.log(line("    Pessoas com múltiplos GCs ativos", r.conflictMultipleActiveGcs));
    console.log(line("    Duplicidade simples / com conflito", `${r.duplicateSimple} / ${r.duplicateConflict}`));
    console.log("═".repeat(60));
    console.log(line("GrowthGroupMembership ANTES → DEPOIS", `${gccBefore} → ${gccAfter}`));
    console.log(line("ImportBatch (DRY_RUN, gc_membership)", r.batchId));
    console.log("═".repeat(60) + "\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
