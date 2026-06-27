---
tags: [tecnico, arquitetura, adr, lgpd, dados]
status: Proposto
atualizado: 2026-06-11
---

# ADR-0006 — Residência de dados e LGPD

**Status:** Proposto (levantado por Claude e Gemini).

## Contexto
Dado pastoral e financeiro de brasileiros (incl. crianças). Duas tensões:
1. **Residência:** em que região ficam Supabase, Vercel e BigQuery? Dado pastoral indo para região US = **transferência internacional** sob LGPD.
2. **Direito ao esquecimento × event store/BI:** eventos append-only e cópias no BigQuery são imutáveis — brigam com o pedido de exclusão de uma pessoa.

## Opções / direção
- **Região:** preferir região **brasileira** (ou ao menos definir e documentar a base legal de transferência internacional) para Postgres, storage e warehouse.
- **Exclusão em mundo append-only:** **crypto-shredding** (chave por titular; apagar a chave torna os eventos ilegíveis) ou **pseudonimização desde o design do evento** — não como remendo depois.
- Mapear papéis **controlador × operador** por modo de venda (nativo, federado, embarcado em terceiro).

## Decisão
_Pendente._ Recomendação: fixar região BR onde possível e adotar **crypto-shredding** no design do event store antes de ligar o BI.

## Consequências
- Decidir cedo evita reprojeto caro do event store e risco jurídico com dado de criança/oferta.
