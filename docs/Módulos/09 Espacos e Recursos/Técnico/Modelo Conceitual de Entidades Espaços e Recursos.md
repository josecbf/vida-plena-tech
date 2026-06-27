---
tags:
  - espacos-recursos
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Espaços e Recursos

← [[000 - Hub Espaços e Recursos]]

## Entidades principais

- Espaço
- Recurso
- Reserva
- Solicitação
- Aprovação
- Bloqueio
- Checklist
- Preparação

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
