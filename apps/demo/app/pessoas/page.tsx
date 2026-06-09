"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import {
  PESSOAS,
  STATUS_LABEL,
  iniciais,
  getFamilia,
  type StatusRelacionamento,
} from "@videira/types";
import { Card, Avatar, Badge, PageHeader } from "@/components/ui";

const FILTROS: { id: StatusRelacionamento | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "membro", label: "Membros" },
  { id: "congregante", label: "Congregantes" },
  { id: "visitante", label: "Visitantes" },
  { id: "em-acompanhamento", label: "Em acompanhamento" },
];

const STATUS_TONE: Record<StatusRelacionamento, "brand" | "salvia" | "accent" | "slate"> = {
  membro: "salvia",
  congregante: "brand",
  visitante: "slate",
  "em-acompanhamento": "accent",
};

export default function PessoasPage() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<StatusRelacionamento | "todos">("todos");

  const lista = useMemo(() => {
    return PESSOAS.filter((p) => {
      const okFiltro = filtro === "todos" || p.status === filtro;
      const okBusca =
        busca.trim() === "" ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(busca.toLowerCase()));
      return okFiltro && okBusca;
    });
  }, [busca, filtro]);

  return (
    <div>
      <PageHeader
        title="Pessoas"
        subtitle="Cadastro único — o coração da plataforma."
        action={
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <UserPlus className="h-4 w-4" /> Nova pessoa
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou tag…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                (filtro === f.id ? "bg-brand text-white" : "bg-white text-muted hover:bg-slate-100 border border-slate-200")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <ul className="divide-y divide-slate-100">
          {lista.map((p) => {
            const familia = getFamilia(p.familiaId);
            return (
              <li key={p.id}>
                <Link href={`/pessoas/${p.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                  <Avatar initials={iniciais(p.nome)} tone={p.status === "membro" ? "salvia" : "brand"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{p.nome}</p>
                    <p className="truncate text-xs text-muted">
                      {p.papeis.join(", ")}
                      {familia ? ` · Família ${familia.sobrenome}` : ""}
                    </p>
                  </div>
                  <div className="hidden gap-1.5 sm:flex">
                    {p.tags.slice(0, 2).map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </Link>
              </li>
            );
          })}
          {lista.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted">Nenhuma pessoa encontrada.</li>
          )}
        </ul>
      </Card>
      <p className="mt-3 text-xs text-muted">{lista.length} de {PESSOAS.length} pessoas</p>
    </div>
  );
}
