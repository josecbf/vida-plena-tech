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

**Fase 0 ✅ e Fase 2 ✅ concluídas. Próximo: Fase 1 (identidade/design system) + Fase 3 (demo).**

### Feito até agora
- Branch `ze-start` criada.
- `ze-start.md` (plano + todo) e `CLAUDE-ZE.md` (handoff) criados.
- **Fase 0:** doc movida para `docs/` (histórico preservado), monorepo configurado (pnpm workspaces + Turborepo: `package.json`, `pnpm-workspace.yaml`, `turbo.json`), `.gitignore` atualizado, README/COLLABORATION ajustados. Commit `e84840a`.
- **Fase 2:** 10 agentes canônicos em `agents/` + 10 definições executáveis em `.claude/agents/` + `agents/README.md` com modelo recomendado por papel.

### Próximo passo imediato
- **Fase 1 — Identidade/design system:** criar `packages/ui` (tokens da Videira: Índigo `#3D4E9E`, Âmbar `#F2A93B`, Verde-sálvia `#5B8C7B`; fontes Inter + Fraunces), tema Tailwind, componentes base, logo SVG.
- **Fase 3 — Demo:** `apps/demo` Next.js 15 + shell multi-módulo + mock data (`packages/types`); telas de Pessoas (lista, perfil, famílias, timeline) e Ensino (trilhas, curso, progresso). Basear em `docs/Módulos/01 Pessoas/Produto/PRD Pessoas.md` e `docs/Módulos/02 Ensino/000 - Hub Ensino.md`.
- **Fase 4 — Deploy Vercel** a partir de `apps/demo`.

### Pastas/arquivos-chave já criados
- `package.json`, `pnpm-workspace.yaml`, `turbo.json` — config monorepo
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

- **2026-06-09:** Sessão inicial. Definidas decisões (monorepo/Videira/demo mock). Criados `ze-start.md` e `CLAUDE-ZE.md`. **Fase 0** (reorg + monorepo, commit `e84840a`) e **Fase 2** (10 agentes de IA) concluídas. Próximo: Fase 1 + Fase 3.
