---
tags: [tecnico, arquitetura, adr, identidade]
status: Proposto
atualizado: 2026-06-11
---

# ADR-0005 — Identidade plugável: revisão pós-Gemini

**Status:** Proposto. Revisa [[Modularidade e Identidade Plugavel]] à luz da crítica do Gemini. **Pendente:** rodar o mesmo prompt no GPT/Claude antes de fechar.

## Contexto
A proposta original tinha 3 providers: Native (Pessoas 01), External/Federado (anti-corruption + SCIM/webhooks/cache) e **Lite** (store mínimo embarcado). O Gemini argumenta que:
- o **Lite quebra a regra de ouro na prática** (ter tabela/validação/edição de pessoa = reimplementar gestão de pessoas) e **vai inchar** virando CRM concorrente;
- o cache da `PersonRef` federada cria consistência distribuída difícil e risco de LGPD (propagar exclusão do hospedeiro em tempo real);
- merge Lite→Native vira pesadelo de FK/órfãos.

## Opções (revisão)
- **Substituir o Lite pela "Alt 1 — Native sempre embarcado + gating comercial":** todo deploy leva o módulo Pessoas; vender Ensino sozinho = Pessoas com UI capada + trava de billing. Modelo de dados único, **zero migração**, não quebra a regra de ouro.
- **External como "Alt 2 — Zero-State":** guardar só o `personId`/`externalId` opaco; **nunca materializar `PersonRef`**; UI enriquece em runtime via gateway que consulta a plataforma-mãe. Consistência perfeita + zero LGPD sobre cadastro. Contra: latência do hospedeiro.
- Implementar External v1 como **SSO/OIDC + JIT mínimo**; **adiar SCIM, webhooks bidirecionais e merge**.

## Decisão
_Pendente._ Recomendação: **adotar Alt 1** (descontinuar o Lite) e **External = SSO/OIDC + JIT mínimo / Zero-State** na v1.

## Consequências
- Simplifica o modelo de dados e elimina a dívida do Lite; o custo é um leve overhead comercial/UX para clientes pequenos (Pessoas "capado" em vez de ausente).
- Confirmar com 2ª/3ª opinião (GPT/Claude) antes de fechar.
