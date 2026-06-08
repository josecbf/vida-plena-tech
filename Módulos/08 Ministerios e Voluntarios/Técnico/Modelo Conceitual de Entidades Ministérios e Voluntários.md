---
tags:
  - ministerios-voluntarios
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Ministérios e Voluntários

← [[000 - Hub Ministérios e Voluntários]]

## Entidades principais

- Ministério
- Equipe
- Voluntário
- Função
- Requisito
- Disponibilidade
- Escala
- Treinamento

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
