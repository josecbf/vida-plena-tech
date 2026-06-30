import Link from "next/link";
import { requireContext, assertPermission } from "@/server/context";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Badge, Empty, Table, THead, TBody, TR, TH, TD } from "@/components/ui/misc";
import {
  buildConflictReport,
  flattenConflictReport,
  filterConflictRows,
  parseConflictKind,
  type ConflictType,
} from "@/modules/integrations/prover/gc-membership-conflicts";

const TYPE_LABEL: Record<ConflictType, string> = {
  MULTIPLE_ACTIVE_GCS: "Múltiplos GCs ativos",
  DUPLICATE_MEMBERSHIP_CONFLICT: "Duplicidade conflitante",
  ACTIVE_MEMBERSHIP_IN_INACTIVE_GC: "Ativo em GC inativo",
  PERSON_MAPPING_NOT_FOUND: "Pessoa não mapeada",
};
const TYPE_VARIANT: Record<ConflictType, "warning" | "danger" | "muted" | "outline"> = {
  MULTIPLE_ACTIVE_GCS: "warning",
  DUPLICATE_MEMBERSHIP_CONFLICT: "danger",
  ACTIVE_MEMBERSHIP_IN_INACTIVE_GC: "outline",
  PERSON_MAPPING_NOT_FOUND: "muted",
};

const VIEW_LIMIT = 100;

export default async function GcConflictsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireContext();
  assertPermission(ctx, "prover.import.manage");

  const sp = await searchParams;
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const kind = parseConflictKind(get("type"));
  const q = (get("q") ?? "").trim();

  const report = await buildConflictReport(prisma, { tenantId: ctx.tenantId });
  const allRows = flattenConflictReport(report);
  const rows = filterConflictRows(allRows, { kind, q });
  const shown = rows.slice(0, VIEW_LIMIT);
  const s = report.summary;

  const tab = (value: string, label: string, count: number) => {
    const active = kind === value || (value === "all" && kind === "all");
    const params = new URLSearchParams();
    if (value !== "all") params.set("type", value);
    if (q) params.set("q", q);
    const href = `/prover/gc-memberships/conflicts${params.toString() ? `?${params}` : ""}`;
    return (
      <Link
        href={href}
        className={`rounded-md border px-3 py-1.5 text-sm ${active ? "border-ink bg-ink text-paper" : "border-line hover:bg-ink/[0.03]"}`}
      >
        {label} <span className={active ? "text-paper/70" : "text-mist"}>({count})</span>
      </Link>
    );
  };

  return (
    <div>
      <PageHeader
        title="Pendências de vínculos de GC"
        description="Revisão assistida (read-only). Sugestões não-vinculantes — nada é aplicado automaticamente."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Múltiplos GCs ativos (pessoas)" value={s.multipleActiveGcsPersons} />
        <Stat label="Duplicidades conflitantes" value={s.duplicateConflicts} />
        <Stat label="Ativo em GC inativo" value={s.activeInInactiveGc} />
        <Stat label="Pessoa não mapeada" value={s.personMappingNotFound} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {tab("all", "Todas", allRows.length)}
        {tab("multiple_active", "Múltiplos GCs", s.multipleActiveGcsPersons)}
        {tab("duplicate", "Duplicidade", s.duplicateConflicts)}
        {tab("inactive_gc", "GC inativo", s.activeInInactiveGc)}
        {tab("unmapped", "Não mapeada", s.personMappingNotFound)}
      </div>

      <form method="get" className="mb-4 flex items-end gap-2">
        {kind !== "all" ? <input type="hidden" name="type" value={kind} /> : null}
        <label className="flex flex-col gap-1 text-xs text-mist">
          Buscar por nome (pessoa ou GC)
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nome…"
            className="h-9 w-64 rounded-md border border-line bg-paper px-3 text-sm text-ink"
          />
        </label>
        <button type="submit" className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-paper">
          Buscar
        </button>
        {q ? (
          <Link href={`/prover/gc-memberships/conflicts${kind !== "all" ? `?type=${kind}` : ""}`} className="h-9 rounded-md border border-line px-4 text-sm leading-9 text-mist">
            Limpar
          </Link>
        ) : null}
      </form>

      <Card>
        <CardHeader>
          <CardTitle>
            {rows.length} pendência(s){rows.length > VIEW_LIMIT ? ` · mostrando ${VIEW_LIMIT}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shown.length === 0 ? (
            <Empty>Nenhuma pendência com esses filtros.</Empty>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Tipo</TH>
                  <TH>Pessoa</TH>
                  <TH>GC</TH>
                  <TH>Detalhe</TH>
                  <TH>Sugestão</TH>
                </TR>
              </THead>
              <TBody>
                {shown.map((r, i) => (
                  <TR key={i}>
                    <TD>
                      <Badge variant={TYPE_VARIANT[r.type]}>{TYPE_LABEL[r.type]}</Badge>
                    </TD>
                    <TD className="text-sm">
                      {r.personId ? (
                        <Link href={`/pessoas/${r.personId}`} className="font-medium hover:underline">
                          {r.personName}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-mist">{r.personName}</span>
                      )}
                    </TD>
                    <TD className="text-sm">
                      {r.growthGroupId ? (
                        <Link href={`/gcs/${r.growthGroupId}`} className="hover:underline">
                          {r.gcName ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-mist">{r.gcName ?? "—"}</span>
                      )}
                    </TD>
                    <TD className="text-xs text-mist">{r.detail}</TD>
                    <TD>
                      <Badge variant="outline">{r.suggestion}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-mist">
            Somente leitura. Nenhuma decisão é aplicada — sugestões são não-vinculantes. Relatório
            completo (JSON/CSV) via <code>pnpm prover:gc-memberships:conflicts-report</code> (fora do git).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-mist">{label}</div>
    </div>
  );
}
