---
tags:
  - plataforma-igrejas
  - ensino
  - tecnico
  - entidades
---

# Modelo Conceitual de Entidades Ensino

← [[000 - Hub Ensino]]

---

## Observação

Este documento define o vocabulário conceitual do módulo. Não é ainda o schema final de banco. Toda entidade protegida pertence a um `Tenant`.

---

## Identidade e vínculo com Pessoas

```text
Person
  id, tenantId, nome, contatos, vínculos

LearningProfile
  id, tenantId, personId
  status: active | paused | completed | blocked
  startedAt, lastActivityAt

LeaderScope
  leaderPersonId
  studentPersonId
  source: manual | gc | ministerio | prover | outro
```

## Jornadas

```text
LearningJourney
  id, tenantId, name, description, status
  kind: discipulado | ministerial | livre

JourneyStage
  id, journeyId, name, order, type
  type: course | presential_class | external_milestone | admin_release

StudentJourneyState
  personId, journeyId, status

StudentStageState
  personId, stageId, status
  unlockedAt, startedAt, completedAt
```

## Cursos e conteúdo

```text
Course
  id, tenantId, title, description, status
  visibility: journey_only | catalog | private

CourseModule
  id, courseId, title, order

Lesson
  id, moduleId, title, order, contentType

LessonAsset
  id, lessonId, type, url, metadata

CourseEnrollment
  personId, courseId, source, enrolledAt

LessonProgress
  personId, lessonId, status, completedAt

CourseCompletion
  personId, courseId, completedAt, source, isOfficial
```

## Pré-requisitos e acesso

```text
AccessRule
  id, tenantId, targetType, targetId

AccessConditionGroup
  id, accessRuleId, operator: AND | OR

AccessCondition
  id, groupId, conditionType, referenceId
  conditionType:
    no_requirement | course_completed | stage_completed |
    event_attended | payment_approved | external_validation |
    admin_release

AccessEvaluation
  personId, targetType, targetId, result, reasons
```

## Turmas e certificados

```text
ClassGroup
  id, tenantId, courseId, name, status

ClassSession
  id, classGroupId, startsAt, location

ClassAttendance
  personId, classSessionId, status

CertificateTemplate
  id, tenantId, courseId, settings

IssuedCertificate
  id, tenantId, personId, courseId, issuedAt, validationCode
```

## Auditoria

```text
ManualReleaseRecord
  id, tenantId, personId, targetType, targetId
  releasedBy, reason, releasedAt

LearningEvent
  id, tenantId, personId, eventType, source, occurredAt
```
