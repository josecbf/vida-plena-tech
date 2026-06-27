import Link from "next/link";
import { requireContext, can } from "@/server/context";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, Badge, Empty } from "@/components/ui/misc";
import { EVENT_STATUS_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export default async function EventsPage() {
  const ctx = await requireContext();
  const canCreate = can(ctx, "events.event.create");

  // Membros veem só eventos publicados; quem cria/gere vê todos.
  const events = await prisma.event.findMany({
    where: {
      tenantId: ctx.tenantId,
      archivedAt: null,
      ...(canCreate ? {} : { status: "PUBLISHED" }),
    },
    include: { _count: { select: { registrations: { where: { status: "CONFIRMED" } } } } },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Eventos"
        description="Eventos da igreja. Inscrição simples, sem pagamento nesta fase."
        action={
          canCreate ? (
            <Link href="/eventos/novo">
              <Button>Novo evento</Button>
            </Link>
          ) : undefined
        }
      />

      {events.length === 0 ? (
        <Empty>Nenhum evento disponível.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <Link key={e.id} href={`/eventos/${e.id}`}>
              <Card className="h-full transition-colors hover:bg-ink/[0.02]">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{e.title}</h3>
                    <Badge variant={e.status === "PUBLISHED" ? "success" : "muted"}>
                      {EVENT_STATUS_LABEL[e.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-mist">{formatDateTime(e.startsAt)}</p>
                  {e.location ? (
                    <p className="text-sm text-mist">{e.location}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-mist">
                    {e._count.registrations} inscrito(s)
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
