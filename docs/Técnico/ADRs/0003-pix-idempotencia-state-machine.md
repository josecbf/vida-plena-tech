---
tags: [tecnico, arquitetura, adr, pix, financeiro]
status: Aceito
atualizado: 2026-06-11
---

# ADR-0003 — Idempotência e máquina de estados do Pix

**Status:** Aceito (convergência GPT + Claude). PSP/economia em aberto.

## Contexto
TAP não é ledger, mas precisa capturar pagamento com segurança e publicar evento idempotente para o Financeiro. Webhook é **notificação, não verdade**; o Mercado Pago envia webhooks duplicados e fora de ordem e usa idempotency key na criação.

## Decisão
1. **Máquina de estados explícita:** `created → qr_generated → pending → paid | expired | cancelled | failed | refunded`.
2. **Idempotência ponta-a-ponta:**
   - Criação de cobrança/QR: `tenant_id + tap_session_id + donation_intent_id` (+ `X-Idempotency-Key` no gateway).
   - Webhook: dedup por `tenant_id + gateway_provider + gateway_event_id`.
   - Evento p/ Financeiro: publicado **uma única vez** via outbox; consumidor com inbox idempotente.
3. **Tratar a corrida no limite do TTL** (job de expiração vs webhook "pago") — pagamento tardio pós-expiração reconciliado, nunca perdido.
4. **Reconciliação periódica:** comparar gateway × banco, reprocessar eventos perdidos, alertar webhook parado, relatório de divergência.
5. **Valor do Pix sempre definido no servidor** (nunca confiar no cliente).

## Em aberto
- **PSP/economia:** Mercado Pago ~0,49% (CNPJ) é sensível para doação. Avaliar PSP alternativo (Efí etc.) ou **Pix direto via banco** com tarifa de entidade sem fins lucrativos. Decisão de produto + técnica.

## Consequências
- Sem isso, o Financeiro recebe lixo e há vazamento silencioso de dinheiro. É pré-requisito de saída do piloto.
