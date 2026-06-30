/**
 * CLI — Importador Prover, Fase 4A, DRY-RUN de ENCONTROS e PRESENÇAS de GC.
 *
 *   pnpm prover:gc-meetings:dry-run --file ./data/export_prover_2026-06-27.zip
 *
 * Lê grupos_encontros.json + grupos_encontros_participantes.json +
 * grupos_encontros_visitantes.json + grupos_encontros_visitas.json. Resolve GC e
 * pessoa por ExternalMapping, verifica membership compatível e detecta conflitos.
 * NÃO cria GrowthGroupMeeting/GrowthGroupAttendance, NÃO altera membership, NÃO
 * cria User/RoleAssignment. Grava relatório FORA do git (tmp/prover-reports/).
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  loadProverGcMeetings,
  loadProverGcMeetingParticipants,
  loadProverGcMeetingVisitors,
  loadProverGcMeetingVisits,
} from "../src/modules/integrations/prover/zip";
import { runGcMeetingsDryRun } from "../src/modules/integrations/prover/gc-meetings-dry-run";

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
  if (!args.file) {
    console.error("Uso: pnpm prover:gc-meetings:dry-run --file <export.zip>");
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ DRY-RUN encontros/presenças de GC — lendo: ${args.file}`);
    const { meetings, sourceFileHash } = loadProverGcMeetings(args.file);
    const { participants } = loadProverGcMeetingParticipants(args.file);
    const { visitors } = loadProverGcMeetingVisitors(args.file);
    const { visits } = loadProverGcMeetingVisits(args.file);
    console.log(`  encontros: ${meetings.length} · part.presenças: ${participants.length} · vis.presenças: ${visitors.length} · visitas: ${visits.length}`);
    console.log(`  Tenant: ${tenant.name}`);
    console.log(`  Modo: DRY-RUN — nenhum encontro/presença criado; nenhum membership alterado.\n`);

    const before = {
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tenant.id } }),
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tenant.id } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
    };

    const outDir = path.resolve(process.cwd(), "tmp", "prover-reports");
    const { report: r, reportFiles } = await runGcMeetingsDryRun(prisma, {
      tenantId: tenant.id, fileName: "encontros+presenças", meetings, participants, visitors, visits, sourceFileHash, outDir,
    });

    const after = {
      meeting: await prisma.growthGroupMeeting.count({ where: { tenantId: tenant.id } }),
      att: await prisma.growthGroupAttendance.count({ where: { tenantId: tenant.id } }),
      gcc: await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } }),
    };

    const line = (l: string, v: string | number) => `  ${l.padEnd(48, ".")} ${v}`;
    console.log("═".repeat(64));
    console.log("  DRY-RUN — Encontros e presenças de GC (Fase 4A)");
    console.log("═".repeat(64));
    console.log("  ENCONTROS:");
    console.log(line("  Lidos", r.meetingsRead));
    console.log(line("  GC resolvido / NÃO resolvido", `${r.meetingsGcResolved} / ${r.meetingsGcNotFound}`));
    console.log(line("  Realizados / Agendados / Cancelados", `${r.meetingsHappened} / ${r.meetingsScheduled} / ${r.meetingsCancelled}`));
    console.log(line("  Duplicados (mesmo GC/data) / em GC inativo", `${r.meetingsDuplicateSameGcDate} / ${r.meetingsInInactiveGc}`));
    console.log(line("  WOULD_CREATE / WOULD_SKIP", `${r.meetingsWouldCreate} / ${r.meetingsWouldSkip}`));
    console.log("  " + "-".repeat(60));
    console.log("  PRESENÇAS DE PARTICIPANTES:");
    console.log(line("  Lidas", r.participantRowsRead));
    console.log(line("  Pessoa resolvida / NÃO resolvida", `${r.participantPersonResolved} / ${r.participantPersonNotFound}`));
    console.log(line("  WOULD_CREATE / WOULD_SKIP", `${r.participantWouldCreate} / ${r.participantWouldSkip}`));
    console.log(line("  Com membership compatível", r.attendanceWithMembership));
    console.log(line("  Sem membership", r.attendanceWithoutMembership));
    console.log(line("  Fora do período do membership", r.attendanceOutsideRange));
    console.log(line("  Presença duplicada", r.attendanceDuplicate));
    console.log("  " + "-".repeat(60));
    console.log("  PRESENÇAS DE VISITANTES:");
    console.log(line("  Lidas", r.visitorRowsRead));
    console.log(line("  Pessoa resolvida (já mapeada)", `${r.visitorPersonResolved} (${r.visitorWithMappedPerson})`));
    console.log(line("  Sem pessoa_uuid", r.visitorWithoutUuid));
    console.log(line("  WOULD_CREATE / WOULD_SKIP", `${r.visitorWouldCreate} / ${r.visitorWouldSkip}`));
    console.log("  " + "-".repeat(60));
    console.log(line("VISITAS lidas", r.visitsRead));
    console.log(`  Semântica visitas: ${r.visitsSemantics}`);
    console.log("  " + "-".repeat(60));
    console.log(line("TOTAL WOULD_CREATE / WOULD_SKIP / Falhas", `${r.wouldCreate} / ${r.wouldSkip} / ${r.failed}`));
    console.log(line("Conflitos por warning", Object.entries(r.conflictsByWarning).map(([k, v]) => `${k}=${v}`).join(" · ") || "—"));
    console.log("═".repeat(64));
    console.log(line("GrowthGroupMeeting ANTES → DEPOIS", `${before.meeting} → ${after.meeting} ${before.meeting === after.meeting ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("GrowthGroupAttendance ANTES → DEPOIS", `${before.att} → ${after.att} ${before.att === after.att ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("GrowthGroupMembership ANTES → DEPOIS", `${before.gcc} → ${after.gcc} ${before.gcc === after.gcc ? "(inalterado ✓)" : "(ALTEROU!)"}`));
    console.log(line("ImportBatch (DRY_RUN)", r.batchId));
    console.log("═".repeat(64));
    if (reportFiles) {
      console.log("  Arquivos gerados (FORA do git):");
      console.log(`    ${reportFiles.jsonPath}`);
      console.log(`    ${reportFiles.csvPath}\n`);
    }
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
