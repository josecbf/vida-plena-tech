# CLAUDE-ZE.md — Log de Progresso / Handoff

> **Para um novo chat:** leia este arquivo de cima a baixo. Ele descreve o que estamos construindo, as decisões tomadas, o estado atual e o próximo passo. Combine com [`ze-start.md`](ze-start.md) (plano + todo list). Depois de qualquer trabalho, **atualize este arquivo** antes de encerrar.

---

## O que é este projeto

Transformar o repositório `plataforma-igrejas-docs` (até agora **só documentação** de produto de um SaaS modular para igrejas, inspirado no Planning Center) em um **monorepo de desenvolvimento**. A plataforma recebeu o nome provisório **Videira**.

Contexto de produto completo está em `docs/` (após a reorg) — comece por `docs/000 - Hub.md`, `docs/PRELIMINARES/Visao Executiva.md` e `docs/Módulos/00 Indice de Qualidade dos Modulos.md`.

## Objetivos desta linha de trabalho (branch `ze-start`)

1. Reorganizar o repo em monorepo (`docs/` + `apps/` + `packages/` + `agents/`).
2. Criar identidade visual mínima da Videira (como código).
3. Criar uma **demo navegável na Vercel** dos módulos **01 Pessoas** e **02 Ensino** (dados mock).
4. Criar um **agente de IA por papel** dos Squads em `agents/`, com modelo recomendado por papel.

## Decisões travadas

- **Monorepo** com pnpm workspaces + Turborepo (não repos separados, não pasta `work/`).
- **Nome:** Videira (provisório, mudável).
- **Demo:** protótipo navegável com **dados mock** (Next.js + Tailwind + shadcn/ui), sem banco/login nesta v1.
- **Branch de trabalho:** `ze-start` (merge no `main` é decisão do dono — ver `COLLABORATION.md`).

## Stack escolhida

- Monorepo: pnpm workspaces + Turborepo
- App: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- Deploy: Vercel (raiz do app = `apps/demo`)
- Ambiente local confirmado: node v25.8.1, pnpm 10.32.1

---

## Estado atual

**Fases 0, 1, 2 e 3 ✅ concluídas. A demo builda. Falta só o deploy manual na Vercel (Fase 4).**

### Feito até agora
- Branch `ze-start` criada; `ze-start.md` (plano + todo) e `CLAUDE-ZE.md` (handoff).
- **Fase 0:** doc movida para `docs/` (histórico preservado), monorepo (pnpm workspaces + Turborepo). Commit `e84840a`.
- **Fase 2:** 10 agentes em `agents/` + `.claude/agents/`. Commit `e4fb42b`.
- **Fase 1:** `packages/ui` (tokens Videira + `cn`), tema Tailwind v4, componentes base (`apps/demo/components/ui.tsx`), página `/brand`. Logo = ícone de uva/videira (lucide `Grape`).
- **Fase 3:** `apps/demo` (Next.js 15 + Tailwind v4) + `packages/types` (mock Pessoas/Ensino). Telas: `/`, `/pessoas`, `/pessoas/[id]`, `/ensino`, `/ensino/curso/[id]`, `/brand`. **Build OK: 22 páginas, 0 erros de tipo.**

### Como rodar a demo
```bash
pnpm install
pnpm --filter @videira/demo dev   # http://localhost:3000
pnpm --filter @videira/demo build # valida produção
```

### Próximo passo (Fase 4 — manual do dono)
- Importar repo na Vercel → Root Directory = `apps/demo` → deploy. Instruções em `apps/demo/README.md`.
- Opcional: favicon próprio, polish de responsividade, e evoluir mock → backend real (Supabase) trocando as fontes em `packages/types`.

### Pastas/arquivos-chave
- `package.json`, `pnpm-workspace.yaml`, `turbo.json` — config monorepo
- `apps/demo/` — a demo (Next.js)
- `packages/ui/`, `packages/types/` — design system e modelo+mock
- `agents/` + `.claude/agents/` — agentes de IA
- `ze-start.md`, `CLAUDE-ZE.md` — controle

---

## Como retomar (checklist para o próximo chat)

```bash
cd <repo>
git status
git checkout ze-start
git pull --ff-only   # se houver remoto
```

1. Leia `ze-start.md` para ver os checkboxes pendentes.
2. Leia a seção "Estado atual" acima.
3. Continue pela próxima tarefa não marcada.
4. Ao terminar, atualize "Estado atual" e os checkboxes.

## Histórico de sessões

- **2026-06-09:** Sessão inicial. Decisões (monorepo/Videira/demo mock). Criados `ze-start.md` e `CLAUDE-ZE.md`. **Fases 0, 1, 2, 3 concluídas:** reorg+monorepo (`e84840a`), 10 agentes de IA (`e4fb42b`), design system + demo Pessoas/Ensino com build validado. Falta deploy manual na Vercel.
