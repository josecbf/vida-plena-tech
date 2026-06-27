---
tags: [tecnico, arquitetura, adr]
status: Aceito
atualizado: 2026-06-27
---

# ADR-0001 — Plataforma inicial e caminho de escala

**Status:** **Aceito (decisão do dono — VIRADA 2026-06-27).** Stack de produção travada em **serverless-first (Opção 1)**: Next.js/Vercel + Supabase (Postgres+Auth+RLS) + Upstash + Mercado Pago/Pix + BigQuery (BI). O ponto antes reaberto (serverless × Cloud Run no caminho de pagamento) está **resolvido para o MVP na direção serverless**, com a migração do caminho de escrita para Cloud Run **parcada como gatilho de revisão por métrica** (ver abaixo) — não descartada.

## Contexto
Construir Pessoas (01), Ensino (02) e TAP (16) com custo inicial baixo e caminho de escala sem reescrita de domínio. Âncora: igreja de 24k pessoas com pico de TAP no domingo.

## Decisão
1. **Monólito modular serverless-first** (Vercel + Supabase) com `tenant_id` + **RLS** em banco compartilhado.
2. **Caminho quente do TAP isolado na borda** (Edge + Redis/KV) — **zero Postgres no redirect**.
3. **Transactional outbox** no Postgres para eventos de domínio; **sem broker** até haver dor real (antes do broker: `LISTEN/NOTIFY` ou logical decoding).
4. **Pooling obrigatório** (Supavisor transaction mode) desde a Fase 0; ORM configurado para esse modo.
5. **Opção 1.5 — um worker persistente** (Cloud Run/Fly/Railway) para relay do outbox, ETL→BI e reconciliação Pix (jobs que estouram o teto de execução serverless).
6. Extrair serviços (redirect/payments), read replicas ou DB dedicado **só por métrica** de carga/SLA/compliance — não por preferência.

## Ponto resolvido — serverless × Cloud Run no caminho de pagamento
As 3 IAs concordavam no diagnóstico: redirect na **borda (Cloudflare Workers + KV)** e o **write/pagamento precisa de conexões quentes**. Divergiam em como:
- **GPT:** serverless (Op.1) serve nas Fases 0–1.
- **Claude:** Op.1.5 — serverless + **um worker persistente**.
- **Gemini:** **Cloud Run (Op.2)** desde já — tráfego "coreografado" (rajada sincronizada no minuto da oferta) é o pior caso para cold start + connection storm.

**Decisão (dono, 2026-06-27):** **serverless-first (Opção 1)** para o MVP, incluindo o **worker persistente da Op.1.5** (relay do outbox, ETL→BI, reconciliação Pix). Pooling (Supavisor transaction mode) obrigatório desde a Fase 0.

**Risco conhecido (parqueado, não ignorado):** o argumento do Gemini é válido — gerar Pix no pico é uma rajada sincronizada contra o Postgres, o pior caso para serverless. **Gatilho de revisão por métrica:** se em carga real o caminho de escrita do TAP apresentar cold starts/connection storms que ameacem o SLA do domingo, **migrar o caminho de API/escrita para Cloud Run** (warm, conexões persistentes), mantendo UI/estático serverless + redirect na borda. O domínio fica portável de propósito (ver Consequências) para que essa migração não toque Pessoas/Ensino.

## Consequências
- Custo inicial baixo; o domínio (Pessoas etc.) fica portável mesmo que redirect/payments sejam reescritos depois.
- Exige disciplina de pooling, idempotência e testes de isolamento (ver ADR-0003, ADR-0004).
