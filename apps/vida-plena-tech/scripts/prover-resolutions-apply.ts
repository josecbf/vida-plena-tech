/**
 * CLI — Fase 3B.3, APPLY das resoluções APROVADAS (READY_TO_APPLY).
 *
 *   pnpm prover:gc-memberships:resolutions:apply --confirm APPLY [--type X] [--conflict-key K] [--limit N]
 *
 * Aplica SOMENTE decisões READY_TO_APPLY, decisão por decisão em transação,
 * idempotente (marca APPLIED após sucesso). Exige --confirm APPLY. NÃO promove a
 * MEMBER, não altera status, não cria User/RoleAssignment, não importa encontros.
 */
import { PrismaClient } from "@prisma/client";
import { applyResolutions } from "../src/modules/integrations/prover/resolution-apply";

function parseArgs(argv: string[]) {
  const out: { tenant?: string; type?: string; conflictKey?: string; limit?: number; confirm?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tenant" || a === "-t") out.tenant = argv[++i];
    else if (a === "--type") out.type = argv[++i];
    else if (a === "--conflict-key") out.conflictKey = argv[++i];
    else if (a === "--limit" || a === "-l") out.limit = parseInt(argv[++i], 10);
    else if (a === "--confirm") out.confirm = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.confirm !== "APPLY") {
    console.error(
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (aplica decisões).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:gc-memberships:resolutions:apply --confirm APPLY\n" +
        "  (Para só analisar, use: pnpm prover:gc-memberships:resolutions:dry-run)\n",
    );
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ APPLY resoluções READY_TO_APPLY — tenant: ${tenant.name}`);
    const before = {
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "person" } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      member: await prisma.person.count({ where: { tenantId: tenant.id, status: "MEMBER" } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
    };

    const r = await applyResolutions(prisma, { tenantId: tenant.id, type: args.type, conflictKey: args.conflictKey, limit: args.limit });

    const after = {
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "person" } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      member: await prisma.person.count({ where: { tenantId: tenant.id, status: "MEMBER" } }),
      user: await prisma.user.count(),
      role: await prisma.roleAssignment.count(),
    };

    const line = (l: string, v: string | number) => `  ${l.padEnd(44, ".")} ${v}`;
    const flag = (a: number, b: number) => (a === b ? "(inalterado ✓)" : "(ALTEROU!)");
    console.log("═".repeat(60));
    console.log("  APPLY — Resoluções de conflito (Fase 3B.3)");
    console.log("═".repeat(60));
    console.log(line("READY_TO_APPLY / Aplicáveis / SKIP_UNSAFE", `${r.readyToApply} / ${r.applicable} / ${r.skipUnsafe}`));
    console.log(line("Aplicadas (APPLIED) / Falhas", `${r.applied} / ${r.failed}`));
    console.log(line("Memberships criados / encerrados", `${r.membershipsCreated} / ${r.membershipsClosed}`));
    console.log(line("Alias ExternalMapping criados", r.aliasMappingsCreated));
    console.log(line("Ignorados (IGNORE_DUPLICATE)", r.ignored));
    console.log("═".repeat(60));
    console.log(line("GrowthGroupMembership ANTES → DEPOIS", `${before.gcc} → ${after.gcc}`));
    console.log(line("ExternalMapping(person) ANTES → DEPOIS", `${before.map} → ${after.map}`));
    console.log(line("Person ANTES → DEPOIS", `${before.person} → ${after.person} ${flag(before.person, after.person)}`));
    console.log(line("Person status=MEMBER ANTES → DEPOIS", `${before.member} → ${after.member} ${flag(before.member, after.member)}`));
    console.log(line("User ANTES → DEPOIS", `${before.user} → ${after.user} ${flag(before.user, after.user)}`));
    console.log(line("RoleAssignment ANTES → DEPOIS", `${before.role} → ${after.role} ${flag(before.role, after.role)}`));
    console.log(line("ImportBatch (resoluções)", r.batchId ?? "—"));
    console.log("═".repeat(60) + "\n");
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
