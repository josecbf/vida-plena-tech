---
tags:
  - tecnico
  - arquitetura
  - modularidade
  - identidade
atualizado: 2026-06-10
---

# Modularidade e Identidade Plugável

← [[Arquitetura Plataforma]] · [[APIs Abertas e Integracoes]]

## Problema

O módulo **Pessoas (01)** é o centro canônico da plataforma. Mas um módulo como **Ensino (02)** precisa poder ser:

1. **contratado isoladamente**, sem o módulo Pessoas; e
2. **plugado em outra plataforma** que já é a dona das pessoas (a plataforma hospedeira traz a identidade).

Isso parece colidir com a **regra de ouro** ("nenhum módulo reinventa pessoa, permissão, auditoria…"). A solução não é quebrar a regra — é **inverter a dependência**: o módulo não depende do *módulo* Pessoas, depende de um **contrato de identidade** que pode ser servido por diferentes provedores.

## Princípio central: Pessoas é um *provider*, não uma dependência rígida

Todo módulo passa a depender de um contrato estável — o **People Provider** — e nunca das entranhas do módulo Pessoas.

```
Ensino ──▶ PeopleProvider (contrato)
                 ▲
     ┌───────────┼─────────────┐
 Native        External       Lite
 (Pessoas 01)  (federado)   (mínimo)
```

### O contrato (`PersonRef` + operações)

```ts
// @videira/people-contract
interface PersonRef {
  id: string;          // id estável local
  displayName: string;
  email?: string;
  avatarUrl?: string;
  externalId?: string; // id no sistema de origem (quando federado)
  source: "native" | "external" | "lite";
}

interface PeopleProvider {
  resolve(id: string): Promise<PersonRef | null>;
  search(query: string): Promise<PersonRef[]>;
  // eventos de ciclo de vida que o módulo precisa reagir
  onPersonEvent(handler: (e: PersonEvent) => void): void; // created | updated | merged | deleted
}
```

O módulo Ensino guarda apenas **`personId` + dados próprios** (matrículas, progresso). Ele resolve nome/avatar via o provider, sob demanda. **A `PersonRef` é a costura estável**: trocar o provider não toca no domínio de Ensino.

> Na demo atual isso já existe em embrião: `Matricula.pessoaId` em `packages/types` é exatamente essa costura — Ensino já referencia a pessoa por id, não por objeto.

## Os três provedores

### 1. Native (Pessoas 01)
Quando o tenant contrata Pessoas. O provider é o próprio módulo Pessoas: cadastro único, histórico rico, famílias, consentimentos. Os módulos recebem `PersonRef` fino e podem *deep-link* para o perfil completo. **Modo integrado** — máximo valor de plataforma.

### 2. External / Federado
Quando Ensino é plugado em uma plataforma hospedeira que é a dona das pessoas. Um **adaptador (anti-corruption layer)** conecta na API de identidade do hospedeiro e:

- mantém um **mapa `externalId ↔ localId`** (já previsto na Integration Layer);
- mantém uma **projeção/cache local** (read model) das `PersonRef` que Ensino usa;
- sincroniza via **webhooks** (`person.created/updated/merged/deleted`) ou polling/SCIM;
- confia em **SSO/OIDC**: o hospedeiro emite um token assinado; Ensino provisiona a pessoa *just-in-time* no primeiro acesso.

O **sistema de origem da identidade é o hospedeiro**. Ensino nunca escreve identidade — só lê e referencia.

### 3. Lite (mínimo embarcado)
Quando Ensino é vendido sozinho **e** não há plataforma hospedeira para federar. Um store de identidade **mínimo** (id, nome, e-mail, avatar, consentimento) — o suficiente para Ensino funcionar. **Não é** o módulo Pessoas: é um provider degenerado, explicitamente limitado, que nunca pode crescer para virar um CRM paralelo. Caminho natural de upgrade: Lite → Native (contratar Pessoas) ou Lite → External (conectar a um hospedeiro).

## Seleção por tenant

Um **feature flag / config por tenant** escolhe qual provider o Ensino daquele tenant usa. **O mesmo código de Ensino**, identidade diferente por trás. Isso preserva um único produto (não um fork por modo de venda).

## Invariantes (o que mantém a regra de ouro)

1. **Módulos não escrevem identidade.** Só leem `PersonRef` e guardam `personId` + dados próprios.
2. **Mutação de pessoa só no provider** (Pessoas nativo ou plataforma hospedeira).
3. **`person.merged` é tratado pelo módulo** — Ensino re-aponta matrículas do id antigo para o novo (dedup é evento de domínio, não exceção esquecida).
4. **Minimização de dados (LGPD):** no modo federado, Ensino só cacheia os campos mínimos da `PersonRef`. Consentimento e exclusão propagam do sistema de origem via eventos.
5. **Lite é sancionado e limitado** — provider mínimo, não reinvenção de Pessoas.

## Modos de embutir ("plugar em outra plataforma")

- **SSO/OIDC + JIT provisioning:** hospedeiro autentica, Ensino cria a `PersonRef` no primeiro login.
- **SCIM:** hospedeiro provisiona usuários antecipadamente.
- **Webhooks de domínio:** hospedeiro emite `person.*`, Ensino mantém o read model fresco.
- **Embed de UI:** Ensino exposto via API + SDK/iframe/web component, recebendo o token de identidade do hospedeiro.

## Mapeamento no monorepo

| Pacote/app | Papel |
|---|---|
| `packages/people-contract` | Interface `PeopleProvider` + `PersonRef` (a costura) |
| `packages/people-native` | Adapter sobre o módulo Pessoas (01) |
| `packages/people-external` | Anti-corruption layer p/ plataforma hospedeira (SSO/SCIM/webhooks) |
| `packages/people-lite` | Provider mínimo embarcado |
| `packages/types` (Ensino) | Domínio de Ensino, já keyed por `personId` |
| `apps/ensino` (futuro) | Ensino como app contratável isolado |

## Trade-offs a debater

- **Consistência eventual** da projeção de pessoas (nomes podem ficar stale entre sync).
- **Merge/dedup** entre origens diferentes (quem decide o match?).
- **Fronteira LGPD controlador × operador** quando embarcado em terceiro.
- **Confiança de token** no SSO (validação, rotação de chaves, expiração).
- **Suporte operacional**: quem resolve problema de identidade no modo standalone?
- **Risco de o Lite "vazar escopo"** e virar um Pessoas pobre.

## ⚠️ Revisão pós-validação (Gemini)

A validação externa contestou o provider **Lite** (tende a inchar e, na prática, reimplementa gestão de pessoas — quebra a regra de ouro) e o **cache da `PersonRef` federada** (consistência distribuída + risco de LGPD). Proposta de revisão em [[ADRs/0005-identidade-plugavel-revisao|ADR-0005]]: **descontinuar o Lite** em favor de *Native sempre embarcado + gating comercial*, e implementar o **External** como *SSO/OIDC + JIT mínimo / Zero-State* (sem materializar `PersonRef`). Confirmar com GPT/Claude antes de fechar.

## Próximas decisões

- [ ] Aprovar (ou ajustar) o contrato `PersonRef`/`PeopleProvider`.
- [ ] Definir protocolo de federação padrão (OIDC + SCIM? webhooks próprios?).
- [ ] Definir política de cache/sync e tratamento de `person.merged`.
- [ ] Mapear papéis LGPD por modo de venda (nativo, federado, lite).
- [ ] Validar o modelo com revisores externos (ver [[Prompt - Validacao de Arquitetura (Gemini e GPT)]]).
