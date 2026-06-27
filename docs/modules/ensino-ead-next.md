# Ensino / EAD — próximo módulo (não implementado nesta demo)

Documento de planejamento técnico. O **EAD completo não faz parte** da primeira demo
local; aqui ficam o conceito e o contrato com o Core para quando for implementado.

## Princípio (igual a todos os módulos)

Ensino é **ativável separadamente** e pode ser **vendido isolado**. Mesmo vendido isolado,
**consome o Core mínimo** de `Person`/`User` — **não cria cadastro paralelo de pessoa**.
O módulo Pessoas completo apenas enriquece esse cadastro.

## Entidades futuras

| Entidade | Papel |
|---|---|
| `Course` | Curso (trilha de ensino) |
| `CourseModule` | Módulo/unidade dentro do curso |
| `Lesson` | Aula |
| `LessonAsset` | Material da aula (vídeo, PDF, etc.) |
| `CourseEnrollment` | Matrícula de uma `Person` em um `Course` |
| `LessonProgress` | Progresso da pessoa por aula |
| `CourseCompletion` | Conclusão do curso |
| `Certificate` | Certificado emitido |

Todas com `tenantId`; `CourseEnrollment.personId` aponta para o `Person` canônico.

## Regras futuras

- Ao **concluir um curso**, registrar na **timeline da pessoa**
  (`TimelineEntryType.COURSE_COMPLETION`, já reservado no schema da demo) e emitir o
  evento de domínio `course.completed` (catálogo canônico).
- Emissão/reemissão de **certificado** é ação auditada.
- Progresso e conclusão alimentam o BI (fatos `fact_course_progress`,
  `fact_course_completion`).
- Professor/Aluno são **papéis** (RBAC), separados do status eclesiástico.

## Integração com o Core

- **Identidade:** `CourseEnrollment` referencia `Person` (nunca duplica cadastro).
- **Permissões:** novas permissões `teaching.course.*`, `teaching.enrollment.*`,
  deny-by-default, com escopo (campus/turma).
- **Eventos:** `course.completed`, `certificate.issued` via outbox transacional.
- **Módulos:** já existe `ModuleSubscription(moduleKey = "teaching")` seedado como
  **inativo** na demo, demonstrando a ativação por tenant.

## Por que não agora

A demo entrega a **Fundação + Pessoas/GCs/Eventos** (Fases 1–2 do
[Sequenciamento MVP](../Produto/Priorizacao%20MVP%20e%20Sequenciamento.md)). Ensino entra
depois, reaproveitando Core, permissões, auditoria e eventos já validados aqui.
