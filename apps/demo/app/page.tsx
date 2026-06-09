import Link from "next/link";
import { ArrowRight, HeartHandshake, GraduationCap } from "lucide-react";
import {
  PESSOAS,
  MATRICULAS,
  iniciais,
  getPessoa,
  getCurso,
  progressoCurso,
} from "@videira/types";
import { Card, CardBody, Stat, Avatar, Badge, Progress, PageHeader } from "@/components/ui";

export default function HomePage() {
  const membros = PESSOAS.filter((p) => p.status === "membro").length;
  const acompanhamento = PESSOAS.filter((p) => p.status === "em-acompanhamento");
  const alunosAtivos = new Set(MATRICULAS.map((m) => m.pessoaId)).size;

  const emAndamento = MATRICULAS.map((m) => {
    const ctx = getCurso(m.cursoId);
    const pessoa = getPessoa(m.pessoaId);
    if (!ctx || !pessoa) return null;
    return { pessoa, curso: ctx.curso, progresso: progressoCurso(ctx.curso, m) };
  })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.progresso < 100)
    .slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Bom dia, Pr. Daniel 👋"
        subtitle="Um panorama do cuidado e do discipulado na Igreja Videira."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Pessoas cadastradas" value={PESSOAS.length} />
        <Stat label="Membros" value={membros} tone="salvia" />
        <Stat label="Em acompanhamento" value={acompanhamento.length} tone="accent" />
        <Stat label="Alunos ativos" value={alunosAtivos} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-salvia" />
              <h2 className="font-display text-lg font-semibold">Cuidado pastoral</h2>
            </div>
            <ul className="space-y-3">
              {acompanhamento.map((p) => (
                <li key={p.id}>
                  <Link href={`/pessoas/${p.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                    <Avatar initials={iniciais(p.nome)} tone="salvia" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.nome}</p>
                      <p className="truncate text-xs text-muted">{p.tags.join(" · ")}</p>
                    </div>
                    <Badge tone="accent">Acompanhar</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-brand" />
              <h2 className="font-display text-lg font-semibold">Ensino em andamento</h2>
            </div>
            <ul className="space-y-4">
              {emAndamento.map(({ pessoa, curso, progresso }) => (
                <li key={pessoa.id + curso.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{pessoa.nome}</span>
                    <span className="text-muted">{curso.nome}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Progress value={progresso} />
                    <span className="w-9 shrink-0 text-right text-xs text-muted">{progresso}%</span>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/ensino" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              Ver trilhas <ArrowRight className="h-4 w-4" />
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
