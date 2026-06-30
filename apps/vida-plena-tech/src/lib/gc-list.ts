// ─────────────────────────────────────────────────────────────────────────
// LISTA DE GCs — helpers PUROS de busca/filtro/paginação (testáveis).
//
// Lê os parâmetros da query string e monta o `where` do Prisma + a query
// string de navegação. SOMENTE LEITURA (não altera nada).
// ─────────────────────────────────────────────────────────────────────────

export type GcStatusFilter = "all" | "active" | "inactive";
export type GcMembersFilter = "all" | "with" | "without";

export const GC_PAGE_SIZE = 50;

export interface GcListParams {
  q: string;
  status: GcStatusFilter;
  members: GcMembersFilter;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

export function parseGcListParams(sp: RawParams): GcListParams {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const status = get("status");
  const members = get("members");
  const pageNum = parseInt(get("page") ?? "1", 10);
  return {
    q: (get("q") ?? "").trim(),
    status: status === "active" || status === "inactive" ? status : "all",
    members: members === "with" || members === "without" ? members : "all",
    page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1,
  };
}

/** Monta o objeto `where` do Prisma (genérico p/ não acoplar o tipo aqui). */
export function buildGcListWhere(opts: {
  tenantId: string;
  scopeIds: string[] | "ALL";
  params: GcListParams;
}): Record<string, unknown> {
  const { tenantId, scopeIds, params } = opts;
  const where: Record<string, unknown> = { tenantId, archivedAt: null };
  if (scopeIds !== "ALL") where.id = { in: scopeIds };
  if (params.q) where.name = { contains: params.q, mode: "insensitive" };
  if (params.status === "active") where.active = true;
  else if (params.status === "inactive") where.active = false;
  if (params.members === "with") where.memberships = { some: { leftAt: null } };
  else if (params.members === "without") where.memberships = { none: { leftAt: null } };
  return where;
}

/** Query string preservando filtros, com overrides (ex.: trocar de página). */
export function gcListQueryString(params: GcListParams, overrides: Partial<GcListParams> = {}): string {
  const p = { ...params, ...overrides };
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.status !== "all") sp.set("status", p.status);
  if (p.members !== "all") sp.set("members", p.members);
  if (p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function totalPages(totalCount: number): number {
  return Math.max(1, Math.ceil(totalCount / GC_PAGE_SIZE));
}
