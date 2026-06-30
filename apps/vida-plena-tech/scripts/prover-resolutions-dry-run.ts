/**
 * CLI — Fase 3B.3, DRY-RUN das resoluções APROVADAS (READY_TO_APPLY).
 *
 *   pnpm prover:gc-memberships:resolutions:dry-run [--type X] [--conflict-key K] [--limit N]
 *
 * SOMENTE LEITURA. Lista, por resolução, o efeito previsto. NÃO escreve nada.
 */
import { PrismaClient } from "@prisma/client";
import { planResolutions } from "../src/modules/integrations/prover/resolution-apply";

function parseArgs(argv: string[]) {
  const out: { tenant?: string; type?: string; conflictKey?: string; limit?: number } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tenant" || a === "-t") out.tenant = argv[++i];
    else if (a === "--type") out.type = argv[++i];
    else if (a === "--conflict-key") out.conflictKey = argv[++i];
    else if (a === "--limit" || a === "-l") out.limit = parseInt(argv[++i], 10);
  }
  return out;
}

function mask(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  return parts.map((p, i) => (i === 0 ? p : (p[0] ?? "") + ".")).join(" ") || "—";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    const tenant = args.tenant
      ? await prisma.tenant.findUnique({ where: { slug: args.tenant } })
      : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
    if (!tenant) throw new Error("Nenhum tenant no banco. Rode o seed primeiro.");

    console.log(`\n▶ DRY-RUN resoluções READY_TO_APPLY — tenant: ${tenant.name}`);
    const gccBefore = await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } });
    const plans = await planResolutions(prisma, { tenantId: tenant.id, type: args.type, conflictKey: args.conflictKey, limit: args.limit });
    const gccAfter = await prisma.growthGroupMembership.count({ where: { tenantId: tenant.id } });

    const applicable = plans.filter((p) => p.applicable).length;
    const skip = plans.length - applicable;
    const line = (l: string, v: string | number) => `  ${l.padEnd(40, ".")} ${v}`;
    console.log("═".repeat(60));
    console.log("  DRY-RUN — Apply de resoluções (Fase 3B.3)");
    console.log("═".repeat(60));
    console.log(line("READY_TO_APPLY", plans.length));
    console.log(line("Aplicáveis", applicable));
    console.log(line("SKIP_UNSAFE", skip));
    console.log(line("GrowthGroupMembership (inalterado)", `${gccBefore} → ${gccAfter}`));
    console.log("═".repeat(60));
    for (const p of plans.slice(0, 30)) {
      const flag = p.applicable ? "✓" : "✗";
      console.log(`  ${flag} ${p.type} · ${p.decision} → ${p.actions.join(",")}`);
      console.log(`      pessoa: ${mask(p.personName)}${p.targetGcName ? ` · GC: ${p.targetGcName.slice(0, 24)}` : ""}`);
      console.log(`      motivo: ${p.reason}${p.risks.length ? ` · riscos: ${p.risks.join("; ")}` : ""}`);
    }
    if (plans.length > 30) console.log(`  … +${plans.length - 30} resolução(ões)`);
    console.log("");
    if (applicable > 0) {
      console.log(`  → Para aplicar: pnpm prover:gc-memberships:resolutions:apply --confirm APPLY\n`);
    } else {
      console.log("  → Nada aplicável (nenhuma READY_TO_APPLY com alvo claro).\n");
    }
  } catch (err) {
    console.error(`\n✖ Erro: ${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
