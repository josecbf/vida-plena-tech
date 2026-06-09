import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Cake, CalendarCheck, Users } from "lucide-react";
import {
  getPessoa,
  getFamilia,
  PESSOAS,
  STATUS_LABEL,
  iniciais,
  matriculasDaPessoa,
  getCurso,
  progressoCurso,
  type EventoTimeline,
} from "@videira/types";
import { Card, CardBody, Avatar, Badge, Progress } from "@/components/ui";

const TIPO_TONE: Record<EventoTimeline["tipo"], "brand" | "salvia" | "accent" | "slate"> = {
  cadastro: "slate",
  batismo: "brand",
  gc: "salvia",
  ensino: "brand",
  evento: "accent",
  pastoral: "accent",
  voluntariado: "salvia",
};

function fmt(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function PessoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pessoa = getPessoa(id);
  if (!pessoa) notFound();

  const familia = getFamilia(pessoa.familiaId);
  const parentes = familia
    ? familia.membrosIds.filter((mid) => mid !== pessoa.id).map(getPessoa).filter(Boolean)
    : [];
  const matriculas = matriculasDaPessoa(pessoa.id);
  const timeline = [...pessoa.timeline].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div>
      <Link href="/pessoas" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Pessoas
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-xl font-semibold text-white">
          {iniciais(pessoa.nome)}
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{pessoa.nome}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="salvia">{STATUS_LABEL[pessoa.status]}</Badge>
            {pessoa.papeis.map((p) => (
              <Badge key={p}>{p}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody>
              <h2 className="mb-3 font-display text-lg font-semibold">Linha do tempo</h2>
              <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                {timeline.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[1.42rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-white" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{e.titulo}</span>
                      <Badge tone={TIPO_TONE[e.tipo]}>{e.tipo}</Badge>
                    </div>
                    <p className="text-xs text-muted">{fmt(e.data)}{e.descricao ? ` · ${e.descricao}` : ""}</p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          {matriculas.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="mb-3 font-display text-lg font-semibold">Jornada de ensino</h2>
                <ul className="space-y-4">
                  {matriculas.map((m) => {
                    const ctx = getCurso(m.cursoId);
                    if (!ctx) return null;
                    const prog = progressoCurso(ctx.curso, m);
                    return (
                      <li key={m.cursoId}>
                        <div className="flex items-center justify-between text-sm">
                          <Link href={`/ensino/curso/${ctx.curso.id}`} className="font-medium hover:text-brand">
                            {ctx.curso.nome}
                          </Link>
                          <span className="text-muted">{ctx.trilha.nome}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <Progress value={prog} />
                          <span className="w-9 shrink-0 text-right text-xs text-muted">{prog}%</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h2 className="mb-3 font-display text-base font-semibold">Contato</h2>
              <dl className="space-y-2.5 text-sm">
                {pessoa.email && (
                  <div className="flex items-center gap-2 text-muted">
                    <Mail className="h-4 w-4" /> <span className="text-ink">{pessoa.email}</span>
                  </div>
                )}
                {pessoa.telefone && (
                  <div className="flex items-center gap-2 text-muted">
                    <Phone className="h-4 w-4" /> <span className="text-ink">{pessoa.telefone}</span>
                  </div>
                )}
                {pessoa.nascimento && (
                  <div className="flex items-center gap-2 text-muted">
                    <Cake className="h-4 w-4" /> <span className="text-ink">{fmt(pessoa.nascimento)}</span>
                  </div>
                )}
                {pessoa.membroDesde && (
                  <div className="flex items-center gap-2 text-muted">
                    <CalendarCheck className="h-4 w-4" /> <span className="text-ink">Desde {fmt(pessoa.membroDesde)}</span>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {familia && (
            <Card>
              <CardBody>
                <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
                  <Users className="h-4 w-4 text-salvia" /> Família {familia.sobrenome}
                </h2>
                <ul className="space-y-2">
                  {parentes.map((parente) => (
                    <li key={parente!.id}>
                      <Link href={`/pessoas/${parente!.id}`} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-slate-50">
                        <Avatar initials={iniciais(parente!.nome)} tone="salvia" />
                        <div>
                          <p className="text-sm font-medium">{parente!.nome}</p>
                          <p className="text-xs text-muted">{STATUS_LABEL[parente!.status]}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <h2 className="mb-3 font-display text-base font-semibold">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {pessoa.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return PESSOAS.map((p) => ({ id: p.id }));
}
