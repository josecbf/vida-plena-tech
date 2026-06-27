---
tags:
  - cultos
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Gestão de Cultos

← [[000 - Hub Gestão de Cultos]]

## Entidades principais

- Plano de Culto
- Item do Culto
- Música
- Arranjo
- Escala
- Confirmação
- Mídia
- Roteiro

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
