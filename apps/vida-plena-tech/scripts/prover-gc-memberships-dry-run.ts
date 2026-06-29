/**
 * CLI — Importador Prover, Fase 3A, VÍNCULOS pessoa↔GC em DRY-RUN.
 *
 *   pnpm prover:gc-memberships:dry-run --file ./data/export_prover_2026-06-27.zip
 *
 * Lê grupos_participantes.json + grupos_visitantes.json, resolve pessoa/GC via
 * ExternalMapping e analisa. NÃO cria GrowthGroupMembership, NÃO altera status,
 * NÃO promove a MEMBER, NÃO cria User/Role. Visitante não vira membro.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadProverGcParticipants, loadProverGcVisitors, loadProverPessoas } from "../src/modules/integrations/prover/zip";
import { runGcMembershipsDryRun } from "../src/modules/integrations/prover/gc-memberships-dry-run";
import { buildSanitizationReport, writeSanitizationReport } from "../src/modules/integrations/prover/gc-memberships-report";

function parseArgs(argv: string[]) {
  const out: { file?: string; tenant?: string; writeReport?: boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" || a === "-f") out.file = argv[++i];
    else if (a === "--tenant" || a === "-t") out.tenant = argv[++i];
    else if (a === "--write-report") out.writeReport = true;
    else if (!a.startsWith("-") && !out.file) out.file = a;
  }
  return out;
}

function mask(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  return parts.map((p, i) => (i === 0 ? p : (p[0] ?? "") + ".")).join(" ") || "—";
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

    // ── relatório de saneamento (FORA do git) ──
    if (args.writeReport) {
      console.log("▶ Gerando relatório de saneamento (--write-report)…");
      const { participantes } = loadProverGcParticipants(args.file!);
      const { visitantes } = loadProverGcVisitors(args.file!);
      const { pessoas } = loadProverPessoas(args.file!);
      const pessoasUuids = new Set(pessoas.map((p) => p.pessoa_uuid).filter(Boolean));
      const report = await buildSanitizationReport(prisma, { tenantId: tenant.id, participantes, visitantes, pessoasUuids });
      const outDir = path.resolve(process.cwd(), "tmp", "prover-reports");
      const paths = writeSanitizationReport(report, outDir);

      const gcAfter2 = await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } });
      console.log("  " + "-".repeat(56));
      console.log(line("Múltiplos GCs ativos (pessoas)", report.summary.multipleActiveGcsPersons));
      console.log(line("Duplicidades CONFLITANTES", report.summary.duplicateConflicts));
      console.log(line("Vínculos não mapeados / uuids distintos", `${report.summary.unmappedLinks} / ${report.summary.unmappedDistinctUuids}`));
      console.log(line("  uuids ÓRFÃOS (fora de pessoas.json)", report.summary.orphanUuids));
      console.log(line("  uuids FALHA DE IMPORTAÇÃO (em pessoas.json)", report.summary.importFailureUuids));
      console.log(line("GrowthGroupMembership após relatório", `${gcAfter2} (inalterado)`));
      // exemplos anonimizados (sem PII no terminal)
      const ex = report.multipleActiveGcs[0];
      if (ex) console.log(`  ex (multi-GC): ${mask(ex.name)} · ${ex.activeGcs.length} GCs ativos · ${ex.suggestion}`);
      const exD = report.duplicateConflicts[0];
      if (exD) console.log(`  ex (dup): ${mask(exD.name)} · GC ${exD.gcName.slice(0, 18)} · ${exD.rows.length} linhas · ${exD.suggestion}`);
      console.log("  Arquivos gerados (FORA do git):");
      console.log(`    ${paths.summaryPath}`);
      console.log(`    ${paths.jsonPath}`);
      console.log(`    ${paths.csvPath}\n`);
    }
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
