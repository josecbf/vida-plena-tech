---
tags:
  - financeiro
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Financeiro

← [[000 - Hub Financeiro]]

## Entidades principais

- Lançamento
- Conta
- Centro de Custo
- Categoria
- Doação
- Despesa
- Conciliação
- Orçamento

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
