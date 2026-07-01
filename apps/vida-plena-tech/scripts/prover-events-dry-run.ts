/**
 * CLI — Importador Prover, Fase 5A, DRY-RUN de EVENTOS.
 *
 *   pnpm prover:events:dry-run --file ./data/export_prover_2026-06-27.zip
 *
 * Lê evento_eventos.json + evento_encontros_eventos.json +
 * evento_inscritos_eventos.json + evento_presenca_eventos.json. Resolve pessoa
 * por ExternalMapping, entende a relação evento/sessão/inscrição/presença e
 * detecta conflitos. NÃO cria Event/EventRegistration/presença reais, NÃO cria
 * ExternalMapping(event), NÃO altera Person/User/Role. Pagamento/lote apenas
 * documentados. Relatório FORA do git (tmp/prover-reports/).
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  loadProverEvents, loadProverEventSessions, loadProverEventRegistrations, loadProverEventAttendances, countProverEntry,
} from "../src/modules/integrations/prover/zip";
import { runEventsDryRun } from "../src/modules/integrations/prover/events-dry-run";

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) { console.error("Uso: pnpm prover:events:dry-run --file <export.zip>"); process.exit(2); }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ DRY-RUN de EVENTOS — lendo: ${args.file}`);
    const { events, sourceFileHash } = loadProverEvents(args.file);
    const { sessions } = loadProverEventSessions(args.file);
    const { registrations } = loadProverEventRegistrations(args.file);
    const { attendances } = loadProverEventAttendances(args.file);
    // auxiliares (documentar/ignorar — pagamento/lote/financeiro)
    const auxFiles = {
      "evento_regras_inscricao": countProverEntry(args.file, "evento_regras_inscricao_eventos.json"),
      "evento_regras_lote": countProverEntry(args.file, "evento_regras_lote_eventos.json"),
      "evento_regras_servico": countProverEntry(args.file, "evento_regras_servico_eventos.json"),
      "evento_encarregados": countProverEntry(args.file, "evento_encarregados_eventos.json"),
      "evento_resumos": countProverEntry(args.file, "evento_resumos_eventos.json"),
    };
    console.log(`  eventos: ${events.length} · sessões: ${sessions.length} · inscrições: ${registrations.length} · presenças: ${attendances.length}`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  Modo: DRY-RUN — nada será criado/alterado.\n`);

    const before = {
      event: await prisma.event.count({ where: { tenantId: tenant.id } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tenant.id } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
    };

    const outDir = path.resolve(process.cwd(), "tmp", "prover-reports");
    const { report: r, reportFiles } = await runEventsDryRun(prisma, { tenantId: tenant.id, fileName: "eventos", events, sessions, registrations, attendances, sourceFileHash, auxFiles, outDir });

    const after = {
      event: await prisma.event.count({ where: { tenantId: tenant.id } }),
      reg: await prisma.eventRegistration.count({ where: { tenantId: tenant.id } }),
      person: await prisma.person.count({ where: { tenantId: tenant.id } }),
    };

    const line = (l: string, v: string | number) => `  ${l.padEnd(48, ".")} ${v}`;
    console.log("═".repeat(64));
    console.log("  DRY-RUN — Eventos do Prover (Fase 5A)");
    console.log("═".repeat(64));
    console.log(line("Eventos / Sessões / Inscrições / Presenças", `${r.totalEvents} / ${r.totalSessions} / ${r.totalRegistrations} / ${r.totalAttendances}`));
    console.log(line("Pessoas (uuids distintos / resolvidos)", `${r.personUuidsDistinct} / ${r.personUuidsResolvedDistinct}`));
    console.log(line("Linhas c/ pessoa resolvida / não resolvida", `${r.personsResolvedRows} / ${r.personsNotFoundRows}`));
    console.log("  " + "-".repeat(60));
    console.log("  EVENTOS:");
    console.log(line("    sem título / sem data", `${r.eventsWithoutTitle} / ${r.eventsWithoutDate}`));
    console.log(line("    status desconhecido (export sem status)", r.eventsStatusUnknown));
    console.log(line("    cancelados/inativos (não há status)", r.eventsCanceledOrInactive));
    console.log("  SESSÕES:");
    console.log(line("    sem evento pai", r.sessionsWithoutParent));
    console.log("  INSCRIÇÕES:");
    console.log(line("    pessoa resolvida / não resolvida", `${r.registrationsPersonResolved} / ${r.registrationsPersonNotFound}`));
    console.log(line("    evento não resolvido", r.registrationsEventNotFound));
    console.log(line("    duplicadas (mesma pessoa/evento)", r.registrationDuplicates));
    console.log(line("    com campos de pagamento/lote (IGNORADOS)", r.paymentFieldsDetected));
    console.log("  PRESENÇAS:");
    console.log(line("    pessoa resolvida / não resolvida", `${r.attendancesPersonResolved} / ${r.attendancesPersonNotFound}`));
    console.log(line("    sessão não resolvida", r.attendancesSessionNotFound));
    console.log(line("    sem inscrição correspondente", r.attendancesWithoutRegistration));
    console.log(line("    duplicadas (mesma pessoa/sessão)", r.attendanceDuplicates));
    console.log(line("    ausentes (presenca=0)", r.attendancesAbsent));
    console.log("  " + "-".repeat(60));
    console.log(line("AUX pagamento/lote/financeiro (IGNORADOS)", Object.entries(r.auxFiles).map(([k, v]) => `${k}=${v}`).join(" · ")));
    console.log(line("TOTAL WOULD_CREATE / WOULD_SKIP / Falhas", `${r.wouldCreate} / ${r.wouldSkip} / ${r.failed}`));
    console.log("═".repeat(64));
    console.log(line("Event ANTES → DEPOIS", `${before.event} → ${after.event} ${before.event === after.event ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("EventRegistration ANTES → DEPOIS", `${before.reg} → ${after.reg} ${before.reg === after.reg ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("Person ANTES → DEPOIS", `${before.person} → ${after.person} ${before.person === after.person ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("ImportBatch (DRY_RUN)", r.batchId));
    console.log("═".repeat(64));
    console.log(`  Interpretação: ${r.modelInterpretation}`);
    if (reportFiles) { console.log("  Arquivos (FORA do git):"); console.log(`    ${reportFiles.jsonPath}`); console.log(`    ${reportFiles.csvPath}\n`); }
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
