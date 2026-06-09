import { Grape } from "lucide-react";
import { brand } from "@videira/ui";
import { Card, CardBody, PageHeader } from "@/components/ui";

const CORES: { nome: string; valor: string; uso: string }[] = [
  { nome: "Índigo", valor: brand.cores.indigo, uso: "Primária" },
  { nome: "Âmbar", valor: brand.cores.ambar, uso: "Acento" },
  { nome: "Verde-sálvia", valor: brand.cores.salvia, uso: "Apoio" },
  { nome: "Tinta", valor: brand.cores.tinta, uso: "Texto" },
  { nome: "Cinza", valor: brand.cores.cinza, uso: "Secundário" },
  { nome: "Névoa", valor: brand.cores.nevoa, uso: "Fundo" },
];

export default function BrandPage() {
  return (
    <div>
      <PageHeader title="Marca — Videira" subtitle="Identidade visual mínima (provisória). Nome e cores podem mudar." />

      <Card>
        <CardBody className="flex items-center gap-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white">
            <Grape className="h-9 w-9" />
          </span>
          <div>
            <p className="font-display text-3xl font-semibold text-ink">{brand.nome}</p>
            <p className="text-sm text-muted">{brand.tagline}</p>
          </div>
        </CardBody>
      </Card>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Paleta</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CORES.map((c) => (
          <Card key={c.nome}>
            <div className="h-20 rounded-t-xl" style={{ backgroundColor: c.valor }} />
            <CardBody className="p-3">
              <p className="text-sm font-medium text-ink">{c.nome}</p>
              <p className="text-xs text-muted">{c.uso}</p>
              <p className="mt-1 font-mono text-xs uppercase text-slate-400">{c.valor}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Tipografia</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-muted">Títulos · Fraunces</p>
            <p className="font-display text-3xl font-semibold text-ink">Cuidado e excelência</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-muted">Interface · Inter</p>
            <p className="text-lg text-ink">Telas densas, claras e rápidas para equipes e voluntários.</p>
          </CardBody>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Tom de voz</h2>
      <Card>
        <CardBody>
          <p className="text-sm text-muted">
            Acolhedor, claro e confiável. A tecnologia serve ao cuidado pastoral — nunca ao controle frio.
            Voluntários e membros têm fluxos simples; equipes administrativas têm telas densas e rápidas.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
