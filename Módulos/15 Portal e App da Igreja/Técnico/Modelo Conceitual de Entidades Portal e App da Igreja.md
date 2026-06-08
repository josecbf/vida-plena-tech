---
tags:
  - portal-app
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Portal e App da Igreja

← [[000 - Hub Portal e App da Igreja]]

## Entidades principais

- Conta do Membro
- Sessão
- Preferência
- Notificação
- Inscrição
- Check-in
- Progresso
- Escala

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
