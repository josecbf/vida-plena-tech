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
- App: Next.js 15 (App Router) + TypeScript + **Tailwind v4** + componentes próprios (estilo shadcn, sem a dependência)
- Deploy: Vercel (raiz do app = `apps/demo`)
- Ambiente local confirmado: node v25.8.1, pnpm 10.32.1
- **Arquitetura de produção (proposta):** Opção 1 serverless-first (Vercel + Supabase + Upstash + Mercado Pago/Pix + BigQuery p/ BI); decisão de cloud ainda em aberto (ver docs de arquitetura)

---

## Estado atual

**Demo dos 3 módulos pronta e buildando. Módulo 16 integrado. Análise de módulos + arquitetura de produção documentadas. Pendentes: deploy na Vercel e rodar os prompts de validação nas 3 IAs.**

### Feito até agora
- Branch `ze-start` criada; `ze-start.md` (plano + todo) e `CLAUDE-ZE.md` (handoff).
- **Fase 0:** doc movida para `docs/` (histórico preservado), monorepo (pnpm workspaces + Turborepo). Commit `e84840a`.
- **Fase 2:** 10 agentes em `agents/` + `.claude/agents/`. Commit `e4fb42b`.
- **Fase 1:** `packages/ui` (tokens Videira + `cn`), tema Tailwind v4, componentes próprios (`apps/demo/components/ui.tsx`), página `/brand`. Logo = ícone de uva/videira (lucide `Grape`).
- **Fase 3:** `apps/demo` + `packages/types` (mock Pessoas/Ensino). Telas equipe: `/`, `/pessoas`, `/pessoas/[id]`, `/ensino`, `/ensino/curso/[id]`, `/brand`. Commit `04dc51f`.
- **Área do aluno:** alternador de perfil Equipe⟷Membro + `/aluno`, `/aluno/curso/[id]`, player `/aluno/aula/[cursoId]/[aulaId]` (progresso em sessão). Commit `742f27b`. **Build OK: 23 páginas, 0 erros.**
- **Módulo 16 (TAP):** trazido da `main` via merge para `docs/` sem quebrar a estrutura. Commit `177a0ef`.
- **Análise + arquitetura:** `Analise de Modulos.md`, `Arquitetura por Fases e Opcoes.md` (com tecnologias nomeadas, custos por cenário, herança do doc original, explicação não-técnica e justificativa de não-grátis) e 2 prompts de validação. Commits `be67fe1`, `1770dd6`, `678322f`, `9af3623`.

### Como rodar a demo
```bash
pnpm install
pnpm --filter @videira/demo dev   # http://localhost:3000
pnpm --filter @videira/demo build # valida produção
```

### Próximos passos (em aberto)
- **Deploy da demo na Vercel** (manual do dono): Root Directory = `apps/demo`. Instruções em `apps/demo/README.md`.
- **Rodar os 2 prompts de validação** (identidade plugável + arquitetura por fases) no GPT, Gemini e Claude; comparar e registrar divergências como **ADR** em `docs/Técnico/`.
- **Decidir cloud-base:** Opção 1 serverless (Vercel+Supabase) vs Opção 2 GCP-nativo (Cloud Run + BigQuery). Usuário sinalizou interesse no BigQuery.
- Opcional: favicon próprio; evoluir mock → backend real (Supabase) trocando as fontes em `packages/types`.

### Pastas/arquivos-chave
- `package.json`, `pnpm-workspace.yaml`, `turbo.json` — config monorepo
- `apps/demo/` — a demo (Next.js)
- `packages/ui/`, `packages/types/` — design system e modelo+mock
- `agents/` + `.claude/agents/` — agentes de IA
- `ze-start.md`, `CLAUDE-ZE.md` — controle

## Documentos de análise e arquitetura

- `docs/Produto/Analise de Modulos.md` — quais módulos vendem sozinhos (Tier A), via provider externo/Lite (Tier B) ou sempre dependem da Pessoas canônica (Tier C); leitura land & expand.
- `docs/Técnico/Arquitetura por Fases e Opcoes.md` — proposta de infra de baixo custo e escalável, em fases (0–3), começando por Pessoas/Ensino/TAP. **Opção 1 (recomendada):** serverless-first (Vercel + Supabase + Upstash + Mercado Pago + BigQuery), redirect do TAP na borda. **Opção 2:** GCP-nativo em containers (Cloud Run + Cloud SQL + Memorystore + Pub/Sub + BigQuery). **Opção 3:** microsserviços (não recomendada). Inclui **tecnologias nomeadas + estimativas de custo por cenário**, **herança/evolução do `Arquitetura Plataforma.md`** (original, abstrato e pré-TAP), **explicação não-técnica** (analogias) e **por que a Fase 0 não deve ser gratuita**. Âncora: igreja 24k pessoas/4k membros/8 pastores.
- `docs/Técnico/Modularidade e Identidade Plugavel.md` — contrato `PeopleProvider`/`PersonRef` (Native/External/Lite) para módulos standalone.
- **Prompts de validação:** `docs/Técnico/Prompt - Validacao de Arquitetura por Fases.md` (infra) e `docs/Técnico/Prompt - Validacao de Arquitetura (Gemini e GPT).md` (identidade).
- **Validação externa:** **Infra = 3/3** (GPT, Claude, Gemini). **Identidade = 2/3** (Gemini, GPT) — falta Claude. Síntese em `docs/Técnico/Validacao de Arquitetura - Consolidacao.md`; decisões em `docs/Técnico/ADRs/` (0001–0006).
  - Novidades da 2ª rodada: **Gemini discorda na infra** (recomenda Cloud Run/containers, não serverless) → ADR-0001 reaberto (serverless × Cloud Run no caminho de pagamento; pooling é risco nº1 nos 3). **Gemini+GPT convergem na identidade:** descontinuar o Lite → **kernel mínimo de identidade** (`localPersonId` + `IdentityLink`), MVP só Native, adiar federação, separar contratos (identidade/perfil/permissão/consentimento) → ADR-0005 "Aceito na direção".
  - **Pendente:** rodar identidade no Claude (fecha 3×2); decidir ADR-0001 (serverless×Cloud Run), 0002 (fonte da verdade TAP), 0006 (região/LGPD); abrir ADR de autorização (gap apontado pelo GPT).

## Frente de arquitetura (em discussão)

Requisito novo: módulos satélites (ex.: **Ensino 02**) precisam ser **contratados isoladamente** e **plugados em outra plataforma** que traz as pessoas — sem quebrar a regra de ouro (Pessoas é o centro).

- Modelo proposto: **identidade plugável** — módulos dependem de um contrato `PeopleProvider`/`PersonRef`, não do módulo Pessoas. Três providers: **Native** (Pessoas 01), **External/Federado** (anti-corruption + SSO/SCIM/webhooks), **Lite** (mínimo embarcado). Seleção por feature flag por tenant. Documento: `docs/Técnico/Modularidade e Identidade Plugavel.md`.
- Costura já existe na demo: `Matricula.pessoaId` em `packages/types`.
- Validação externa: prompt pronto para Gemini e GPT em `docs/Técnico/Prompt - Validacao de Arquitetura (Gemini e GPT).md`. Próximo: rodar nos dois, comparar e registrar divergências como ADR.

## Módulo 16 — TAP e Engajamento Digital ✅ (trazido da main)

A doc do módulo 16 estava na `main` (não com o usuário). Trazida via **merge da `main` na `ze-start`** (commit `177a0ef`), com os arquivos novos realocados automaticamente para `docs/` (rename detection) — estrutura do monorepo preservada, zero conflito de conteúdo. O merge também trouxe revisões da main em PRD Ensino, Produto/*, Técnico/* e Auditoria/* (linha de produto "TAP").

**O que é:** módulo de presença física + engajamento em tempo real. Dispositivos NFC ("moedas") com **redirect dinâmico** — a URL gravada não muda, o destino sim (oferta Pix, formulário pastoral, URL externa, landing própria), sincronizável com o ProPresenter. Referência de mercado: **Overflow** (mas com Pix nativo e contexto BR). É um **facilitador de ofertas/inscrições, não fonte de cadastro de pessoas**.

**Decoupling (relevante p/ a frente de arquitetura):** TAP deliberadamente NÃO cria Pessoas (integração futura via contrato próprio) e NÃO reimplementa Financeiro (integra via eventos de domínio idempotentes `tap.donation.confirmed` etc.). É um caso real do princípio de identidade/contratos plugáveis.

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
- **2026-06-10:** Área do aluno (`742f27b`), README com instruções de rodar local (`ee9fa19`), branch `ze-start` publicada no GitHub (`origin`). Iniciada **frente de arquitetura** (identidade plugável para Ensino standalone/embarcável) + prompt de validação Gemini/GPT. **Pendente:** receber doc do módulo 16.
- **2026-06-11:** Merge da `main` na `ze-start` trazendo o **módulo 16 (TAP)** e revisões, com realocação automática para `docs/` (`177a0ef`). Módulo 16 lido e analisado (`b7b660b`). Criados **`Analise de Modulos.md`** (Tier A/B/C) e **`Arquitetura por Fases e Opcoes.md`** + prompt 3-IAs (`1770dd6`); arquitetura enriquecida com **tecnologias nomeadas e custos** (`678322f`) e com **herança do doc original, explicação não-técnica e justificativa de não-grátis** (`9af3623`). Controles atualizados (`bd81c7e`).
- **2026-06-11 (cont.):** **Validação externa consolidada** — GPT+Claude (infra) e Gemini (identidade). Criados `Validacao de Arquitetura - Consolidacao.md` e **6 ADRs** em `docs/Técnico/ADRs/`. Principais convergências: caminho de escrita do TAP, idempotência/state-machine do Pix, pooling, RLS+testes de isolamento, worker persistente, custo da âncora maior. Gemini sugere descontinuar o **Lite** (ADR-0005). **Pendente:** fechar ADRs `Proposto` e decisões do dono.
