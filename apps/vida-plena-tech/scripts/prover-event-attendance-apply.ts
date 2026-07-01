/**
 * CLI — Importador Prover, Fase 5B.3, APPLY de PRESENÇAS de evento.
 *
 *   pnpm prover:event-attendance:apply --file ./data/export.zip --limit 500 --confirm APPLY
 *   pnpm prover:event-attendance:apply --file ./data/export.zip --confirm APPLY   (FULL)
 *
 * Cria EventAttendance. Exige --confirm APPLY. NÃO altera Event/EventSession/
 * EventRegistration/Person/status, NÃO cria User/Role, NÃO cria financeiro.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverEventAttendances } from "../src/modules/integrations/prover/zip";
import { runEventAttendanceApply } from "../src/modules/integrations/prover/event-attendance-apply";

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
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria presenças de evento).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:event-attendance:apply --file ./data/export.zip --limit 500 --confirm APPLY\n",
    );
    process.exit(2);
  }
  if (!args.file) { console.error("Uso: pnpm prover:event-attendance:apply --file <export.zip> [--limit N] --confirm APPLY"); process.exit(2); }
  if (args.limit !== undefined && (!Number.isFinite(args.limit) || args.limit <= 0)) { console.error("--limit deve ser um inteiro positivo."); process.exit(2); }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ APPLY de PRESENÇAS de evento — lendo: ${args.file}`);
    const { attendances } = loadProverEventAttendances(args.file);
    const planned = args.limit ? Math.min(args.limit, attendances.length) : attendances.length;
    console.log(`  presenças: ${attendances.length} · aplicando ${planned}${args.limit ? ` (--limit ${args.limit})` : " (TUDO)"}`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  ⚠ MODO APPLY — cria EventAttendance; NÃO altera inscrição/pessoa; sem financeiro.\n`);

    const cnt = async () => ({
      att: await prisma.eventAttendance.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "event_attendance" } }),
      event: await prisma.event.count({ where: { tenantId: tenant.id } }),
      session: await prisma.eventSession.count({ where: { tenantId: tenant.id } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tenant.id } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      member: await prisma.person.count({ where: { tenantId: tenant.id, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    });
    const before = await cnt();

    const r = await runEventAttendanceApply(prisma, { tenantId: tenant.id, fileName: "presenças de evento", attendances, limit: args.limit });

    const after = await cnt();
    const line = (l: string, v: string | number) => `  ${l.padEnd(48, ".")} ${v}`;
    const flag = (a: number, b: number) => (a === b ? "(inalterado ✓)" : "(ALTEROU!)");
    console.log("═".repeat(62));
    console.log("  APPLY — Presenças de evento (Fase 5B.3)");
    console.log("═".repeat(62));
    console.log(line("Presenças processadas", r.read));
    console.log(line("Criadas / Atualizadas / Puladas / Falhas", `${r.created} / ${r.updated} / ${r.skipped} / ${r.failed}`));
    console.log(line("Presentes / Ausentes / Unknown", `${r.present} / ${r.absent} / ${r.unknown}`));
    console.log(line("Sessão resolvida / não resolvida", `${r.sessionResolved} / ${r.sessionNotFound}`));
    console.log(line("Pessoa resolvida / não resolvida", `${r.personResolved} / ${r.personNotFound}`));
    console.log(line("Inscrição resolvida / não / ambígua", `${r.registrationResolved} / ${r.registrationNotFound} / ${r.registrationAmbiguous}`));
    console.log(line("Duplicidade simples / conflitante", `${r.duplicateSimple} / ${r.duplicateConflict}`));
    console.log(line("Já importado (idempotente)", r.alreadyImported));
    console.log("═".repeat(62));
    console.log(line("EventAttendance ANTES → DEPOIS", `${before.att} → ${after.att}`));
    console.log(line("ExternalMapping(event_attendance) A → D", `${before.map} → ${after.map}`));
    console.log(line("Event ANTES → DEPOIS", `${before.event} → ${after.event} ${flag(before.event, after.event)}`));
    console.log(line("EventSession ANTES → DEPOIS", `${before.session} → ${after.session} ${flag(before.session, after.session)}`));
    console.log(line("EventRegistration ANTES → DEPOIS", `${before.reg} → ${after.reg} ${flag(before.reg, after.reg)}`));
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
