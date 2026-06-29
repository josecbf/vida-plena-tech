/**
 * CLI — Importador Prover, Fase 3A.2, RECONCILIAÇÃO de ExternalMapping de Pessoas (DRY-RUN).
 *
 *   pnpm prover:people:mapping-reconcile:dry-run --file ./data/export_prover_2026-06-27.zip
 *
 * Analisa pessoas referenciadas em vínculos de GC, presentes em pessoas.json, mas
 * SEM ExternalMapping. Diagnostica o motivo e sugere CREATE_MAPPING/REVIEW_MANUALLY/
 * SKIP. SOMENTE LEITURA: não cria mapping, Person, status, User, Role. Grava
 * relatório FORA do git (tmp/prover-reports/).
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadProverPessoas, loadProverGcParticipants, loadProverGcVisitors } from "../src/modules/integrations/prover/zip";
import { analyzePersonMappingReconcile, writeReconcileReport } from "../src/modules/integrations/prover/person-mapping-reconcile";

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

function mask(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  return parts.map((p, i) => (i === 0 ? p : (p[0] ?? "") + ".")).join(" ") || "—";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("Uso: pnpm prover:people:mapping-reconcile:dry-run --file <export.zip>");
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ Reconciliação de mappings (DRY-RUN) — lendo: ${args.file}`);
    const { pessoas } = loadProverPessoas(args.file);
    const { participantes } = loadProverGcParticipants(args.file);
    const { visitantes } = loadProverGcVisitors(args.file);
    console.log(`  pessoas: ${pessoas.length} · participantes: ${participantes.length} · visitantes: ${visitantes.length}`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  Modo: DRY-RUN — nenhum mapping/Person/status será criado ou alterado.\n`);

    const before = {
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "person" } }),
    };
    const analysis = await analyzePersonMappingReconcile(prisma, { tenantId: tenant.id, pessoas, participantes, visitantes });
    const after = {
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "person" } }),
    };

    const outDir = path.resolve(process.cwd(), "tmp", "prover-reports");
    const paths = writeReconcileReport(analysis, outDir);
    const s = analysis.summary;

    const line = (l: string, v: string | number) => `  ${l.padEnd(48, ".")} ${v}`;
    console.log("═".repeat(62));
    console.log("  RELATÓRIO DRY-RUN — Reconciliação de mappings (Fase 3A.2)");
    console.log("═".repeat(62));
    console.log(line("UUIDs referenciados em vínculos / não mapeados", `${s.referencedUuids} / ${s.referencedUnmapped}`));
    console.log(line("Alvo (não mapeados ∩ em pessoas.json)", s.inPessoasJson));
    console.log("  " + "-".repeat(58));
    console.log(line("CPF válido / inválido / placeholder / ausente", `${s.cpfValid} / ${s.cpfInvalid} / ${s.cpfPlaceholder} / ${s.cpfMissing}`));
    console.log("  " + "-".repeat(58));
    console.log(line("Confiança SAFE / POSSIBLE / UNSAFE", `${s.safe} / ${s.possible} / ${s.unsafe}`));
    console.log(line("Ação CREATE_MAPPING / REVIEW_MANUALLY / SKIP", `${s.createMapping} / ${s.reviewManually} / ${s.skip}`));
    console.log("═".repeat(62));
    console.log(line("Person ANTES → DEPOIS", `${before.person} → ${after.person} (inalterado)`));
    console.log(line("ExternalMapping(person) ANTES → DEPOIS", `${before.map} → ${after.map} (inalterado)`));
    console.log("═".repeat(62));

    // exemplos anonimizados (sem PII sensível no terminal)
    const exSafe = analysis.rows.find((r) => r.recommendedAction === "CREATE_MAPPING");
    if (exSafe) console.log(`  ex (SAFE): ${mask(exSafe.proverName)} · ${exSafe.probableReason} · via ${exSafe.resolvedVia} → CREATE_MAPPING`);
    const exReview = analysis.rows.find((r) => r.recommendedAction === "REVIEW_MANUALLY");
    if (exReview) console.log(`  ex (REVIEW): ${mask(exReview.proverName)} · ${exReview.confidence} · ${exReview.warnings.join(",") || "—"}`);
    const exSkip = analysis.rows.find((r) => r.recommendedAction === "SKIP");
    if (exSkip) console.log(`  ex (SKIP): ${mask(exSkip.proverName)} · ${exSkip.probableReason}`);
    console.log("  Arquivos gerados (FORA do git):");
    console.log(`    ${paths.jsonPath}`);
    console.log(`    ${paths.csvPath}\n`);

    if (s.createMapping > 0) {
      console.log(`  → Há ${s.createMapping} caso(s) SEGURO(s). Para aplicar SOMENTE o ExternalMapping:`);
      console.log(`    pnpm prover:people:mapping-reconcile:apply --file ${args.file} --confirm APPLY\n`);
    } else {
      console.log("  → Nenhum caso seguro para apply automático nesta rodada.\n");
    }
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
