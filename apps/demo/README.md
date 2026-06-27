# Videira — Demo (Pessoas + Ensino)

Protótipo navegável dos módulos **01 Pessoas** e **02 Ensino** com dados fictícios (mock). Next.js 15 + Tailwind v4 + design system da Videira (`@videira/ui`).

## Rodar localmente

A partir da **raiz do monorepo**:

```bash
pnpm install
pnpm --filter @videira/demo dev
# abre http://localhost:3000
```

Build de produção:

```bash
pnpm --filter @videira/demo build
```

## Telas

- `/` — painel com indicadores, cuidado pastoral e ensino em andamento
- `/pessoas` — lista com busca e filtro por status
- `/pessoas/[id]` — perfil: contato, família, linha do tempo, jornada de ensino
- `/ensino` — trilhas de discipulado (Novo Convertido, Discipulado, Liderança) + próximo passo
- `/ensino/curso/[id]` — aulas do curso e alunos com progresso
- `/brand` — identidade visual (cores, tipografia, tom)

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Em **Settings → General → Root Directory**, defina `apps/demo`.
3. Framework: **Next.js** (detectado). Build command e install ficam automáticos (pnpm workspaces).
4. Deploy. As rotas dinâmicas já são pré-renderizadas (SSG) a partir dos dados mock.

> Sem variáveis de ambiente, banco ou login nesta versão — é um protótipo de UX.

## Dados

Os dados ficam em `packages/types` (`PESSOAS`, `FAMILIAS`, `TRILHAS`, `MATRICULAS`). Trocar mock por backend real depois é só substituir essas fontes.
