import Link from "next/link";
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

const REG_LIMIT = 50;

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-mist">{label}</div>
    </div>
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireContext();
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { campus: true },
  });
  if (!event) notFound();

  const canViewAll = can(ctx, "events.registration.view_all");
  const [regCount, registrations, sessions, attByStatus, myReg] = await Promise.all([
    prisma.eventRegistration.count({ where: { tenantId: ctx.tenantId, eventId: id, status: "CONFIRMED" } }),
    canViewAll
      ? prisma.eventRegistration.findMany({ where: { tenantId: ctx.tenantId, eventId: id, status: "CONFIRMED" }, include: { person: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "asc" }, take: REG_LIMIT })
      : Promise.resolve([]),
    prisma.eventSession.findMany({ where: { tenantId: ctx.tenantId, eventId: id }, orderBy: { startsAt: "asc" }, take: 30, include: { _count: { select: { attendances: true } } } }),
    prisma.eventAttendance.groupBy({ by: ["status"], where: { tenantId: ctx.tenantId, eventId: id }, _count: true }),
    ctx.personId ? prisma.eventRegistration.findFirst({ where: { tenantId: ctx.tenantId, eventId: id, personId: ctx.personId } }) : Promise.resolve(null),
  ]);
  const present = attByStatus.find((a) => a.status === "PRESENT")?._count ?? 0;
  const absent = attByStatus.find((a) => a.status === "ABSENT")?._count ?? 0;
  const totalAtt = attByStatus.reduce((s, a) => s + a._count, 0);

  return (
    <div>
      <PageHeader
        title={event.title}
        description={`${event.sourceType ? `${event.sourceType} · ` : ""}${formatDateTime(event.startsAt)}`}
        action={
          <Badge variant={event.status === "PUBLISHED" ? "success" : event.status === "CANCELLED" ? "danger" : "muted"}>
            {EVENT_STATUS_LABEL[event.status]}
          </Badge>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Inscritos" value={regCount} />
        <Stat label="Sessões" value={sessions.length} />
        <Stat label="Presenças" value={totalAtt} />
        <Stat label="Presentes" value={present} />
        <Stat label="Ausentes" value={absent} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-2 pt-5 text-sm">
              {event.description ? <p>{event.description}</p> : null}
              <p className="text-mist">Local: {event.location ?? "—"}</p>
              <p className="text-mist">Campus: {event.campus?.name ?? "—"}</p>
              {event.endsAt ? <p className="text-mist">Término: {formatDateTime(event.endsAt)}</p> : null}
            </CardContent>
          </Card>

          {/* Sessões */}
          <Card>
            <CardHeader>
              <CardTitle>Sessões ({sessions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <Empty>Nenhuma sessão registrada.</Empty>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Data</TH>
                      <TH>Tema</TH>
                      <TH>Presenças</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {sessions.map((s) => (
                      <TR key={s.id}>
                        <TD className="text-sm">{formatDateTime(s.startsAt)}</TD>
                        <TD className="text-sm text-mist">{s.title ?? "—"}</TD>
                        <TD className="text-sm">{s._count.attendances}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {canViewAll ? (
            <Card>
              <CardHeader>
                <CardTitle>Inscritos ({regCount})</CardTitle>
              </CardHeader>
              <CardContent>
                {registrations.length === 0 ? (
                  <Empty>Ninguém inscrito ainda.</Empty>
                ) : (
                  <>
                    <Table>
                      <THead>
                        <TR>
                          <TH>Pessoa</TH>
                          <TH>Inscrição</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {registrations.map((r) => (
                          <TR key={r.id}>
                            <TD className="text-sm font-medium">
                              <Link href={`/pessoas/${r.personId}`} className="hover:underline">{r.person.fullName}</Link>
                            </TD>
                            <TD className="text-sm text-mist">{formatDateTime(r.sourceRegisteredAt ?? r.createdAt)}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                    {regCount > REG_LIMIT ? (
                      <p className="mt-3 text-xs text-mist">Mostrando {REG_LIMIT} de {regCount} inscritos.</p>
                    ) : null}
                  </>
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
                <p className="text-sm text-mist">Seu login não está vinculado a uma pessoa, então não é possível se inscrever.</p>
              ) : (
                <RegisterButton eventId={event.id} personId={ctx.personId} registered={!!myReg} />
              )}
            </CardContent>
          </Card>

          {can(ctx, "events.event.create") && event.status === "PUBLISHED" ? (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Inscrição pública</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm text-mist">Compartilhe este link — visitantes se inscrevem sem login:</p>
                <code className="block break-all rounded-md bg-ink/5 px-2 py-1.5 text-xs">/e/{event.id}</code>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
