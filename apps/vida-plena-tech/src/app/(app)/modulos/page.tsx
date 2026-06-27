import { requireContext, assertPermission } from "@/server/context";
import { prisma } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, Badge } from "@/components/ui/misc";

const MODULE_META: Record<string, { name: string; desc: string }> = {
  people: { name: "Pessoas", desc: "Cadastro canônico — o centro da plataforma." },
  groups: { name: "Grupos de Crescimento", desc: "GCs, encontros, presença e saúde do grupo." },
  events: { name: "Eventos", desc: "Eventos e inscrições (sem pagamento nesta fase)." },
  teaching: { name: "Ensino / EAD", desc: "Cursos e trilhas — próximo módulo (não implementado)." },
};

export default async function ModulesPage() {
  const ctx = await requireContext();
  assertPermission(ctx, "admin.modules.view");

  const subs = await prisma.moduleSubscription.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { moduleKey: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Módulos habilitados"
        description="Módulos são ativáveis por tenant. Todos consomem o Person canônico — nenhum cria cadastro paralelo."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {subs.map((s) => {
          const meta = MODULE_META[s.moduleKey] ?? { name: s.moduleKey, desc: "" };
          return (
            <Card key={s.id}>
              <CardContent className="flex items-start justify-between pt-5">
                <div>
                  <h3 className="font-semibold">{meta.name}</h3>
                  <p className="mt-1 text-sm text-mist">{meta.desc}</p>
                </div>
                {s.active ? (
                  <Badge variant="success">Ativo</Badge>
                ) : (
                  <Badge variant="muted">Inativo</Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-mist">
        Mesmo que um cliente contrate só Ensino no futuro, ele ainda usará um Person mínimo do Core.
      </p>
    </div>
  );
}
