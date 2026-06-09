import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PlayCircle, Clock } from "lucide-react";
import {
  getCurso,
  TRILHAS,
  MATRICULAS,
  getPessoa,
  progressoCurso,
  iniciais,
} from "@videira/types";
import { Card, CardBody, Avatar, Badge, Progress } from "@/components/ui";

export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = getCurso(id);
  if (!ctx) notFound();
  const { curso, trilha } = ctx;

  const alunos = MATRICULAS.filter((m) => m.cursoId === curso.id)
    .map((m) => {
      const pessoa = getPessoa(m.pessoaId);
      return pessoa ? { pessoa, progresso: progressoCurso(curso, m) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.progresso - a.progresso);

  const totalMin = curso.aulas.reduce((s, a) => s + a.duracaoMin, 0);

  return (
    <div>
      <Link href="/ensino" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Ensino
      </Link>

      <div className="mb-6">
        <Badge tone="brand">Trilha {trilha.nome}</Badge>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">{curso.nome}</h1>
        <p className="mt-1 text-sm text-muted">{curso.descricao}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1"><PlayCircle className="h-4 w-4" /> {curso.aulas.length} aulas</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {totalMin} min</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              <h2 className="mb-3 font-display text-lg font-semibold">Aulas</h2>
              <ol className="divide-y divide-slate-100">
                {curso.aulas.map((aula, i) => (
                  <li key={aula.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-ink">{aula.titulo}</span>
                    <span className="text-xs text-muted">{aula.duracaoMin} min</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardBody>
              <h2 className="mb-3 font-display text-base font-semibold">Alunos ({alunos.length})</h2>
              <ul className="space-y-4">
                {alunos.map(({ pessoa, progresso }) => (
                  <li key={pessoa.id}>
                    <Link href={`/pessoas/${pessoa.id}`} className="flex items-center gap-3">
                      <Avatar initials={iniciais(pessoa.nome)} tone="salvia" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{pessoa.nome}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={progresso} />
                          <span className="w-9 shrink-0 text-right text-xs text-muted">{progresso}%</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
                {alunos.length === 0 && <li className="text-sm text-muted">Nenhum aluno matriculado.</li>}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return TRILHAS.flatMap((t) => t.cursos.map((c) => ({ id: c.id })));
}
