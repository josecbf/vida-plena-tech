---
tags:
  - tecnico
  - dados
  - modelo-canonico
---

# Modelo de Dados Canonico

## Entidades de plataforma

- Tenant.
- Campus.
- Account/User global.
- TenantMembership.
- Role.
- Permission.
- Scope.
- RoleAssignment.
- UserScope.
- ModuleSubscription.
- FeatureFlag.
- AuditLog.
- DomainEvent.
- DomainEventOutbox.
- DomainEventInbox.
- IntegrationConnection.
- ExternalMapping.
- DataSubjectRequest.
- ConsentRecord.
- FileAsset.
- Notification.
- ReportDefinition.

## Entidades centrais

### Person

Representa qualquer pessoa conhecida pela igreja.

Campos conceituais:

- nome;
- nome social/apelido;
- data de nascimento;
- contatos;
- endereco;
- status;
- tags;
- origem;
- consentimentos;
- preferencias de comunicacao.
- privacy_flags;
- merged_into_person_id;
- canonical_confidence;
- created_from_source.

### Household

Representa familia ou casa.

Relacoes:

- responsavel principal;
- conjuge;
- filhos;
- dependentes;
- contatos de emergencia;
- autorizacoes.

### ConsentRecord

Representa consentimento, revogacao ou base legal aplicada a uma finalidade.

Campos conceituais:

- person;
- tenant;
- purpose;
- legal_basis;
- consent_version;
- granted_at;
- revoked_at;
- source;
- evidence_ref.

### TenantMembership

Liga uma identidade global a um tenant.

Campos conceituais:

- account/user global;
- tenant;
- status;
- role base;
- person vinculada opcionalmente;
- data de convite;
- data de aceite;
- ultimo acesso.

### RoleAssignment e UserScope

Representam permissao e limite de atuacao por tenant, campus, ministerio, GC, area, turma, evento ou funcao.

Nenhuma permissao sensivel deve depender apenas de cargo nominal.

### Participation

Registra participacao de uma pessoa em algo:

- evento;
- culto;
- GC;
- turma;
- ministerio;
- aula;
- escala;
- check-in infantil.

### TimelineEntry

Linha do tempo unificada da pessoa.

Tipos:

- presenca;
- inscricao;
- conclusao de curso;
- atendimento pastoral;
- entrada em GC;
- servico voluntario;
- doacao;
- observacao;
- documento;
- comunicacao enviada.

## Entidades transversais

- CalendarEvent.
- Resource.
- Location.
- Form.
- FormSubmission.
- MessageTemplate.
- ApprovalRequest.
- Comment.
- Task.
- WorkflowState.
- DataRetentionPolicy.
- ImportBatch.
- MergeReview.

## Entidades por modulo

Cada modulo deve ter suas entidades especificas, mas sempre referenciando `Person`, `Campus`, `CalendarEvent`, `Resource`, `DomainEvent` e `AuditLog` quando fizer sentido.

Nenhum modulo cria cadastro paralelo de:

- pessoa;
- usuario;
- familia;
- permissao;
- arquivo;
- calendario;
- comentario;
- tarefa;
- notificacao;
- auditoria.

Se precisar de comportamento especifico, cria entidade propria referenciando a entidade canonica.

## Invariantes globais

1. Toda entidade operacional tem `tenant_id`.
2. Toda entidade com escopo local relevante tem `campus_id` ou escopo equivalente.
3. Toda entidade sensivel tem classificacao de dado.
4. Toda escrita sensivel gera `AuditLog`.
5. Toda integracao externa usa `ExternalMapping`.
6. Toda importacao usa `ImportBatch` e estrategia de deduplicacao.
7. Toda mesclagem de pessoa preserva historico e gera auditoria.
8. Toda delecao operacional preferencialmente e soft delete.
9. Todo evento de dominio tem `schema_version`, `idempotency_key` e `sensitivity`.
10. Relatorio pesado nao roda diretamente sobre fluxo operacional critico.

## Contratos por modulo

Antes de implementar, cada modulo deve declarar:

- entidades proprias;
- entidades canonicas consumidas;
- eventos produzidos;
- eventos consumidos;
- permissoes sensiveis;
- dados LGPD;
- politicas de retencao;
- relatorios derivados;
- regras de importacao/exportacao.

## BI e relatorios

Desde o inicio, separar:

- dados transacionais;
- dados derivados;
- snapshots historicos;
- metricas calculadas;
- visoes de relatorio.

Isso evita que relatorios pesados prejudiquem operacao diaria.
