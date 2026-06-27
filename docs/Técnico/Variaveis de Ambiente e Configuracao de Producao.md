---
tags:
  - tecnico
  - operacao
  - ambiente
  - configuracao
atualizado: 2026-06-16
---

# Variáveis de Ambiente e Configuração de Produção

← [[Arquitetura Plataforma]]

Referência completa das variáveis de ambiente da plataforma. O arquivo `.env.local.example` no repositório de código é a fonte canônica para desenvolvimento local. Este documento detalha contexto, obrigatoriedade e como gerar cada valor.

---

## Supabase

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase. Obtida em: Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anon pública. Obtida em: Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave de service role (admin). **Nunca expor no frontend.** Obtida em: Project Settings → API |

---

## Vercel KV (rate limiting e cache do Redirect Engine)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `KV_REST_API_URL` | Sim (produção) | URL da instância KV. Provisionada em: Vercel → Storage → KV → Connect to project |
| `KV_REST_API_TOKEN` | Sim (produção) | Token de acesso KV. Gerado junto com `KV_REST_API_URL` |

Em desenvolvimento local, se KV não estiver configurado, o redirect funciona sem cache (com degradação de performance aceitável para testes).

---

## Criptografia e Hashing

| Variável | Obrigatória | Como gerar | Uso |
|---|---|---|---|
| `ENCRYPTION_KEY` | Sim | `openssl rand -hex 32` | AES-256-GCM para credenciais de gateway e CPF dos doadores |
| `CPF_HASH_SALT` | Sim | `openssl rand -hex 32` | Hash SHA-256 irreversível dos CPFs de doadores (LGPD) |

**Rotação do `CPF_HASH_SALT`:** ao rotacionar, incrementar `CPF_HASH_SALT_VERSION` no Vercel e executar o endpoint `POST /api/tap/admin/rotate-cpf-hash`. Ver `docs/runbook-cpf-hash-rotation.md` no repositório de código.

**`ENCRYPTION_KEY` nunca deve ser rotacionada sem re-criptografar todos os registros que dependem dela.** Processo de key rotation é operação sensível que requer janela de manutenção.

---

## MercadoPago

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MP_WEBHOOK_SECRET` | Sim (produção) | Assinatura HMAC-SHA256 dos webhooks. Obtida em: Integrações → Notificações → Chave secreta |

Sem este valor, todos os webhooks do MercadoPago são rejeitados e doações ficam permanentemente como `pending`.

---

## Admin

| Variável | Obrigatória | Como gerar | Uso |
|---|---|---|---|
| `ADMIN_SECRET` | Sim | `openssl rand -hex 32` | Bearer token para endpoints admin (`/api/tap/admin/*`) |

---

## Comunicação (e-mail)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `RESEND_API_KEY` | Não | Chave da API Resend. Sem este valor, envio de e-mail falha silenciosamente |
| `RESEND_FROM_EMAIL` | Não | Remetente padrão. Default: `noreply@tap.vidaplena.org.br` |

---

## App URL

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Sim | URL base da aplicação. Usada em links de onboarding, redirecionamentos e e-mails |

---

## Stripe Billing

| Variável | Obrigatória | Descrição |
|---|---|---|
| `STRIPE_SECRET_KEY` | Sim | Chave secreta da API. Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Sim | Signing secret do endpoint de webhook. Stripe Dashboard → Developers → Webhooks |
| `STRIPE_PRICE_ESSENCIAL` | Sim | Price ID do plano Essencial. Stripe Dashboard → Product Catalog → Prices |
| `STRIPE_PRICE_CRESCIMENTO` | Sim | Price ID do plano Crescimento |
| `STRIPE_PRICE_MISSAO` | Sim | Price ID do plano Missão |

Endpoint a registrar no Stripe: `https://<dominio>/api/webhooks/stripe`

Eventos a habilitar: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`

---

## Nuvemfiscal — NFS-e (opcional)

Emissão automática de Nota Fiscal de Serviço para cobranças Stripe. Se `NUVEMFISCAL_API_KEY` não estiver configurada, o evento `invoice.paid` é ignorado silenciosamente — nenhuma funcionalidade é afetada.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NUVEMFISCAL_API_KEY` | Não | API key da Nuvemfiscal. Obtida em: nuvemfiscal.com.br → Configurações → API |
| `NUVEMFISCAL_AMBIENTE` | Não | `producao` ou `homologacao`. Padrão: `homologacao` |
| `FISCAL_PRESTADOR_CNPJ` | Se API key definida | CNPJ da plataforma emissora da NF (o prestador do serviço SaaS) |
| `FISCAL_PRESTADOR_IM` | Não | Inscrição Municipal do prestador. Exigida por alguns municípios |
| `FISCAL_SERVICO_ITEM` | Não | Item da lista de serviços ISS. Padrão: `01.07` (desenvolvimento de programas de computador) |
| `FISCAL_SERVICO_CODIGO` | Não | Código tributário municipal. Padrão: `0107` |

Para ativar a emissão de NFS-e para uma organização, preencher a coluna `fiscal_cnpj` na tabela `organizations` via painel admin ou SQL.

---

## Variáveis removidas / não mais utilizadas

| Variável | Motivo da remoção |
|---|---|
| `IP_HASH_SALT` | O hash de IP é calculado de forma efêmera no edge sem persistência de salt configurável. Removida do `.env.local.example` em 2026-06-16. |

---

## Checklist de deploy em produção (Vercel)

1. Configurar todas as variáveis marcadas como "Sim" no Vercel Dashboard → Settings → Environment Variables
2. Ativar para os ambientes: `Production`, `Preview` (com valores de staging), `Development` (opcional)
3. Após configurar `CPF_HASH_SALT` pela primeira vez, definir `CPF_HASH_SALT_VERSION=1`
4. Configurar KV Store e conectar ao projeto
5. Registrar o webhook endpoint no Stripe com os eventos necessários
6. Testar um pagamento de ponta a ponta em staging antes de ir a produção
