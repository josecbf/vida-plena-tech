"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Play, CheckCircle2, RotateCcw } from "lucide-react";
import { getCurso } from "@videira/types";
import { Card, CardBody, Badge } from "@/components/ui";
import { useApp } from "@/components/app-context";

export default function PlayerAula() {
  const { cursoId, aulaId } = useParams<{ cursoId: string; aulaId: string }>();
  const router = useRouter();
  const { estaConcluida, alternar } = useApp();
  const ctx = getCurso(cursoId);

  if (!ctx) {
    return (
      <div>
        <Link href="/aluno" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Meus cursos
        </Link>
        <p className="text-sm text-muted">Aula não encontrada.</p>
      </div>
    );
  }

  const { curso, trilha } = ctx;
  const idx = curso.aulas.findIndex((a) => a.id === aulaId);
  const aula = curso.aulas[idx];
  if (!aula) {
    return <p className="text-sm text-muted">Aula não encontrada.</p>;
  }

  const feita = estaConcluida(curso.id, aula.id);
  const anterior = idx > 0 ? curso.aulas[idx - 1] : null;
  const proxima = idx < curso.aulas.length - 1 ? curso.aulas[idx + 1] : null;

  const concluirEAvancar = () => {
    if (!feita) alternar(curso.id, aula.id);
    if (proxima) router.push(`/aluno/aula/${curso.id}/${proxima.id}`);
    else router.push(`/aluno/curso/${curso.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/aluno/curso/${curso.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {curso.nome}
      </Link>

      <div className="mb-3 flex items-center gap-2">
        <Badge tone="brand">Trilha {trilha.nome}</Badge>
        <span className="text-xs text-muted">Aula {idx + 1} de {curso.aulas.length}</span>
      </div>

      {/* Player (demonstração) */}
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#3d4e9e] to-[#5b8c7b]">
        <button className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-brand shadow-lg transition-transform hover:scale-105">
          <Play className="ml-1 h-7 w-7" />
        </button>
        <span className="absolute bottom-3 left-4 text-xs font-medium text-white/80">Aula em vídeo · demonstração</span>
      </div>

      <h1 className="mt-5 font-display text-2xl font-semibold text-ink">{aula.titulo}</h1>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {aula.duracaoMin} min</span>
        {feita && <span className="flex items-center gap-1 text-salvia"><CheckCircle2 className="h-3.5 w-3.5" /> Concluída</span>}
      </div>

      <Card className="mt-4">
        <CardBody>
          <p className="text-sm leading-relaxed text-muted">
            Nesta aula, <span className="text-ink">{aula.titulo.toLowerCase()}</span> é apresentado de forma simples e
            prática, com base bíblica e aplicação para o seu dia a dia. Ao final, reserve um momento de oração e, se tiver
            dúvidas, converse com seu discipulador ou líder de GC.
          </p>
        </CardBody>
      </Card>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={concluirEAvancar}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <CheckCircle2 className="h-4 w-4" />
          {feita ? (proxima ? "Próxima aula" : "Voltar ao curso") : "Marcar como concluída"}
        </button>
        {feita && (
          <button
            onClick={() => alternar(curso.id, aula.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-muted hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Desmarcar
          </button>
        )}
      </div>

      {/* Navegação entre aulas */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
        {anterior ? (
          <Link href={`/aluno/aula/${curso.id}/${anterior.id}`} className="inline-flex items-center gap-1 text-muted hover:text-ink">
            <ChevronLeft className="h-4 w-4" /> {anterior.titulo}
          </Link>
        ) : (
          <span />
        )}
        {proxima ? (
          <Link href={`/aluno/aula/${curso.id}/${proxima.id}`} className="inline-flex items-center gap-1 text-muted hover:text-ink">
            {proxima.titulo} <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
