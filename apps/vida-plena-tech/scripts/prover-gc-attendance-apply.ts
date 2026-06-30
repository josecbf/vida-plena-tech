/**
 * CLI — Importador Prover, Fase 4B.2, APPLY de PRESENÇAS de GC.
 *
 *   pnpm prover:gc-attendance:apply --file ./data/export.zip --limit 200 --confirm APPLY
 *   pnpm prover:gc-attendance:apply --file ./data/export.zip --confirm APPLY   (FULL)
 *
 * Cria GrowthGroupAttendance (participantes + visitantes). Exige --confirm APPLY.
 * NÃO cria/altera membership/Person/status, NÃO altera encontro, NÃO cria User/Role.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverGcMeetingParticipants, loadProverGcMeetingVisitors } from "../src/modules/integrations/prover/zip";
import { runGcAttendanceApply } from "../src/modules/integrations/prover/gc-attendance-apply";

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
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria presenças).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:gc-attendance:apply --file ./data/export.zip --limit 200 --confirm APPLY\n" +
        "  (Para só analisar, use: pnpm prover:gc-meetings:dry-run --file <...>)\n",
    );
    process.exit(2);
  }
  if (!args.file) {
    console.error("Uso: pnpm prover:gc-attendance:apply --file <export.zip> [--limit N] --confirm APPLY");
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

    console.log(`\n▶ APPLY de PRESENÇAS de GC — lendo: ${args.file}`);
    const { participants } = loadProverGcMeetingParticipants(args.file);
    const { visitors } = loadProverGcMeetingVisitors(args.file);
    const total = participants.length + visitors.length;
    const planned = args.limit ? Math.min(args.limit, total) : total;
    console.log(`  participantes: ${participants.length} · visitantes: ${visitors.length} · aplicando ${planned}${args.limit ? ` (--limit ${args.limit})` : " (TUDO)"}.`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  ⚠ MODO APPLY — cria presenças; NÃO cria/altera membership; visitante NÃO vira membro.\n`);

    const before = {
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "growth_group_attendance" } }),
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tenant.id } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      member: await prisma.person.count({ where: { tenantId: tenant.id, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    };

    const r = await runGcAttendanceApply(prisma, { tenantId: tenant.id, fileName: "presenças", participants, visitors, limit: args.limit });

    const after = {
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "growth_group_attendance" } }),
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tenant.id } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      member: await prisma.person.count({ where: { tenantId: tenant.id, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    };

    const line = (l: string, v: string | number) => `  ${l.padEnd(46, ".")} ${v}`;
    const flag = (a: number, b: number) => (a === b ? "(inalterado ✓)" : "(ALTEROU!)");
    console.log("═".repeat(62));
    console.log("  APPLY — Presenças de GC (Fase 4B.2)");
    console.log("═".repeat(62));
    console.log(line("Participantes / Visitantes (arquivo)", `${r.participantRowsRead} / ${r.visitorRowsRead}`));
    console.log(line("Processados (após --limit)", r.processed));
    console.log(line("Criados / Atualizados / Pulados / Falhas", `${r.created} / ${r.updated} / ${r.skipped} / ${r.failed}`));
    console.log(line("Presentes / Ausentes", `${r.present} / ${r.absent}`));
    console.log(line("Participantes criados / Visitantes criados", `${r.participantsCreated} / ${r.visitorsCreated}`));
    console.log("  " + "-".repeat(58));
    console.log("  PULADOS / WARNINGS:");
    console.log(line("    presenca=null", r.presencaNullSkipped));
    console.log(line("    encontro não resolvido", r.meetingNotFound));
    console.log(line("    pessoa não resolvida", r.personNotFound));
    console.log(line("    sem membership", r.withoutMembership));
    console.log(line("    fora do período do membership", r.outsideRange));
    console.log(line("    mismatch de GC", r.groupMismatch));
    console.log(line("    duplicidade simples / conflitante", `${r.duplicateSimple} / ${r.duplicateConflict}`));
    console.log(line("    já importado (idempotente)", r.alreadyImported));
    console.log("═".repeat(62));
    console.log(line("GrowthGroupAttendance ANTES → DEPOIS", `${before.att} → ${after.att}`));
    console.log(line("ExternalMapping(attendance) ANTES → DEPOIS", `${before.map} → ${after.map}`));
    console.log(line("GrowthGroupMeeting ANTES → DEPOIS", `${before.meeting} → ${after.meeting} ${flag(before.meeting, after.meeting)}`));
    console.log(line("GrowthGroupMembership ANTES → DEPOIS", `${before.gcc} → ${after.gcc} ${flag(before.gcc, after.gcc)}`));
    console.log(line("Person ANTES → DEPOIS", `${before.person} → ${after.person} ${flag(before.person, after.person)}`));
    console.log(line("Person status=MEMBER ANTES → DEPOIS", `${before.member} → ${after.member} ${flag(before.member, after.member)}`));
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
