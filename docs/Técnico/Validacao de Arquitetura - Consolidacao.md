---
tags:
  - tecnico
  - arquitetura
  - validacao
  - adr
atualizado: 2026-06-11
---

# Validação de Arquitetura — Consolidação (GPT · Claude · Gemini)

Síntese das três rodadas de validação externa. Regra: **convergência = risco real (agir); divergência = decisão a registrar como ADR.**

> Cobertura dos prompts: **GPT** e **Claude** responderam ao prompt de **infraestrutura** ([[Arquitetura por Fases e Opcoes]]). **Gemini** respondeu ao prompt de **identidade plugável** ([[Modularidade e Identidade Plugavel]]). Logo, na infra há convergência **GPT+Claude**; na identidade o Gemini é voz única. **Pendente:** rodar o prompt de infra no Gemini e o de identidade no GPT/Claude para fechar a cobertura 3×2.

---

## Trilha A — Infraestrutura (GPT + Claude)

### Convergências → risco real, agir (vira ADR "Aceito")

1. **O caminho de ESCRITA do destino ativo do TAP está sub-especificado.** Ambos: o read (Edge→Redis) está ok; falta o write/sync — fonte da verdade, propagação, cache stale, versionamento, kill switch. Cache velho no minuto da oferta = pessoa cai no destino errado (mexe com dinheiro). Exigem registro versionado: `tap_group_id, active_destination_id, version, effective_from, updated_by, tenant_id` + TTL curto + write-through + fallback seguro + auditoria + load test com troca durante pico. → **ADR-0002**.
2. **Idempotência do Pix ponta-a-ponta + máquina de estados, não só webhook.** Ambos: idempotência na criação do QR, no webhook (MP manda duplicado/fora de ordem), e no evento p/ Financeiro. State machine `created→qr_generated→pending→paid|expired|cancelled|failed|refunded`. Corrida crítica: expiração vs webhook "pago" no limite do TTL. Reconciliação obrigatória (webhook é notificação, não verdade). → **ADR-0003**.
3. **Pooling de Postgres obrigatório desde a Fase 0.** O storm de conexões não está no redirect (já saiu do Postgres) — está no **caminho de pagamento/escrita** no pico. Supabase Micro ~60 conexões; usar **Supavisor transaction mode** (porta 6543), ciente de que isso quebra prepared statements/`LISTEN-NOTIFY` (afeta config do ORM e do relay do outbox). → **ADR-0001 / ADR-0004**.
4. **RLS é seguro para começar, mas service-role é footgun.** Em rotas de backend é tentador usar service-role, que **bypassa RLS** → cada query precisa de `WHERE tenant_id` manual → um esquecido = vazamento entre igrejas (catastrófico com dado pastoral/LGPD). Exigem: contexto de tenant na sessão + RLS contra ele + **testes automatizados de isolamento cross-tenant** em todo PR que cria tabela tenant-scoped. → **ADR-0004**.
5. **Falta um worker persistente.** Funções serverless têm teto de execução; relay do outbox, ETL→BI e reconciliação Pix não cabem de forma confiável. Claude propõe **"Opção 1.5"**: serverless para UI/API/redirect + **um worker sempre-ligado** (Cloud Run/Fly/Railway) para esses jobs. → **ADR-0001**.
6. **Custo da Fase 1 (igreja âncora) subestimado.** Ambos: $60–120 é piso de MVP, mas **a âncora de 24k não é carga de Fase 0**. Estimativa realista para a âncora: **~$250–700/mês** com backup/PITR, e-mail, observabilidade, compute do Supabase, egress, staging. → ajustar [[Arquitetura por Fases e Opcoes]].
7. **Faltam itens críticos da Fase 0** (ambos): e-mail/SMS transacional (recibo/avisos); **rate limiting no edge** (moeda NFC é pública) + **valor do Pix sempre server-side** (nunca confiar no cliente); reconciliação de pagamento; runbook de "modo domingo" (quem troca destino, kill switch, o que fazer se Redis/MP/internet caírem). → **ADR-0003 / ADR-0001**.
8. **Super-engenheirado para a Fase 0** (ambos): BigQuery com streaming completo (começar com Postgres+views/export batch), adapters de identidade plugável, microsserviços, Pub/Sub/Kafka. Manter só o **outbox** (higiene barata). → reflete em [[Arquitetura por Fases e Opcoes]].
9. **Multi-tenant RLS compartilhado escala longe** (ambos): promover a schema/DB dedicado por **compliance/SLA/contrato enterprise ou noisy-neighbor**, nunca por tamanho (24k é pequeno). → **ADR-0004**.
10. **Outbox sustenta muito longe** (ambos; Claude: "provavelmente nunca precisa Kafka"). Sinais p/ broker: lag em horário normal, fan-out pesado, replay, consumidores externos, serviços separados. Antes do broker: `LISTEN/NOTIFY` ou logical decoding p/ matar latência de polling. → **ADR-0001**.

### Divergências / decisões em aberto → ADR "Proposto"

- **Serverless puro (Op.1) vs híbrido com worker (Op.1.5):** GPT aceita Op.1 nas Fases 0–1; Claude pede o worker persistente já cedo. (Convergem em "vai precisar de worker"; divergem no quando.) → **ADR-0001**.
- **Fonte da verdade do destino ativo do TAP:** Redis-as-source (write-through p/ Postgres) **vs** Postgres-as-source (push/invalidate p/ Redis). → **ADR-0002**.
- **service-role vs JWT do usuário no backend.** → **ADR-0004**.
- **A âncora entra na Fase 0 ou Fase 1?** Muda custo e prontidão exigida. → decisão de roadmap.
- **PSP/economia do Pix:** Mercado Pago ~0,49% (CNPJ) é sensível para doação; avaliar PSP alternativo ou Pix direto via banco com tarifa de entidade sem fins lucrativos. → **ADR-0003**.
- **Residência de dados + LGPD:** região de Supabase/Vercel/BigQuery; dado pastoral de brasileiros em região US = transferência internacional. Event store append-only + BI brigam com o **direito ao esquecimento** → exige **crypto-shredding/pseudonimização desde o design do evento**. → **ADR-0006**.

---

## Trilha B — Identidade plugável (Gemini)

O Gemini **desafia a minha própria proposta** (Native/External/Lite). Honestamente, os pontos são bons:

1. **Cache da `PersonRef` federada** = consistência distribuída difícil (webhook falho → dado stale, ou matrícula ativa de quem perdeu acesso na origem).
2. **Lite incha** → vira CRM concorrente (já era o risco que eu mesmo apontei).
3. **LGPD operador:** guardar `PersonRef` obriga propagar exclusão em tempo real do hospedeiro.
4. **JIT + mapeamento de tenant externo:** erro de validação de token cruza matrículas entre igrejas.
5. **Merge Lite→Native** = pesadelo de FK/órfãos sem event sourcing rígido.

**Veredito do Gemini:** o **Lite quebra a regra de ouro na prática** (ter tabelas/validação/edição de pessoa = reimplementar gestão de pessoas).

**Alternativas que ele propõe (e que eu acho superiores ao Lite):**
- **Alt 1 — Pessoas Core sempre embarcado, gating comercial:** todo deploy leva o módulo Pessoas; quando Ensino é vendido sozinho, o cliente leva Pessoas com UI "capada" e trava de billing. Modelo de dados único, **zero migração**, não quebra a regra de ouro. Contra: leve overhead comercial/UX.
- **Alt 2 — Zero-State (proxy):** no modo federado, guardar só o `personId` opaco; **nunca materializar `PersonRef`** no Postgres; a UI enriquece em runtime via gateway que consulta a plataforma-mãe. Consistência perfeita + zero LGPD sobre cadastro. Contra: latência do hospedeiro impacta o serviço.

**Recomendação consolidada (revisão da minha proposta):** trocar o **Lite** pela **Alt 1** (Native sempre embarcado + gating comercial) e implementar o **External** como **SSO/OIDC + JIT mínimo / Zero-State** (sem SCIM/webhook/cache na v1). Adiar SCIM, sync bidirecional e merge. → **ADR-0005**.

> Pendência: rodar o prompt de identidade no GPT e no Claude para confirmar/contestar a recomendação do Gemini antes de fechar o ADR-0005.

---

## Premissas que mudam a conclusão (a responder)

Da união das três rodadas, as decisões de maior alavancagem:
1. **Fonte da verdade do destino ativo do TAP** (Redis vs Postgres).
2. **service-role vs JWT** no backend.
3. **A âncora entra na Fase 0 ou na Fase 1?**
4. **Região/residência de dados** (LGPD) e estratégia de exclusão (crypto-shredding).
5. **Identidade:** adotar Alt 1 (gating comercial) no lugar do Lite?
6. **PSP do Pix** (taxa) e domínio da URL do NFC (Videira vs igreja).

Ver ADRs em [`ADRs/`](ADRs/).
