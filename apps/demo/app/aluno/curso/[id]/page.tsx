"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Clock, PlayCircle, Footprints } from "lucide-react";
import { getCurso } from "@videira/types";
import { Card, CardBody, Badge, Progress } from "@/components/ui";
import { useApp } from "@/components/app-context";

export default function AlunoCurso() {
  const { id } = useParams<{ id: string }>();
  const { concluidasDe, estaConcluida } = useApp();
  const ctx = getCurso(id);

  if (!ctx) {
    return (
      <div>
        <Link href="/aluno" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Meus cursos
        </Link>
        <p className="text-sm text-muted">Curso não encontrado.</p>
      </div>
    );
  }

  const { curso, trilha } = ctx;
  const feitas = concluidasDe(curso.id).length;
  const total = curso.aulas.length;
  const prog = total ? Math.round((feitas / total) * 100) : 0;
  const completo = prog === 100;
  const proxima = curso.aulas.find((a) => !estaConcluida(curso.id, a.id)) ?? curso.aulas[0];

  return (
    <div>
      <Link href="/aluno" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Meus cursos
      </Link>

      <div className="mb-6">
        <Badge tone="brand">Trilha {trilha.nome}</Badge>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">{curso.nome}</h1>
        <p className="mt-1 text-sm text-muted">{curso.descricao}</p>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={prog} />
          <span className="w-20 shrink-0 text-right text-xs text-muted">{feitas}/{total} aulas</span>
        </div>
        {!completo && (
          <Link
            href={`/aluno/aula/${curso.id}/${proxima.id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <PlayCircle className="h-4 w-4" /> {feitas > 0 ? "Continuar de onde parei" : "Começar primeira aula"}
          </Link>
        )}
      </div>

      <Card>
        <CardBody>
          <h2 className="mb-2 font-display text-lg font-semibold">Aulas</h2>
          <ol className="divide-y divide-slate-100">
            {curso.aulas.map((aula, i) => {
              const feita = estaConcluida(curso.id, aula.id);
              return (
                <li key={aula.id}>
                  <Link
                    href={`/aluno/aula/${curso.id}/${aula.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-slate-50"
                  >
                    {feita ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-salvia" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                    )}
                    <span className="text-xs text-slate-400">{i + 1}</span>
                    <span className={"flex-1 text-sm " + (feita ? "text-muted line-through" : "text-ink")}>
                      {aula.titulo}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="h-3.5 w-3.5" /> {aula.duracaoMin} min
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>

      {completo && (
        <div className="mt-5 flex items-center gap-2 rounded-lg bg-salvia-50 px-4 py-3 text-sm text-salvia">
          <Footprints className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Parabéns! Curso concluído.</span> Próximo passo: {trilha.proximoPasso}
          </span>
        </div>
      )}
    </div>
  );
}
