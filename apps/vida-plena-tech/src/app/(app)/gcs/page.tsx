import Link from "next/link";
import { requireContext, visibleGcIds } from "@/server/context";
import { prisma } from "@/server/db";
import {
  PageHeader,
  Badge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Empty,
} from "@/components/ui/misc";
import { weekdayLabel } from "@/lib/format";

export default async function GcListPage() {
  const ctx = await requireContext();
  const scope = await visibleGcIds(ctx);

  const gcs = await prisma.growthGroup.findMany({
    where:
      scope === "ALL"
        ? { tenantId: ctx.tenantId, archivedAt: null }
        : { tenantId: ctx.tenantId, archivedAt: null, id: { in: [...scope] } },
    include: {
      leader: true,
      campus: true,
      _count: { select: { memberships: { where: { leftAt: null } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Grupos de Crescimento"
        description={
          scope === "ALL"
            ? "Todos os GCs do tenant."
            : "GCs dentro do seu escopo de liderança."
        }
      />

      {gcs.length === 0 ? (
        <Empty>Nenhum GC no seu escopo.</Empty>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>GC</TH>
              <TH>Líder</TH>
              <TH>Encontro</TH>
              <TH>Campus</TH>
              <TH>Membros</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {gcs.map((g) => (
              <TR key={g.id}>
                <TD>
                  <Link href={`/gcs/${g.id}`} className="font-medium hover:underline">
                    {g.name}
                  </Link>
                </TD>
                <TD className="text-sm">{g.leader?.fullName ?? <span className="text-mist">—</span>}</TD>
                <TD className="text-sm">
                  {weekdayLabel(g.weekday)} {g.time ?? ""}
                </TD>
                <TD className="text-sm">{g.campus?.name ?? "—"}</TD>
                <TD className="text-sm">{g._count.memberships}</TD>
                <TD>
                  {g.active ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="muted">Inativo</Badge>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
