import { requireContext, assertPermission } from "@/server/context";
import { prisma } from "@/server/db";
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
} from "@/components/ui/misc";
import { ROLE_LABEL } from "@/server/rbac";
import { ScopeType } from "@prisma/client";

const SCOPE_LABEL: Record<ScopeType, string> = {
  TENANT: "Igreja",
  CAMPUS: "Campus",
  AREA: "Área",
  SUPERVISION: "Supervisão",
  GC: "GC",
};

export default async function UsersPage() {
  const ctx = await requireContext();
  assertPermission(ctx, "admin.users.manage");

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: ctx.tenantId },
    include: { user: true, person: true, roleAssignments: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div>
      <PageHeader
        title="Usuários e papéis"
        description="Papéis são separados do status eclesiástico. Escopo limita o que cada um vê."
      />
      <Table>
        <THead>
          <TR>
            <TH>Usuário</TH>
            <TH>E-mail</TH>
            <TH>Pessoa vinculada</TH>
            <TH>Papéis (escopo)</TH>
          </TR>
        </THead>
        <TBody>
          {memberships.map((m) => (
            <TR key={m.id}>
              <TD>
                <span className="flex items-center gap-3">
                  <Avatar name={m.user.name} />
                  <span className="text-sm font-medium">{m.user.name}</span>
                </span>
              </TD>
              <TD className="text-sm text-mist">{m.user.email}</TD>
              <TD className="text-sm">{m.person?.fullName ?? <span className="text-mist">—</span>}</TD>
              <TD>
                <div className="flex flex-wrap gap-1">
                  {m.roleAssignments.map((r) => (
                    <Badge key={r.id} variant="outline">
                      {ROLE_LABEL[r.role]}
                      <span className="ml-1 text-mist">· {SCOPE_LABEL[r.scopeType]}</span>
                    </Badge>
                  ))}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <p className="mt-3 text-xs text-mist">
        Edição de papéis fica fora do escopo desta demo (somente leitura). A atribuição é seedada.
      </p>
    </div>
  );
}
