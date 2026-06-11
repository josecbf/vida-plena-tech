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

- `event_id`;
- `tenant_id`;
- `schema_version`;
- `event_type`;
- `aggregate_type`;
- `aggregate_id`;
- `producer_module`;
- `actor_user_id`;
- `person_id`;
- `occurred_at`;
- `payload`;
- `correlation_id`;
- `causation_id`;
- `idempotency_key`;
- `sensitivity`;
- `allowed_consumers`.

## Outbox e Inbox

Eventos devem usar o padrao outbox/inbox.

### Outbox

O modulo produtor grava o evento na mesma transacao da alteracao principal.

Campos minimos:

- `event_id`;
- `tenant_id`;
- `event_type`;
- `schema_version`;
- `payload`;
- `sensitivity`;
- `status: pending | published | failed`;
- `attempts`;
- `next_retry_at`;
- `created_at`;
- `published_at`.

### Inbox

Cada consumidor registra eventos processados para garantir idempotencia.

Campos minimos:

- `consumer_module`;
- `event_id`;
- `tenant_id`;
- `processing_status`;
- `processed_at`;
- `error_message`.

Regra: consumidor deve ser seguro para reprocessamento. Evento duplicado nunca pode duplicar efeito financeiro, pastoral, comunicacional ou operacional.

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
- nunca assumir que todo consumidor pode ver todo payload.
- usar payloads segmentados ou referencias quando houver dados de nivel 3, 4, 5 ou 6.

## Eventos essenciais

- `person.created`
- `person.updated`
- `person.merged`
- `person.consent.granted`
- `person.consent.revoked`
- `person.data_export_requested`
- `person.merge_review_required`
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
- `payment.received`
- `donation.received`
- `donation.refunded`
- `space.booking_approved`
- `communication.sent`
- `communication.consent_missing`
- `tap.donation.confirmed`
- `tap.donation.failed`
- `tap.donation.refunded`
- `tap.gift_entry.created`
- `tap.gift_batch.closed`

### Contrato financeiro do TAP

Eventos financeiros do TAP seguem o mesmo padrao outbox/inbox dos demais modulos. TAP atua como produtor; Financeiro atua como consumidor autorizado e fonte oficial para conciliacao, relatorios contabeis e prestacao de contas.

| Evento | Produtor | Consumidor autorizado | Payload minimo | Idempotencia |
|---|---|---|---|---|
| `tap.donation.confirmed` | TAP | Financeiro | `donation_id`, `fund_id`, `amount`, `currency`, `method`, `gateway_provider`, `gateway_transaction_id`, `gateway_charge_id`, `confirmed_at`, `campus_id` | `tenant_id + gateway_provider + gateway_transaction_id` |
| `tap.donation.failed` | TAP | Financeiro | `donation_id`, `fund_id`, `amount`, `method`, `gateway_provider`, `gateway_charge_id`, `failure_reason`, `failed_at` | `tenant_id + donation_id + failed` |
| `tap.donation.refunded` | TAP | Financeiro | `donation_id`, `refund_id`, `amount`, `gateway_provider`, `gateway_transaction_id`, `refunded_at`, `reason` | `tenant_id + gateway_provider + refund_id` |
| `tap.gift_entry.created` | TAP | Financeiro | `gift_entry_id`, `gift_batch_id`, `fund_id`, `amount`, `method`, `donated_at`, `recorded_by`, `campus_id` | `tenant_id + gift_entry_id` |
| `tap.gift_batch.closed` | TAP | Financeiro | `gift_batch_id`, `campus_id`, `closed_by`, `closed_at`, `entry_count`, `total_amount_by_fund`, `total_amount_by_method` | `tenant_id + gift_batch_id + closed_at` |

Regras:

- TAP nao e ledger contabil oficial; mantem staging operacional.
- Financeiro registra consumo em inbox antes de gerar efeito contabil.
- Reprocessamento do mesmo evento nunca duplica receita, lancamento, relatorio ou conciliacao.
- Payload financeiro nao carrega CPF completo, dados de cartao ou credenciais de gateway.
- Dados financeiros individualizados sao no minimo nivel sensivel e exigem consumidor explicitamente autorizado.

## AuditLog

Auditoria registra acoes sensiveis, nao apenas eventos de negocio.

Campos conceituais:

- `audit_id`;
- `tenant_id`;
- `actor_user_id`;
- `actor_membership_id`;
- `module`;
- `action`;
- `resource_type`;
- `resource_id`;
- `sensitivity`;
- `before`;
- `after`;
- `reason`;
- `permission_used`;
- `scope_used`;
- `ip_hash`;
- `session_id`;
- `occurred_at`.

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
- leitura de doacao individualizada;
- leitura de nota pastoral confidencial;
- leitura de dado de menor;
- exclusao ou cancelamento;
- merge de pessoa;
- troca de responsavel de crianca;
- checkout infantil;
- reemissao de certificado;
- baixa manual de estoque;
- aprovacao de compra;
- alteracao de permissao;
- exportacao de dados.
- uso de break-glass.
- envio de comunicacao em massa.
- alteracao de integracao, token ou webhook.

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
