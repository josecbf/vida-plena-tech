---
tags:
  - tecnico
  - eventos
  - auditoria
  - bi
---

# Eventos de Dominio Auditoria e BI

## Por que isso importa

Uma plataforma modular precisa conversar internamente sem acoplar tudo. Eventos de dominio permitem que um modulo emita fatos e outros modulos reajam.

Exemplo:

- Ensino emite `course.completed`.
- Pessoas registra na timeline.
- SOM pode considerar como sinal de avanco.
- Voluntarios pode liberar requisito de treinamento.
- Comunicacao pode enviar certificado.

## DomainEvent

Campos conceituais:

- tenantId;
- eventType;
- aggregateType;
- aggregateId;
- actorUserId;
- personId;
- occurredAt;
- payload;
- correlationId;
- idempotencyKey;

## Politica de payload minimo

Eventos de dominio nao devem virar copia completa dos dados do modulo. O payload deve conter apenas o minimo necessario para consumidores autorizados reagirem.

Regras:

- nunca colocar notas pastorais confidenciais em evento generico;
- nunca colocar dados completos de crianca, saude, documentos ou doacoes individualizadas em payload aberto;
- usar referencias por ID quando possivel;
- incluir `schemaVersion`;
- classificar sensibilidade do evento;
- definir consumidores permitidos;
- aplicar mascaramento ou redaction em campos sensiveis;
- manter idempotencia sem expor dado pessoal.

## Eventos essenciais

- `person.created`
- `person.updated`
- `person.merged`
- `group.attendance_recorded`
- `course.completed`
- `certificate.issued`
- `pastoral_signal.detected`
- `pastoral_case.opened`
- `event.registration_confirmed`
- `event.checkin_completed`
- `child.checked_in`
- `child.checked_out`
- `volunteer.scheduled`
- `volunteer.confirmed`
- `purchase.approved`
- `stock.movement_recorded`
- `stock.item_below_minimum`
- `asset.maintenance_scheduled`
- `payment.approved`
- `space.booking_approved`

## AuditLog

Auditoria registra acoes sensiveis, nao apenas eventos de negocio.

Campos conceituais:

- tenantId;
- actorUserId;
- module;
- action;
- resourceType;
- resourceId;
- before;
- after;
- reason;
- ip;
- sessionId;
- occurredAt.

`before` e `after` devem ser mascarados por politica. Auditoria precisa provar o que aconteceu, mas nao deve criar um segundo banco irrestrito de dados sensiveis.

Para dados sensiveis, armazenar preferencialmente:

- campos alterados;
- hash ou resumo do valor anterior;
- valor mascarado;
- motivo;
- autorizacao usada;
- nivel de sensibilidade;
- referencia ao registro original.

## Acoes que exigem auditoria forte

- ajuste manual de jornada;
- alteracao financeira;
- exclusao ou cancelamento;
- merge de pessoa;
- troca de responsavel de crianca;
- checkout infantil;
- reemissao de certificado;
- baixa manual de estoque;
- aprovacao de compra;
- alteracao de permissao;
- exportacao de dados.

## BI

Separar banco operacional de camada analitica quando o produto crescer.

BI identificado e BI agregado devem ser tratados separadamente. Relatorios agregados precisam de limite minimo de grupo quando houver risco de inferir dados de uma pessoa especifica.

Dimensoes:

- dim_tenant;
- dim_date;
- dim_person;
- dim_ministry;
- dim_group;
- dim_event;
- dim_course;
- dim_location;
- dim_asset;
- dim_supplier;
- dim_cost_center.

Fatos:

- fact_attendance;
- fact_course_progress;
- fact_course_completion;
- fact_pastoral_signal;
- fact_pastoral_case;
- fact_event_registration;
- fact_child_checkin;
- fact_volunteer_assignment;
- fact_stock_movement;
- fact_purchase;
- fact_financial_transaction;
- fact_asset_booking;
- fact_space_booking.

## Indicadores executivos

- saude pastoral geral;
- pessoas sem conexao ativa;
- retencao em GCs;
- avanco na jornada de ensino;
- carga pastoral por lider/supervisor;
- presenca em cultos e GCs;
- ocupacao de espacos;
- disponibilidade de voluntarios;
- saude financeira por centro de custo;
- estoque critico;
- equipamentos indisponiveis.

## Catalogo de eventos

Cada evento deve ter:

- `eventType` canonico;
- versao de schema;
- produtor;
- consumidores autorizados;
- payload minimo;
- sensibilidade;
- retencao;
- regra de reprocessamento;
- chave de idempotencia.

Evitar nomes duplicados para o mesmo fato. Exemplo: escolher um padrao unico entre `checkin.completed`, `event.checkin_completed` e `child.checked_in`, conforme o dominio produtor.
