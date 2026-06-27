---
tags:
  - tecnico
  - arquitetura
  - validacao
  - adr
atualizado: 2026-06-11
---

# Validação de Arquitetura — Consolidação (GPT · Claude · Gemini)

Síntese das rodadas de validação externa. Regra: **convergência = risco real (agir); divergência = decisão a registrar como ADR.**

> **Cobertura:** Infra (prompt [[Arquitetura por Fases e Opcoes]]) = **3/3** (GPT, Claude, Gemini). Identidade (prompt [[Modularidade e Identidade Plugavel]]) = **2/3** (Gemini, GPT) — **falta rodar no Claude**.

---

## Trilha A — Infraestrutura (GPT + Claude + Gemini) — cobertura completa

### Convergências (2+ IAs) → risco real, agir

1. **Pooling de Postgres no caminho de pagamento é o risco nº1 — os TRÊS concordam.** Não é o redirect (já saiu do Postgres); é o momento da oferta: 500+ pessoas gerando Pix quase no mesmo segundo → tempestade de conexões → 5xx na tela de oferta. **Supavisor transaction mode obrigatório** desde a Fase 0 (e isso quebra prepared statements/`LISTEN-NOTIFY` → afeta ORM e relay do outbox). → **ADR-0001 / ADR-0004**.
2. **Caminho de ESCRITA/consistência do destino do TAP** (os três). Gemini reforça: lag de replicação do Upstash global pode servir destino velho na primeira onda; e falta **confirmação em tempo real** (SSE/WebSocket/Supabase realtime) de que a troca de destino chegou. → **ADR-0002**.
3. **Idempotência Pix ponta-a-ponta + state machine + reconciliação** (os três). Gemini: lock na inbox sob concorrência → evento financeiro duplicado se a unique constraint não for impecável. → **ADR-0003**.
4. **RLS seguro p/ começar, mas com dois cuidados:** service-role bypassa RLS (GPT+Claude); **políticas RLS com JOINs complexos degradam sob carga** (Gemini) → manter políticas simples, sem JOIN cross-módulo. → **ADR-0004**.
5. **BigQuery no dia 1 é over-engineering** (os três) → começar com **Postgres views/read replicas**; warehouse na Fase 2. → [[Arquitetura por Fases e Opcoes]].
6. **Custo subestimado** (os três). Gemini é o mais duro: **~US$250–300 já no início** por causa dos picos/overages, não US$60–120. GPT/Claude: Fase 1 âncora ~US$250–700. Ocultos: egress, e-mail transacional com IP dedicado, WAF/Cloudflare. → ajuste já refletido na arquitetura.
7. **Rate limiting + WAF no TAP** (Gemini forte + Claude). Moeda NFC é pública = alvo de abuso; sem isso, um bot estoura cota de edge/DB. + **valor do Pix sempre server-side**. → **ADR-0003**.
8. **LGPD: direito ao esquecimento × event sourcing/BigQuery imutável** (Gemini + Claude) → **crypto-shredding/pseudonimização** desde o design do evento. → **ADR-0006**.
9. **Outbox sustenta longe; sinal p/ broker** (os três). Gemini concreto: quando o worker do outbox passa a roubar CPU das transações do culto, ou WAL incha. → **ADR-0001**.
10. **Worker persistente p/ jobs longos** (Claude forte; Gemini confirma: ETL/relatórios estouram timeout da Vercel). → **ADR-0001**.

### Divergência principal (a única real, agora 2×1) → ADR-0001

**Serverless (Op.1) vs Cloud Run/containers (Op.2):**
- **GPT:** Opção 1 serve p/ Fase 0–1, desde que o redirect saia do monólito.
- **Claude:** "Opção 1.5" — serverless + **um worker persistente**.
- **Gemini:** **Opção 2 (Cloud Run)** — tráfego de igreja é "coreografado" (rajada sincronizada), o pior caso p/ serverless (cold start + connection storm); Cloud Run mantém conexões quentes.

**Onde os três concordam (e que resolve metade da briga):** (a) o redirect vai p/ a **borda** — **Cloudflare Workers + KV** é o específico favorito (Gemini: "mais rápido, maduro e barato que Vercel Edge + Upstash"); (b) o **caminho de escrita/pagamento precisa de conexões quentes** (seja Cloud Run, seja worker persistente + pooling agressivo). O ponto do Gemini tem força porque o caminho síncrono mais perigoso — gerar Pix no pico da oferta — é exatamente uma rajada sincronizada batendo no Postgres. → **decisão do dono em ADR-0001**.

---

## Trilha B — Identidade (Gemini + GPT; falta Claude)

### Convergência forte (2/2)

1. **O Lite ameaça/quebra a regra de ouro na prática.** Ambos: só se sustenta se for um **kernel de identidade mínimo**, nunca um "Pessoas básico". Exigem **proibições arquiteturais explícitas** (sem família, tags, comunicação, histórico pastoral, campos customizados, CRM, busca rica).
2. **Substituir o Lite por um núcleo mínimo de identidade obrigatório.** Gemini: "Native sempre embarcado + gating comercial". GPT: "Identity Kernel obrigatório". **É a mesma ideia** — um núcleo (`tenantId + localPersonId + identityLinks + status + consentimento mínimo + lifecycle`), com o Pessoas completo acima dele.
3. **MVP = só Native** atrás do contrato. Adiar External/Federado, SCIM, webhooks, embed (SDK/iframe), múltiplos providers por tenant, troca dinâmica e merge automático.
4. **Matriz LGPD controlador×operador por modo** é obrigatória — o Ensino gera dados próprios (matrícula, progresso, certificado, dados de criança), então "o hospedeiro é dono da identidade" NÃO resolve LGPD.

### Refinos fortes do GPT (decisões de design)

- **`PersonRef` é fraco demais** como base operacional → introduzir **`localPersonId` + `IdentityLink`**. Matrícula/progresso/certificado apontam para **`localPersonId`, nunca para `externalId`**.
- **Separar contratos** em vez de um `PeopleProvider` que mistura tudo: `Identity` (auth/SSO), `Profile` (nome/avatar), `PersonDirectory` (pessoa local/status), `Authorization` (papéis/escopos), `Consent` (LGPD), `Audit`.
- **Falta um contrato de permissão.** A regra de ouro diz "não reinventar permissão", mas a proposta é silenciosa sobre autorização (quem pode criar curso, ver progresso, matricular, ver dado de criança, por campus). **Gap a endereçar.**
- **Lifecycle rico de eventos** (`linked/unlinked/merged/split/deactivated/reactivated/deleted/anonymized`, `consent.revoked`) — `person.merged` sozinho corrompe histórico.
- **Testes de arquitetura:** Ensino não importa tabela interna de Pessoas, só o contrato.

### Decisão consolidada de identidade → ADR-0005 (sobe para "Aceito na direção")

Com Gemini + GPT convergindo: **(1) núcleo mínimo de identidade obrigatório (localPersonId + IdentityLink); (2) descontinuar o "Lite como mini-Pessoas"; (3) MVP só Native atrás do contrato; (4) adiar toda federação; (5) separar identidade/perfil/permissão/consentimento.** Confirmar com Claude antes de marcar "Aceito" pleno.

---

## Decisões a fechar (ADRs)

| ADR | Tema | Situação |
|---|---|---|
| 0001 | Plataforma e escala | **Aberto:** serverless (GPT) vs Cloud Run (Gemini) vs híbrido+worker (Claude) p/ o caminho de pagamento. Convergência: redirect na borda (Cloudflare Workers+KV) + conexões quentes no write. |
| 0002 | Destino ativo do TAP | **Aberto:** fonte da verdade (Redis vs Postgres) + confirmação realtime. |
| 0003 | Pix idempotência | Aceito; PSP + rate limiting/WAF a confirmar. |
| 0004 | Isolamento multi-tenant | Aceito; service-role×JWT em aberto; manter RLS simples (sem JOIN). |
| 0005 | Identidade plugável | **Convergência 2/2:** kernel mínimo + Native-only + adiar federação. Falta Claude. |
| 0006 | Residência/LGPD | Reforçado (Gemini+Claude): região BR + crypto-shredding. |

Falta: rodar **identidade no Claude** para fechar 3×2.
