"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Network,
  CalendarDays,
  Ticket,
  ScrollText,
  ShieldCheck,
  Boxes,
  DownloadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { logout } from "@/modules/core/auth-actions";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

const ICONS = {
  dashboard: LayoutDashboard,
  people: Users,
  groups: Network,
  events: CalendarDays,
  tickets: Ticket,
  audit: ScrollText,
  users: ShieldCheck,
  modules: Boxes,
  prover: DownloadCloud,
};

export function Sidebar({
  items,
  user,
}: {
  items: NavItem[];
  user: { name: string; role: string; tenant: string };
}) {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-paper">
      <div className="flex items-center gap-2 px-5 py-5">
        <Logo size={26} className="text-ink" />
        <div className="leading-tight">
          <div className="display text-sm">Vida Plena</div>
          <div className="tagline text-[9px] text-mist">Tech</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div className="mb-2 px-2">
          <div className="truncate text-sm font-medium">{user.name}</div>
          <div className="truncate text-xs text-mist">{user.role}</div>
          <div className="truncate text-xs text-mist">{user.tenant}</div>
        </div>
        <form action={logout}>
          <button className="w-full rounded-md px-2 py-1.5 text-left text-xs text-mist hover:bg-ink/5 hover:text-ink">
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
