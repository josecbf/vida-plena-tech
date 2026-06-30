/**
 * CLI — Importador Prover, Fase 3B.1, RELATÓRIO de pendências de vínculos de GC.
 *
 *   pnpm prover:gc-memberships:conflicts-report [--file ./data/export.zip]
 *
 * SOMENTE LEITURA. Consolida MULTIPLE_ACTIVE_GCS, DUPLICATE_MEMBERSHIP_CONFLICT,
 * ACTIVE_MEMBERSHIP_IN_INACTIVE_GC e PERSON_MAPPING_NOT_FOUND a partir do que já
 * está persistido (ImportBatchItem do último apply) + estado do banco. NÃO altera
 * nada. Grava relatório FORA do git (tmp/prover-reports/). --file é opcional
 * (mantido por compatibilidade; o relatório usa os dados já importados).
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildConflictReport, writeConflictReport } from "../src/modules/integrations/prover/gc-membership-conflicts";

function parseArgs(argv: string[]) {
  const out: { tenant?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tenant" || a === "-t") out.tenant = argv[++i];
    else if (a === "--file" || a === "-f") i++; // aceito mas ignorado
  }
  return out;
}

function mask(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  return parts.map((p, i) => (i === 0 ? p : (p[0] ?? "") + ".")).join(" ") || "—";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ Relatório de pendências de vínculos de GC (READ-ONLY) — tenant: ${tenant.name}`);
    const gccBefore = await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } });
    const report = await buildConflictReport(prisma, { tenantId: tenant.id });
    const gccAfter = await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } });

    const outDir = path.resolve(process.cwd(), "tmp", "prover-reports");
    const paths = writeConflictReport(report, outDir);
    const s = report.summary;

    const line = (l: string, v: string | number) => `  ${l.padEnd(50, ".")} ${v}`;
    console.log("═".repeat(64));
    console.log("  PENDÊNCIAS DE VÍNCULOS DE GC (Fase 3B.1)");
    console.log("═".repeat(64));
    console.log(line("A. MULTIPLE_ACTIVE_GCS (pessoas / vínculos)", `${s.multipleActiveGcsPersons} / ${s.multipleActiveGcsLinks}`));
    console.log(line("B. DUPLICATE_MEMBERSHIP_CONFLICT (conflitos)", s.duplicateConflicts));
    console.log(line("C. ACTIVE_MEMBERSHIP_IN_INACTIVE_GC", s.activeInInactiveGc));
    console.log(line("D. PERSON_MAPPING_NOT_FOUND", s.personMappingNotFound));
    console.log(line("TOTAL de pendências", s.total));
    console.log(line("Lote de origem (ImportBatch)", report.batchId ?? "—"));
    console.log("═".repeat(64));
    console.log(line("GrowthGroupMembership ANTES → DEPOIS", `${gccBefore} → ${gccAfter} (inalterado)`));
    console.log("═".repeat(64));

    // exemplos anonimizados (sem PII no terminal)
    const exA = report.multipleActiveGcs[0];
    if (exA) console.log(`  ex A: ${mask(exA.name)} · ${exA.gcs.length} GCs ativos · ${exA.suggestion}`);
    const exB = report.duplicateConflicts[0];
    if (exB) console.log(`  ex B: ${mask(exB.name)} · GC ${exB.gcName.slice(0, 18)} · ${exB.rows.length} linhas · ${exB.suggestion}`);
    const exC = report.activeInInactiveGc[0];
    if (exC) console.log(`  ex C: ${mask(exC.name)} · GC ${exC.gcName.slice(0, 18)} (inativo) · ${exC.suggestion}`);
    const exD = report.personMappingNotFound[0];
    if (exD) console.log(`  ex D: uuid ${exD.pessoaUuid.slice(0, 8)}… · ${exD.candidates.length} candidato(s) · ${exD.suggestion}`);

    console.log("  Arquivos gerados (FORA do git):");
    console.log(`    ${paths.jsonPath}`);
    console.log(`    ${paths.csvPath}\n`);
    console.log("  Rota administrativa (read-only): /prover/gc-memberships/conflicts\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
