/**
 * CLI — Importador Prover, Fase 6A, DRY-RUN de ENSINO/TD.
 *
 *   pnpm prover:teaching:dry-run --file ./data/export_prover_2026-06-27.zip
 *
 * Lê os 6 arquivos de ensino, resolve pessoa por ExternalMapping, entende a
 * relação curso/módulo/aula/encontro/inscrição/presença e detecta conflitos.
 * NÃO cria dados reais de ensino, NÃO cria ExternalMapping(teaching), NÃO altera
 * Person/User/Role. Pagamento/lote apenas documentados. Relatório FORA do git.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  loadProverTeachings, loadProverTeachingModules, loadProverTeachingLessons,
  loadProverTeachingSessions, loadProverTeachingRegistrations, loadProverTeachingAttendances, countProverEntry,
} from "../src/modules/integrations/prover/zip";
import { runTeachingDryRun } from "../src/modules/integrations/prover/teaching-dry-run";

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
  if (!args.file) { console.error("Uso: pnpm prover:teaching:dry-run --file <export.zip>"); process.exit(2); }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ DRY-RUN de ENSINO/TD — lendo: ${args.file}`);
    const { teachings, sourceFileHash } = loadProverTeachings(args.file);
    const { modules } = loadProverTeachingModules(args.file);
    const { lessons } = loadProverTeachingLessons(args.file);
    const { sessions } = loadProverTeachingSessions(args.file);
    const { registrations } = loadProverTeachingRegistrations(args.file);
    const { attendances } = loadProverTeachingAttendances(args.file);
    const auxFiles = {
      "ensino_regras_inscricao": countProverEntry(args.file, "ensino_regras_inscricao_ensinos.json"),
      "ensino_regras_lote": countProverEntry(args.file, "ensino_regras_lote_ensinos.json"),
      "ensino_regras_servico": countProverEntry(args.file, "ensino_regras_servico_ensinos.json"),
      "ensino_encarregados": countProverEntry(args.file, "ensino_encarregados_ensinos.json"),
      "ensino_resumos": countProverEntry(args.file, "ensino_resumos_ensinos.json"),
    };
    console.log(`  ensinos: ${teachings.length} · módulos: ${modules.length} · aulas: ${lessons.length} · encontros: ${sessions.length} · inscrições: ${registrations.length} · presenças: ${attendances.length}`);
    console.log(`  Tenant: ${tenant.name}\n  Modo: DRY-RUN — nada será criado/alterado.\n`);

    const before = { teaching: await prisma.event.count({ where: { tenantId: tenant.id } }), person: await prisma.person.count({ where: { tenantId: tenant.id } }) };

    const outDir = path.resolve(process.cwd(), "tmp", "prover-reports");
    const { report: r, reportFiles } = await runTeachingDryRun(prisma, { tenantId: tenant.id, fileName: "ensino", teachings, modules, lessons, sessions, registrations, attendances, sourceFileHash, auxFiles, outDir });

    const after = { teaching: await prisma.event.count({ where: { tenantId: tenant.id } }), person: await prisma.person.count({ where: { tenantId: tenant.id } }) };
    const line = (l: string, v: string | number) => `  ${l.padEnd(50, ".")} ${v}`;
    console.log("═".repeat(66));
    console.log("  DRY-RUN — Ensino/TD do Prover (Fase 6A)");
    console.log("═".repeat(66));
    console.log(line("Ensinos / Módulos / Aulas", `${r.totalTeachings} / ${r.totalModules} / ${r.totalLessons}`));
    console.log(line("Encontros / Inscrições / Presenças", `${r.totalSessions} / ${r.totalRegistrations} / ${r.totalAttendances}`));
    console.log(line("Pessoas (uuids distintos / resolvidos)", `${r.personUuidsDistinct} / ${r.personUuidsResolved}`));
    console.log(line("Linhas c/ pessoa resolvida / não resolvida", `${r.personsResolvedRows} / ${r.personsNotFoundRows}`));
    console.log("  " + "-".repeat(62));
    console.log(line("Ensinos sem título / sem data", `${r.teachingsWithoutTitle} / ${r.teachingsWithoutDate}`));
    console.log(line("Módulos sem ensino pai (via encontro)", r.modulesWithoutParent));
    console.log(line("Aulas sem módulo", r.lessonsWithoutModule));
    console.log(line("Encontros sem ensino pai", r.sessionsWithoutTeaching));
    console.log("  INSCRIÇÕES:");
    console.log(line("    pessoa resolvida / não / ensino não resolvido", `${r.registrationsPersonResolved} / ${r.registrationsPersonNotFound} / ${r.registrationsTeachingNotFound}`));
    console.log(line("    duplicadas", r.registrationDuplicates));
    console.log(line("    status encontrados", Object.entries(r.registrationStatuses).map(([k, v]) => `${k}=${v}`).join(", ") || "—"));
    console.log("  PRESENÇAS:");
    console.log(line("    pessoa resolvida / não", `${r.attendancesPersonResolved} / ${r.attendancesPersonNotFound}`));
    console.log(line("    encontro não resolvido", r.attendancesSessionNotFound));
    console.log(line("    sem inscrição correspondente", r.attendancesWithoutRegistration));
    console.log(line("    duplicadas / ausentes", `${r.attendanceDuplicates} / ${r.attendancesAbsent}`));
    console.log("  " + "-".repeat(62));
    console.log(line("Pagamento/lote detectado (IGNORADO)", r.paymentFieldsDetected));
    console.log(line("Conclusão/nota/aproveitamento detectado", r.completionFieldsDetected));
    console.log(line("AUX financeiro/regras (IGNORADOS)", Object.entries(r.auxFiles).map(([k, v]) => `${k}=${v}`).join(" · ")));
    console.log(line("TOTAL WOULD_CREATE / WOULD_SKIP / Falhas", `${r.wouldCreate} / ${r.wouldSkip} / ${r.failed}`));
    console.log("═".repeat(66));
    console.log(line("Event ANTES → DEPOIS (referência)", `${before.teaching} → ${after.teaching} ${before.teaching === after.teaching ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("Person ANTES → DEPOIS", `${before.person} → ${after.person} ${before.person === after.person ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("ImportBatch (DRY_RUN)", r.batchId));
    console.log("═".repeat(66));
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
