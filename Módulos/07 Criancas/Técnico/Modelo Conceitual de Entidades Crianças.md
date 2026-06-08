---
tags:
  - criancas
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Crianças

← [[000 - Hub Crianças]]

## Entidades principais

- Criança
- Responsável
- Autorização
- Check-in Infantil
- Sala
- Turma
- Restrição
- Ocorrência

## Entidades de segurança obrigatórias

```text
ChildProfile
  id, tenantId, personId
  defaultRoomId
  notesSensitivity

AuthorizedGuardian
  id, tenantId, childPersonId, guardianPersonId
  relationshipType
  canPickup
  canAuthorizeMedical
  verifiedAt
  revokedAt

CustodyRestriction
  id, tenantId, childPersonId
  restrictedPersonId
  reasonCategory
  visibilityPolicy
  activeFrom, activeUntil

HealthRestriction
  id, tenantId, childPersonId
  type (allergy | medication | special_need | other)
  summary
  severity
  visibilityPolicy

CheckinSession
  id, tenantId, childPersonId
  eventId, roomId
  checkinCode
  checkedInByPersonId
  checkedInByUserId
  checkedInAt

CheckoutAttempt
  id, tenantId, checkinSessionId
  attemptedByPersonId
  executedByUserId
  result (approved | denied | overridden)
  denialReason
  overrideReason
  occurredAt

IncidentReport
  id, tenantId, childPersonId, checkinSessionId
  type
  description
  severity
  responsibleUserId
  guardianNotifiedAt
```

## Relações fundamentais

- Todas as entidades pertencem a um tenant.
- Quando houver pessoa envolvida, o relacionamento aponta para Pessoa.
- Ações relevantes registram usuário executor, data, origem e contexto.
- Histórico deve ser preservado para auditoria e relatórios.
- Checkout valida responsável autorizado, código/etiqueta, contexto do evento, sala, executor e horário.
- Alergias, restrições médicas, restrições de guarda e incidentes são dados sensíveis de menor.
- Voluntário deve ver somente o necessário para cuidar da criança naquele contexto.

## Eventos de domínio possíveis

- Registro criado.
- Registro atualizado.
- Status alterado.
- Responsável definido.
- Ação concluída.
- Pendência aberta.
- Check-in realizado.
- Checkout aprovado.
- Checkout negado.
- Checkout autorizado por exceção.
- Incidente registrado.
