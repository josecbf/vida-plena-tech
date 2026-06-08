---
tags:
  - pessoas
  - tecnico
  - plano
---

# Plano de Trabalho Pessoas

← [[000 - Hub Pessoas]]

---

## Fase 1 - Fundamento do domínio

Objetivo: fechar decisões conceituais antes de código.

Entregas:

- confirmar escopo v1;
- revisar entidades;
- decidir campos obrigatórios;
- decidir status iniciais;
- decidir tratamento de CPF;
- decidir regras de dados de crianças;
- validar matriz de permissões.

---

## Fase 2 - Cadastro e busca

Objetivo: permitir criação, edição e localização de pessoas.

Entregas:

- schema base;
- endpoints ou actions de pessoa;
- tela de lista;
- tela de ficha;
- busca por nome, e-mail e telefone;
- auditoria de criação/edição.

---

## Fase 3 - Família, contatos e consentimentos

Objetivo: transformar cadastro em contexto relacional seguro.

Entregas:

- contatos;
- endereços;
- famílias/casas;
- responsáveis;
- consentimentos;
- validações de dados sensíveis.

---

## Fase 4 - Tags, segmentos e timeline

Objetivo: preparar Pessoas para uso real pelos demais módulos.

Entregas:

- tags;
- filtros;
- segmentos salvos;
- timeline básica;
- contrato de evento para módulos externos.

---

## Fase 5 - Importação e deduplicação

Objetivo: permitir entrada de dados reais sem destruir qualidade.

Entregas:

- importação por planilha;
- validação de linhas;
- relatório de erros;
- candidatos a duplicidade;
- mesclagem assistida;
- auditoria da mesclagem.

---

## Critério de pronto do módulo v1

- Uma igreja consegue cadastrar, importar, buscar e manter pessoas.
- Famílias e responsáveis estão representados.
- Consentimentos são rastreáveis.
- Lideranças só veem o que têm permissão para ver.
- Outros módulos conseguem referenciar pessoa e publicar eventos na timeline.
- Duplicidades têm fluxo de tratamento.

