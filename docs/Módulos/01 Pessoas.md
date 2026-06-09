---
tags:
  - modulo
  - pessoas
  - core
---

# Modulo 01 - Pessoas

> Documento original de visão rápida. A versão amadurecida do módulo agora está em [[000 - Hub Pessoas]].

## Estrutura detalhada

- [[000 - Hub Pessoas]]
- [[Visão e Proposta de Valor - Pessoas]]
- [[PRD Pessoas]]
- [[Modelo Conceitual de Entidades Pessoas]]

---

## Papel na plataforma

Pessoas e o modulo mais importante. Ele e o cadastro vivo da igreja e a base para todos os demais produtos.

## Problema

Igrejas perdem contexto sobre pessoas: quem e membro, visitante, aluno, voluntario, pai, mae, lider, crianca, doador, participante de evento, pessoa em acompanhamento ou alguem que sumiu.

## MVP

- Cadastro completo de pessoa.
- Familias e vinculos.
- Contatos e enderecos.
- Tags e segmentos.
- Status ministerial.
- Jornada do discipulo.
- Timeline unificada.
- Consentimentos.
- Busca global.
- Importacao via planilha/API.
- Auditoria.

## Futuro

- Duplicidade inteligente.
- Score de engajamento.
- Segmentacao por IA.
- Historico multi-campus.
- Portal do membro para atualizar dados.

## Entidades

- Person.
- Household.
- HouseholdMember.
- ContactMethod.
- Address.
- Consent.
- PersonTag.
- PersonStatus.
- PersonJourneyStage.
- TimelineEntry.
- ExternalMapping.

## Telas

- Lista de pessoas.
- Ficha da pessoa.
- Familia.
- Timeline.
- Jornada.
- Segmentos.
- Importacao.
- Duplicidades.
- Consentimentos.

## Integracoes

Todos os modulos leem Pessoas. Alguns tambem escrevem timeline.

## Riscos

- Cadastro virar deposito baguncado.
- Dado sensivel exposto.
- Duplicidade.
- Falta de governanca para status.
