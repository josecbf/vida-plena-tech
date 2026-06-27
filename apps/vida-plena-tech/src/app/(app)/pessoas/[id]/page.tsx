import Link from "next/link";
import { notFound } from "next/navigation";
import {
  requireContext,
  canViewPerson,
  can,
  visibleGcIds,
  personScopeWhere,
} from "@/server/context";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { PageHeader, Badge, Avatar, Empty } from "@/components/ui/misc";
import {
  STATUS_LABEL,
  statusBadgeVariant,
  RELATIONSHIP_LABEL,
  TIMELINE_LABEL,
  SOURCE_LABEL,
} from "@/lib/labels";
import { maskCpf, formatCpf, formatDate, formatDateTime } from "@/lib/format";
import {
  StatusPanel,
  GcPanel,
  FamilyPanel,
  PastoralNotePanel,
} from "./person-actions";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireContext();
  const { id } = await params;
  if (!(await canViewPerson(ctx, id))) notFound();

  const person = await prisma.person.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      contacts: true,
      addresses: true,
      campus: true,
      primaryGc: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      timeline: { orderBy: { occurredAt: "desc" }, take: 50 },
      householdLinksA: { include: { household: { include: { members: { include: { person: true } } } } } },
    },
  });
  if (!person) notFound();

  const canSensitive = can(ctx, "people.timeline_sensitive.view");
  const canFullCpf = can(ctx, "people.cpf.view_full");

  // Notas pastorais só são CARREGADAS se o usuário pode vê-las (deny-by-default).
  const pastoralNotes = canSensitive
    ? await prisma.pastoralNote.findMany({
        where: { tenantId: ctx.tenantId, personId: id, archivedAt: null },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Leitura sensível auditada: pastor abriu ficha que CONTÉM nota pastoral.
  if (canSensitive && pastoralNotes.length > 0) {
    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        actorPersonId: ctx.personId,
        module: "people",
        action: "read_sensitive",
        entityType: "PastoralNote",
        entityId: id, // pessoa acessada
        sensitivity: "CONFIDENTIAL",
        reason: "Abertura de ficha com observação pastoral",
      },
    });
  }

  // Timeline: esconde itens sensíveis de quem não pode vê-los.
  const timeline = person.timeline.filter(
    (t) => canSensitive || t.sensitivity !== "CONFIDENTIAL",
  );

  // Opções para painéis de ação
  const gcScope = await visibleGcIds(ctx);
  const gcs = await prisma.growthGroup.findMany({
    where:
      gcScope === "ALL"
        ? { tenantId: ctx.tenantId, archivedAt: null }
        : { tenantId: ctx.tenantId, archivedAt: null, id: { in: [...gcScope] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const peopleForFamily = can(ctx, "people.family.manage")
    ? await prisma.person.findMany({
        where: { ...(await personScopeWhere(ctx)), archivedAt: null },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
        take: 300,
      })
    : [];

  const householdMembers =
    person.householdLinksA[0]?.household.members.filter((m) => m.personId !== id) ?? [];

  return (
    <div>
      <PageHeader
        title={person.fullName}
        description={person.socialName ? `“${person.socialName}”` : undefined}
        action={
          can(ctx, "people.person.edit") ? (
            <Link href={`/pessoas/${id}/editar`}>
              <Button variant="outline">Editar</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={statusBadgeVariant(person.status)}>
          {STATUS_LABEL[person.status]}
        </Badge>
        {person.isBaptized ? <Badge variant="outline">Batizado</Badge> : null}
        {person.hasTD ? <Badge variant="outline">TD</Badge> : null}
        <Badge variant="muted">{SOURCE_LABEL[person.source]}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dados cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="CPF" value={canFullCpf ? formatCpf(person.cpf) : maskCpf(person.cpf)} mono />
              <Info label="Nascimento" value={formatDate(person.birthDate)} />
              <Info label="Campus" value={person.campus?.name ?? "—"} />
              <Info label="GC principal" value={person.primaryGc?.name ?? "—"} />
              <Info label="Batismo" value={person.isBaptized ? formatDate(person.baptismDate) : "Não"} />
              <Info label="TD" value={person.hasTD ? formatDate(person.tdDate) : "Não"} />
              {person.contacts.map((c) => (
                <Info key={c.id} label={c.type} value={c.value} />
              ))}
              {person.addresses[0] ? (
                <div className="col-span-2">
                  <Info label="Endereço" value={formatAddress(person.addresses[0])} />
                </div>
              ) : null}
              {person.operationalNotes ? (
                <div className="col-span-2">
                  <Info label="Observações operacionais" value={person.operationalNotes} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Família */}
          <Card>
            <CardHeader>
              <CardTitle>Família e vínculos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {householdMembers.length === 0 ? (
                <p className="text-sm text-mist">Nenhum vínculo familiar.</p>
              ) : (
                householdMembers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/pessoas/${m.personId}`}
                    className="flex items-center gap-3 rounded-md p-1 hover:bg-ink/[0.03]"
                  >
                    <Avatar name={m.person.fullName} />
                    <div className="text-sm">
                      <div className="font-medium">{m.person.fullName}</div>
                      <div className="text-xs text-mist">
                        {RELATIONSHIP_LABEL[m.relationship]}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Linha do tempo</CardTitle>
              <CardDescription>Histórico de eventos relevantes da pessoa.</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <Empty>Sem eventos na linha do tempo.</Empty>
              ) : (
                <ol className="relative space-y-4 border-l border-line pl-5">
                  {timeline.map((t) => (
                    <li key={t.id} className="relative">
                      <span className="absolute -left-[23px] top-1 size-2 rounded-full bg-ink" />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t.title}</span>
                        <Badge variant="muted">{TIMELINE_LABEL[t.type]}</Badge>
                      </div>
                      {t.description ? (
                        <p className="text-sm text-mist">{t.description}</p>
                      ) : null}
                      <p className="text-xs text-mist">{formatDateTime(t.occurredAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Notas pastorais — só pastores */}
          {canSensitive ? (
            <Card>
              <CardHeader>
                <CardTitle>Observações pastorais</CardTitle>
                <CardDescription>
                  Confidencial · visível apenas a Pastor de Área e Pastor Sênior.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {can(ctx, "people.pastoral_note.manage") ? (
                  <PastoralNotePanel personId={id} />
                ) : null}
                <div className="space-y-2">
                  {pastoralNotes.length === 0 ? (
                    <p className="text-sm text-mist">Nenhuma observação registrada.</p>
                  ) : (
                    pastoralNotes.map((n) => (
                      <div key={n.id} className="rounded-md border border-line p-3">
                        <p className="text-sm">{n.body}</p>
                        <p className="mt-1 text-xs text-mist">{formatDateTime(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Coluna lateral: ações + históricos */}
        <div className="space-y-4">
          {can(ctx, "people.status.promote") ? (
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPanel personId={id} current={person.status} />
              </CardContent>
            </Card>
          ) : null}

          {can(ctx, "groups.membership.manage") ? (
            <Card>
              <CardHeader>
                <CardTitle>Grupo de Crescimento</CardTitle>
              </CardHeader>
              <CardContent>
                <GcPanel personId={id} currentGcId={person.primaryGcId} gcs={gcs} />
              </CardContent>
            </Card>
          ) : null}

          {can(ctx, "people.family.manage") ? (
            <Card>
              <CardHeader>
                <CardTitle>Vincular família</CardTitle>
              </CardHeader>
              <CardContent>
                <FamilyPanel personId={id} people={peopleForFamily} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Histórico de status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {person.statusHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-2">
                  <span>
                    {h.fromStatus ? `${STATUS_LABEL[h.fromStatus]} → ` : ""}
                    {STATUS_LABEL[h.toStatus]}
                  </span>
                  <span className="text-xs text-mist">{formatDate(h.createdAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-mist">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}

function formatAddress(a: {
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}): string {
  const line1 = [a.street, a.number].filter(Boolean).join(", ");
  const parts = [
    line1,
    a.complement,
    a.district,
    [a.city, a.state].filter(Boolean).join(" / "),
    a.zipCode,
  ].filter((p) => p && p.length > 0);
  return parts.join(" · ") || "—";
}
