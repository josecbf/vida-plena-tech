---
tags:
  - tap
  - engajamento
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## Áreas funcionais

O módulo é dividido em cinco áreas funcionais com fronteiras claras:

```
┌─────────────────────────────────────────────────────────┐
│                 TAP e Engajamento Digital                │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dispositivos│  │   Destinos   │  │  Redirect    │  │
│  │  e Grupos    │  │              │  │  Engine      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │  Gateway     │  │  Dashboard e Analytics           │ │
│  │  Abstrato    │  │                                  │ │
│  └──────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Área 1 — Dispositivos e Grupos TAP

**Responsabilidade:** representar logicamente os dispositivos NFC físicos e sua organização em grupos dentro de um campus.

**Capacidades:**
- CRUD de grupos TAP por campus
- CRUD de dispositivos dentro de grupos
- Geração e exibição de URL única por dispositivo
- Geração de QR code equivalente
- Exibição do destino ativo atual por grupo
- Log de trocas de destino (quem trocou, quando, por qual meio)

**Campos mínimos do grupo TAP:**
- campus;
- nome interno;
- descrição opcional;
- destino padrão opcional;
- destino ativo atual;
- status: ativo / inativo / arquivado.

**Campos mínimos do dispositivo TAP:**
- grupo TAP;
- nome interno;
- localização física;
- identificador público não enumerável;
- URL pública gerada automaticamente;
- QR code equivalente;
- status: ativo / inativo / arquivado.

**Regras de produto:**
- Um grupo TAP sempre pertence a um único campus.
- Um dispositivo TAP sempre pertence a um único grupo.
- A URL pública do dispositivo não pode ser editada manualmente.
- O QR code sempre representa a mesma URL pública do dispositivo.
- Desativar um grupo impede novos redirects de seus dispositivos e serve página de contingência.
- Arquivar grupo ou dispositivo não apaga histórico de taps, trocas ou auditoria.
- Excluir fisicamente só é permitido se não houver histórico operacional; caso contrário, usar arquivamento.
- Comunicação pode visualizar grupos, dispositivos, URL, QR e destino ativo, mas não cria nem exclui dispositivos.

**Fluxo de configuração de um novo dispositivo:**
```
Admin cria grupo TAP (campus, nome, descrição)
  ↓
Admin adiciona dispositivo ao grupo (nome, localização física)
  ↓
Sistema gera URL única: {slug}.plataforma.com.br/t/{device-id}
  ↓
Admin programa a URL na moeda NFC (fora da plataforma)
  ↓
Admin configura o destino padrão do grupo
  ↓
Dispositivo está operacional
```

**Critérios de aceite do Alpha:**
- Admin cria um grupo TAP vinculado a um campus ativo.
- Admin registra um dispositivo no grupo e recebe URL pública única.
- Sistema gera QR code equivalente à URL pública.
- Comunicação visualiza URL, QR e destino ativo sem permissão de edição estrutural.
- Dispositivo ou grupo inativo não expõe erro técnico ao visitante; usa página de contingência.
- Tentativa de usar dispositivo de outro tenant/campus é bloqueada por validação e RLS.

---

## Área 2 — Destinos

**Responsabilidade:** gerenciar o catálogo de destinos configuráveis — o "o quê" para onde cada TAP aponta.

**Capacidades:**
- CRUD de destinos por organização
- Suporte conceitual a cinco tipos: `offering`, `event_registration`, `pastoral_form`, `external_url`, `own_page`
- Entrega Alpha limitada a `own_page` e `external_url`
- Editor simplificado para tipo `own_page`: upload de imagem, título, texto, botão
- Atribuição de destino ativo a grupos TAP
- Controle de trocas: manual, agendado, ProPresenter

**Fluxo de criação e publicação de destino Alpha:**
```
Usuário cria destino como rascunho
  ↓
Seleciona tipo: own_page ou external_url
  ↓
Sistema valida schema do tipo e config_version
  ↓
Se external_url ou botão externo: valida HTTPS, scheme, domínio e política
  ↓
Se domínio fora da política: solicita aprovação owner/admin
  ↓
Publicação muda status para active
  ↓
AuditLog registra tipo, status anterior, status novo, usuário e campos sensíveis alterados
```

**Regras operacionais por tipo Alpha:**
- `own_page` renderiza página própria da plataforma, com imagem opcional, título, texto e botão.
- `own_page` não executa HTML arbitrário, scripts de terceiros ou coleta de dados pessoais.
- `external_url` faz redirect direto somente após publicação válida.
- URL externa publicada mostra domínio final no painel e na confirmação de publicação.
- Alterar URL, domínio ou botão externo em destino publicado exige nova validação antes de continuar ativo.

**Fluxo de troca de destino:**
```
Fonte de troca (manual / agendamento / keyword ProPresenter)
  ↓
Valida: destino existe? está ativo? grupo pertence ao tenant e campus permitido?
  ↓
Atualiza `tap_groups.current_destination_id` no banco
  ↓
Invalida cache do grupo no KV store
  ↓
Registra evento no log de trocas
  ↓
Próximo tap já recebe o novo destino
```

Toda troca de destino registra `AuditLog` com origem, usuário/token, campus, grupo, destino anterior, destino novo, duração do override e justificativa quando aplicável.

**Critérios de aceite do Alpha:**
- Comunicação cria rascunho `own_page`, preenche campos mínimos e publica após validação.
- Admin cria rascunho `external_url` com URL `https://` válida e visualiza preview do domínio antes de publicar.
- Sistema bloqueia URL com scheme proibido, URL relativa ou domínio inválido.
- URL fora da política fica pendente de aprovação ou exige permissão apropriada.
- Destino `draft` ou `inactive` não pode ser atribuído como destino ativo de grupo.
- Inativar destino ativo em grupo exige substituto ou retorno ao destino padrão.
- Toda publicação, alteração de URL e despublicação gera auditoria.

---

## Área 3 — Redirect Engine

**Responsabilidade:** responder requisições de tap com a menor latência possível.

**Capacidades:**
- Endpoint `GET /t/{device-id}` → consulta destino ativo → 302 redirect
- Cache de destino ativo com TTL de 10s (KV store / Vercel Edge Config)
- Fallback para banco se cache miss
- Registro de tap (timestamp, device-id, destination-id) — sem dados pessoais do usuário final
- Resposta em < 200ms em p95 sob 500 taps simultâneos
- IDs de dispositivos não enumeráveis
- Rate limit leve por IP/device fingerprint
- Detecção de anomalia por volume e origem
- Inserção de analytics fora do caminho crítico do redirect

**Fluxo de um tap:**
```
Celular toca moeda NFC
  ↓
Abre URL do dispositivo (ex: /t/abc123)
  ↓
Edge Function consulta cache (< 5ms)
  ↓ [cache hit]
302 redirect para URL do destino ativo
  ↓
Celular abre destino (tela de oferta, formulário, etc.)
```

**Falhas e fallback:**
- Device inexistente ou inativo: página segura de "TAP indisponível".
- Grupo sem destino ativo: página padrão da organização/campus.
- Destino inativo: retorna destino padrão ou página de contingência.
- Cache indisponível: consulta banco com timeout curto.
- Banco indisponível: usa último destino cacheado se ainda válido; caso contrário, página de contingência.

---

## Área 4 — Gateway Abstrato

**Responsabilidade:** abstrair os diferentes gateways de pagamento em uma interface única, delegar o processamento financeiro ao gateway da organização.

**Interface do gateway:**
```typescript
interface PaymentGateway {
  createPixCharge(params: PixParams): Promise<PixCharge>
  createCardToken(params: CardParams): Promise<CardToken>
  chargeCard(token: string, params: ChargeParams): Promise<Charge>
  getApplePaySession(): Promise<ApplePaySession>
  getWebhookPayload(raw: string, signature: string): DonationEvent
}
```

**Implementações v1:**
- `MercadoPagoGateway`

**Implementações pós-MVP:**
- `StripeGateway`
- `AsaasGateway`

**Configuração por organização:**
- Admin escolhe gateway no onboarding
- Fornece credenciais de API (armazenadas criptografadas)
- Cada campus pode ter gateway diferente (pacote Missão)

**Fluxo de doação via Pix:**
```
Doador seleciona valor e fundo na tela de oferta
  ↓
Backend cria cobrança Pix no gateway da organização
  ↓
Gateway retorna QR code + código Pix copia-e-cola
  ↓
Tela exibe QR + botão de copiar
  ↓
Doador abre banco, escaneia ou cola
  ↓
Gateway notifica plataforma via webhook
  ↓
Plataforma registra doação confirmada
  ↓
Emite evento para módulo Financeiro
  ↓
Envia recibo para doador (se e-mail informado)
```

**Regras obrigatórias do gateway:**
- Todo webhook é validado por assinatura.
- Todo webhook é armazenado em `PaymentWebhookEvent`.
- Processamento é idempotente por `gateway_event_id` e por `gateway_transaction_id`.
- Reenvio conhecido retorna sucesso sem duplicar doação.
- Cobrança Pix possui TTL e expiração.
- Doação só entra em relatório confirmado quando `status = confirmed`.
- Reembolso publica evento próprio para Financeiro.

---

## Área 5 — Dashboard e Analytics

**Responsabilidade:** dar visibilidade ao engajamento e às receitas sem expor dados sensíveis desnecessariamente.

**Capacidades:**
- Métricas de engajamento: taps por período, por grupo, por campus
- Métricas de oferta: total arrecadado, por fundo, por método, por período
- Formulários pastorais: quantidade por tipo (sem expor dados individuais)
- Histórico de trocas de destino
- Status de conexão do app ProPresenter
- Gift entry: lançamento e listagem

**Observabilidade de culto:**
- Latência p95/p99 do redirect
- Taxa de erro do redirect
- Último destino ativo por grupo
- Status do gateway e último erro
- Webhooks pendentes/falhos
- Status ProPresenter por campus/máquina
- Fila de analytics e eventos financeiros

---

## Integração ProPresenter — fluxo detalhado

```
[Mac com ProPresenter]
       |
   App Auxiliar
   (instalado local)
       |
       | Lê slides via API de rede do ProPresenter
       | (porta configurável, ex: 50001)
       |
       | Detecta nota do slide ativo
       |
       | Keyword encontrada? (ex: "OFERTA")
       |
       ↓
   POST /api/propresenter/keyword
   Authorization: Bearer {campus-machine-token}
   Body: { keyword: "OFERTA", campus_id: "...", machine_id: "...", app_version: "..." }
       |
       ↓
   Backend identifica grupo(s) mapeados para "OFERTA"
       |
       ↓
   Atualiza destino ativo de cada grupo
       |
       ↓
   Invalida cache
```

**Contrato operacional:**
- Token do app é escopado a tenant, campus e máquina.
- Token pode ser revogado e rotacionado pelo painel.
- App envia heartbeat periódico com versão, campus, máquina e status da conexão local.
- Keyword duplicada no mesmo campus é inválida, salvo prioridade explícita.
- Duas keywords no mesmo slide seguem ordem de prioridade; conflito é logado.
- Slide repetido não deve reenviar o mesmo evento sem mudança de estado ou janela mínima.
- Versão mínima do ProPresenter é pré-requisito de GA.
- App macOS deve ser assinado e notarizado antes do piloto aberto.

---

## Fluxo de onboarding de nova organização

```
1. Cadastro no site
   Nome da organização, e-mail, senha

2. Verificação de e-mail

3. Onboarding guiado (wizard 4 passos)
   Passo 1: Informações básicas (nome, cidade, porte)
   Passo 2: Configurar primeiro campus
   Passo 3: Escolher e conectar gateway de pagamento
   Passo 4: Criar primeiro grupo TAP e copiar URL

4. Selecionar plano (Essencial gratuito por 14 dias → upgrade)

5. Igreja operacional
```

## Contratos de integração interna

### Financeiro

TAP não é a fonte contábil final. TAP publica eventos idempotentes e o módulo Financeiro consolida.

Eventos mínimos:
- `tap.donation.confirmed`
- `tap.donation.failed`
- `tap.donation.refunded`
- `tap.gift_entry.created`
- `tap.gift_batch.closed`

### Pessoas

No escopo atual, TAP não publica intake para Pessoas e não cria, atualiza ou enriquece cadastro de Pessoas/visitantes.

Regras:
- Formulários pastorais e inscrições permanecem como registros operacionais do TAP.
- Pedido de oração anônimo permanece sem identificação canônica.
- Origem, consentimento e destino ficam registrados no TAP.
- Integração futura com Pessoas exige contrato próprio antes de qualquer match, criação ou revisão de cadastro.

### Comunicação

Confirmações e recibos são enviados por Comunicação quando houver permissão e dado de contato autorizado. TAP não implementa motor próprio de mensagens.

## Segurança de URL externa

Destino `external_url` exige:
- URL absoluta `https://`, exceto ambiente local/dev.
- Bloqueio de protocolos perigosos: `javascript:`, `data:`, `file:`, `mailto:` e `tel:`.
- Normalização e preview do domínio antes de publicar.
- Alerta visual quando domínio não pertence à política da organização.
- Política opcional de allowlist por organização.
- Aprovação owner/admin ou permissão `tap.external_url.publish` para publicar fora da política.
- Auditoria ao publicar, alterar URL, aprovar exceção ou despublicar URL externa.
