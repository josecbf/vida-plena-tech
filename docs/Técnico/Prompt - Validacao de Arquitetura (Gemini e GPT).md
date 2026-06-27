---
tags:
  - tecnico
  - arquitetura
  - validacao
atualizado: 2026-06-10
---

# Prompt — Validação de Arquitetura (Gemini e GPT)

Use o bloco abaixo em **Gemini** e em **GPT** (separadamente). É autocontido: a outra IA não tem acesso ao repositório. Compare as duas respostas e traga as divergências para discussão. Referência interna: [[Modularidade e Identidade Plugavel]].

---

```
Você é um arquiteto de software sênior, cético e direto, especialista em SaaS B2B multi-tenant, identidade/SSO e LGPD. Avalie criticamente a arquitetura abaixo. Não seja gentil: seu trabalho é encontrar furos.

## Contexto do produto
"Vida Plena Tech" é uma plataforma SaaS modular para igrejas (inspirada no Planning Center). Há um módulo central "Pessoas" (cadastro único de pessoas, famílias, consentimentos, histórico) e ~15 módulos satélites (Ensino, Eventos, Financeiro, Crianças, etc.). Começa como monolito modular multi-tenant (1 tenant = 1 igreja; pode ter múltiplos campus). Cada registro tem tenantId. Eventos de domínio e auditoria desde o início. Regra de ouro: nenhum módulo pode reinventar pessoa, permissão, comunicação ou auditoria.

## Requisito que gera a tensão
O módulo "Ensino" (trilhas/cursos/aulas/matrículas/progresso) precisa poder ser:
1) contratado isoladamente, SEM o módulo Pessoas; e
2) plugado em OUTRA plataforma (hospedeira) que já é a dona das pessoas e traz a identidade.
Isso aparentemente colide com a regra de ouro (Pessoas é o centro).

## Arquitetura proposta (a ser avaliada)
- Inverter a dependência: módulos dependem de um CONTRATO de identidade ("PeopleProvider"), não do módulo Pessoas.
- PersonRef = { id, displayName, email?, avatarUrl?, externalId?, source }. Ensino guarda só personId + dados próprios (matrículas, progresso) e resolve nome/avatar via o provider.
- Três implementações do provider, selecionadas por feature flag por tenant:
  1. Native: o próprio módulo Pessoas (modo integrado, valor máximo).
  2. External/Federado: anti-corruption layer que conecta na API de identidade da plataforma hospedeira; mantém mapa externalId↔localId, projeção/cache local das PersonRef, sincroniza via webhooks/SCIM, confia em SSO/OIDC com provisionamento just-in-time. O hospedeiro é o sistema de origem da identidade.
  3. Lite: store de identidade mínimo embarcado (id, nome, email, avatar, consentimento) para quando Ensino é vendido sozinho sem hospedeiro. Explicitamente limitado para não virar um CRM paralelo.
- Invariantes: módulos nunca escrevem identidade; mutação de pessoa só no provider; person.merged faz o módulo re-apontar matrículas; minimização de dados LGPD no modo federado; Lite é sancionado mas limitado.
- Modos de embutir: SSO/OIDC + JIT, SCIM, webhooks de domínio, embed de UI via SDK/iframe/web component.

## O que eu quero de você
1. Veredito em uma frase: a arquitetura é sólida, arriscada ou furada?
2. Os 5 maiores riscos/failure modes concretos (consistência de cache, merge/dedup entre origens, confiança de token SSO, fronteira LGPD controlador×operador quando embarcado em terceiro, suporte operacional, vazamento de escopo do Lite — e o que mais você enxergar).
3. O que está SUPER-engenheirado e poderia ser mais simples para um MVP.
4. O que está FALTANDO (algo crítico não endereçado).
5. 1 ou 2 arquiteturas ALTERNATIVAS que você consideraria, com prós/contras vs. a proposta.
6. A regra de ouro ("módulo não reinventa pessoa") realmente se mantém, ou o provider Lite a quebra na prática?
7. Recomendação final priorizada (o que fazer primeiro, o que adiar).

Seja específico e técnico. Aponte premissas que eu não declarei e que mudam a conclusão. Se faltar informação para julgar algo, diga qual.
```

---

## Como usar o resultado

1. Rode em Gemini e GPT separadamente.
2. Cole as duas respostas de volta aqui (ou resuma) para o time/IA comparar.
3. Pontos onde as duas concordam → tratar como risco real. Onde divergem → decisão de arquitetura a registrar como ADR em `docs/Técnico/`.
