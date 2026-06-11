---
tags:
  - tecnico
  - arquitetura
  - infraestrutura
  - escalabilidade
atualizado: 2026-06-11
---

# Arquitetura por Fases e Opções

Proposta de arquitetura de baixo custo inicial e escalável para produção, para a plataforma **Videira**. Complementa [[Arquitetura Plataforma]] (que já define "monólito modular, não microsserviços prematuros") e [[Modularidade e Identidade Plugavel]].

## Contexto e requisitos

- **Ordem de construção:** módulos **01 Pessoas**, **02 Ensino**, **16 TAP** primeiro.
- **Premissa:** todos os 16 módulos entrarão no ar — a arquitetura não pode pintar a si mesma num canto.
- **Primeira igreja (âncora):** 24.000 pessoas, 4.000 membros, 8 pastores. Multi-campus.
- **Objetivo:** SaaS para igrejas de **todos os tamanhos** (de pequenas a redes).
- **Restrições:** custo inicial baixo; caminho claro para escala sem reescrita.

> Nota de dimensionamento: 24k registros de pessoa é **dado pequeno** para Postgres. O desafio real não é volume de dados — é o **pico de concorrência do TAP no domingo** (centenas/milhares de toques no mesmo minuto da oferta) e a **latência do redirect (<200ms p95)**. A arquitetura é guiada por isso.

## Princípios

1. **Monólito modular primeiro**, com fronteiras de módulo nítidas (já é a decisão do repo).
2. **Isolar desde o dia 1 só o que é crítico de carga:** o **redirect engine** e o **ingest de pagamentos** do TAP.
3. **Eventos de domínio via transactional outbox** (Postgres) — sem broker pesado no início.
4. **Multi-tenant por `tenant_id` + RLS** começando em banco/schema compartilhado; isolamento dedicado só para enterprise.
5. **Contratos plugáveis** (`PeopleProvider`) para permitir módulos standalone depois.
6. **Strangler-ready:** qualquer módulo pode ser extraído como serviço quando (e só quando) a carga justificar.

---

## Opção 1 — RECOMENDADA: Monólito modular serverless-first + borda para o TAP

Stack coerente, barata para começar, que escala por uso.

```
                 ┌─────────────────────────────────────────┐
  Visitante ───▶ │  Edge Redirect (TAP)   [Edge Fn + cache] │ ◀── destino ativo em Redis/KV
  (toca NFC)     └─────────────────────────────────────────┘
                                  │ (cache miss / config)
                                  ▼
  Equipe/Membro ─▶ Next.js (App Router) na Vercel ─▶ Postgres gerenciado (RLS)
                       │  - UI + API (route handlers/server actions)
                       │  - módulos: Pessoas, Ensino, TAP
                       ├─▶ Redis (Upstash): destino ativo, sessões, rate limit
                       ├─▶ Gateway Pix (Mercado Pago) ─▶ webhook ─▶ inbox idempotente
                       ├─▶ Cron/QStash: expiração de Pix, retries, envios
                       └─▶ Outbox (tabela) ─▶ consumidores (Financeiro, Comunicação)
```

**Componentes:**
- **App + API:** Next.js na Vercel (já é a stack da demo). Um único deploy, módulos como pastas/rotas.
- **Banco + Auth:** Postgres gerenciado com **RLS** e Auth inclusos (ex.: Supabase). Multi-tenant compartilhado com `tenant_id` em tudo.
- **Redirect do TAP:** **Edge Function + cache (Redis/KV)** guardando o destino ativo por grupo TAP. Não bate no Postgres a cada toque → atende <200ms global e o pico do domingo.
- **Landing pages do TAP (`own_page`):** estáticas/edge + CDN.
- **Pagamentos:** gateway Pix; **webhook idempotente** gravado em tabela inbox; jobs para expiração/retry.
- **Eventos de domínio:** **transactional outbox** no Postgres; consumidores leem e marcam processado (inbox idempotente no Financeiro).
- **Jobs/filas:** Cron da plataforma + fila gerenciada (ex.: QStash) — sem operar Kafka/Rabbit no início.
- **Observabilidade:** Sentry + logs estruturados + dashboard básico.

**Fases de execução:**

| Fase | Foco | Entregas-chave |
|---|---|---|
| **0 — MVP barato (0–3 meses)** | Os 3 módulos no ar | Pessoas (cadastro/família/consentimento/RLS), Ensino (trilhas/progresso por `personId`), TAP (device → redirect edge → `own_page`/`external_url`), Auth, outbox, deploy serverless |
| **1 — Produção / 1ª igreja grande** | Hardening | Pix estável + inbox idempotente, contrato com Financeiro aceito, **connection pooling** (PgBouncer/Supavisor), cache do destino ativo, CDN, criptografia de CPF, auditoria, **load test do redirect (500+ taps)**, backups/PITR, testes cross-tenant RLS |
| **2 — Multi-módulo + tenancy** | Largura + isolamento | Demais módulos como pacotes; **tiers de tenancy** (compartilhado p/ maioria, **schema/DB dedicado p/ enterprise**); adapters `PeopleProvider` (Native/External/Lite) p/ Ensino standalone |
| **3 — Escala / rede de igrejas** | Profundidade | Read replicas, extrair **redirect** e **payments** como serviços (já isolados), fila robusta se a outbox não bastar, **data warehouse** alimentado pelos eventos p/ BI/IA |

**Envelope de custo:** começa baixo (ordem de ~dezenas a baixas centenas de US$/mês somando app + Postgres + Redis + filas em planos iniciais), crescendo por uso. Sem custo fixo de cluster.

**Prós**
- Custo inicial mínimo; escala automática por uso.
- Reaproveita a stack que já temos (Next.js/Vercel/Postgres).
- O ponto crítico (redirect do TAP) já nasce na borda, isolado.
- RLS resolve multi-tenant cedo e barato; isolamento dedicado quando precisar.
- Migração futura para serviços é incremental (Strangler).

**Contras**
- **Cold starts** e limites de execução serverless exigem cuidado (pooling, funções de borda).
- Algum **lock-in** de plataforma (mitigável: Postgres e Next.js são portáveis).
- Jobs longos/pesados (relatórios, BI) pedem solução à parte mais cedo.

---

## Opção 2 — Monólito modular em containers ("boring"/portável)

Mesma forma lógica (monólito modular + outbox + RLS), mas rodando em **containers** com conexões persistentes.

- **App/API:** Node (NestJS) — ou Django/Rails — em containers (Fly.io / Render / Railway / ECS).
- **Banco:** Postgres gerenciado (Neon/RDS/Cloud SQL). **Redis** gerenciado. Fila **BullMQ** (Redis) ou SQS.
- **Redirect do TAP:** mesmo conceito, mas servido por um container leve + cache (ou ainda uma edge/CDN na frente).

**Prós**
- **Sem cold start**; **conexões Postgres persistentes** (melhor sob carga sustentada).
- **Portável** e previsível; pouco lock-in; controle fino de runtime.
- Jobs/workers longos são naturais (mesmo runtime).

**Contras**
- **Custo fixo mínimo** (sempre há container ligado) — piso um pouco maior que serverless.
- Mais infra para operar (deploy, scaling, healthchecks) desde o início.
- Escala global do redirect exige CDN/edge na frente mesmo assim.

---

## Opção 3 — Event-driven / microsserviços desde cedo (NÃO recomendada agora)

Separar Pessoas, Ensino, TAP, Financeiro como **serviços independentes** com **message broker** (Kafka/Rabbit/SQS) desde o início.

**Prós**
- Isolamento forte e escala independente por serviço.
- Alinha com "todos os módulos entrarão no ar" e com squads paralelos.
- Falha de um serviço não derruba os outros.

**Contras**
- **Caro e lento para começar** — contradiz o requisito de custo inicial baixo.
- Complexidade operacional alta: transações distribuídas, consistência eventual, observabilidade difícil.
- **Contradiz a decisão já registrada** em [[Arquitetura Plataforma]] ("não microsserviços prematuros").
- Risco de over-engineering antes de ter clientes.

> Veredito: é o **destino possível** de partes de alta carga (redirect, payments, BI) — não o **ponto de partida**. A Opção 1 chega lá por extração incremental, sem pagar o custo agora.

---

## Comparativo

| Critério | Opção 1 (serverless-first) | Opção 2 (containers) | Opção 3 (microsserviços) |
|---|---|---|---|
| Custo inicial | 🟢 Mínimo (por uso) | 🟡 Piso fixo baixo | 🔴 Alto |
| Velocidade p/ MVP | 🟢 Alta (reusa stack) | 🟡 Média | 🔴 Baixa |
| Pico do TAP no domingo | 🟢 Borda nativa | 🟡 Borda/CDN na frente | 🟢 Serviço dedicado |
| Conexões Postgres | 🟡 Exige pooling | 🟢 Persistentes | 🟢 Por serviço |
| Operação/complexidade | 🟢 Baixa | 🟡 Média | 🔴 Alta |
| Escala futura | 🟢 Incremental | 🟢 Boa | 🟢 Máxima |
| Lock-in | 🟡 Algum | 🟢 Baixo | 🟢 Baixo |
| Alinha c/ doc atual | 🟢 Sim | 🟢 Sim | 🔴 Não |

## Recomendação

**Opção 1 (serverless-first) para Fases 0–1**, com o **redirect e os pagamentos do TAP isolados na borda desde o dia 1**, e tenancy começando em **RLS compartilhado**. Migrar para tiers dedicados (schema/DB) e extrair serviços de alta carga **só quando a métrica exigir** (Fase 2–3). Se o time preferir previsibilidade e zero cold-start desde já, a **Opção 2** é uma troca defensável com pouca perda — a forma lógica é a mesma e o caminho de evolução é idêntico.

## Decisões abertas (viram ADRs)

- [ ] Plataforma de banco/auth (Supabase vs Neon+Auth.js vs RDS+Cognito).
- [ ] Onde mora o redirect (Vercel Edge vs Cloudflare Workers).
- [ ] Estratégia de tenancy por tier (quando promover de RLS p/ schema/DB dedicado).
- [ ] Gateway Pix inicial e contrato de eventos com Financeiro.
- [ ] Validar esta arquitetura com revisores externos (ver [[Prompt - Validacao de Arquitetura por Fases]]).
