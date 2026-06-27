---
tags:
  - eventos
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Eventos

← [[000 - Hub Eventos]]

## Entidades principais

- Evento
- Inscrição
- Participante
- Lote
- Pagamento
- Formulário
- Check-in
- Equipe do Evento

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
