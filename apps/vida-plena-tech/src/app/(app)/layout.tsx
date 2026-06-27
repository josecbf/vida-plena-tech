import { requireContext, can } from "@/server/context";
import { ROLE_LABEL } from "@/server/rbac";
import { Sidebar, type NavItem } from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();

  // Navegação montada por permissão (deny-by-default também na UI).
  const items: NavItem[] = [{ href: "/", label: "Dashboard", icon: "dashboard" }];
  if (can(ctx, "people.person.view"))
    items.push({ href: "/pessoas", label: "Pessoas", icon: "people" });
  if (can(ctx, "groups.gc.view"))
    items.push({ href: "/gcs", label: "Grupos de Crescimento", icon: "groups" });
  if (can(ctx, "events.event.view"))
    items.push({ href: "/eventos", label: "Eventos", icon: "events" });
  items.push({
    href: "/minhas-inscricoes",
    label: "Minhas inscrições",
    icon: "tickets",
  });
  if (can(ctx, "audit.log.view"))
    items.push({ href: "/auditoria", label: "Auditoria", icon: "audit" });
  if (can(ctx, "admin.users.manage"))
    items.push({ href: "/usuarios", label: "Usuários e papéis", icon: "users" });
  if (can(ctx, "admin.modules.view"))
    items.push({ href: "/modulos", label: "Módulos", icon: "modules" });
  if (can(ctx, "prover.import.manage"))
    items.push({ href: "/prover", label: "Importação Prover", icon: "prover" });

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={items}
        user={{
          name: ctx.userName,
          role: ROLE_LABEL[ctx.primaryRole],
          tenant: ctx.tenantName,
        }}
      />
      <main className="flex-1 overflow-x-hidden bg-paper px-8 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
