---
tags:
  - tap
  - engajamento
  - tecnico
  - modelo-dados
  - entidades
---

# Modelo Conceitual de Entidades — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## Vocabulário do domínio

| Termo | Definição |
|-------|-----------|
| **Organização** | Uma igreja ou instituição religiosa cadastrada na plataforma. Unidade máxima de isolamento de dados (tenant). |
| **Campus** | Unidade física ou operacional dentro de uma organização. Uma sede, um campo, uma filial. |
| **Grupo TAP** | Agrupamento lógico de dispositivos NFC dentro de um campus. Ex: "Cadeiras Bloco A", "Altar", "Recepção". |
| **Dispositivo TAP** | Um objeto físico NFC (moeda, placa, etiqueta) programado com uma URL única da plataforma. |
| **Destino** | O recurso digital para onde um TAP redireciona o visitante. Pode ser página própria, fluxo de oferta, formulário pastoral ou URL externa. |
| **Destino ativo** | O destino que está sendo servido por um grupo TAP no momento atual. |
| **Keyword** | Palavra-chave registrada nas notas de um slide do ProPresenter que, quando detectada, dispara a troca do destino ativo de um ou mais grupos TAP. |
| **Agendamento** | Configuração de troca automática de destino por horário. |
| **Tap event** | Registro de uma pessoa tocando um dispositivo TAP (timestamp + device-id + destination-id). Sem dados pessoais. |
| **Fundo** | Categoria de destinação de doação dentro de uma organização. Ex: Dízimo, Oferta Geral, Missões, Construção. |
| **Doação** | Registro de uma contribuição financeira digital confirmada pelo gateway. |
| **Gift entry** | Registro manual de contribuição física (dinheiro, cheque, Pix fora da plataforma). |
| **Gateway** | Serviço externo de processamento de pagamentos configurado pela organização. |
| **Formulário pastoral** | Tipo de destino que exibe um formulário específico (visitante, oração, batismo, célula) e mantém a submissão como registro operacional do TAP no escopo atual. |
| **Tenant** | Vocabulário técnico global equivalente à organização contratante. No schema, preferir `tenant_id`; na linguagem de produto, usar organização. |
| **Consentimento** | Registro versionado da autorização dada pelo titular para coleta e tratamento de dados pessoais. |
| **Evento financeiro idempotente** | Evento de gateway ou domínio processado uma única vez, mesmo se recebido repetidamente. |

---

## Mapa de entidades

```
Organization (tenant)
  │
  ├── Campus[]
  │     │
  │     └── TapGroup[]
  │           │
  │           ├── TapDevice[]     ← dispositivo físico
  │           ├── current_destination_id → Destination
  │           ├── TapSchedule[]   ← agendamentos
  │           └── TapEvent[]      ← analytics
  │
  ├── Destination[]
  │     ├── type: offering | event_registration | pastoral_form | own_page | external_url
  │     └── config: JSON por tipo
  │
  ├── ProPresenterKeyword[]
  │     ├── keyword: string
  │     ├── destination_id → Destination
  │     └── tap_group_ids[] → TapGroup[]
  │
  ├── Fund[]
  │     ├── name, description
  │     └── is_default
  │
  ├── Donation[]
  │     ├── amount, fund_id, method
  │     ├── gateway_transaction_id
  │     ├── status: created | pending | expired | confirmed | failed | cancelled | refunded
  │     └── campus_id, tap_device_id (se via TAP)
  │
  ├── GiftEntry[]
  │     ├── amount, fund_id
  │     ├── method: cash | check | external_pix
  │     ├── batch_id (lote de culto)
  │     └── recorded_by (user_id)
  │
  ├── GiftBatch[]
  │
  ├── PastoralFormSubmission[]
  │
  ├── PaymentWebhookEvent[]
  │
  └── GatewayConfig[]
        ├── provider: mercadopago | stripe | asaas
        ├── credentials: encrypted JSON
        └── campus_id (null = padrão da organização)
```

---

## Entidades detalhadas

### Organization
```
id: uuid
slug: string (único na plataforma, usado na URL)
name: string
legal_name: string (nullable)
cnpj: string (nullable, normalizado)
fiscal_address: jsonb (nullable)
plan: essencial | crescimento | missao
plan_expires_at: timestamp
created_at: timestamp
```

### Campus
```
id: uuid
organization_id: uuid → Organization
name: string
city, state: string
timezone: string (IANA, ex: America/Sao_Paulo)
is_active: boolean
```

### TapGroup
```
id: uuid
campus_id: uuid → Campus
organization_id: uuid → Organization
name: string
description: string
current_destination_id: uuid → Destination (nullable)
default_destination_id: uuid → Destination (nullable)
status: active | inactive | archived
created_at: timestamp
updated_at: timestamp
archived_at: timestamp (nullable)
```

### TapDevice
```
id: uuid
tap_group_id: uuid → TapGroup
organization_id: uuid → Organization
name: string
physical_location: string
public_id: string (não enumerável)
url: string (gerada: {slug}.plataforma.com.br/t/{public_id})
qr_code_url: string
status: active | inactive | archived
created_at: timestamp
updated_at: timestamp
archived_at: timestamp (nullable)
```

### Destination
```
id: uuid
organization_id: uuid → Organization
name: string (interno)
type: offering | event_registration | pastoral_form | own_page | external_url
status: draft | active | inactive
approval_status: not_required | pending | approved | rejected
scope: organization | campus
campus_id: uuid → Campus (nullable; obrigatório quando scope = campus)
config_version: integer
config: jsonb (estrutura validada por schema do tipo + versão)
published_at: timestamp (nullable)
published_by: uuid → User (nullable)
approved_at: timestamp (nullable)
approved_by: uuid → User (nullable)
created_at, updated_at: timestamp
```

**config por tipo (schemas v1):**

O campo `config_version` na tabela `Destination` indica qual versão do schema está em uso. Validação ocorre antes de persistir. Regras de migração de versão estão em `Decisões e Riscos Técnicos TAP e Engajamento Digital.md` (ADR-09).

---

**offering v1**

```typescript
// config_version: 1
{
  suggested_values: number[],      // máx 6 itens; cada valor > 0; em centavos (integer)
  fund_ids: uuid[],                // mínimo 1; devem pertencer à organização e estar ativos
  allow_custom_value: boolean,
  collect_email: boolean,
  collect_name: boolean,
  collect_cpf: boolean,
  allow_anonymous: boolean,
  min_amount: number,              // obrigatório; > 0; em centavos
  max_amount?: number,             // quando presente: > min_amount
  pix_ttl_seconds: number          // obrigatório; entre 300 (5 min) e 86400 (24 h)
}
```

**Validações `offering` v1:**
- `suggested_values`: array não vazio, máximo 6 itens, cada valor > 0.
- `fund_ids`: mínimo 1 fundo ativo da organização.
- `min_amount`: obrigatório, > 0.
- `max_amount`: quando informado, deve ser > `min_amount`.
- `pix_ttl_seconds`: obrigatório, entre 300 e 86400.
- `collect_cpf = true` exige `collect_name = true` (CPF sem nome não gera recibo válido).
- Publicar exige pelo menos um fundo e configuração de gateway de Pix ativa no campus.

---

**own_page v1**

```typescript
// config_version: 1
{
  title: string,
  body: string,
  button_label: string,
  button_url?: string,             // quando presente, segue regras de external_url
  image_url?: string,
  image_alt?: string
}
```

**Validações `own_page` v1:**
- `title`, `body` e `button_label` são obrigatórios para publicação.
- `button_url`, quando informado, usa as mesmas regras de validação de `external_url`.
- Não permite HTML arbitrário, scripts embutidos ou coleta de dados pessoais.
- Imagem é opcional; quando houver imagem, `image_alt` é recomendado.

---

**pastoral_form v1**

```typescript
// config_version: 1
{
  form_type: 'visitor' | 'prayer' | 'decision' | 'baptism' | 'cell_group',
  custom_fields?: Field[],         // cada Field: { field_id, label, type, required }
  consent_text_version: string,    // referência a versão de texto registrada na organização
  allow_anonymous: boolean
}

// Field
{
  field_id: string,
  label: string,
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox',
  required: boolean,
  options?: string[]               // obrigatório quando type = 'select'
}
```

**Validações `pastoral_form` v1:**
- `form_type`: obrigatório; deve ser um dos valores definidos.
- `consent_text_version`: obrigatório; deve referenciar versão de consentimento ativa na organização.
- `allow_anonymous`: obrigatório.
- `custom_fields`: opcional; quando presente, cada campo deve ter `field_id` único, `label` não vazio e `type` válido; `type = select` exige `options` não vazio.
- Publicar exige `consent_text_version` válida.
- Dados capturados ficam como `PastoralFormSubmission`; não criam `Person` no escopo atual.

---

**event_registration v1**

```typescript
// config_version: 1
{
  mode: 'external_url' | 'events_module',
  url?: string,                    // obrigatório quando mode = external_url
  event_id?: uuid                  // obrigatório quando mode = events_module
}
```

**Validações `event_registration` v1:**
- `mode`: obrigatório.
- `url` e `event_id` são mutuamente exclusivos: exatamente um presente conforme o `mode`.
- Quando `mode = external_url`: `url` é obrigatório e segue as regras de validação de `external_url` (https, domínio, policy_status).
- Quando `mode = events_module`: `event_id` é obrigatório e deve referenciar evento ativo da organização.
- Publicar `mode = events_module` requer que o módulo de Eventos esteja ativo para a organização (feature flag).
- Publicar `mode = external_url` exige mesma aprovação de domínio de `external_url`.

---

**external_url v1**

```typescript
// config_version: 1
{
  url: string,
  normalized_url: string,
  domain: string,
  policy_status: 'allowed' | 'requires_approval' | 'blocked',
  preview_title?: string,
  preview_description?: string,
  approval_reason?: string
}
```

**Validações `external_url` v1:**
- `url` deve ser absoluta e usar `https://`.
- `normalized_url` é a versão persistida após trim, normalização do host e validação de parse.
- `domain` é extraído da URL normalizada e exibido no preview de publicação.
- `policy_status = blocked` impede publicação.
- `policy_status = requires_approval` exige owner/admin ou permissão `tap.external_url.publish`.
- Schemes `javascript:`, `data:`, `file:`, `mailto:`, `tel:` e URLs relativas são inválidos.
- Alterar `url`, `normalized_url` ou `domain` em destino publicado exige nova validação e auditoria.

---

### ProPresenterKeyword
```
id: uuid
organization_id: uuid → Organization
campus_id: uuid → Campus
keyword: string (case-insensitive)
destination_id: uuid → Destination
tap_group_ids: uuid[] → TapGroup[]
is_active: boolean
priority: integer
created_at, updated_at: timestamp
```

### TapSchedule
```
id: uuid
tap_group_id: uuid → TapGroup
organization_id: uuid → Organization
destination_id: uuid → Destination
scheduled_at: time (HH:MM)
day_of_week: 0-6 (null = não recorrente)
scheduled_date: date (para eventos pontuais)
timezone: string (IANA)
is_recurring: boolean
is_active: boolean
created_at, updated_at: timestamp
```

### TapEvent
```
id: uuid
tap_device_id: uuid → TapDevice
destination_id: uuid → Destination
organization_id: uuid → Organization
campus_id: uuid → Campus
tapped_at: timestamp
ip_hash: string (nullable)
user_agent_hash: string (nullable)
is_suspicious: boolean
```

### Donation
```
id: uuid
organization_id: uuid → Organization
campus_id: uuid → Campus
fund_id: uuid → Fund
tap_device_id: uuid → TapDevice (nullable)
amount: decimal
method: pix | credit_card | debit_card | apple_pay | google_pay
gateway_provider: string
gateway_transaction_id: string
gateway_charge_id: string (nullable)
donor_person_id: uuid → Person (nullable, futuro; não preenchido no escopo atual)
donor_name: string (nullable)
donor_email: string (nullable)
donor_cpf_encrypted: string (nullable)
receipt_requested: boolean
is_anonymous: boolean
status: created | pending | expired | confirmed | failed | cancelled | refunded
confirmed_at: timestamp
expires_at: timestamp (nullable)
finance_event_published_at: timestamp (nullable)
finance_event_id: uuid (nullable)
created_at: timestamp
```

`Donation` é staging operacional do TAP, não ledger contábil oficial. Ele registra a origem da doação, o estado do gateway e os dados mínimos para emitir evento idempotente ao Financeiro.

### GiftBatch
```
id: uuid
organization_id: uuid → Organization
campus_id: uuid → Campus
service_or_event_id: uuid (nullable)
status: open | reviewing | closed | reopened | exported
opened_by: uuid → User
closed_by: uuid → User (nullable)
closed_at: timestamp (nullable)
finance_event_published_at: timestamp (nullable)
finance_event_id: uuid (nullable)
notes: string
created_at, updated_at: timestamp
```

### GiftEntry
```
id: uuid
organization_id: uuid → Organization
campus_id: uuid → Campus
fund_id: uuid → Fund
batch_id: uuid → GiftBatch
amount: decimal
method: cash | check | external_pix | other
reference: string (número de cheque, comprovante etc.)
donor_person_id: uuid → Person (nullable, futuro; não preenchido no escopo atual)
donor_name: string (nullable)
donor_cpf_encrypted: string (nullable)
donated_at: date
notes: string
recorded_by: uuid → User
finance_event_published_at: timestamp (nullable)
finance_event_id: uuid (nullable)
created_at: timestamp
```

`GiftEntry` é lançamento operacional de origem física ou externa. O fechamento e a consolidação oficial pertencem ao módulo Financeiro após consumo dos eventos do TAP.

### PastoralFormSubmission
```
id: uuid
organization_id: uuid → Organization
campus_id: uuid → Campus
destination_id: uuid → Destination
form_type: visitor | prayer | decision | baptism | cell_group
payload: jsonb (criptografar campos sensíveis quando aplicável)
submission_status: received | reviewed | archived | anonymized
consent_version: string
consented_at: timestamp
source_tap_device_id: uuid → TapDevice (nullable)
ip_hash: string (nullable)
user_agent_hash: string (nullable)
created_at: timestamp
```

### PaymentWebhookEvent
```
id: uuid
organization_id: uuid → Organization
gateway_provider: string
gateway_event_id: string
gateway_transaction_id: string (nullable)
payload_hash: string
signature_valid: boolean
processing_status: received | processed | ignored_duplicate | failed
received_at: timestamp
processed_at: timestamp (nullable)
error_message: string (nullable)
```

### GatewayConfig
```
id: uuid
organization_id: uuid → Organization
campus_id: uuid (nullable — null = padrão da org)
provider: mercadopago | stripe | asaas
credentials: text (encrypted)
status: active | invalid | expired | disabled
last_tested_at: timestamp (nullable)
last_error: string (nullable)
is_active: boolean
created_at: timestamp
```

---

## Invariantes do domínio

1. Um `TapDevice` pertence a exatamente um `TapGroup`
2. Um `TapGroup` pertence a exatamente um `Campus`
3. Um `Campus` pertence a exatamente uma `Organization`
4. Toda query no banco inclui `organization_id` — garantido por RLS no Supabase
5. `Destination.config` é validado por schema JSON antes de persistir, de acordo com o `type`
6. Um `TapGroup` pode ter `current_destination_id = null` — nesse caso o redirect serve uma página padrão de "em breve"
7. `GatewayConfig.credentials` nunca é retornado em endpoints de leitura — apenas confirmação de que está configurado
8. `Donation` com `status != confirmed` não é contabilizada em relatórios financeiros confirmados
9. `unique(organization_id, gateway_provider, gateway_transaction_id)` quando `gateway_transaction_id` não for nulo
10. `unique(organization_id, gateway_provider, gateway_charge_id)` quando `gateway_charge_id` não for nulo
11. `unique(organization_id, gateway_provider, gateway_event_id)` em `PaymentWebhookEvent`
12. `TapSchedule` recorrente exige `day_of_week`; agendamento pontual exige `scheduled_date`
13. `TapSchedule.timezone` deve ser IANA válido
14. `ProPresenterKeyword` é sempre escopado a um campus
15. `Destination.scope = campus` exige `campus_id`; `scope = organization` exige `campus_id = null`
16. `GiftEntry` só pode ser alterado livremente enquanto o lote estiver `open`; após `closed`, correção exige reabertura auditada
17. Nenhuma submissão pastoral cria ou atualiza `Person` no escopo atual
18. Toda entidade operacional carrega `organization_id` e, quando fizer sentido, `campus_id`
19. Nenhuma FK pode permitir referência cruzada entre organizações; usar FK composta ou validação transacional
20. CPF e credenciais de gateway são criptografados em repouso
21. `TapDevice.public_id` é único, não enumerável e nunca editado manualmente
22. `TapDevice.url` é derivada de `Organization.slug` + `public_id`, não digitada pelo operador
23. `TapGroup.default_destination_id` e `current_destination_id` devem pertencer ao mesmo tenant e respeitar escopo de campus
24. `status = archived` preserva histórico e impede uso operacional sem apagar registros relacionados

## Contratos de domínio

### Eventos publicados para Financeiro

```typescript
type TapFinanceEvent = {
  event_id: string
  schema_version: 1
  organization_id: string
  campus_id: string
  occurred_at: string
  idempotency_key: string
  type:
    | 'tap.donation.confirmed'
    | 'tap.donation.failed'
    | 'tap.donation.refunded'
    | 'tap.gift_entry.created'
    | 'tap.gift_batch.closed'
  payload: Record<string, unknown>
}
```

Payload mínimo por evento financeiro:

| Evento | Aggregate | Payload mínimo |
|---|---|---|
| `tap.donation.confirmed` | `Donation` | `donation_id`, `fund_id`, `amount`, `currency`, `method`, `gateway_provider`, `gateway_transaction_id`, `gateway_charge_id`, `confirmed_at`, `tap_device_id`, `is_anonymous`, `receipt_requested` |
| `tap.donation.failed` | `Donation` | `donation_id`, `fund_id`, `amount`, `method`, `gateway_provider`, `gateway_charge_id`, `failure_reason`, `failed_at` |
| `tap.donation.refunded` | `Donation` | `donation_id`, `refund_id`, `amount`, `gateway_provider`, `gateway_transaction_id`, `refunded_at`, `reason` |
| `tap.gift_entry.created` | `GiftEntry` | `gift_entry_id`, `gift_batch_id`, `fund_id`, `amount`, `method`, `donated_at`, `recorded_by`, `reference` |
| `tap.gift_batch.closed` | `GiftBatch` | `gift_batch_id`, `campus_id`, `closed_by`, `closed_at`, `entry_count`, `total_amount_by_fund`, `total_amount_by_method` |

Regras do contrato financeiro:
- TAP grava evento em outbox na mesma transação que confirma doação, cria Gift Entry ou fecha lote.
- Financeiro consome via inbox e registra `event_id`, `tenant_id`, `idempotency_key` e status de processamento.
- Reprocessamento do mesmo evento não pode duplicar receita, lançamento ou relatório.
- CPF, credenciais de gateway e dados completos do doador não trafegam no payload financeiro aberto; quando necessário, usar referência ao registro de origem e acesso autorizado.
- O contrato financeiro é gate para tirar Pix e Gift Entry de piloto.

### Integração futura com Pessoas

No escopo atual, TAP não publica evento de intake para Pessoas e não cria, atualiza ou enriquece cadastro de Pessoas/visitantes.

Se Pessoas voltar ao escopo, a integração deve ser especificada em contrato próprio antes da implementação, incluindo:
- evento/API de intake;
- consentimento e finalidade;
- campos permitidos;
- regras de match e revisão de duplicidade;
- retorno esperado;
- auditoria e retenção.
