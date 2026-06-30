/**
 * CLI — Importador Prover, Fase 4B.1, APPLY de ENCONTROS de GC (somente encontros).
 *
 *   pnpm prover:gc-meetings:apply --file ./data/export.zip --limit 100 --confirm APPLY
 *   pnpm prover:gc-meetings:apply --file ./data/export.zip --confirm APPLY   (FULL)
 *
 * Cria/atualiza GrowthGroupMeeting (status preservado). Exige --confirm APPLY.
 * NÃO cria presença, NÃO altera membership/Person/status, NÃO cria User/Role.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverGcMeetings } from "../src/modules/integrations/prover/zip";
import { runGcMeetingsApply } from "../src/modules/integrations/prover/gc-meetings-apply";

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
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria/atualiza encontros).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:gc-meetings:apply --file ./data/export.zip --limit 100 --confirm APPLY\n" +
        "  (Para só analisar, use: pnpm prover:gc-meetings:dry-run --file <...>)\n",
    );
    process.exit(2);
  }
  if (!args.file) {
    console.error("Uso: pnpm prover:gc-meetings:apply --file <export.zip> [--limit N] --confirm APPLY");
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

    console.log(`\n▶ APPLY de ENCONTROS de GC — lendo: ${args.file}`);
    const { meetings, sourceFileHash } = loadProverGcMeetings(args.file);
    const planned = args.limit ? Math.min(args.limit, meetings.length) : meetings.length;
    console.log(`  encontros: ${meetings.length} · aplicando ${planned}${args.limit ? ` (--limit ${args.limit})` : " (TUDO)"}.`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  ⚠ MODO APPLY — cria/atualiza encontros; NÃO cria presença.\n`);

    const before = {
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tenant.id } }),
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tenant.id } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "growth_group_meeting" } }),
    };

    const r = await runGcMeetingsApply(prisma, { tenantId: tenant.id, fileName: "encontros", meetings, sourceFileHash, limit: args.limit });

    const after = {
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tenant.id } }),
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tenant.id } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "growth_group_meeting" } }),
    };

    const line = (l: string, v: string | number) => `  ${l.padEnd(46, ".")} ${v}`;
    const flag = (a: number, b: number) => (a === b ? "(inalterado ✓)" : "(ALTEROU!)");
    console.log("═".repeat(62));
    console.log("  APPLY — Encontros de GC (Fase 4B.1)");
    console.log("═".repeat(62));
    console.log(line("Lidos (processados)", r.totalRead));
    console.log(line("Criados / Atualizados / Pulados / Falhas", `${r.created} / ${r.updated} / ${r.skipped} / ${r.failed}`));
    console.log(line("Realizados / Agendados / Cancelados / Desconh.", `${r.held} / ${r.scheduled} / ${r.canceled} / ${r.unknown}`));
    console.log(line("GC resolvido / NÃO resolvido", `${r.gcResolved} / ${r.gcNotFound}`));
    console.log(line("Em GC inativo / Duplicados (GC/data)", `${r.inInactiveGc} / ${r.duplicateSameGcDate}`));
    console.log("═".repeat(62));
    console.log(line("GrowthGroupMeeting ANTES → DEPOIS", `${before.meeting} → ${after.meeting}`));
    console.log(line("ExternalMapping(meeting) ANTES → DEPOIS", `${before.map} → ${after.map}`));
    console.log(line("GrowthGroupAttendance ANTES → DEPOIS", `${before.att} → ${after.att} ${flag(before.att, after.att)}`));
    console.log(line("GrowthGroupMembership ANTES → DEPOIS", `${before.gcc} → ${after.gcc} ${flag(before.gcc, after.gcc)}`));
    console.log(line("Person ANTES → DEPOIS", `${before.person} → ${after.person} ${flag(before.person, after.person)}`));
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
