"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { getCurso } from "@videira/types";
import { Card, CardBody, Badge, Progress, PageHeader } from "@/components/ui";
import { useApp, MEUS_CURSO_IDS } from "@/components/app-context";

export default function AlunoHome() {
  const { concluidasDe } = useApp();

  const cursos = MEUS_CURSO_IDS.map((id) => getCurso(id)).filter(
    (x): x is NonNullable<typeof x> => Boolean(x),
  );

  return (
    <div>
      <PageHeader
        title="Meus cursos"
        subtitle="Continue sua jornada de discipulado na Igreja Videira."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {cursos.map(({ curso, trilha }) => {
          const feitas = concluidasDe(curso.id).length;
          const total = curso.aulas.length;
          const prog = total ? Math.round((feitas / total) * 100) : 0;
          const completo = prog === 100;
          return (
            <Card key={curso.id}>
              <CardBody>
                <div className="mb-3 flex items-center justify-between">
                  <Badge tone="brand">Trilha {trilha.nome}</Badge>
                  {completo && (
                    <span className="flex items-center gap-1 text-xs font-medium text-salvia">
                      <CheckCircle2 className="h-4 w-4" /> Concluído
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink">{curso.nome}</h2>
                    <p className="text-sm text-muted">{curso.descricao}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Progress value={prog} />
                  <span className="w-20 shrink-0 text-right text-xs text-muted">{feitas}/{total} aulas</span>
                </div>

                <Link
                  href={`/aluno/curso/${curso.id}`}
                  className="mt-4 inline-flex items-center gap-1 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  {completo ? "Revisar curso" : feitas > 0 ? "Continuar" : "Começar"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
