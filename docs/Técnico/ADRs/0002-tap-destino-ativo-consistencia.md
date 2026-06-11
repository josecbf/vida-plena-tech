---
tags: [tecnico, arquitetura, adr, tap]
status: Proposto
atualizado: 2026-06-11
---

# ADR-0002 — Consistência do destino ativo do TAP

**Status:** Proposto — aguardando decisão do dono. (GPT, Claude e Gemini convergem que o **caminho de escrita** do destino ativo está sub-especificado e é o coração do módulo crítico.)

## Contexto
O read do redirect (Edge→Redis, <200ms) está resolvido. Falta o **write/sync**: como o operador de palco troca o destino, qual a fonte da verdade, e o que acontece com cache stale no minuto da oferta (pessoa cai no destino anterior = bug que mexe com dinheiro).

## Opções
- **A — Redis como fonte da verdade**, com write-through assíncrono para o Postgres (durabilidade). Prós: latência mínima de propagação. Contra: durabilidade depende do write-through.
- **B — Postgres como fonte da verdade**, com push/invalidate para o Redis na troca. Prós: durabilidade/auditoria natural. Contra: janela de propagação maior; risco de réplica regional atrasada.

## Requisitos (valem para qualquer opção)
- Registro versionado: `tap_group_id, active_destination_id, version, effective_from, updated_by, tenant_id`.
- TTL curto, fallback seguro, **kill switch**, painel "destino ativo agora", auditoria de troca.
- **Load test simulando troca de destino durante rajada** no mesmo minuto (não requests distribuídos).
- **Confirmação em tempo real** (SSE/WebSocket/Supabase realtime) de que a troca chegou à borda — não usar polling (Gemini).
- Redirect na borda preferido em **Cloudflare Workers + KV** (Gemini: mais rápido/maduro/barato que Vercel Edge + Upstash); atenção ao **lag de replicação** entre regiões (cache stale na primeira onda).

## Decisão
_Pendente._ Recomendação inicial: **Opção B** (Postgres fonte da verdade + invalidate/push para Redis) pela durabilidade e auditoria, com cache de leitura na borda e versão monotônica para detectar stale.
