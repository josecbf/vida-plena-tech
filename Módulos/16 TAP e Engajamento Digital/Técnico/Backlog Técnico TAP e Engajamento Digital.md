---
tags:
  - tap
  - engajamento
  - tecnico
  - backlog-tecnico
---

# Backlog Técnico — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## Frentes técnicas

### FT-01 — Infraestrutura base

- [ ] Projeto Next.js com App Router no Vercel
- [ ] Projeto Supabase com schema multi-tenant
- [ ] RLS habilitado em todas as tabelas de organização
- [ ] Testes automatizados cross-tenant e cross-campus
- [ ] Migrations iniciais (organizations, campuses, tap_groups, tap_devices, destinations)
- [ ] FKs compostas ou validação transacional contra referência cruzada entre tenants
- [ ] Supabase Auth configurado (e-mail + senha, magic link)
- [ ] Variáveis de ambiente por ambiente (dev, staging, prod)
- [ ] CI/CD básico: lint, type-check, testes, deploy automático

### FT-00 — Contratos, LGPD e auditoria

- [ ] Schemas versionados de `Destination.config` por tipo
- [ ] Mapa LGPD por entidade do módulo
- [ ] Textos de consentimento versionados por formulário pastoral
- [ ] `AuditLog` obrigatório para ações sensíveis
- [ ] Contrato `tap.donation.confirmed` com Financeiro
- [ ] Contrato `tap.gift_entry.created` e `tap.gift_batch.closed` com Financeiro
- [ ] Decisão documentada de não publicar intake para Pessoas no escopo atual
- [ ] Registros operacionais de formulários sem criação de cadastro de Pessoas/visitantes
- [ ] Política de retenção de `TapEvent`, `Donation`, `GiftEntry` e `PastoralFormSubmission`

### FT-02 — Redirect Engine

- [ ] Edge Function `/t/[device-id]`
- [ ] Integração com Vercel KV para cache de destino ativo
- [ ] Invalidação de cache na troca de destino
- [ ] Log de tap events fora do caminho crítico do redirect
- [ ] Rate limit leve no endpoint público
- [ ] Device IDs não enumeráveis
- [ ] Marcação de tráfego suspeito
- [ ] Tela padrão "em breve" para grupos sem destino ativo
- [ ] Página de contingência para device inativo, destino inativo e erro de cache/banco
- [ ] Teste de carga: 500 requisições simultâneas < 200ms p95
- [ ] Teste de carga estendido: 2.000 e 10.000 taps simulados com degradação controlada

### FT-03 — API de Administração

- [ ] CRUD de campus
- [ ] CRUD de grupos TAP
- [ ] CRUD de dispositivos TAP com geração de URL
- [ ] Geração de QR code (servidor ou client-side)
- [ ] CRUD de destinos (com validação de config por tipo)
- [ ] Endpoint de troca de destino ativo
- [ ] Override manual com duração e retorno ao destino padrão
- [ ] CRUD de agendamentos
- [ ] Timezone IANA por campus/agendamento
- [ ] CRUD de keywords ProPresenter
- [ ] Endpoint de webhook recebimento ProPresenter
- [ ] Segurança de URL externa: HTTPS, preview, allowlist opcional e auditoria

### FT-04 — Gateway Abstrato

- [ ] Interface `PaymentGateway` em TypeScript
- [ ] Implementação `MercadoPagoGateway`
  - [ ] Criar cobrança Pix
  - [ ] Receber webhook de confirmação
- [ ] TTL e expiração de cobrança Pix
- [ ] Tabela `PaymentWebhookEvent`
- [ ] Validação de assinatura de webhook
- [ ] Idempotência por evento, transação e cobrança
- [ ] Job de expiração de cobranças pendentes
- [ ] Job de reconciliação com gateway
- [ ] Reembolso total no MVP; parcial como decisão futura
- [ ] Implementação `StripeGateway` (pós-MVP)
- [ ] Implementação `AsaasGateway` (pós-MVP)
- [ ] Criptografia de credenciais (AES-256)
- [ ] Endpoint de teste de conexão com gateway
- [ ] Fila de retry para webhooks perdidos

### FT-05 — Telas do visitante

- [ ] Tela de oferta (seleção de valor + fundo)
- [ ] Fluxo Pix: criação de cobrança → exibição de QR → polling de status
- [ ] Contador de expiração do Pix + gerar novo Pix
- [ ] Identificação opcional do doador: nome, e-mail e CPF
- [ ] Fluxo cartão: formulário tokenizado por gateway (pós-MVP)
- [ ] Fluxo Apple Pay (Payment Request API) (pós-MVP)
- [ ] Fluxo Google Pay (Payment Request API) (pós-MVP)
- [ ] Tela de confirmação de doação
- [ ] Envio de recibo por e-mail (opcional)
- [ ] Página própria (imagem + título + texto + botão)
- [ ] Formulário de visitante
- [ ] Formulário de oração
- [ ] Formulário de decisão
- [ ] Formulário de inscrição em célula
- [ ] Consentimento obrigatório e versionado em formulários pastorais
- [ ] Tela de agradecimento pós-formulário

### FT-06 — Painel Admin e Comunicação

- [ ] Dashboard (taps, doações, status ProPresenter)
- [ ] Gestão de grupos e dispositivos
- [ ] Editor de destinos (por tipo)
- [ ] Upload de imagem para destinos (Supabase Storage)
- [ ] Painel de agendamentos
- [ ] Painel ProPresenter (status + keywords + log)
- [ ] Dashboard financeiro (doações por fundo, período, método)
- [ ] Gift entry (lançamento manual + lotes)
- [ ] Estados de lote: aberto, conferência, fechado, reaberto, exportado
- [ ] Exportação CSV de doações
- [ ] Gestão de fundos
- [ ] Gestão de usuários e papéis
- [ ] Configuração de gateway (UI segura — não exibe credenciais após salvar)

### FT-07 — App Auxiliar ProPresenter

- [ ] Projeto Electron (Mac)
- [ ] Tela de configuração: token escopado por tenant/campus/máquina + porta ProPresenter
- [ ] Conexão com API de rede do ProPresenter (WebSocket ou HTTP polling)
- [ ] Leitura de slide note ativo
- [ ] Detecção de keywords
- [ ] POST para backend na detecção
- [ ] Heartbeat com campus, máquina, versão e status
- [ ] Rotação e revogação de token
- [ ] Tratamento de keyword duplicada/conflitante
- [ ] Indicador visual de status (conectado/desconectado)
- [ ] Auto-start no login do Mac
- [ ] Distribuição como .dmg assinado e notarizado
- [ ] Página de download no painel admin
- [ ] Definição de versão mínima do ProPresenter suportada

### FT-08 — Billing e Planos

- [ ] Tabela de planos e feature flags
- [ ] Controle de limites por plano (campus, grupos TAP, métodos de pagamento)
- [ ] Trial de 14 dias automático
- [ ] Integração com Stripe Billing para cobrança de assinatura
- [ ] Estratégia de NF brasileira para assinatura SaaS
- [ ] Upgrade/downgrade de plano self-service
- [ ] Alertas de limite próximo
- [ ] Bloqueio administrativo por limite sem derrubar TAP público durante janela de graça

### FT-09 — Observabilidade operacional

- [ ] Dashboard de saúde do culto
- [ ] Métricas p95/p99 do redirect
- [ ] Monitoramento de erro de gateway
- [ ] Webhooks pendentes/falhos
- [ ] Status de filas/eventos de domínio
- [ ] Status ProPresenter por campus/máquina
- [ ] Alertas antes do culto para gateway inválido, token vencido e app desconectado

---

## Stack técnica definida

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14+ (App Router) |
| Hosting | Vercel |
| Redirect | Vercel Edge Functions |
| Cache | Vercel KV |
| Banco | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (imagens) |
| Email | Resend |
| App auxiliar | Electron (Mac) |
| Pagamentos | Interface abstrata — Mercado Pago / Stripe / Asaas |
| Billing SaaS | Stripe Billing |
| Linguagem | TypeScript |
