import { requireContext, assertPermission } from "@/server/context";
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
import { formatDateTime } from "@/lib/format";
import { Sensitivity } from "@prisma/client";

const SENS_VARIANT: Record<Sensitivity, "muted" | "outline" | "warning" | "danger"> = {
  PUBLIC: "muted",
  INTERNAL: "outline",
  CONFIDENTIAL: "warning",
  RESTRICTED: "danger",
};

export default async function AuditPage() {
  const ctx = await requireContext();
  assertPermission(ctx, "audit.log.view");

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: ctx.tenantId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Trilha de alterações relevantes. Histórico não é apagado."
      />
      {logs.length === 0 ? (
        <Empty>Nenhum registro de auditoria.</Empty>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Quando</TH>
              <TH>Ator</TH>
              <TH>Ação</TH>
              <TH>Entidade</TH>
              <TH>Sensibilidade</TH>
              <TH>Motivo</TH>
            </TR>
          </THead>
          <TBody>
            {logs.map((l) => (
              <TR key={l.id}>
                <TD className="whitespace-nowrap text-xs text-mist">
                  {formatDateTime(l.createdAt)}
                </TD>
                <TD className="text-sm">{l.actor?.name ?? "Sistema"}</TD>
                <TD>
                  <code className="rounded bg-ink/5 px-1.5 py-0.5 text-xs">
                    {l.module ? `${l.module}.` : ""}
                    {l.action}
                  </code>
                </TD>
                <TD className="text-sm">{l.entityType}</TD>
                <TD>
                  <Badge variant={SENS_VARIANT[l.sensitivity]}>{l.sensitivity}</Badge>
                </TD>
                <TD className="text-sm text-mist">{l.reason ?? "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="mt-3 text-xs text-mist">
        Mostrando até 200 registros mais recentes.
      </p>
    </div>
  );
}
