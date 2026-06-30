import Link from "next/link";
import { requireContext, assertPermission } from "@/server/context";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Badge, Empty } from "@/components/ui/misc";
import {
  buildConflictReport,
  flattenConflictReport,
  filterConflictRows,
  parseConflictKind,
  type ConflictType,
  type ConflictFlatRow,
} from "@/modules/integrations/prover/gc-membership-conflicts";
import { ALLOWED_DECISIONS, type Decision } from "@/modules/integrations/prover/conflict-resolutions";
import { saveConflictResolutionAction } from "@/modules/integrations/conflict-actions";

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
const DECISION_LABEL: Record<Decision, string> = {
  KEEP_THIS_GC_ACTIVE: "Manter este GC ativo",
  CLOSE_THIS_MEMBERSHIP: "Encerrar vínculo",
  IGNORE_DUPLICATE: "Ignorar duplicidade",
  CONSOLIDATE_HISTORY: "Consolidar histórico",
  MAP_ALIAS_TO_PERSON: "Mapear alias para pessoa",
  REVIEW_LATER: "Revisar depois",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", READY_TO_APPLY: "Pronto p/ aplicar", APPLIED: "Aplicada", CANCELLED: "Cancelada",
};
const STATUS_VARIANT: Record<string, "warning" | "success" | "default" | "muted"> = {
  DRAFT: "warning", READY_TO_APPLY: "success", APPLIED: "default", CANCELLED: "muted",
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

  // decisões já registradas (rascunho), por conflictKey
  const resolutions = await prisma.gcMembershipConflictResolution.findMany({
    where: { tenantId: ctx.tenantId, conflictKey: { in: shown.map((r) => r.conflictKey) } },
    select: { conflictKey: true, decision: true, status: true, note: true },
  });
  const resByKey = new Map(resolutions.map((r) => [r.conflictKey, r]));
  const decidedCount = await prisma.gcMembershipConflictResolution.count({ where: { tenantId: ctx.tenantId } });

  const tab = (value: string, label: string, count: number) => {
    const active = kind === value || (value === "all" && kind === "all");
    const params = new URLSearchParams();
    if (value !== "all") params.set("type", value);
    if (q) params.set("q", q);
    const href = `/prover/gc-memberships/conflicts${params.toString() ? `?${params}` : ""}`;
    return (
      <Link href={href} className={`rounded-md border px-3 py-1.5 text-sm ${active ? "border-ink bg-ink text-paper" : "border-line hover:bg-ink/[0.03]"}`}>
        {label} <span className={active ? "text-paper/70" : "text-mist"}>({count})</span>
      </Link>
    );
  };

  return (
    <div>
      <PageHeader
        title="Pendências de vínculos de GC"
        description="Revisão assistida. Registre a decisão como rascunho — nada é aplicado nesta fase (a aplicação fica para a 3B.3)."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Múltiplos GCs ativos" value={s.multipleActiveGcsPersons} />
        <Stat label="Duplicidades" value={s.duplicateConflicts} />
        <Stat label="Ativo em GC inativo" value={s.activeInInactiveGc} />
        <Stat label="Não mapeada" value={s.personMappingNotFound} />
        <Stat label="Decisões registradas" value={decidedCount} />
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
          <input type="search" name="q" defaultValue={q} placeholder="Nome…" className="h-9 w-64 rounded-md border border-line bg-paper px-3 text-sm text-ink" />
        </label>
        <button type="submit" className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-paper">Buscar</button>
        {q ? (
          <Link href={`/prover/gc-memberships/conflicts${kind !== "all" ? `?type=${kind}` : ""}`} className="h-9 rounded-md border border-line px-4 text-sm leading-9 text-mist">Limpar</Link>
        ) : null}
      </form>

      <p className="mb-3 text-xs text-mist">
        {rows.length} pendência(s){rows.length > VIEW_LIMIT ? ` · mostrando ${VIEW_LIMIT}` : ""}
      </p>

      {shown.length === 0 ? (
        <Empty>Nenhuma pendência com esses filtros.</Empty>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <ConflictRow key={r.conflictKey} row={r} existing={resByKey.get(r.conflictKey) ?? null} />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-mist">
        As decisões ficam como rascunho auditável (<code>GcMembershipConflictResolution</code>). Nada é
        aplicado em <code>GrowthGroupMembership</code> nesta fase.
      </p>
    </div>
  );
}

function ConflictRow({
  row,
  existing,
}: {
  row: ConflictFlatRow;
  existing: { decision: string; status: string; note: string | null } | null;
}) {
  const allowed = ALLOWED_DECISIONS[row.type];
  const targetLabel = row.type === "PERSON_MAPPING_NOT_FOUND" ? "Pessoa alvo" : "GC a manter";
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={TYPE_VARIANT[row.type]}>{TYPE_LABEL[row.type]}</Badge>
          {row.personId ? (
            <Link href={`/pessoas/${row.personId}`} className="font-medium hover:underline">{row.personName}</Link>
          ) : (
            <span className="font-mono text-xs text-mist">{row.personName}</span>
          )}
          {row.growthGroupId ? (
            <Link href={`/gcs/${row.growthGroupId}`} className="text-sm text-mist hover:underline">· {row.gcName}</Link>
          ) : row.gcName ? (
            <span className="text-sm text-mist">· {row.gcName}</span>
          ) : null}
          <span className="text-xs text-mist">· {row.detail}</span>
          <Badge variant="outline">{row.suggestion}</Badge>
          <span className="ml-auto">
            {existing ? (
              <Badge variant={STATUS_VARIANT[existing.status] ?? "muted"}>
                {STATUS_LABEL[existing.status] ?? existing.status}: {existing.decision}
              </Badge>
            ) : (
              <Badge variant="muted">Sem decisão</Badge>
            )}
          </span>
        </div>

        <form action={saveConflictResolutionAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="conflictKey" value={row.conflictKey} />
          <input type="hidden" name="type" value={row.type} />
          {row.personId ? <input type="hidden" name="personId" value={row.personId} /> : null}
          {row.growthGroupId ? <input type="hidden" name="growthGroupId" value={row.growthGroupId} /> : null}
          {row.proverPersonUuid ? <input type="hidden" name="proverPersonUuid" value={row.proverPersonUuid} /> : null}
          <input type="hidden" name="suggestion" value={row.suggestion} />

          <label className="flex flex-col gap-1 text-xs text-mist">
            Decisão
            <select name="decision" defaultValue={existing?.decision ?? ""} className="h-9 rounded-md border border-line bg-paper px-2 text-sm text-ink">
              {allowed.map((d) => (
                <option key={d} value={d}>{DECISION_LABEL[d]}</option>
              ))}
            </select>
          </label>

          {row.targets.length > 0 ? (
            <label className="flex flex-col gap-1 text-xs text-mist">
              {targetLabel}
              <select name="target" className="h-9 w-56 rounded-md border border-line bg-paper px-2 text-sm text-ink">
                <option value="">—</option>
                {row.targets.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="flex flex-1 flex-col gap-1 text-xs text-mist">
            Observação
            <input name="note" defaultValue={existing?.note ?? ""} placeholder="Opcional…" className="h-9 min-w-48 rounded-md border border-line bg-paper px-3 text-sm text-ink" />
          </label>

          <button type="submit" name="status" value="DRAFT" className="h-9 rounded-md border border-line px-4 text-sm font-medium hover:bg-ink/[0.03]">
            Salvar rascunho
          </button>
          <button type="submit" name="status" value="READY_TO_APPLY" className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-paper">
            Marcar pronto p/ aplicar
          </button>
        </form>
      </CardContent>
    </Card>
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
