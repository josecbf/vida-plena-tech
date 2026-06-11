---
tags:
  - tecnico
  - arquitetura
  - validacao
atualizado: 2026-06-11
---

# Prompt — Validação de Arquitetura por Fases (GPT, Gemini e Claude)

Use o bloco abaixo nas três IAs (separadamente). É autocontido. Compare as respostas: onde concordam = risco real; onde divergem = decisão a registrar como ADR. Referência interna: [[Arquitetura por Fases e Opcoes]].

---

```
Você é um arquiteto de software/infra sênior, cético e direto, especialista em SaaS B2B multi-tenant, sistemas de pagamento (Pix) e baixa latência. Avalie criticamente a arquitetura abaixo. Seu trabalho é encontrar furos, não agradar.

## Contexto do produto
"Videira" é um SaaS modular para igrejas (estilo Planning Center), com um módulo central "Pessoas" (cadastro canônico, famílias, consentimento, LGPD, auditoria) e ~15 módulos satélites. Decisão já tomada: começar como MONÓLITO MODULAR multi-tenant (não microsserviços prematuros), com eventos de domínio e auditoria desde cedo. Todo registro tem tenant_id.

## Restrições e metas
- Construir primeiro 3 módulos: Pessoas (01), Ensino (02) e TAP/Engajamento Digital (16).
- A arquitetura deve assumir que TODOS os 16 módulos entrarão no ar (não pintar-se num canto).
- Custo INICIAL baixo, mas escalável para produção sem reescrita.
- SaaS para igrejas de TODOS os tamanhos (pequenas a redes).
- Primeira igreja âncora: 24.000 pessoas, 4.000 membros, 8 pastores, multi-campus.

## Característica crítica do módulo TAP
TAP usa dispositivos NFC físicos ("moedas") com REDIRECT DINÂMICO: a URL gravada não muda, mas o destino (oferta via Pix, formulário pastoral, URL externa, landing própria) muda em tempo real, sincronizado com o palco (ProPresenter). Metas duras: redirect <200ms p95 sob 500+ toques simultâneos no momento da oferta; pagamento Pix com QR dinâmico, TTL e webhook idempotente; integração com o módulo Financeiro só via eventos de domínio idempotentes (TAP não é ledger). TAP não cria cadastro de pessoa no escopo atual.

## Arquitetura proposta (Opção 1 — recomendada), com serviços nomeados
- Monólito modular em Next.js (App Router) na **Vercel** (UI + API). Módulos como pastas/rotas.
- Banco + Auth: **Supabase** (Postgres + RLS + Auth). Multi-tenant em banco/schema COMPARTILHADO com tenant_id; isolamento dedicado (schema/DB) só para enterprise depois.
- Redirect do TAP isolado na BORDA: **Vercel Edge Functions + Upstash Redis** (destino ativo por grupo TAP em cache) — não bate no Postgres a cada toque.
- Pagamentos: **Mercado Pago** (Pix); webhook idempotente em tabela inbox; jobs (**Vercel Cron + Upstash QStash**) para expiração de Pix e retries.
- Eventos de domínio via TRANSACTIONAL OUTBOX no Postgres (sem Kafka no início); consumidores com inbox idempotente; eventos vão para **Google BigQuery** (BI/IA).
- Observabilidade: **Sentry + Axiom**.
- Fases: (0) MVP barato dos 3 módulos; (1) hardening p/ 1ª igreja grande (pooling, cache, CDN, LGPD, load test do redirect); (2) demais módulos + tiers de tenancy + adapters de identidade plugável; (3) read replicas, extrair redirect/payments como serviços, BigQuery p/ BI.
- Custo de infra estimado: Fase 0 ~US$60–120/mês; Fase 1 ~US$150–400/mês; escala ~US$1.000–5.000/mês.

## Alternativas consideradas
- Opção 2 (GCP-nativo): CONTAINERS em **Cloud Run** + **Cloud SQL for PostgreSQL** + **Memorystore (Redis)** + **Pub/Sub** + **BigQuery**, redirect via **Cloudflare Workers** ou **Cloud CDN**. Prós: sem cold start, conexões persistentes, BI nativo. Contras: piso de custo fixo maior (~US$120–250/mês na Fase 0), mais infra para operar.
- Opção 3: microsserviços event-driven (**GKE** + **Pub/Sub/Kafka**, banco por serviço) desde o início. Prós: isolamento/escala independente. Contras: caro (~US$700–2.000+/mês já no início) e complexo; contradiz a decisão de monólito modular.

## O que eu quero de você
1. Veredito em uma frase: a Opção 1 é sólida, arriscada ou furada para este contexto?
2. Os 5 maiores riscos técnicos concretos (ex.: cold start + pooling de Postgres em serverless; consistência do cache de destino ativo do TAP; idempotência ponta-a-ponta do Pix; RLS vs performance/segurança cross-tenant; custo escondido; jobs longos de BI em serverless).
3. O que está SUPER-engenheirado e pode ser cortado no MVP.
4. O que está FALTANDO e é crítico (algo não endereçado).
5. Especificamente: serverless (Opção 1) vs containers (Opção 2) para ESTE caso — qual você escolheria e por quê? O redirect <200ms p95 sob pico de domingo muda sua escolha?
6. Estratégia de multi-tenant: RLS compartilhado é seguro/escalável o suficiente para começar e ir até igrejas grandes? Quando exatamente promover para schema/DB dedicado?
7. A escolha de transactional outbox (em vez de broker) se sustenta até onde? Qual o sinal de que precisa virar Kafka/SQS?
8. Custo: as estimativas (Fase 0 ~US$60–120/mês na Opção 1) são realistas para 2026? O que está subestimado (egress, suporte, e-mail transacional, HA)?
9. Recomendação final priorizada: o que fazer na Fase 0, o que adiar.

Seja específico e técnico. Aponte premissas não declaradas que mudam a conclusão. Se faltar informação para julgar algo, diga qual.
```

---

## Como usar o resultado

1. Rode em GPT, Gemini e Claude separadamente.
2. Cole as três respostas de volta (ou resuma) para comparar.
3. Convergência entre as três → risco real, tratar já. Divergência → decisão de arquitetura a registrar como ADR em `docs/Técnico/`.
