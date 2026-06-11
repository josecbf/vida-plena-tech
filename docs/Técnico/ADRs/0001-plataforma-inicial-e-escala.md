---
tags: [tecnico, arquitetura, adr]
status: Aceito
atualizado: 2026-06-11
---

# ADR-0001 — Plataforma inicial e caminho de escala

**Status:** Aceito no núcleo (monólito modular, RLS, redirect na borda, outbox). **Reaberto um ponto:** com a 3ª opinião (Gemini), a escolha serverless × Cloud Run para o caminho de pagamento virou divergência real (2×1).

## Contexto
Construir Pessoas (01), Ensino (02) e TAP (16) com custo inicial baixo e caminho de escala sem reescrita de domínio. Âncora: igreja de 24k pessoas com pico de TAP no domingo.

## Decisão
1. **Monólito modular serverless-first** (Vercel + Supabase) com `tenant_id` + **RLS** em banco compartilhado.
2. **Caminho quente do TAP isolado na borda** (Edge + Redis/KV) — **zero Postgres no redirect**.
3. **Transactional outbox** no Postgres para eventos de domínio; **sem broker** até haver dor real (antes do broker: `LISTEN/NOTIFY` ou logical decoding).
4. **Pooling obrigatório** (Supavisor transaction mode) desde a Fase 0; ORM configurado para esse modo.
5. **Opção 1.5 — um worker persistente** (Cloud Run/Fly/Railway) para relay do outbox, ETL→BI e reconciliação Pix (jobs que estouram o teto de execução serverless).
6. Extrair serviços (redirect/payments), read replicas ou DB dedicado **só por métrica** de carga/SLA/compliance — não por preferência.

## Ponto em aberto — serverless × Cloud Run no caminho de pagamento
As 3 IAs concordam: redirect na **borda (Cloudflare Workers + KV)** e o **write/pagamento precisa de conexões quentes**. Divergem em como:
- **GPT:** serverless (Op.1) serve nas Fases 0–1.
- **Claude:** Op.1.5 — serverless + **um worker persistente**.
- **Gemini:** **Cloud Run (Op.2)** desde já — tráfego "coreografado" (rajada sincronizada no minuto da oferta) é o pior caso para cold start + connection storm.

**Recomendação atualizada:** dado que o caminho síncrono mais perigoso (gerar Pix no pico) é exatamente uma rajada sincronizada contra o Postgres, **levar o caminho de API/escrita para Cloud Run** (warm, conexões persistentes) e manter **UI/estático serverless + redirect na borda**. Pooling (Supavisor transaction mode) obrigatório de qualquer forma. **Decisão do dono.**

## Consequências
- Custo inicial baixo; o domínio (Pessoas etc.) fica portável mesmo que redirect/payments sejam reescritos depois.
- Exige disciplina de pooling, idempotência e testes de isolamento (ver ADR-0003, ADR-0004).
