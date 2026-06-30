import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext, visibleGcIds, can } from "@/server/context";
import { prisma } from "@/server/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  PageHeader,
  Badge,
  Avatar,
  Empty,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { weekdayLabel, formatDate } from "@/lib/format";
import { STATUS_LABEL, ATTENDANCE_LABEL, MEMBERSHIP_SOURCE_LABEL } from "@/lib/labels";
import { InviteLinkBox, NewMeetingForm } from "./gc-actions";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-mist">{label}</div>
    </div>
  );
}

type UnitWithMembers = {
  name: string;
  type: string;
  members: { id: string; role: string; person: { fullName: string } }[];
};

function UnitBlock({ title, unit, empty }: { title: string; unit: UnitWithMembers | null; empty: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-mist">{title}</div>
      {unit ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{unit.name}</span>
            <Badge variant="outline">{unit.type}</Badge>
          </div>
          {unit.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.person.fullName}</span>
              <Badge variant="muted">{leadershipRoleLabel(m.role)}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mist">{empty}</p>
      )}
    </div>
  );
}

export default async function GcDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireContext();
  const { id } = await params;
  const scope = await visibleGcIds(ctx);
  if (scope !== "ALL" && !scope.has(id)) notFound();

  const gc = await prisma.growthGroup.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      leader: true,
      assistant: true,
      campus: true,
      memberships: {
        where: { leftAt: null },
        include: { person: true },
        orderBy: { person: { fullName: "asc" } },
      },
      meetings: {
        orderBy: { date: "desc" },
        take: 10,
        include: { attendances: true },
      },
      inviteLinks: { where: { active: true }, take: 1 },
    },
  });
  if (!gc) notFound();

  // Unidades (novo modelo) — legado segue em gc.leader/assistant.
  const loadUnit = (unitId: string | null) =>
    unitId
      ? prisma.leadershipUnit.findUnique({
          where: { id: unitId },
          include: { members: { include: { person: true } } },
        })
      : Promise.resolve(null);

  const [leadershipUnit, supervisionUnit, coordinationUnit, historicalCount, bySourceRaw] =
    await Promise.all([
      loadUnit(gc.leadershipUnitId),
      loadUnit(gc.supervisionUnitId),
      loadUnit(gc.coordinationUnitId),
      prisma.growthGroupMembership.count({ where: { tenantId: ctx.tenantId, gcId: id, NOT: { leftAt: null } } }),
      prisma.growthGroupMembership.groupBy({ by: ["source"], where: { tenantId: ctx.tenantId, gcId: id }, _count: true }),
    ]);

  const activeCount = gc.memberships.length;
  const bySource: Record<string, number> = { PARTICIPANT: 0, VISITOR: 0, MANUAL: 0, IMPORTED: 0 };
  for (const row of bySourceRaw) bySource[row.source] = row._count;
  // inconsistência read-only: GC inativo com vínculo ativo (não corrige).
  const inactiveWithActive = !gc.active && activeCount > 0;

  // Dashboard do GC
  const lastMeeting = gc.meetings[0];
  const lastPresent =
    lastMeeting?.attendances.filter((a) => a.status === "PRESENT").length ?? 0;
  const lastAbsent =
    lastMeeting?.attendances.filter((a) => a.status === "ABSENT").length ?? 0;
  const lastVisitors =
    lastMeeting?.attendances.filter((a) => a.status === "VISITOR").length ?? 0;

  const happenedMeetings = gc.meetings.filter((m) => m.happened);
  const avgAttendance =
    happenedMeetings.length > 0
      ? Math.round(
          happenedMeetings.reduce(
            (sum, m) => sum + m.attendances.filter((a) => a.status === "PRESENT").length,
            0,
          ) / happenedMeetings.length,
        )
      : 0;

  return (
    <div>
      <PageHeader
        title={gc.name}
        description={`${weekdayLabel(gc.weekday)} ${gc.time ?? ""} · ${gc.location ?? "local não informado"}`}
        action={gc.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="muted">Inativo</Badge>}
      />

      {inactiveWithActive ? (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          ⚠ GC inativo com vínculo ativo — revisar origem ({activeCount} vínculo(s) ativo(s) em GC inativo).
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Membros ativos" value={activeCount} />
        <Stat label="Históricos" value={historicalCount} />
        <Stat label="Participantes" value={bySource.PARTICIPANT} />
        <Stat label="Visitantes" value={bySource.VISITOR} />
        <Stat label="Manuais" value={bySource.MANUAL} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Freq. média" value={avgAttendance} />
        <Stat label="Presentes (último)" value={lastPresent} />
        <Stat label="Ausentes (último)" value={lastAbsent} />
        <Stat label="Visitantes (último)" value={lastVisitors} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Membros */}
          <Card>
            <CardHeader>
              <CardTitle>Membros do GC</CardTitle>
              <CardDescription>Líder 1: {gc.leader?.fullName ?? "—"}{gc.assistant ? ` · Líder 2: ${gc.assistant.fullName}` : ""}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {gc.memberships.length === 0 ? (
                <Empty>Nenhum membro ativo.</Empty>
              ) : (
                gc.memberships.map((m) => (
                  <Link
                    key={m.id}
                    href={`/pessoas/${m.personId}`}
                    className="flex items-center justify-between rounded-md p-1.5 hover:bg-ink/[0.03]"
                  >
                    <span className="flex items-center gap-3">
                      <Avatar name={m.person.fullName} />
                      <span className="text-sm font-medium">{m.person.fullName}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant="muted">{MEMBERSHIP_SOURCE_LABEL[m.source]}</Badge>
                      <Badge variant="outline">{STATUS_LABEL[m.person.status]}</Badge>
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Encontros */}
          <Card>
            <CardHeader>
              <CardTitle>Encontros recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {gc.meetings.length === 0 ? (
                <Empty>Nenhum encontro registrado.</Empty>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Data</TH>
                      <TH>Aconteceu</TH>
                      <TH>Presença</TH>
                      <TH></TH>
                    </TR>
                  </THead>
                  <TBody>
                    {gc.meetings.map((m) => {
                      const counts = m.attendances.reduce(
                        (acc, a) => {
                          acc[a.status] = (acc[a.status] ?? 0) + 1;
                          return acc;
                        },
                        {} as Record<string, number>,
                      );
                      return (
                        <TR key={m.id}>
                          <TD className="text-sm">{formatDate(m.date)}</TD>
                          <TD>
                            {m.happened ? (
                              <Badge variant="success">Sim</Badge>
                            ) : (
                              <Badge variant="muted">Cancelado</Badge>
                            )}
                          </TD>
                          <TD className="text-xs text-mist">
                            {m.attendances.length === 0
                              ? "Sem registro"
                              : Object.entries(counts)
                                  .map(([s, n]) => `${ATTENDANCE_LABEL[s as keyof typeof ATTENDANCE_LABEL]}: ${n}`)
                                  .join(" · ")}
                          </TD>
                          <TD>
                            {can(ctx, "groups.attendance.record") ? (
                              <Link href={`/gcs/${id}/encontro/${m.id}`}>
                                <Button variant="outline" size="sm">
                                  Presença
                                </Button>
                              </Link>
                            ) : null}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lateral: ações */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liderança e cobertura</CardTitle>
              <CardDescription>
                Líder 1: {gc.leader?.fullName ?? "—"}
                {gc.assistant ? ` · Líder 2: ${gc.assistant.fullName}` : ""} (legado)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UnitBlock title="Liderança" unit={leadershipUnit} empty="Sem unidade de liderança." />
              <UnitBlock title="Supervisão" unit={supervisionUnit} empty="Sem supervisão definida." />
              <UnitBlock title="Coordenação" unit={coordinationUnit} empty="Sem coordenação definida." />
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-mist">Pastor de área</div>
                <p className="text-sm text-mist">Não informado</p>
              </div>
            </CardContent>
          </Card>

          {can(ctx, "groups.meeting.create") ? (
            <Card>
              <CardHeader>
                <CardTitle>Novo encontro</CardTitle>
              </CardHeader>
              <CardContent>
                <NewMeetingForm gcId={id} />
              </CardContent>
            </Card>
          ) : null}

          {can(ctx, "groups.invite.create") ? (
            <Card>
              <CardHeader>
                <CardTitle>Link de cadastro</CardTitle>
              </CardHeader>
              <CardContent>
                <InviteLinkBox gcId={id} initialToken={gc.inviteLinks[0]?.token ?? null} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Papel da unidade → rótulo humano. Numa unidade de liderança, PRIMARY/SECONDARY
// são "Líder 1"/"Líder 2" (regra de produto: nada de "auxiliar").
function leadershipRoleLabel(role: string): string {
  switch (role) {
    case "PRIMARY":
      return "Líder 1";
    case "SECONDARY":
    case "ASSISTANT":
      return "Líder 2";
    case "IN_TRAINING":
      return "Líder em Treinamento";
    case "SPOUSE":
      return "Cônjuge";
    case "TEAM_MEMBER":
      return "Equipe";
    default:
      return role;
  }
}
