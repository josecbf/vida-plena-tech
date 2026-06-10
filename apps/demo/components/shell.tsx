"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  GraduationCap,
  LayoutDashboard,
  Palette,
  ChevronDown,
  Grape,
  BookMarked,
} from "lucide-react";
import { cn } from "@videira/ui";
import { TENANT, getPessoa, iniciais } from "@videira/types";
import type { ReactNode } from "react";
import { useApp, MEMBRO_ID, type Persona } from "@/components/app-context";

const NAV_EQUIPE = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/pessoas", label: "Pessoas", icon: Users, modulo: "01" },
  { href: "/ensino", label: "Ensino", icon: GraduationCap, modulo: "02" },
  { href: "/brand", label: "Marca", icon: Palette },
];

const NAV_MEMBRO = [
  { href: "/aluno", label: "Meus cursos", icon: BookMarked, modulo: "02" },
  { href: "/brand", label: "Marca", icon: Palette },
];

function PersonaToggle() {
  const { persona, setPersona } = useApp();
  const router = useRouter();

  const trocar = (p: Persona) => {
    setPersona(p);
    router.push(p === "membro" ? "/aluno" : "/");
  };

  return (
    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
      {(["equipe", "membro"] as Persona[]).map((p) => (
        <button
          key={p}
          onClick={() => trocar(p)}
          className={cn(
            "rounded-md px-3 py-1 capitalize transition-colors",
            persona === p ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {p === "equipe" ? "Equipe" : "Membro"}
        </button>
      ))}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { persona } = useApp();

  const nav = persona === "membro" ? NAV_MEMBRO : NAV_EQUIPE;
  const membro = getPessoa(MEMBRO_ID);
  const usuario =
    persona === "membro"
      ? { nome: membro?.nome ?? "Membro", iniciais: iniciais(membro?.nome ?? "Membro"), tone: "bg-brand" }
      : { nome: "Pr. Daniel Lima", iniciais: "DL", tone: "bg-salvia" };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <Grape className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold leading-none text-ink">Videira</p>
            <p className="text-xs text-muted">{persona === "membro" ? "Área do aluno" : "Plataforma para Igrejas"}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => {
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
                {"modulo" in item && item.modulo && (
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
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden font-medium text-ink sm:block">{TENANT.nome}</span>
            {persona === "equipe" && (
              <button className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-muted hover:bg-slate-50">
                {TENANT.campus[0].nome}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <PersonaToggle />
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted sm:block">{usuario.nome}</span>
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white", usuario.tone)}>
                {usuario.iniciais}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-7">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
