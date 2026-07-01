/**
 * CLI — Importador Prover, Fase 5B.1, APPLY de EVENTOS + SESSÕES.
 *
 *   pnpm prover:events:apply --file ./data/export.zip --limit 100 --confirm APPLY
 *   pnpm prover:events:apply --file ./data/export.zip --confirm APPLY   (FULL)
 *
 * Cria/atualiza Event + EventSession. Exige --confirm APPLY. NÃO cria inscrições/
 * presenças, NÃO importa pagamento, NÃO altera Person/status/User/Role.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverEvents, loadProverEventSessions } from "../src/modules/integrations/prover/zip";
import { runEventsApply } from "../src/modules/integrations/prover/events-apply";

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
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria/atualiza eventos+sessões).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:events:apply --file ./data/export.zip --limit 100 --confirm APPLY\n" +
        "  (Para só analisar, use: pnpm prover:events:dry-run --file <...>)\n",
    );
    process.exit(2);
  }
  if (!args.file) { console.error("Uso: pnpm prover:events:apply --file <export.zip> [--limit N] --confirm APPLY"); process.exit(2); }
  if (args.limit !== undefined && (!Number.isFinite(args.limit) || args.limit <= 0)) { console.error("--limit deve ser um inteiro positivo."); process.exit(2); }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ APPLY de EVENTOS + SESSÕES — lendo: ${args.file}`);
    const { events, sourceFileHash } = loadProverEvents(args.file);
    const { sessions } = loadProverEventSessions(args.file);
    const pE = args.limit ? Math.min(args.limit, events.length) : events.length;
    const pS = args.limit ? Math.min(args.limit, sessions.length) : sessions.length;
    console.log(`  eventos: ${events.length} (aplicando ${pE}) · sessões: ${sessions.length} (aplicando ${pS})${args.limit ? ` [--limit ${args.limit}]` : " (TUDO)"}`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  ⚠ MODO APPLY — cria/atualiza Event+EventSession; NÃO cria inscrição/presença.\n`);

    const cnt = async () => ({
      event: await prisma.event.count({ where: { tenantId: tenant.id } }),
      session: await prisma.eventSession.count({ where: { tenantId: tenant.id } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tenant.id } }),
      mapE: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "event" } }),
      mapS: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "event_session" } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    });
    const before = await cnt();

    const r = await runEventsApply(prisma, { tenantId: tenant.id, fileName: "eventos+sessões", events, sessions, sourceFileHash, limit: args.limit });

    const after = await cnt();
    const line = (l: string, v: string | number) => `  ${l.padEnd(46, ".")} ${v}`;
    const flag = (a: number, b: number) => (a === b ? "(inalterado ✓)" : "(ALTEROU!)");
    console.log("═".repeat(62));
    console.log("  APPLY — Eventos + Sessões (Fase 5B.1)");
    console.log("═".repeat(62));
    console.log(line("Eventos lidos / Sessões lidas", `${r.eventsRead} / ${r.sessionsRead}`));
    console.log(line("Eventos criados / Sessões criadas", `${r.eventsCreated} / ${r.sessionsCreated}`));
    console.log(line("Atualizados / Pulados / Falhas", `${r.updated} / ${r.skipped} / ${r.failed}`));
    console.log(line("Eventos sem título / sem data", `${r.eventsWithoutTitle} / ${r.eventsWithoutDate}`));
    console.log(line("Sessões sem evento pai / sem data", `${r.sessionsWithoutParent} / ${r.sessionsWithoutDate}`));
    console.log("═".repeat(62));
    console.log(line("Event ANTES → DEPOIS", `${before.event} → ${after.event}`));
    console.log(line("EventSession ANTES → DEPOIS", `${before.session} → ${after.session}`));
    console.log(line("ExternalMapping(event) ANTES → DEPOIS", `${before.mapE} → ${after.mapE}`));
    console.log(line("ExternalMapping(event_session) A → D", `${before.mapS} → ${after.mapS}`));
    console.log(line("EventRegistration ANTES → DEPOIS", `${before.reg} → ${after.reg} ${flag(before.reg, after.reg)}`));
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
