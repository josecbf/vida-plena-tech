import Link from "next/link";
import { requireContext, personScopeWhere, visibleGcIds, hasTenantWideScope } from "@/server/context";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Badge } from "@/components/ui/misc";
import { STATUS_LABEL, statusBadgeVariant } from "@/lib/labels";
import { ROLE_LABEL } from "@/server/rbac";
import { EclesiasticalStatus } from "@prisma/client";

function Stat({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const inner = (
    <Card className={href ? "transition-colors hover:bg-ink/[0.02]" : ""}>
      <CardContent className="pt-5">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-sm text-mist">{label}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const ctx = await requireContext();
  const where = await personScopeWhere(ctx);
  const gcScope = await visibleGcIds(ctx);
  const gcWhere =
    gcScope === "ALL"
      ? { tenantId: ctx.tenantId, archivedAt: null }
      : { tenantId: ctx.tenantId, archivedAt: null, id: { in: [...gcScope] } };

  const [totalPeople, members, visitors, withoutGc, gcCount, eventCount, byStatus] =
    await Promise.all([
      prisma.person.count({ where: { ...where, archivedAt: null } }),
      prisma.person.count({ where: { ...where, archivedAt: null, status: "MEMBER" } }),
      prisma.person.count({ where: { ...where, archivedAt: null, status: "VISITOR" } }),
      prisma.person.count({ where: { ...where, archivedAt: null, primaryGcId: null } }),
      prisma.growthGroup.count({ where: gcWhere }),
      prisma.event.count({ where: { tenantId: ctx.tenantId, archivedAt: null } }),
      prisma.person.groupBy({
        by: ["status"],
        where: { ...where, archivedAt: null },
        _count: true,
      }),
    ]);

  const statusMap = new Map<EclesiasticalStatus, number>(
    byStatus.map((s) => [s.status, s._count]),
  );

  return (
    <div>
      <PageHeader
        title={`Olá, ${ctx.userName.split(" ")[0]}`}
        description={`${ROLE_LABEL[ctx.primaryRole]} · ${ctx.tenantName}${hasTenantWideScope(ctx) ? "" : " · visão limitada ao seu escopo"}`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Pessoas" value={totalPeople} href="/pessoas" />
        <Stat label="Membros oficiais" value={members} />
        <Stat label="Visitantes" value={visitors} />
        <Stat label="Sem GC" value={withoutGc} />
        <Stat label="Grupos de Crescimento" value={gcCount} href="/gcs" />
        <Stat label="Eventos" value={eventCount} href="/eventos" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pessoas por status eclesiástico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...statusMap.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge variant={statusBadgeVariant(status)}>
                    {STATUS_LABEL[status]}
                  </Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            {statusMap.size === 0 ? (
              <p className="text-sm text-mist">Nenhuma pessoa no seu escopo.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link className="block text-ink hover:underline" href="/pessoas">
              → Ver pessoas
            </Link>
            <Link className="block text-ink hover:underline" href="/gcs">
              → Grupos de Crescimento
            </Link>
            <Link className="block text-ink hover:underline" href="/eventos">
              → Eventos
            </Link>
            <a className="block text-ink hover:underline" href="/cadastro" target="_blank">
              → Cadastro público (nova aba)
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
