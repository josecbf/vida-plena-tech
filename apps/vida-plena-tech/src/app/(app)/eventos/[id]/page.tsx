import { notFound } from "next/navigation";
import { requireContext, can } from "@/server/context";
import { prisma } from "@/server/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  PageHeader,
  Badge,
  Empty,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui/misc";
import { EVENT_STATUS_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { RegisterButton } from "./register-button";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireContext();
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      campus: true,
      registrations: {
        where: { status: "CONFIRMED" },
        include: { person: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) notFound();

  const canViewAll = can(ctx, "events.registration.view_all");
  const myReg = ctx.personId
    ? event.registrations.find((r) => r.personId === ctx.personId)
    : undefined;

  return (
    <div>
      <PageHeader
        title={event.title}
        description={formatDateTime(event.startsAt)}
        action={
          <Badge variant={event.status === "PUBLISHED" ? "success" : "muted"}>
            {EVENT_STATUS_LABEL[event.status]}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-2 pt-5 text-sm">
              {event.description ? <p>{event.description}</p> : null}
              <p className="text-mist">Local: {event.location ?? "—"}</p>
              <p className="text-mist">Campus: {event.campus?.name ?? "—"}</p>
              {event.endsAt ? (
                <p className="text-mist">Término: {formatDateTime(event.endsAt)}</p>
              ) : null}
            </CardContent>
          </Card>

          {canViewAll ? (
            <Card>
              <CardHeader>
                <CardTitle>Inscritos ({event.registrations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {event.registrations.length === 0 ? (
                  <Empty>Ninguém inscrito ainda.</Empty>
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Pessoa</TH>
                        <TH>Inscrição</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {event.registrations.map((r) => (
                        <TR key={r.id}>
                          <TD className="text-sm font-medium">{r.person.fullName}</TD>
                          <TD className="text-sm text-mist">{formatDateTime(r.createdAt)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Inscrição</CardTitle>
            </CardHeader>
            <CardContent>
              {event.status !== "PUBLISHED" ? (
                <p className="text-sm text-mist">Inscrições não estão abertas.</p>
              ) : !ctx.personId ? (
                <p className="text-sm text-mist">
                  Seu login não está vinculado a uma pessoa, então não é possível se inscrever.
                </p>
              ) : (
                <RegisterButton
                  eventId={event.id}
                  personId={ctx.personId}
                  registered={!!myReg}
                />
              )}
            </CardContent>
          </Card>

          {/* Link público de inscrição (para divulgação) — só organizadores. */}
          {can(ctx, "events.event.create") && event.status === "PUBLISHED" ? (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Inscrição pública</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm text-mist">
                  Compartilhe este link — visitantes se inscrevem sem login:
                </p>
                <code className="block break-all rounded-md bg-ink/5 px-2 py-1.5 text-xs">
                  /e/{event.id}
                </code>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
