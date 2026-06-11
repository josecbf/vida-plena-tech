---
tags: [tecnico, arquitetura, adr]
status: Aceito
atualizado: 2026-06-11
---

# ADR-0001 — Plataforma inicial e caminho de escala

**Status:** Aceito (convergência GPT + Claude). Um ponto aberto: timing do worker persistente.

## Contexto
Construir Pessoas (01), Ensino (02) e TAP (16) com custo inicial baixo e caminho de escala sem reescrita de domínio. Âncora: igreja de 24k pessoas com pico de TAP no domingo.

## Decisão
1. **Monólito modular serverless-first** (Vercel + Supabase) com `tenant_id` + **RLS** em banco compartilhado.
2. **Caminho quente do TAP isolado na borda** (Edge + Redis/KV) — **zero Postgres no redirect**.
3. **Transactional outbox** no Postgres para eventos de domínio; **sem broker** até haver dor real (antes do broker: `LISTEN/NOTIFY` ou logical decoding).
4. **Pooling obrigatório** (Supavisor transaction mode) desde a Fase 0; ORM configurado para esse modo.
5. **Opção 1.5 — um worker persistente** (Cloud Run/Fly/Railway) para relay do outbox, ETL→BI e reconciliação Pix (jobs que estouram o teto de execução serverless).
6. Extrair serviços (redirect/payments), read replicas ou DB dedicado **só por métrica** de carga/SLA/compliance — não por preferência.

## Ponto em aberto
- **Quando** introduzir o worker persistente: já na Fase 0 (Claude) ou só quando outbox/reconciliação saírem do "brinquedo" (GPT). Recomendação: criar o worker já na Fase 0, mesmo mínimo.

## Consequências
- Custo inicial baixo; o domínio (Pessoas etc.) fica portável mesmo que redirect/payments sejam reescritos depois.
- Exige disciplina de pooling, idempotência e testes de isolamento (ver ADR-0003, ADR-0004).
