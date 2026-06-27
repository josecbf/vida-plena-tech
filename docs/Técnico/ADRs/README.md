---
tags:
  - tecnico
  - arquitetura
  - adr
atualizado: 2026-06-11
---

# ADRs — Architecture Decision Records

Decisões de arquitetura registradas a partir da validação externa (GPT, Claude, Gemini). Síntese: [[Validacao de Arquitetura - Consolidacao]].

**Status possíveis:** `Aceito` (convergência forte, baixo risco) · `Proposto` (aguardando decisão do dono) · `Substituído` · `Rejeitado`.

| ADR | Título | Status |
|---|---|---|
| [0001](0001-plataforma-inicial-e-escala.md) | Plataforma inicial e caminho de escala | Núcleo aceito; **serverless×Cloud Run reaberto** (Gemini) |
| [0002](0002-tap-destino-ativo-consistencia.md) | Consistência do destino ativo do TAP | **Proposto** (convergência 3/3 no problema) |
| [0003](0003-pix-idempotencia-state-machine.md) | Idempotência e máquina de estados do Pix | Aceito (PSP em aberto) |
| [0004](0004-multitenant-rls-isolamento.md) | Isolamento multi-tenant (RLS) | Aceito (service-role em aberto) |
| [0005](0005-identidade-plugavel-revisao.md) | Identidade plugável — revisão | **Aceito na direção** (Gemini+GPT); falta Claude |
| [0006](0006-residencia-dados-lgpd.md) | Residência de dados e LGPD | **Proposto** |

> Template mínimo: Status · Contexto · Decisão (ou Opções, se aberto) · Consequências.
