---
tags:
  - tap
  - engajamento
  - tecnico
  - decisoes
  - riscos
  - adr
---

# Decisões e Riscos Técnicos — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## ADR-01 — Edge Function para o redirect endpoint

**Contexto:** O endpoint `/t/{device-id}` é o mais crítico do módulo — todo tap passa por ele. Precisa de latência < 200ms em p95 sob pico realista.

**Decisão:** Implementar como Vercel Edge Function (não como serverless function comum).

**Motivação:** Edge Functions rodam na borda da rede CDN, próximas do usuário. Eliminam cold start. Suportam Vercel KV (cache) e Vercel Edge Config nativamente.

**Consequência:** O código do redirect deve ser compatível com o Edge Runtime (sem Node.js APIs exclusivas). Dependências de banco devem usar drivers compatíveis com Edge (ex: `@supabase/supabase-js` com fetch nativo).

**Guardrail:** Nenhum SDK de gateway, criptografia Node-only ou dependência incompatível com Edge pode entrar no caminho crítico do redirect.

---

## ADR-02 — Cache de destino ativo com TTL de 10 segundos

**Contexto:** Cada tap faria uma query ao banco para descobrir o destino ativo. Com 500+ pessoas tocando ao mesmo tempo, o banco ficaria sobrecarregado.

**Decisão:** Cachear o `current_destination_id` por grupo TAP no Vercel KV com TTL de 10 segundos. Toda troca de destino invalida o cache imediatamente.

**Motivação:** 10 segundos é suficientemente curto para garantir que uma troca de destino (manual ou por keyword) seja percebida em até 10s. É suficientemente longo para absorver picos de taps simultâneos sem consultar o banco.

**Consequência:** Existe uma janela de até 10s onde um tap pode servir o destino anterior após uma troca. Trocas manuais e ProPresenter devem invalidar cache imediatamente. Agendamentos também invalidam cache ao aplicar troca.

**Complemento Alpha:** além do cache principal, o redirect pode manter último destino válido por até 5 minutos para degradação controlada quando banco/cache falharem. Esse fallback só pode ser usado se o status inválido do dispositivo, grupo ou destino não for conhecido no momento da requisição.

---

## ADR-02A — Analytics fora do caminho crítico do redirect

**Contexto:** A Fase 1 exige que o visitante seja redirecionado em menos de 2 segundos. Gravação de analytics, filas ou banco não podem transformar uma métrica operacional em bloqueio de experiência.

**Decisão:** `TapEvent` é gravado de forma assíncrona, usando `waitUntil()`, fila, outbox ou mecanismo equivalente compatível com Edge Runtime. O redirect responde antes da confirmação de persistência do evento.

**Motivação:** Preserva latência baixa e evita que falhas temporárias de banco/analytics derrubem o fluxo público do culto.

**Consequência:** Analytics pode ter perda controlada em incidentes. Dashboards devem distinguir métrica operacional de dado financeiro ou contábil.

**Guardrail:** `TapEvent` não armazena dado pessoal direto do visitante. IP e user agent, quando usados para segurança, devem ter retenção curta, truncamento, hash efêmero ou agregação.

---

## ADR-02B — Contingência pública sem vazamento técnico

**Contexto:** Dispositivos NFC ficam em ambientes públicos. URLs inválidas, device-id inexistente, destino inativo ou falha de infraestrutura não podem expor stack trace, IDs internos ou pistas úteis para enumeração.

**Decisão:** Todo erro do endpoint público converge para páginas de contingência controladas: "TAP indisponível", "Conteúdo em breve" ou fallback de marca pública da organização/campus quando disponível.

**Motivação:** Mantém a experiência compreensível para o visitante e reduz vazamento de informação operacional.

**Consequência:** Logs internos precisam guardar o motivo real da falha, porque a tela pública será genérica por padrão.

**Guardrail:** A resposta pública não revela se o `device-id` existe, qual tenant é dono do dispositivo, nem detalhes de cache, banco ou política de destino.

---

## ADR-03 — RLS (Row Level Security) no Supabase como barreira de multi-tenant

**Contexto:** O banco é compartilhado entre todas as organizações. Vazamento de dados entre tenants é o risco de segurança mais crítico do sistema.

**Decisão:** Usar RLS do PostgreSQL/Supabase como barreira primária de isolamento. Toda tabela com dados de organização tem política RLS que filtra por `organization_id`/`tenant_id` do contexto autenticado.

**Motivação:** RLS é enforçado no nível do banco — mesmo se o código de aplicação tiver um bug de autorização, o banco não retorna dados de outro tenant. É defesa em profundidade.

**Consequência:** Toda migração de schema que cria nova tabela com dados de organização deve incluir política RLS no mesmo migration. Testes devem tentar acesso cross-tenant e cross-campus.

---

## ADR-04 — App auxiliar ProPresenter como Electron (Mac)

**Contexto:** A integração com ProPresenter requer um processo local que leia a API de rede do ProPresenter e envie eventos para o backend.

**Decisão:** App auxiliar implementado em Electron para Mac. Distribuído como `.dmg` assinado e notarizado com certificado Apple Developer.

**Motivação:** Electron permite UI simples para configuração (token, porta, campus), processo em background, auto-start no login do Mac, e distribuição fácil sem App Store.

**Consequência:** Manter o Electron atualizado. O app deve ter tamanho mínimo. Considerar alternativa em Swift/SwiftUI para versão futura mais leve. O token do app é escopado a tenant, campus e máquina, pode ser revogado, e nunca deve ser salvo em texto puro.

---

## ADR-05 — Tokens de pagamento no frontend, nunca no backend

**Contexto:** Pagamentos com cartão envolvem dados sensíveis. O backend não pode receber número de cartão, CVV ou data de validade.

**Decisão:** O SDK JavaScript do gateway (Mercado Pago JS, Stripe.js, Asaas JS) é carregado no frontend e transforma os dados do cartão em um token opaco antes de qualquer envio ao backend. O backend recebe apenas o token para confirmar a cobrança.

**Motivação:** Elimina responsabilidade PCI do backend. Se o backend for comprometido, não há dados de cartão a vazar.

**Consequência:** A tela de cartão deve carregar o SDK do gateway correto para a organização do TAP ativo. Isso requer que o frontend saiba qual gateway a organização usa antes de renderizar o formulário.

---

## ADR-06 — Credenciais de gateway criptografadas em repouso

**Contexto:** As credenciais de API do gateway (tokens, chaves secretas) ficam armazenadas no banco.

**Decisão:** Criptografar as credenciais com AES-256 antes de persistir. A chave de criptografia fica em variável de ambiente do servidor, nunca no banco.

**Motivação:** Se o banco for comprometido, as credenciais são inúteis sem a chave. A chave fica fora do banco.

**Consequência:** Rotação de chave requer re-criptografia de todas as credenciais. Processo de key rotation deve ser documentado e testado.

---

## ADR-07 — MVP de pagamento com Mercado Pago + Pix primeiro

**Contexto:** A documentação original prometia Mercado Pago, Stripe, Asaas, cartão, Apple Pay e Google Pay cedo demais.

**Decisão:** O MVP comercial usa Mercado Pago + Pix dinâmico. Cartão, Apple Pay, Google Pay, Stripe e Asaas entram depois que o contrato de gateway, idempotência, recibo e reconciliação estiverem estáveis.

**Motivação:** Reduz risco de implementação e valida o fluxo dominante no Brasil antes de multiplicar variações de gateway.

**Consequência:** Backlog, plano comercial e UI devem tratar métodos não entregues como desabilitados por feature flag.

---

## ADR-08 — Webhooks financeiros idempotentes

**Contexto:** Gateways reenviam webhooks e podem entregar eventos fora de ordem.

**Decisão:** Todo webhook financeiro é persistido em `PaymentWebhookEvent` antes de processar. O processamento usa `gateway_event_id`, `gateway_transaction_id` e `gateway_charge_id` como chaves de idempotência.

**Motivação:** Evitar duplicidade de doação e garantir rastreabilidade de falhas.

**Consequência:** O webhook deve retornar sucesso para evento duplicado já processado. Erros transitórios entram em fila de retry com backoff.

---

## ADR-09 — Destination config versionado

**Contexto:** `Destination.config` é um campo JSONB que varia por tipo e tende a evoluir. Sem schemas versionados, alterações futuras podem quebrar destinos já publicados silenciosamente e impedir migrações seguras.

**Decisão:** Cada destino armazena `config_version` (integer) e valida `config` contra o schema do tipo + versão antes de persistir. Schemas v1 de todos os tipos estão documentados em `Modelo Conceitual de Entidades TAP e Engajamento Digital.md`.

**Motivação:** `config_version` permite detectar destinos em formato antigo e aplicar migração controlada. A validação na camada de persistência garante que nenhum destino inválido chegue ao redirect engine ou ao formulário.

**Consequência:** Toda mudança de schema exige as ações descritas abaixo.

### Regras de migração de Destination.config

**Classificação de mudança:**

| Tipo de mudança | Nova versão? | Migration obrigatória? |
|---|---|---|
| Novo campo opcional com `default` definido | Não | Não |
| Novo campo obrigatório | Sim | Sim |
| Remoção de campo | Sim | Sim |
| Mudança de tipo de campo | Sim | Sim |
| Renomeação de campo | Sim | Sim |

**Protocolo:**

1. Documentar nova versão no `Modelo Conceitual de Entidades` com número explícito (v2, v3...).
2. Incluir migration script no **mesmo PR** do novo schema — nunca em PR separado.
3. Destinos em `draft` migram imediatamente via script.
4. Destinos em `active` migram via script retrocompatível, ou em janela de manutenção com rollback documentado.
5. O redirect engine e os formulários devem aceitar `config_version` anterior e novo durante a transição.
6. `config_version` nunca é decrementado; rollback de schema usa migration reversa.
7. Após todos os registros migrados e confirmados em produção, a versão anterior pode ser descontinuada.

---

## ADR-10 — Analytics bruto não é dado financeiro

**Contexto:** `TapEvent` é público, ruidoso e pode sofrer abuso.

**Decisão:** Analytics de tap é tratado como métrica operacional. Dados financeiros confirmados vêm de gateway idempotente e eventos do Financeiro.

**Motivação:** Evitar misturar métrica estimada com dado contábil.

**Consequência:** Dashboard deve indicar claramente quando uma métrica é operacional/agregada.

---

## ADR-11 — TAP não é ledger contábil oficial

**Contexto:** O módulo TAP facilita doações e Gift Entry, mas não deve criar uma segunda fonte de verdade financeira. A auditoria identificou risco de dupla contabilidade caso TAP e Financeiro emitam relatórios oficiais independentes.

**Decisão:** TAP mantém staging operacional da origem da doação e publica eventos idempotentes para Financeiro. O módulo Financeiro é a fonte oficial para conciliação, relatórios contábeis, prestação de contas e visão financeira consolidada.

**Motivação:** Preserva separação de responsabilidades: TAP otimiza o momento de engajamento; Financeiro governa consistência contábil, conciliação e prestação de contas.

**Consequência:** Dashboards financeiros do TAP são operacionais e devem ser rotulados como não oficiais quando exibirem dados ainda não consolidados pelo Financeiro. Pix, webhook, reembolso e Gift Entry dependem de contrato financeiro aceito antes do MVP comercial.

---

## ADR-12 — Eventos financeiros do TAP usam outbox/inbox

**Contexto:** Webhooks de gateway podem ser duplicados, atrasados ou entregues fora de ordem. Gift Entry também pode ser corrigido por reabertura de lote.

**Decisão:** TAP publica `tap.donation.confirmed`, `tap.donation.failed`, `tap.donation.refunded`, `tap.gift_entry.created` e `tap.gift_batch.closed` via outbox. Financeiro consome via inbox, com idempotência por `event_id` e `idempotency_key`.

**Motivação:** Garante que eventos financeiros possam ser reprocessados sem duplicar receita, lançamento, relatório ou conciliação.

**Consequência:** Toda confirmação financeira precisa gravar a alteração operacional e o evento na mesma transação. Se publicação falhar, o evento permanece pendente para retry. Financeiro deve tratar reenvio conhecido como sucesso idempotente.

---

## Contrato Financeiro TAP → Financeiro

**Status de aceite:** Pendente de aceite formal pelo módulo Financeiro
**Gate para MVP comercial:** Este contrato deve ser aceito antes de Pix e Gift Entry saírem do piloto para produção comercial

---

### Fronteira de responsabilidade

TAP e Financeiro têm responsabilidades distintas e não se sobrepõem:

| Domínio | TAP | Financeiro |
|---|---|---|
| Registro da origem da transação | Sim — `Donation`, `GiftEntry`, `GiftBatch` | — |
| Estado operacional no gateway | Sim — `status` da `Donation` | — |
| Publicação de evento via outbox | Sim | — |
| Consumo de evento via inbox | — | Sim |
| Ledger contábil oficial | — | Sim |
| Conciliação com gateway | — | Sim |
| Relatórios contábeis e prestação de contas | — | Sim |
| Dashboards operacionais (não oficiais) | Pode exibir dados próprios, rotulados | — |

Dashboards financeiros do TAP devem ser rotulados como "dados operacionais — não consolidados pelo Financeiro" até confirmação de consumo pelo inbox.

---

### Estrutura base do evento

```typescript
type TapFinanceEvent = {
  event_id: string          // uuid v4 — único e imutável por ocorrência
  schema_version: 1         // versão deste contrato; consumidor deve rejeitar versão desconhecida
  event_type: TapFinanceEventType
  aggregate_type: 'Donation' | 'GiftEntry' | 'GiftBatch'
  aggregate_id: string      // id da entidade de origem no TAP
  producer_module: 'tap'
  organization_id: string   // tenant
  campus_id: string
  occurred_at: string       // ISO 8601 UTC
  idempotency_key: string   // chave de deduplicação para o Financeiro
  payload: TapFinanceEventPayload
}
```

---

### Eventos, payloads e chaves de idempotência

#### tap.donation.confirmed

Publicado quando o gateway confirma pagamento. Ocorre exatamente uma vez por doação confirmada.

**Idempotency key:** `{organization_id}:{gateway_provider}:{gateway_transaction_id}`

```typescript
payload: {
  donation_id: string,
  fund_id: string,
  amount: number,                                           // em centavos (integer)
  currency: 'BRL',
  method: 'pix' | 'credit_card' | 'debit_card',
  gateway_provider: string,
  gateway_transaction_id: string,
  gateway_charge_id: string | null,
  confirmed_at: string,                                     // ISO 8601 UTC
  campus_id: string,
  tap_device_id: string | null,
  is_anonymous: boolean,
  receipt_requested: boolean
}
```

#### tap.donation.failed

Publicado quando o gateway confirma falha definitiva (não tentativa transitória). Doações com TTL expirado sem pagamento **não** geram este evento.

**Idempotency key:** `{organization_id}:{donation_id}:failed`

```typescript
payload: {
  donation_id: string,
  fund_id: string,
  amount: number,                                           // em centavos
  method: string,
  gateway_provider: string,
  gateway_charge_id: string | null,
  failure_reason: string,                                   // código retornado pelo gateway
  failed_at: string                                         // ISO 8601 UTC
}
```

#### tap.donation.refunded

Publicado quando reembolso é confirmado pelo gateway. No MVP, apenas reembolso total é suportado.

**Idempotency key:** `{organization_id}:{gateway_provider}:{refund_id}`

```typescript
payload: {
  donation_id: string,
  refund_id: string,                                        // id do reembolso no gateway
  amount: number,                                           // em centavos — igual ao original no MVP
  gateway_provider: string,
  gateway_transaction_id: string,
  refunded_at: string,                                      // ISO 8601 UTC
  reason: string                                            // motivo registrado pelo operador
}
```

#### tap.gift_entry.created

Publicado quando um `GiftEntry` é criado. Cada lançamento gera um evento independente.

**Idempotency key:** `{organization_id}:{gift_entry_id}`

```typescript
payload: {
  gift_entry_id: string,
  gift_batch_id: string,
  fund_id: string,
  amount: number,                                           // em centavos
  method: 'cash' | 'check' | 'external_pix' | 'other',
  donated_at: string,                                       // date ISO 8601 (data física, não timestamp)
  recorded_by: string,                                      // user_id do operador
  reference: string | null                                  // número de cheque ou comprovante
}
```

#### tap.gift_batch.closed

Publicado quando o lote de Gift Entry é fechado. Contém totais consolidados por fundo e por método.

**Idempotency key:** `{organization_id}:{gift_batch_id}:closed_at:{closed_at}`

```typescript
payload: {
  gift_batch_id: string,
  campus_id: string,
  closed_by: string,                                        // user_id
  closed_at: string,                                        // ISO 8601 UTC
  entry_count: number,
  total_amount_by_fund: Record<string, number>,             // fund_id → total em centavos
  total_amount_by_method: Record<string, number>            // method → total em centavos
}
```

---

### Garantias de processamento

1. TAP grava o evento no outbox na **mesma transação** que confirma doação, cria Gift Entry ou fecha lote — se a transação falhar, o evento não é publicado.
2. Um worker publica eventos `pending` do outbox com retry automático e backoff exponencial.
3. Financeiro registra `event_id` e `idempotency_key` no inbox **antes** de aplicar qualquer efeito contábil.
4. Reprocessamento do mesmo evento (retry ou reenvio) produz o mesmo resultado e **nunca duplica** receita, lançamento, relatório ou conciliação.
5. Financeiro trata evento com `idempotency_key` já processado como sucesso — nunca como erro.
6. Evento com `schema_version` desconhecido vai para dead letter queue, nunca descartado silenciosamente.

---

### Campos que nunca aparecem no payload financeiro

Os dados abaixo são sensíveis e não trafegam nos eventos. Quando o Financeiro precisar deles, acessa pelo `donation_id` via API autorizada do TAP.

- CPF do doador (mesmo criptografado)
- Nome completo e e-mail do doador
- Dados de cartão ou token de cartão
- Credenciais ou chaves de gateway

---

### Decisão formal: TAP não cria cadastro de Pessoas/visitantes

No escopo atual:
- Nenhuma submissão de formulário pastoral cria ou atualiza `Person`.
- Nenhuma doação vincula automaticamente `donor_person_id`.
- O campo `donor_person_id` em `Donation` e `GiftEntry` existe para uso futuro e permanece `null` no escopo atual.
- Mudança nesta decisão exige contrato próprio com o módulo Pessoas antes de qualquer implementação.

---

### Gate para aceite formal do Financeiro

O MVP comercial (Pix em produção e Gift Entry) **não pode ser liberado** sem que o módulo Financeiro:

1. Revise os 5 eventos, payloads e chaves de idempotência acima.
2. Confirme que o payload é suficiente para os fluxos de conciliação e relatório contábil.
3. Registre o aceite formal em issue dedicada ou comentário nesta issue (#30).

Até o aceite formal, Pix e Gift Entry permanecem em piloto restrito.

---

## Riscos técnicos abertos

### RT-01 — Latência do ProPresenter → backend em redes lentas

O app auxiliar envia eventos via HTTPS para o backend. Em igrejas com internet lenta, a troca de destino pode levar mais de 3s. Mitigação: websocket com reconexão automática em vez de polling HTTP.

### RT-02 — Versões do ProPresenter

A API de rede do ProPresenter pode mudar entre versões. O app auxiliar deve ser tolerante a falhas e logar erros de compatibilidade. Testar com ProPresenter 7 (versão mais comum).

### RT-03 — Webhooks de gateway perdidos

Se o backend estiver indisponível quando o gateway enviar o webhook de confirmação de pagamento, a doação fica como `pending`. Implementar persistência do webhook, fila de retry com backoff exponencial e job de reconciliação consultando o gateway.

### RT-04 — Apple Pay em contexto web

Apple Pay no browser (Safari mobile) requer que o domínio seja verificado com a Apple via arquivo de associação. A verificação é por domínio. Em modelo multi-tenant com subdomínios, cada subdomínio precisa de verificação própria ou usar um domínio pai verificado. Investigar antes de implementar.

### RT-05 — Supabase free tier e espaço em disco

Em produção multi-tenant, o volume de `TapEvent` crescerá rápido. Implementar política de retenção: manter eventos por 12 meses, agregar para séries temporais após isso. Ver lição aprendida no SOM App (infra/free tier).

### RT-06 — Token do app ProPresenter vazado

Token vazado poderia trocar destinos. Mitigação: token escopado por campus/máquina, rotação, revogação imediata, auditoria e detecção de origem inesperada.

### RT-07 — URL externa maliciosa

Destino externo pode ser usado para phishing. Mitigação: validação HTTPS, preview de domínio, allowlist opcional, auditoria e alerta quando domínio não pertence à organização.

### RT-08 — Reembolso parcial

O modelo precisa decidir se suporta reembolso parcial. Para MVP, suportar apenas reembolso total, salvo decisão contrária documentada. Reembolso parcial fica como requisito futuro se não entrar no schema inicial.
