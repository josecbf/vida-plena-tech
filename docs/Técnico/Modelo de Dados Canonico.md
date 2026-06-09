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
- User.
- Role.
- Permission.
- Scope.
- ModuleSubscription.
- AuditLog.
- DomainEvent.
- IntegrationConnection.
- ExternalMapping.

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

### Household

Representa familia ou casa.

Relacoes:

- responsavel principal;
- conjuge;
- filhos;
- dependentes;
- contatos de emergencia;
- autorizacoes.

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
- FileAsset.
- Form.
- FormSubmission.
- Notification.
- MessageTemplate.
- ApprovalRequest.
- Comment.
- Task.
- ReportDefinition.

## Entidades por modulo

Cada modulo deve ter suas entidades especificas, mas sempre referenciando `Person`, `Campus`, `CalendarEvent`, `Resource`, `DomainEvent` e `AuditLog` quando fizer sentido.

## BI e relatorios

Desde o inicio, separar:

- dados transacionais;
- dados derivados;
- snapshots historicos;
- metricas calculadas;
- visoes de relatorio.

Isso evita que relatorios pesados prejudiquem operacao diaria.

