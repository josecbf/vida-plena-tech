import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireContext, can } from "@/server/context";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, Badge, Empty } from "@/components/ui/misc";
import { EVENT_STATUS_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 30;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireContext();
  const canCreate = can(ctx, "events.event.create");
  const sp = await searchParams;
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const q = (get("q") ?? "").trim();
  const statusParam = get("status");
  const status = ["PUBLISHED", "FINISHED", "CANCELLED", "DRAFT"].includes(statusParam ?? "") ? statusParam! : "all";
  const pageNum = Math.max(1, parseInt(get("page") ?? "1", 10) || 1);

  const where: Prisma.EventWhereInput = {
    tenantId: ctx.tenantId,
    archivedAt: null,
    // Membros veem só eventos publicados; quem cria/gere vê todos.
    ...(canCreate ? {} : { status: "PUBLISHED" }),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(canCreate && status !== "all" ? { status: status as Prisma.EventWhereInput["status"] } : {}),
  };

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      include: { _count: { select: { registrations: { where: { status: "CONFIRMED" } }, attendances: true } } },
      orderBy: { startsAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (page: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (page > 1) params.set("page", String(page));
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div>
      <PageHeader
        title="Eventos"
        description="Eventos da igreja. Inscrição simples (sem pagamento operacional)."
        action={canCreate ? <Link href="/eventos/novo"><Button>Novo evento</Button></Link> : undefined}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-mist">
          Buscar por tema
          <input type="search" name="q" defaultValue={q} placeholder="Nome do evento…" className="h-9 w-56 rounded-md border border-line bg-paper px-3 text-sm text-ink" />
        </label>
        {canCreate ? (
          <label className="flex flex-col gap-1 text-xs text-mist">
            Status
            <select name="status" defaultValue={status} className="h-9 rounded-md border border-line bg-paper px-2 text-sm text-ink">
              <option value="all">Todos</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="FINISHED">Encerrado</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="DRAFT">Rascunho</option>
            </select>
          </label>
        ) : null}
        <button type="submit" className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-paper">Filtrar</button>
        {(q || status !== "all") && <Link href="/eventos" className="h-9 rounded-md border border-line px-4 text-sm leading-9 text-mist">Limpar</Link>}
      </form>

      <p className="mb-3 text-xs text-mist">
        {total === 0 ? "Nenhum evento." : `${(pageNum - 1) * PAGE_SIZE + 1}–${Math.min(pageNum * PAGE_SIZE, total)} de ${total} evento(s)`}
        {pages > 1 ? ` · página ${pageNum} de ${pages}` : ""}
      </p>

      {events.length === 0 ? (
        <Empty>Nenhum evento com esses filtros.</Empty>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((e) => (
              <Link key={e.id} href={`/eventos/${e.id}`}>
                <Card className="h-full transition-colors hover:bg-ink/[0.02]">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{e.title}</h3>
                      <Badge variant={e.status === "PUBLISHED" ? "success" : e.status === "CANCELLED" ? "danger" : "muted"}>
                        {EVENT_STATUS_LABEL[e.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-mist">{formatDateTime(e.startsAt)}</p>
                    {e.location ? <p className="text-sm text-mist">{e.location}</p> : null}
                    <p className="mt-3 text-xs text-mist">
                      {e._count.registrations} inscrito(s) · {e._count.attendances} presença(s)
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              {pageNum > 1 ? (
                <Link href={`/eventos${qs(pageNum - 1)}`} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-ink/[0.03]">← Anterior</Link>
              ) : <span className="rounded-md border border-line px-3 py-1.5 text-sm text-mist/50">← Anterior</span>}
              <span className="text-xs text-mist">Página {pageNum} de {pages}</span>
              {pageNum < pages ? (
                <Link href={`/eventos${qs(pageNum + 1)}`} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-ink/[0.03]">Próxima →</Link>
              ) : <span className="rounded-md border border-line px-3 py-1.5 text-sm text-mist/50">Próxima →</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
