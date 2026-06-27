import { requireContext, assertPermission } from "@/server/context";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Badge } from "@/components/ui/misc";
import { isProverConfigured } from "@/modules/integrations/prover/client";

export default async function ProverPage() {
  const ctx = await requireContext();
  assertPermission(ctx, "prover.import.manage");

  const configured = isProverConfigured();
  const [batches, mappings] = await Promise.all([
    prisma.importBatch.count({ where: { tenantId: ctx.tenantId } }),
    prisma.externalMapping.count({ where: { tenantId: ctx.tenantId, system: "PROVER" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Importação Prover"
        description="Integração de leitura/importação. Nunca escrevemos no Prover."
      />

      <Card className="mb-4">
        <CardContent className="flex items-center justify-between pt-5">
          <div>
            <h3 className="font-semibold">Status da integração</h3>
            <p className="mt-1 text-sm text-mist">
              {configured
                ? "Configurada. O importador real lerá o ZIP de JSONs do Prover."
                : "Aguardando configuração. Defina PROVER_* no .env.local e forneça o ZIP de JSONs."}
            </p>
          </div>
          {configured ? (
            <Badge variant="success">Configurada</Badge>
          ) : (
            <Badge variant="warning">Aguardando configuração</Badge>
          )}
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-3xl font-bold">{batches}</div>
            <div className="text-sm text-mist">Lotes de importação</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-3xl font-bold">{mappings}</div>
            <div className="text-sm text-mist">Mapeamentos externos (ExternalMapping)</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras já fixadas para a importação (futuro)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-ink/80">
          <p>• Prover é <strong>somente leitura</strong>. Nunca escrevemos no Prover.</p>
          <p>• Importação <strong>idempotente</strong> via <code>ExternalMapping</code>.</p>
          <p>• Importação passa por <strong>deduplicação</strong> (CPF / nome+contato).</p>
          <p>• Cada execução gera <code>ImportBatch</code> + <code>ImportBatchItem</code>.</p>
          <p>• Chave de API fica em <code>.env.local</code>, nunca no código.</p>
          <p>• Status do Prover é mapeado para status eclesiástico canônico; cargos viram papéis.</p>
        </CardContent>
      </Card>
    </div>
  );
}
