"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, GraduationCap, LayoutDashboard, Palette, ChevronDown, Grape } from "lucide-react";
import { cn } from "@videira/ui";
import { TENANT } from "@videira/types";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/pessoas", label: "Pessoas", icon: Users, modulo: "01" },
  { href: "/ensino", label: "Ensino", icon: GraduationCap, modulo: "02" },
  { href: "/brand", label: "Marca", icon: Palette },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <Grape className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold leading-none text-ink">Videira</p>
            <p className="text-xs text-muted">Plataforma para Igrejas</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-50 text-brand" : "text-muted hover:bg-slate-50 hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.modulo && (
                  <span className="ml-auto text-xs text-slate-400">{item.modulo}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-muted">
          Demo navegável · dados fictícios
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-ink">{TENANT.nome}</span>
            <button className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-muted hover:bg-slate-50">
              {TENANT.campus[0].nome}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:block">Pr. Daniel Lima</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-salvia text-xs font-semibold text-white">
              DL
            </span>
          </div>
        </header>

        <main className="flex-1 px-6 py-7">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
