/**
 * CLI — Importador Prover, Fase 6B.1, APPLY da ESTRUTURA de Ensino.
 *
 *   pnpm prover:teaching:apply --file ./data/export.zip --limit 50 --confirm APPLY
 *   pnpm prover:teaching:apply --file ./data/export.zip --confirm APPLY   (FULL)
 *
 * Cria/atualiza Teaching + TeachingModule + TeachingLesson + TeachingSession.
 * Exige --confirm APPLY. NÃO cria inscrição/presença, NÃO importa pagamento,
 * NÃO altera Person/status/User/Role.
 */
import { PrismaClient } from "@prisma/client";
import {
  loadProverTeachings, loadProverTeachingModules, loadProverTeachingLessons, loadProverTeachingSessions,
} from "../src/modules/integrations/prover/zip";
import { runTeachingApply } from "../src/modules/integrations/prover/teaching-apply";

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
      "\n✖ APPLY recusado. Este comando ESCREVE no banco (cria estrutura de ensino).\n" +
        "  Use --confirm APPLY. Ex.: pnpm prover:teaching:apply --file ./data/export.zip --limit 50 --confirm APPLY\n" +
        "  (Para só analisar, use: pnpm prover:teaching:dry-run --file <...>)\n",
    );
    process.exit(2);
  }
  if (!args.file) { console.error("Uso: pnpm prover:teaching:apply --file <export.zip> [--limit N] --confirm APPLY"); process.exit(2); }
  if (args.limit !== undefined && (!Number.isFinite(args.limit) || args.limit <= 0)) { console.error("--limit deve ser um inteiro positivo."); process.exit(2); }

  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ APPLY da ESTRUTURA de Ensino — lendo: ${args.file}`);
    const { teachings, sourceFileHash } = loadProverTeachings(args.file);
    const { modules } = loadProverTeachingModules(args.file);
    const { lessons } = loadProverTeachingLessons(args.file);
    const { sessions } = loadProverTeachingSessions(args.file);
    console.log(`  ensinos: ${teachings.length} · módulos: ${modules.length} · aulas: ${lessons.length} · encontros: ${sessions.length}${args.limit ? ` · aplicando ${args.limit} de cada [--limit]` : " (TUDO)"}`);
    console.log(`  Tenant: ${tenant.name}\n  ⚠ MODO APPLY — cria estrutura; NÃO cria inscrição/presença.\n`);

    const t = tenant.id;
    const cnt = async () => ({
      teaching: await prisma.teaching.count({ where: { tenantId: t } }),
      module: await prisma.teachingModule.count({ where: { tenantId: t } }),
      lesson: await prisma.teachingLesson.count({ where: { tenantId: t } }),
      session: await prisma.teachingSession.count({ where: { tenantId: t } }),
      mT: await prisma.externalMapping.count({ where: { tenantId: t, externalType: "teaching" } }),
      mM: await prisma.externalMapping.count({ where: { tenantId: t, externalType: "teaching_module" } }),
      mL: await prisma.externalMapping.count({ where: { tenantId: t, externalType: "teaching_lesson" } }),
      mS: await prisma.externalMapping.count({ where: { tenantId: t, externalType: "teaching_session" } }),
      person: await prisma.person.count({ where: { tenantId: t } }),
      user: await prisma.user.count(), role: await prisma.roleAssignment.count(),
    });
    const before = await cnt();

    const r = await runTeachingApply(prisma, { tenantId: t, fileName: "ensino (estrutura)", teachings, modules, lessons, sessions, sourceFileHash, limit: args.limit });

    const after = await cnt();
    const line = (l: string, v: string | number) => `  ${l.padEnd(46, ".")} ${v}`;
    const flag = (a: number, b: number) => (a === b ? "(inalterado ✓)" : "(ALTEROU!)");
    console.log("═".repeat(62));
    console.log("  APPLY — Estrutura de Ensino (Fase 6B.1)");
    console.log("═".repeat(62));
    console.log(line("Lidos (ensino/módulo/aula/sessão)", `${r.teachingsRead}/${r.modulesRead}/${r.lessonsRead}/${r.sessionsRead}`));
    console.log(line("Criados (ensino/módulo/aula/sessão)", `${r.teachingsCreated}/${r.modulesCreated}/${r.lessonsCreated}/${r.sessionsCreated}`));
    console.log(line("Atualizados / Pulados / Falhas", `${r.updated} / ${r.skipped} / ${r.failed}`));
    console.log(line("Ensinos sem título / Módulos sem título", `${r.teachingsWithoutTitle} / ${r.modulesWithoutTitle}`));
    console.log(line("Aulas sem módulo / Sessões sem ensino pai", `${r.lessonsWithoutModule} / ${r.sessionsWithoutTeaching}`));
    console.log(line("Sessões sem módulo/aula (warning)", r.sessionsWithoutModuleOrLesson));
    console.log("═".repeat(62));
    console.log(line("Teaching ANTES → DEPOIS", `${before.teaching} → ${after.teaching}`));
    console.log(line("TeachingModule ANTES → DEPOIS", `${before.module} → ${after.module}`));
    console.log(line("TeachingLesson ANTES → DEPOIS", `${before.lesson} → ${after.lesson}`));
    console.log(line("TeachingSession ANTES → DEPOIS", `${before.session} → ${after.session}`));
    console.log(line("Mapping teaching / module", `${before.mT}→${after.mT} / ${before.mM}→${after.mM}`));
    console.log(line("Mapping lesson / session", `${before.mL}→${after.mL} / ${before.mS}→${after.mS}`));
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
