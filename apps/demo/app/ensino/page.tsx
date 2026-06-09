import Link from "next/link";
import { BookOpen, ArrowRight, Footprints } from "lucide-react";
import { TRILHAS, totalAlunos, type Trilha } from "@videira/types";
import { Card, CardBody, Badge, PageHeader } from "@/components/ui";

const COR: Record<Trilha["cor"], { dot: string; chip: "brand" | "accent" | "salvia" }> = {
  indigo: { dot: "bg-brand", chip: "brand" },
  ambar: { dot: "bg-accent", chip: "accent" },
  salvia: { dot: "bg-salvia", chip: "salvia" },
};

export default function EnsinoPage() {
  return (
    <div>
      <PageHeader
        title="Ensino"
        subtitle="Trilhas de discipulado com próximo passo pastoral — não um LMS genérico."
      />

      <div className="space-y-6">
        {TRILHAS.map((trilha) => {
          const cor = COR[trilha.cor];
          const totalAulas = trilha.cursos.reduce((s, c) => s + c.aulas.length, 0);
          return (
            <Card key={trilha.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-3 w-3 rounded-full ${cor.dot}`} />
                    <div>
                      <h2 className="font-display text-lg font-semibold text-ink">Trilha {trilha.nome}</h2>
                      <p className="mt-0.5 text-sm text-muted">{trilha.descricao}</p>
                    </div>
                  </div>
                  <Badge tone={cor.chip}>{trilha.cursos.length} cursos · {totalAulas} aulas</Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {trilha.cursos.map((curso) => (
                    <Link
                      key={curso.id}
                      href={`/ensino/curso/${curso.id}`}
                      className="group flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:border-brand hover:bg-brand-50/40"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 text-brand" />
                        <div>
                          <p className="text-sm font-medium text-ink">{curso.nome}</p>
                          <p className="text-xs text-muted">{curso.aulas.length} aulas · {totalAlunos(curso.id)} alunos</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-brand" />
                    </Link>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-lg bg-salvia-50 px-3 py-2 text-sm text-salvia">
                  <Footprints className="h-4 w-4 shrink-0" />
                  <span><span className="font-medium">Próximo passo:</span> {trilha.proximoPasso}</span>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
