/**
 * CLI — Importador Prover, Fase 3A.2, APPLY de RECONCILIAÇÃO de ExternalMapping de Pessoas.
 *
 *   pnpm prover:people:mapping-reconcile:apply --file ./data/export.zip --confirm APPLY
 *
 * Cria SOMENTE ExternalMapping para os casos SEGUROS (CREATE_MAPPING). Exige
 * --confirm APPLY. NUNCA cria/altera Person, status, User, RoleAssignment, nem
 * GrowthGroupMembership. Idempotente: rodar 2x cria 0 duplicados.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverPessoas, loadProverGcParticipants, loadProverGcVisitors } from "../src/modules/integrations/prover/zip";
import { applyPersonMappingReconcile } from "../src/modules/integrations/prover/person-mapping-reconcile";

function parseArgs(argv: string[]) {
  const out: { file?: string; tenant?: string; confirm?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" || a === "-f") out.file = argv[++i];
    else if (a === "--tenant" || a === "-t") out.tenant = argv[++i];
    else if (a === "--confirm") out.confirm = argv[++i];
    else if (!a.startsWith("-") && !out.file) out.file = a;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.confirm !== "APPLY") {
    console.error(
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria ExternalMapping).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:people:mapping-reconcile:apply --file ./data/export.zip --confirm APPLY\n" +
        "  (Para só analisar, use: pnpm prover:people:mapping-reconcile:dry-run --file <...>)\n",
    );
    process.exit(2);
  }
  if (!args.file) {
    console.error("Uso: pnpm prover:people:mapping-reconcile:apply --file <export.zip> --confirm APPLY");
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ APPLY reconciliação de mappings — lendo: ${args.file}`);
    const { pessoas, sourceFileHash } = loadProverPessoas(args.file);
    const { participantes } = loadProverGcParticipants(args.file);
    const { visitantes } = loadProverGcVisitors(args.file);
    console.log(`  pessoas: ${pessoas.length} · participantes: ${participantes.length} · visitantes: ${visitantes.length}`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  ⚠ MODO APPLY — cria SOMENTE ExternalMapping para casos SEGUROS.\n`);

    const before = {
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "person" } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
    };

    const { report } = await applyPersonMappingReconcile(prisma, {
      tenantId: tenant.id, fileName: "pessoas+vínculos (reconcile)", pessoas, participantes, visitantes, sourceFileHash,
    });

    const after = {
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "person" } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
    };

    const line = (l: string, v: string | number) => `  ${l.padEnd(48, ".")} ${v}`;
    console.log("═".repeat(62));
    console.log("  RELATÓRIO APPLY — Reconciliação de mappings (Fase 3A.2)");
    console.log("═".repeat(62));
    console.log(line("Analisados (alvo)", report.analyzed));
    console.log(line("SAFE (CREATE_MAPPING)", report.safe));
    console.log(line("Mappings CRIADOS", report.created));
    console.log(line("Já mapeados (idempotente, no-op)", report.alreadyMapped));
    console.log(line("Conflitos no apply (abortados)", report.conflictsAtApply));
    console.log(line("Pulados (UNSAFE, fora do apply)", report.skippedUnsafe));
    console.log(line("Falhas", report.failed));
    console.log("═".repeat(62));
    console.log(line("Person ANTES → DEPOIS", `${before.person} → ${after.person} ${before.person === after.person ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("ExternalMapping(person) ANTES → DEPOIS", `${before.map} → ${after.map}`));
    console.log(line("User ANTES → DEPOIS", `${before.user} → ${after.user} ${before.user === after.user ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("RoleAssignment ANTES → DEPOIS", `${before.role} → ${after.role} ${before.role === after.role ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("GrowthGroupMembership ANTES → DEPOIS", `${before.gcc} → ${after.gcc} ${before.gcc === after.gcc ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("ImportBatch (mode APPLY)", report.batchId));
    console.log("═".repeat(62) + "\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
