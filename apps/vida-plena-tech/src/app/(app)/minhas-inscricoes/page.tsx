import Link from "next/link";
import { requireContext } from "@/server/context";
import { prisma } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, Badge, Empty } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/format";

export default async function MyRegistrationsPage() {
  const ctx = await requireContext();

  if (!ctx.personId) {
    return (
      <div>
        <PageHeader title="Minhas inscrições" />
        <Empty>Seu login não está vinculado a uma pessoa.</Empty>
      </div>
    );
  }

  const regs = await prisma.eventRegistration.findMany({
    where: { tenantId: ctx.tenantId, personId: ctx.personId, status: "CONFIRMED" },
    include: { event: true },
    orderBy: { event: { startsAt: "asc" } },
  });

  return (
    <div>
      <PageHeader title="Minhas inscrições" description="Eventos em que você está inscrito." />
      {regs.length === 0 ? (
        <Empty>
          Você não tem inscrições. <Link href="/eventos" className="underline">Ver eventos</Link>.
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {regs.map((r) => (
            <Link key={r.id} href={`/eventos/${r.eventId}`}>
              <Card className="transition-colors hover:bg-ink/[0.02]">
                <CardContent className="flex items-center justify-between pt-5">
                  <div>
                    <div className="font-medium">{r.event.title}</div>
                    <div className="text-sm text-mist">{formatDateTime(r.event.startsAt)}</div>
                  </div>
                  <Badge variant="success">Confirmada</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
