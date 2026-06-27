import Link from "next/link";
import { requireContext, personScopeWhere, can } from "@/server/context";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  PageHeader,
  Badge,
  Avatar,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Empty,
} from "@/components/ui/misc";
import { STATUS_LABEL, STATUS_ORDER, statusBadgeVariant } from "@/lib/labels";
import { maskCpf, formatCpf } from "@/lib/format";
import { EclesiasticalStatus, Prisma } from "@prisma/client";

export default async function PeopleListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const scopeWhere = await personScopeWhere(ctx);
  const canFullCpf = can(ctx, "people.cpf.view_full");

  const where: Prisma.PersonWhereInput = { ...scopeWhere, archivedAt: null };
  if (sp.q) {
    where.OR = [
      { fullName: { contains: sp.q, mode: "insensitive" } },
      { socialName: { contains: sp.q, mode: "insensitive" } },
      { contacts: { some: { value: { contains: sp.q, mode: "insensitive" } } } },
    ];
  }
  if (sp.status && STATUS_ORDER.includes(sp.status as EclesiasticalStatus)) {
    where.status = sp.status as EclesiasticalStatus;
  }

  const people = await prisma.person.findMany({
    where,
    include: { primaryGc: true, campus: true },
    orderBy: { fullName: "asc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Pessoas"
        description="Cadastro único da igreja. Visão limitada ao seu escopo."
        action={
          can(ctx, "people.person.create") ? (
            <Link href="/pessoas/nova">
              <Button>Nova pessoa</Button>
            </Link>
          ) : undefined
        }
      />

      <form className="mb-4 flex gap-2" method="get">
        <Input name="q" defaultValue={sp.q} placeholder="Buscar por nome ou contato…" className="max-w-xs" />
        <Select name="status" defaultValue={sp.status ?? ""} className="max-w-[200px]">
          <option value="">Todos os status</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {people.length === 0 ? (
        <Empty>Nenhuma pessoa encontrada no seu escopo.</Empty>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Status</TH>
              <TH>GC principal</TH>
              <TH>Campus</TH>
              <TH>CPF</TH>
            </TR>
          </THead>
          <TBody>
            {people.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link href={`/pessoas/${p.id}`} className="flex items-center gap-3 hover:underline">
                    <Avatar name={p.fullName} />
                    <div>
                      <div className="font-medium">{p.fullName}</div>
                      {p.socialName ? (
                        <div className="text-xs text-mist">{p.socialName}</div>
                      ) : null}
                    </div>
                  </Link>
                </TD>
                <TD>
                  <Badge variant={statusBadgeVariant(p.status)}>{STATUS_LABEL[p.status]}</Badge>
                </TD>
                <TD className="text-sm">{p.primaryGc?.name ?? <span className="text-mist">—</span>}</TD>
                <TD className="text-sm">{p.campus?.name ?? <span className="text-mist">—</span>}</TD>
                <TD className="font-mono text-xs">
                  {canFullCpf ? formatCpf(p.cpf) : maskCpf(p.cpf)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="mt-3 text-xs text-mist">
        {people.length} pessoa(s){" "}
        {!canFullCpf ? "· CPF mascarado (você não é administrador)" : ""}
      </p>
    </div>
  );
}
