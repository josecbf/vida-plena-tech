/**
 * CLI — Importador Prover, Fase 5B.2, APPLY de INSCRIÇÕES de evento.
 *
 *   pnpm prover:event-registrations:apply --file ./data/export.zip --limit 500 --confirm APPLY
 *   pnpm prover:event-registrations:apply --file ./data/export.zip --confirm APPLY   (FULL)
 *
 * Cria EventRegistration. Exige --confirm APPLY. Pagamento/lote PRESERVADOS em
 * metadata (sem financeiro). NÃO cria presença, NÃO altera Event/Person/status/User/Role.
 */
import { PrismaClient } from "@prisma/client";
import { loadProverEventRegistrations } from "../src/modules/integrations/prover/zip";
import { runEventRegistrationsApply } from "../src/modules/integrations/prover/event-registrations-apply";

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
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria inscrições).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:event-registrations:apply --file ./data/export.zip --limit 500 --confirm APPLY\n" +
        "  (Para só analisar, use: pnpm prover:events:dry-run --file <...>)\n",
    );
    process.exit(2);
  }
  if (!args.file) { console.error("Uso: pnpm prover:event-registrations:apply --file <export.zip> [--limit N] --confirm APPLY"); process.exit(2); }
  if (args.limit !== undefined && (!Number.isFinite(args.limit) || args.limit <= 0)) { console.error("--limit deve ser um inteiro positivo."); process.exit(2); }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ APPLY de INSCRIÇÕES de evento — lendo: ${args.file}`);
    const { registrations } = loadProverEventRegistrations(args.file);
    const planned = args.limit ? Math.min(args.limit, registrations.length) : registrations.length;
    console.log(`  inscrições: ${registrations.length} · aplicando ${planned}${args.limit ? ` (--limit ${args.limit})` : " (TUDO)"}`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  ⚠ MODO APPLY — cria EventRegistration; pagamento/lote só em metadata; NÃO cria presença.\n`);

    const cnt = async () => ({
      reg: await prisma.eventRegistration.count({ where: { tenantId: tenant.id } }),
      map: await prisma.externalMapping.count({ where: { tenantId: tenant.id, system: "PROVER", externalType: "event_registration" } }),
      event: await prisma.event.count({ where: { tenantId: tenant.id } }),
      session: await prisma.eventSession.count({ where: { tenantId: tenant.id } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
      member: await prisma.person.count({ where: { tenantId: tenant.id, status: "MEMBER" } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    });
    const before = await cnt();

    const r = await runEventRegistrationsApply(prisma, { tenantId: tenant.id, fileName: "inscrições", registrations, limit: args.limit });

    const after = await cnt();
    const line = (l: string, v: string | number) => `  ${l.padEnd(48, ".")} ${v}`;
    const flag = (a: number, b: number) => (a === b ? "(inalterado ✓)" : "(ALTEROU!)");
    console.log("═".repeat(62));
    console.log("  APPLY — Inscrições de evento (Fase 5B.2)");
    console.log("═".repeat(62));
    console.log(line("Inscrições lidas (processadas)", r.read));
    console.log(line("Criadas / Vinculadas / Puladas / Falhas", `${r.created} / ${r.updated} / ${r.skipped} / ${r.failed}`));
    console.log(line("Evento resolvido / não resolvido", `${r.eventResolved} / ${r.eventNotFound}`));
    console.log(line("Pessoa resolvida / não resolvida", `${r.personResolved} / ${r.personNotFound}`));
    console.log(line("Duplicidade simples / conflitante", `${r.duplicateSimple} / ${r.duplicateConflict}`));
    console.log(line("Já importado (idempotente)", r.alreadyImported));
    console.log(line("Pagamento/lote detectado / preservado (metadata)", `${r.paymentDetected} / ${r.paymentPreserved}`));
    console.log("═".repeat(62));
    console.log(line("EventRegistration ANTES → DEPOIS", `${before.reg} → ${after.reg}`));
    console.log(line("ExternalMapping(event_registration) A → D", `${before.map} → ${after.map}`));
    console.log(line("Event ANTES → DEPOIS", `${before.event} → ${after.event} ${flag(before.event, after.event)}`));
    console.log(line("EventSession ANTES → DEPOIS", `${before.session} → ${after.session} ${flag(before.session, after.session)}`));
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
