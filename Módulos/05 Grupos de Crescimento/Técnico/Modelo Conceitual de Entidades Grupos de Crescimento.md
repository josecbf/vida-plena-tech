---
tags:
  - grupos-crescimento
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Grupos de Crescimento

← [[000 - Hub Grupos de Crescimento]]

## Entidades principais

- Grupo
- Participante
- Liderança do Grupo
- Reunião
- Frequência
- Ciclo
- Região
- Encaminhamento

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
