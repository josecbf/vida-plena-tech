---
tags:
  - pessoas
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Pessoas

← [[000 - Hub Pessoas]]

> Referência conceitual do domínio. Não é o schema final, mas define o vocabulário e as relações essenciais.

---

## 1. Núcleo

```text
Tenant
  id, name, slug, status

Person
  id, tenantId
  fullName, preferredName
  birthDate, gender
  maritalStatus
  status
  avatarUrl
  notes
  archivedAt
  createdAt, updatedAt
```

Regra: `Person` não é `User`. A pessoa pode nunca fazer login.

---

## 2. Usuário e vínculo

```text
Account/User
  id, email, status, createdAt

TenantMembership
  id, tenantId, userId, status
  joinedAt, disabledAt

UserPersonLink
  id, tenantId, userId, personId
  linkStatus
  verifiedAt
```

Um usuário de login é identidade global. A participação em uma igreja fica em `TenantMembership`. Um usuário pode estar vinculado a uma pessoa dentro de um tenant. O vínculo deve ser verificável e auditável.

---

## 3. Contatos e endereços

```text
ContactMethod
  id, tenantId, personId
  type (email | phone | whatsapp)
  value
  isPrimary
  verifiedAt
  consentRequired

Address
  id, tenantId, personId
  type (home | work | other)
  street, number, complement
  neighborhood, city, state, postalCode, country
  isPrimary
```

---

## 4. Família e vínculos

```text
Household
  id, tenantId
  name
  primaryAddressId
  createdAt, updatedAt

HouseholdMember
  id, tenantId, householdId, personId
  relationshipType
  isPrimaryResponsible
  startDate, endDate

PersonRelationship
  id, tenantId
  fromPersonId, toPersonId
  relationshipType
  notes
```

---

## 5. Status, tags e segmentos

```text
PersonStatus
  id, tenantId, key, label, isActive

PersonStatusHistory
  id, tenantId, personId, statusId
  startedAt, endedAt
  changedByUserId

Tag
  id, tenantId, name, color, isActive

PersonTag
  id, tenantId, personId, tagId

Segment
  id, tenantId, name
  definitionJson
  visibility
```

---

## 6. Consentimentos

```text
Consent
  id, tenantId, personId
  purpose
  channel
  legalBasis
  policyVersion
  termVersion
  status (granted | revoked | expired)
  source
  guardianPersonId
  grantedAt
  revokedAt
  expiresAt
  revocationReason
  evidenceRef
  evidenceHash
```

Consentimento deve ser histórico, não apenas um booleano.

---

## 7. Timeline

```text
TimelineEntry
  id, tenantId, personId
  sourceModule
  sourceEntityType, sourceEntityId
  title, description
  occurredAt
  sensitivityLevel (public_internal | restricted | sensitive)
  visibilityPolicy
```

Timeline é federada: outros módulos publicam eventos resumidos, mas continuam donos dos seus dados detalhados.

Regra: timeline operacional e timeline sensível não devem ser tratadas como a mesma coisa. Dados pastorais confidenciais, dados de crianças e dados financeiros individualizados exigem permissão específica e auditoria de leitura.

---

## 8. Auditoria e origem externa

```text
AuditLog
  id, tenantId
  actorUserId
  entityType, entityId
  action
  changedFields
  beforeMaskedJson, afterMaskedJson
  sensitivityLevel
  reason
  occurredAt

ExternalMapping
  id, tenantId
  provider
  externalEntityType
  externalId
  internalEntityType
  internalId
```

---

## Relações críticas

- `Person` 1:N `ContactMethod`
- `Person` 1:N `Address`
- `Household` 1:N `HouseholdMember`
- `Person` N:N `Tag`
- `Person` 1:N `Consent`
- `Person` 1:N `TimelineEntry`
- `User` N:1 `Person` via `UserPersonLink`
