---
tags:
  - apoio-pastoral-som
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Apoio Pastoral SOM

← [[000 - Hub Apoio Pastoral SOM]]

## Entidades principais

- Sinal Pastoral
- Caso Pastoral
- Ação Pastoral
- Janela Temporal
- Indicador de Saúde
- Escopo de Liderança
- Briefing

## Relações fundamentais

- Todas as entidades pertencem a um tenant.
- Quando houver pessoa envolvida, o relacionamento aponta para Pessoa.
- Ações relevantes registram usuário executor, data, origem e contexto.
- Histórico deve ser preservado para auditoria e relatórios.

## Eventos de domínio possíveis

- Registro criado.
- Registro atualizado.
- Status alterado.
- Responsável definido.
- Ação concluída.
- Pendência aberta.
