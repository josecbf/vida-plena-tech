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

**Componentes e serviços nomeados:**
| Camada | Serviço (recomendado) | Alternativa |
|---|---|---|
| App + API (Next.js) | **Vercel** | Cloudflare Pages / Netlify |
| Banco + Auth | **Supabase** (Postgres + RLS + Auth) | **Neon** + Auth.js |
| Redirect do TAP (borda) | **Vercel Edge Functions** + **Upstash Redis** | **Cloudflare Workers + KV** |
| Cache / rate limit / sessão | **Upstash Redis** | Redis gerenciado |
| Fila / cron | **Upstash QStash** + Vercel Cron | Inngest |
| Pagamentos (Pix) | **Mercado Pago** (gateway abstrato) | Asaas, Stripe |
| Storage de arquivos | **Supabase Storage** | Cloudflare R2 |
| BI / Data Warehouse | **Google BigQuery** | ClickHouse Cloud |
| Observabilidade | **Sentry** + **Axiom** | Logflare, Datadog |

- **Multi-tenant:** banco/schema compartilhado, `tenant_id` em tudo + **RLS**.
- **Redirect do TAP:** destino ativo por grupo TAP no **Upstash Redis**, servido por **Edge Function** — não bate no Postgres a cada toque (atende <200ms global e o pico do domingo).
- **Eventos de domínio:** **transactional outbox** no Postgres; consumidores com inbox idempotente (Financeiro/Comunicação). Eventos também fluem para o **BigQuery** (BI/IA) por batch/stream.
- **Pagamentos:** **webhook idempotente** em tabela inbox; jobs (QStash) para expiração de Pix e retries.

**Fases de execução:**

| Fase | Foco | Entregas-chave |
|---|---|---|
| **0 — MVP barato (0–3 meses)** | Os 3 módulos no ar | Pessoas (cadastro/família/consentimento/RLS), Ensino (trilhas/progresso por `personId`), TAP (device → redirect edge → `own_page`/`external_url`), Auth, outbox, deploy serverless |
| **1 — Produção / 1ª igreja grande** | Hardening | Pix estável + inbox idempotente, contrato com Financeiro aceito, **connection pooling** (PgBouncer/Supavisor), cache do destino ativo, CDN, criptografia de CPF, auditoria, **load test do redirect (500+ taps)**, backups/PITR, testes cross-tenant RLS |
| **2 — Multi-módulo + tenancy** | Largura + isolamento | Demais módulos como pacotes; **tiers de tenancy** (compartilhado p/ maioria, **schema/DB dedicado p/ enterprise**); adapters `PeopleProvider` (Native/External/Lite) p/ Ensino standalone |
| **3 — Escala / rede de igrejas** | Profundidade | Read replicas, extrair **redirect** e **payments** como serviços (já isolados), fila robusta se a outbox não bastar, **data warehouse** alimentado pelos eventos p/ BI/IA |

**Estimativa de custo (US$/mês, ordem de grandeza — ver premissas no fim):**
| Cenário | Composição | Custo infra |
|---|---|---|
| **Fase 0** — MVP, poucos pilotos | Vercel Pro $20 + Supabase Pro $25 + Upstash ~$10 + Sentry $0–26 + BigQuery ~$5 | **~$60–120** |
| **Fase 1** — 1ª igreja grande (24k) | + overages Vercel, add-on de compute Supabase, mais cache/CDN | **~$150–400** |
| **Escala** — centenas de igrejas | uso elevado em app + banco + cache + BI | **~$1.000–5.000** |

Sem custo fixo de cluster; escala por uso. (Taxas de Pix do Mercado Pago são por transação e normalmente do gateway da própria igreja — fora do custo de infra.)

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

## Opção 2 — Monólito modular em containers, GCP-nativo

Mesma forma lógica (monólito modular + outbox + RLS), mas em **containers** com conexões persistentes, usando a stack do **Google Cloud** (boa pedida se o BI em **BigQuery** já é desejado — fica tudo no mesmo cloud).

**Serviços nomeados (GCP):**
| Camada | Serviço |
|---|---|
| App + API (NestJS/Node) | **Cloud Run** (min instances p/ zero cold start) — ou **GKE Autopilot** |
| Banco | **Cloud SQL for PostgreSQL** (HA opcional) → **AlloyDB** ao escalar |
| Cache / destino ativo TAP | **Memorystore for Redis** (ou Upstash p/ baratear no início) |
| Eventos / fila | **Pub/Sub** (+ transactional outbox no Postgres) |
| Redirect do TAP (borda) | **Cloudflare Workers** na frente, ou **Cloud CDN** + **Cloud Load Balancing** |
| Storage | **Cloud Storage** |
| Pagamentos (Pix) | **Mercado Pago** |
| BI / Data Warehouse | **BigQuery** (nativo) |
| Observabilidade | **Cloud Logging/Monitoring** + Sentry |

**Estimativa de custo (US$/mês, ordem de grandeza):**
| Cenário | Composição | Custo infra |
|---|---|---|
| **Fase 0** | Cloud Run min-instance ~$30 + Cloud SQL small ~$50 + Memorystore 1GB ~$35 + Pub/Sub ~$5 + LB/CDN ~$18 + BigQuery ~$5 | **~$120–250** |
| **Fase 1** (24k) | Cloud SQL HA ~$200 + Cloud Run escalado ~$100 + Memorystore ~$50 + LB/egress ~$50 + BigQuery ~$20 | **~$350–800** |
| **Escala** | múltiplas réplicas, AlloyDB, mais egress/BI | **~$1.500–6.000** |

**Prós**
- **Sem cold start**; **conexões Postgres persistentes** (melhor sob carga sustentada).
- **BI nativo** (BigQuery) no mesmo cloud; um único provedor para faturar/governar.
- Portável (containers) e com controle fino de runtime; jobs/workers longos são naturais.

**Contras**
- **Piso de custo fixo maior** que serverless (Cloud SQL HA + Memorystore + Load Balancer ficam sempre ligados).
- Mais infra para operar (deploy, scaling, healthchecks, VPC) desde o início.
- Escala global do redirect ainda pede CDN/edge na frente (Cloud CDN tem latência maior que Workers/Edge para esse caso).

---

## Opção 3 — Event-driven / microsserviços desde cedo (NÃO recomendada agora)

Separar Pessoas, Ensino, TAP, Financeiro como **serviços independentes** com **message broker** (Kafka/Rabbit/SQS) desde o início.

**Serviços nomeados (GCP):** **GKE Autopilot** (orquestração) · **Pub/Sub** ou **Confluent/Managed Kafka** (mensageria) · **Cloud SQL/AlloyDB** por serviço · **BigQuery** (BI) · **Cloud Operations Suite** + Prometheus/Grafana (observabilidade) · **API Gateway / Apigee**.

**Estimativa de custo (US$/mês, ordem de grandeza):**
| Cenário | Composição | Custo infra |
|---|---|---|
| **Fase 0** | GKE nodes $150–400 + control plane ~$75 + múltiplos Cloud SQL $150–600 + Kafka/Confluent $200–1.000 + obs $100 | **~$700–2.000+** |
| **Escala** | clusters maiores, mais serviços e bancos | **~$5.000–20.000+** |

**Prós**
- Isolamento forte e escala independente por serviço.
- Alinha com "todos os módulos entrarão no ar" e com squads paralelos.
- Falha de um serviço não derruba os outros.

**Contras**
- **Caro e lento para começar** (piso de milhares de US$/mês) — contradiz o requisito de custo inicial baixo.
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

## Custo consolidado (US$/mês de infra, ordem de grandeza)

| Opção | Fase 0 (MVP) | Fase 1 (1ª igreja 24k) | Escala (centenas) |
|---|---|---|---|
| **1 — Serverless-first** | **$60–120** | $150–400 | $1.000–5.000 |
| **2 — Containers GCP** | $120–250 | $350–800 | $1.500–6.000 |
| **3 — Microsserviços** | $700–2.000+ | — | $5.000–20.000+ |

**Premissas e ressalvas:**
- Valores são **ordens de grandeza (2026)**, não cotação — variam com tráfego, egress, retenção e HA.
- **Taxas de pagamento (Pix ~0,99% no Mercado Pago) são por transação** e normalmente ficam no gateway da própria igreja — fora do custo de infra acima.
- **HA (alta disponibilidade) de banco ~dobra** o custo do Postgres; opcional na Fase 0, recomendado na Fase 1.
- 24k pessoas = **dado pequeno**; o custo cresce por **concorrência do TAP e tráfego**, não por volume de cadastro.
- Não inclui custos de equipe, suporte, domínio, e-mail transacional (ex.: Resend/SendGrid ~$0–20) nem ferramentas de produto.

## Recomendação

**Opção 1 (serverless-first) para Fases 0–1**, com o **redirect e os pagamentos do TAP isolados na borda desde o dia 1**, e tenancy começando em **RLS compartilhado**. Migrar para tiers dedicados (schema/DB) e extrair serviços de alta carga **só quando a métrica exigir** (Fase 2–3). Se o time preferir previsibilidade e zero cold-start desde já, a **Opção 2** é uma troca defensável com pouca perda — a forma lógica é a mesma e o caminho de evolução é idêntico.

## Decisões abertas (viram ADRs)

- [ ] Plataforma de banco/auth (Supabase vs Neon+Auth.js vs RDS+Cognito).
- [ ] Onde mora o redirect (Vercel Edge vs Cloudflare Workers).
- [ ] Estratégia de tenancy por tier (quando promover de RLS p/ schema/DB dedicado).
- [ ] Gateway Pix inicial e contrato de eventos com Financeiro.
- [ ] Validar esta arquitetura com revisores externos (ver [[Prompt - Validacao de Arquitetura por Fases]]).
