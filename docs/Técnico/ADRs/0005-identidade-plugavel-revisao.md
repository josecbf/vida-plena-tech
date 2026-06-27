---
tags: [tecnico, arquitetura, adr, identidade]
status: Aceito na direção
atualizado: 2026-06-11
---

# ADR-0005 — Identidade plugável: revisão

**Status:** Aceito na direção (convergência **Gemini + GPT**). Falta a 3ª opinião (Claude) para marcar "Aceito" pleno. Revisa [[Modularidade e Identidade Plugavel]].

## Contexto
A proposta original tinha 3 providers (Native / External-Federado / **Lite**). Gemini e GPT, de forma independente, chegaram à mesma crítica e à mesma solução.

**Crítica convergente:** o **Lite** quebra a regra de ouro na prática (incentivo comercial o empurra a virar CRM paralelo); o cache da `PersonRef` federada cria consistência distribuída difícil + risco de LGPD; `PersonRef` é fraco demais como base operacional.

## Decisão (direção)
1. **Núcleo mínimo de identidade obrigatório** (Gemini "Native sempre embarcado + gating comercial" = GPT "Identity Kernel"): `tenantId + localPersonId + identityLinks + displayName + email? + status + consentimento mínimo + eventos de lifecycle`. O módulo **Pessoas completo** (famílias, histórico pastoral, tags, comunicação) fica **acima** desse núcleo.
2. **`localPersonId` + `IdentityLink`:** matrícula, progresso e certificado apontam para **`localPersonId` estável por tenant — nunca para `externalId`**. `IdentityLink` mapeia `localPersonId ↔ provider/externalSubject`.
3. **MVP = só `NativeProvider`** atrás do contrato (uma única implementação real). Não construir abstração para hospedeiro que ainda não existe.
4. **Descontinuar o "Lite como mini-Pessoas".** Se sobreviver, é só como o núcleo mínimo acima, com **proibições arquiteturais**: sem família, tags globais, campos customizados, comunicação, histórico pastoral, segmentação, CRM, busca rica, relatórios de pessoas. Necessidade acima disso = contratar/migrar para Pessoas.
5. **Separar contratos** em vez de um `PeopleProvider` que mistura tudo: `Identity` (auth/SSO), `Profile` (nome/avatar), `PersonDirectory` (pessoa local/status/lifecycle), `Authorization` (papéis/escopos), `Consent` (LGPD), `Audit`.
6. **Adiar** External/Federado, SCIM, webhooks bidirecionais, embed (SDK/iframe), múltiplos providers por tenant, troca dinâmica e merge automático — até existir um hospedeiro real.
7. **Lifecycle rico de eventos:** `person.linked/unlinked/merged/split/deactivated/reactivated/deleted/anonymized`, `identity.external_changed`, `consent.revoked` — o Ensino reage explicitamente a cada um.
8. **Testes de arquitetura:** o Ensino não importa tabela/entidade interna de Pessoas; só o contrato.

## Gaps a endereçar (levantados pelo GPT)
- **Contrato de permissão/autorização** não existe na proposta (a regra de ouro proíbe reinventar permissão, mas nada foi definido sobre quem pode criar curso, ver progresso, matricular, ver dado de criança, por campus). → abrir ADR próprio de autorização.
- **Matriz LGPD controlador×operador por modo** (Native/External/Lite) — quem é controlador dos dados educacionais gerados pelo Ensino.
- **Estratégia de migração Lite/standalone → Native** (dedup, consentimento, IDs locais, crianças/responsáveis).

## Consequências
- Modelo de dados único e estável; elimina a dívida do Lite-CRM e a maior parte do risco de LGPD de cadastro.
- Custo: leve overhead comercial/UX (Pessoas "capado" em vez de ausente para clientes pequenos).
- Pendente: confirmar com Claude; abrir ADR de autorização.
