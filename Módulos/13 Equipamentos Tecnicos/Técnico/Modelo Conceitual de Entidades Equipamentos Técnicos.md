---
tags:
  - equipamentos-tecnicos
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Equipamentos Técnicos

← [[000 - Hub Equipamentos Técnicos]]

## Entidades principais

- Equipamento
- Kit
- Reserva
- Manutenção
- Ocorrência
- Responsável
- Local
- Checklist Técnico

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
