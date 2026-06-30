import Link from "next/link";
import type { Prisma } from "@prisma/client";
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
import {
  parseGcListParams,
  buildGcListWhere,
  gcListQueryString,
  totalPages,
  GC_PAGE_SIZE,
  type GcListParams,
} from "@/lib/gc-list";

export default async function GcListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireContext();
  const scope = await visibleGcIds(ctx);
  const params = parseGcListParams(await searchParams);

  const where = buildGcListWhere({
    tenantId: ctx.tenantId,
    scopeIds: scope === "ALL" ? "ALL" : [...scope],
    params,
  }) as Prisma.GrowthGroupWhereInput;

  const [total, gcs] = await Promise.all([
    prisma.growthGroup.count({ where }),
    prisma.growthGroup.findMany({
      where,
      include: {
        leader: true,
        campus: true,
        _count: { select: { memberships: { where: { leftAt: null } } } },
      },
      orderBy: { name: "asc" },
      skip: (params.page - 1) * GC_PAGE_SIZE,
      take: GC_PAGE_SIZE,
    }),
  ]);

  const pages = totalPages(total);
  const from = total === 0 ? 0 : (params.page - 1) * GC_PAGE_SIZE + 1;
  const to = Math.min(params.page * GC_PAGE_SIZE, total);

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

      {/* Busca + filtros (GET — sem JS) */}
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-mist">
          Buscar por nome
          <input
            type="search"
            name="q"
            defaultValue={params.q}
            placeholder="Nome do GC…"
            className="h-9 w-56 rounded-md border border-line bg-paper px-3 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mist">
          Status
          <select name="status" defaultValue={params.status} className="h-9 rounded-md border border-line bg-paper px-2 text-sm text-ink">
            <option value="all">Todos</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-mist">
          Membros ativos
          <select name="members" defaultValue={params.members} className="h-9 rounded-md border border-line bg-paper px-2 text-sm text-ink">
            <option value="all">Todos</option>
            <option value="with">Com membros ativos</option>
            <option value="without">Sem membros ativos</option>
          </select>
        </label>
        <button type="submit" className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-paper">
          Filtrar
        </button>
        {(params.q || params.status !== "all" || params.members !== "all") && (
          <Link href="/gcs" className="h-9 rounded-md border border-line px-4 text-sm leading-9 text-mist">
            Limpar
          </Link>
        )}
      </form>

      <p className="mb-3 text-xs text-mist">
        {total === 0 ? "Nenhum GC encontrado." : `${from}–${to} de ${total} GC(s)`}
        {pages > 1 ? ` · página ${params.page} de ${pages}` : ""}
      </p>

      {gcs.length === 0 ? (
        <Empty>Nenhum GC com esses filtros.</Empty>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>GC</TH>
                <TH>Líder</TH>
                <TH>Encontro</TH>
                <TH>Campus</TH>
                <TH>Ativos</TH>
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

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <PageLink params={params} page={params.page - 1} disabled={params.page <= 1}>
                ← Anterior
              </PageLink>
              <span className="text-xs text-mist">
                Página {params.page} de {pages}
              </span>
              <PageLink params={params} page={params.page + 1} disabled={params.page >= pages}>
                Próxima →
              </PageLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PageLink({
  params,
  page,
  disabled,
  children,
}: {
  params: GcListParams;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded-md border border-line px-3 py-1.5 text-sm text-mist/50">{children}</span>;
  }
  return (
    <Link href={`/gcs${gcListQueryString(params, { page })}`} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-ink/[0.03]">
      {children}
    </Link>
  );
}
