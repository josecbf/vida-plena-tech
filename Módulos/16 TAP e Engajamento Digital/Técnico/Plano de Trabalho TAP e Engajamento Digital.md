---
tags:
  - tap
  - engajamento
  - tecnico
  - plano-trabalho
---

# Plano de Trabalho — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## Princípio de sequenciamento

Entregar valor real o mais cedo possível. A Fase 1 já deve ser utilizável em um culto real. Cada fase seguinte adiciona capacidade sem quebrar o que já funciona.

---

## Fase 0 — Contratos, LGPD e fundação de segurança
**Objetivo:** Eliminar decisões implícitas antes da primeira migration.

**Entregáveis:**
- Contratos de eventos com Financeiro
- Contrato de intake com Pessoas
- Schemas versionados de `Destination.config`
- Mapa LGPD por entidade e formulário
- Matriz de permissões sensíveis
- Política de retenção e auditoria
- Decisão formal sobre MVP comercial

**Critério de aceite:** A squad consegue derivar migrations, policies RLS, contratos de eventos e testes de autorização sem tomar decisão de produto no código.

**Duração estimada:** 1 semana

## Fase 1 — Fundação e TAP Básico
**Objetivo:** Uma organização consegue configurar um TAP, trocar destino manualmente e redirecionar visitantes. Esta fase é **Alpha operacional sem pagamento**, não MVP comercial.

**Entregáveis:**
- Cadastro de organização + autenticação
- CRUD de campus, grupos TAP e dispositivos
- Geração de URL única por dispositivo + QR code
- Redirect engine (Edge Function + cache KV)
- Rate limit, device IDs não enumeráveis e analytics não bloqueante
- Destino tipo `external_url` e `own_page`
- Validação de URL externa e preview de domínio
- Painel de comunicação (editor simplificado)
- Troca manual de destino ativo
- Override manual com duração e retorno ao destino padrão
- Página de contingência para device/grupo/destino inválido

**Critério de aceite:** Uma moeda NFC programada com a URL redireciona corretamente para o destino configurado, em < 2s, sem login do visitante.

**Duração estimada:** 2–3 semanas

---

## Fase 2 — Oferta Digital
**Objetivo:** Visitante consegue completar uma doação via Pix Mercado Pago com idempotência, expiração e evento financeiro.

**Pré-requisito:** Fase 1 concluída.

**Entregáveis:**
- Destino tipo `oferta` com seleção de valor e fundo
- Gateway abstrato — implementação Mercado Pago
- Fluxo Pix completo (cobrança → QR → polling → confirmação)
- TTL visível do Pix e regeneração
- Webhook idempotente com tabela de eventos
- Job de expiração de cobranças pendentes
- Identificação opcional do doador: nome, e-mail e CPF
- Recibo por e-mail (opcional)
- Gestão de fundos no painel admin
- Dashboard financeiro básico (total por fundo e período)
- Gift Entry básico com lote aberto/fechado
- Observabilidade de culto: redirect, gateway, webhooks e filas

**Critério de aceite:** Doação via Pix confirmada em menos de 30s, webhook duplicado não duplica doação, evento financeiro é emitido exatamente uma vez e lote físico pode ser fechado com auditoria.

**Duração estimada:** 2–3 semanas

---

## Fase 3 — Automação e Engajamento
**Objetivo:** A equipe configura uma vez e o TAP se gerencia durante o culto.

**Pré-requisito:** Fase 2 concluída.

**Entregáveis:**
- Agendamento de trocas de destino por horário (recorrente e pontual)
- App auxiliar ProPresenter (Electron, Mac)
- Integração ProPresenter → keywords → troca automática
- Formulários pastorais (visitante, oração, decisão, célula)
- Consentimento versionado em formulários pastorais
- Encaminhamento de dados de formulário ao módulo Pessoas
- Leitura sensível com permissão e auditoria
- App ProPresenter assinado/notarizado, token por campus/máquina e heartbeat
- Gateway Stripe como segunda implementação, se Pix estiver estável
- Cartão tokenizado, se contrato de gateway estiver estável

**Critério de aceite:** Keyword no slide do ProPresenter troca o destino do TAP em < 3s. Formulário de visitante cria registro no módulo Pessoas sem duplicidade.

**Duração estimada:** 3–4 semanas

---

## Fase 4 — Produto Comercial
**Objetivo:** Qualquer igreja brasileira consegue se cadastrar, onboardar e usar o produto de forma autônoma.

**Pré-requisito:** Fases 1–3 concluídas e validadas em uso real.

**Entregáveis:**
- Onboarding guiado (wizard 4 passos)
- Três pacotes com feature flags (Essencial, Crescimento, Missão)
- Trial de 14 dias automático
- Billing com Stripe Billing (assinatura mensal e anual)
- Upgrade/downgrade self-service
- Gateway Asaas como terceira implementação
- Apple Pay e Google Pay quando domínio/gateway estiverem validados
- Dashboard completo de engajamento e analytics
- Suporte a domínio próprio por organização (plano Missão)
- Estratégia de NF brasileira para assinatura SaaS
- Base de conhecimento e documentação pública

**Critério de aceite:** Uma organização consegue se cadastrar, completar o onboarding, configurar um TAP e receber uma doação sem intervenção da equipe da plataforma.

**Duração estimada:** 3–4 semanas

---

## Fase 5 — Inteligência (futuro)
**Objetivo:** Analytics avançado e IA conversacional para liderança financeira.

**Entregáveis:**
- Doações recorrentes com agendamento
- Relatórios de campanha / capital campaign
- Pledges e metas
- IA: perguntas em linguagem natural sobre dados financeiros
- App auxiliar ProPresenter para Windows
- Notificação push para liderança em tempo real

---

## Marcos e dependências críticas

```
Fase 1 ──────────────────────────────► Fase 2
(TAP + Redirect + Painel)              (Oferta + Gateway MP)
                                              │
                                              ▼
                                        Fase 3
                                  (ProPresenter + Agendamento
                                   + Formulários + Cartão opcional)
                                              │
                                              ▼
                                        Fase 4
                                  (Produto Comercial + Billing)
```

**Dependência crítica para Fase 3:** O app Electron precisa ser testado com a versão real do ProPresenter da organização piloto antes de ser distribuído.

**Dependência crítica para Fase 4:** Validar os três pacotes com pelo menos 3 igrejas reais antes de abrir cadastro público.

**Dependência crítica financeira:** O módulo Financeiro precisa aceitar eventos idempotentes do TAP antes do MVP comercial.

**Dependência crítica LGPD:** Formulários pastorais só podem ir a piloto com consentimento versionado, retenção definida e permissão sensível auditada.

---

## Organização piloto

A primeira organização a usar o produto em produção é a **Comunidade Vida Plena**. Isso garante:
- Feedback real de uso em culto
- Identificação de bugs em ambiente real
- Validação dos fluxos de oferta com Mercado Pago Brasil
- Teste da integração ProPresenter antes de distribuição

Toda funcionalidade das Fases 1–3 deve ser validada internamente antes de abrir para outras organizações.
