---
tags:
  - tap
  - engajamento
  - produto
  - sitemap
  - telas
---

# Sitemap e Mapa de Telas — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## Dois contextos de interface

O módulo tem dois contextos distintos:

1. **Painel Admin** — usado pela equipe da organização (web, autenticado)
2. **Experiência do Visitante** — aberta via TAP/QR, sem login (web mobile)

---

## Painel Admin — Sitemap

```
/admin/tap
│
├── /dashboard
│     Visão geral: taps, doações, formulários, saúde do culto, status ProPresenter
│
├── /dispositivos
│     ├── Lista de grupos TAP por campus
│     ├── /grupos/novo
│     ├── /grupos/{id}
│     │     ├── Dispositivos do grupo
│     │     ├── Destino ativo atual
│     │     ├── Histórico de trocas
│     │     └── /dispositivos/novo
│     └── /dispositivos/{id}
│           URL gerada, QR code, localização
│
├── /destinos
│     ├── Lista de destinos da organização
│     ├── /novo
│     │     Seletor de tipo → editor específico
│     └── /{id}/editar
│
├── /agenda
│     Agendamentos de troca de destino por data/hora
│
├── /propresenter
│     Status de conexão, keywords mapeadas, log de eventos
│
├── /financeiro
│     ├── Resumo de doações
│     ├── Por fundo / período / campus
│     ├── Gift entry (lotes: aberto, conferência, fechado, reaberto, exportado)
│     ├── Reembolsos
│     └── Exportação CSV
│
└── /configuracoes
      ├── Gateway de pagamento
      ├── Fundos e categorias
      ├── Valores sugeridos de oferta
      ├── Campus
      └── Usuários e permissões
```

---

## Painel de Comunicação — Sitemap simplificado

Acesso restrito ao perfil "Comunicação". Sem dados financeiros individuais.

```
/comunicacao/tap
│
├── /destinos
│     Lista dos destinos da organização com destaque no ativo
│
├── /destinos/novo
│     Editor simplificado por tipo
│
├── /ativar
│     Seletor rápido: qual destino ativar agora em qual grupo
│
└── /agenda
      Agendamentos da semana
```

---

## Experiência do Visitante — Sitemap

```
/t/{device-id}
  → Redirect para destino ativo do grupo

/oferta/{destination-id}
  ├── Passo 1: Seleção de valor
  ├── Passo 2: Seleção de fundo (se múltiplos)
  ├── Passo 3: Método de pagamento
  │     └── Pix → exibe QR + copia-e-cola + instrução no MVP
  │
  │     Pós-MVP:
  │     ├── Cartão → formulário tokenizado pelo gateway
  │     ├── Apple Pay → confirmação nativa
  │     └── Google Pay → confirmação nativa
  └── Confirmação / recibo

/formulario/{destination-id}?tipo=visitante|oracao|decisao|celula
  ├── Formulário específico por tipo
  ├── Consentimento explícito versionado
  └── Tela de agradecimento / próximos passos

/pagina/{destination-id}
  Página própria: imagem, título, texto, botão CTA

/u/{short-url}
  URL externa configurada → redirect direto
```

---

## Detalhamento das telas principais

### T01 — Dashboard Admin

**Conteúdo:**
- Cards: taps hoje, taps este mês, total arrecadado hoje, total arrecadado este mês
- Saúde operacional: redirect p95, gateway, webhooks pendentes, fila de eventos
- Status de conexão ProPresenter (verde/vermelho + última atualização)
- Destino ativo de cada grupo (resumo visual)
- Botão "Trocar destino agora" por grupo
- Últimas 10 doações (valor, fundo, método — sem nome por padrão)
- Gráfico de taps por hora (últimas 24h)

---

### T02 — Editor de destino tipo "Página Própria"

**Painel de comunicação — interface simplificada:**

```
┌─────────────────────────────────────────┐
│  Nome interno: [__________________________]│
│                                          │
│  Imagem de capa:                         │
│  [   Arraste ou clique para carregar   ] │
│                                          │
│  Título: [________________________________]│
│  Texto: [_________________________________│
│          _________________________________│
│          _________________________________]│
│                                          │
│  Botão:                                  │
│  Texto: [Quero me inscrever______________]│
│  Link:  [https://forms.gle/..._________] │
│  Domínio detectado: forms.gle             │
│  Política: aprovado / requer aprovação    │
│                                          │
│  Keyword ProPresenter: [ECD_____________]│
│                                          │
│  [  Salvar rascunho  ]  [ Publicar ✓  ] │
└─────────────────────────────────────────┘
```

---

### T03 — Tela de oferta (visitante, mobile)

```
┌─────────────────────────────┐
│  Logo da organização        │
│                             │
│  Contribua hoje             │
│                             │
│  [ R$20 ] [ R$50 ] [R$100] │
│  [ R$200 ] [ Outro valor ] │
│                             │
│  Fundo: [Oferta ▼]         │
│                             │
│  ┌─────────────────────┐   │
│  │ 🍎 Pagar com Apple  │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ G  Pagar com Google │   │
│  └─────────────────────┘   │
│  ─────── ou ────────        │
│  ┌─────────────────────┐   │
│  │ 📱 Pagar com Pix    │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 💳 Cartão           │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

---

### T04 — Tela de Pix (visitante, mobile)

```
┌─────────────────────────────┐
│  R$ 50,00 para Oferta       │
│                             │
│  [   QR CODE 200x200   ]    │
│  Expira em 08:42            │
│                             │
│  [ 📋 Copiar código Pix ]   │
│  [ Gerar novo Pix ]         │
│                             │
│  Abra o app do seu banco,   │
│  escaneie ou cole o código. │
│                             │
│  ○ ○ ● Aguardando…         │
│                             │
│  ← Voltar | Precisa de ajuda│
└─────────────────────────────┘
```

Polling leve a cada 3s para confirmar pagamento sem reload de página.

Se o Pix expirar, o polling para e a tela oferece geração de uma nova cobrança. Webhook tardio ainda confirma a cobrança original se o gateway indicar pagamento válido.

---

### T05 — Painel ProPresenter (admin)

```
┌──────────────────────────────────────────┐
│  Integração ProPresenter                 │
│                                          │
│  Status: ● Conectado (há 2 min)          │
│  Computador: MacBook Pro — Sede          │
│  Campus: Sede | App: 1.0.3               │
│                                          │
│  [ Baixar app auxiliar ]                 │
│  [ Rotacionar token ] [ Revogar token ]  │
│  [ Ver instrução de instalação ]         │
│                                          │
│  Keywords mapeadas:                      │
│  ┌──────────────────────────────────┐   │
│  │ OFERTA    → Tela de Oferta       │   │
│  │ ECD       → Inscrição ECD        │   │
│  │ INTEGRACAO→ Form Integração      │   │
│  │ ORACAO    → Pedido de Oração     │   │
│  │ + Adicionar keyword              │   │
│  └──────────────────────────────────┘   │
│                                          │
│  Últimos eventos:                        │
│  14:32 — Keyword OFERTA detectada       │
│  14:18 — Keyword ECD detectada          │
│  14:05 — Conexão estabelecida           │
└──────────────────────────────────────────┘
```

### T06 — Formulário pastoral com consentimento

Todo formulário pastoral exibe, antes do envio:

```
┌─────────────────────────────┐
│  Pedido de oração           │
│                             │
│  [ Nome opcional ]          │
│  [ Seu pedido...        ]   │
│                             │
│  [ ] Autorizo a igreja a    │
│      tratar estes dados     │
│      para acompanhamento    │
│      pastoral.              │
│                             │
│  [ Enviar ]                 │
└─────────────────────────────┘
```

O texto do consentimento é versionado. Pedido de oração pode ser anônimo quando configurado.

### T07 — Gift Entry por lote

```
┌──────────────────────────────────────────┐
│  Lote: Culto Domingo 10h — Aberto        │
│                                          │
│  [ + Lançar doação física ]              │
│                                          │
│  Total lançado: R$ 3.420,00              │
│  Itens: 18                               │
│                                          │
│  [ Enviar para conferência ]             │
│  [ Fechar lote ]                         │
└──────────────────────────────────────────┘
```

Lote fechado só pode ser reaberto por permissão financeira e gera auditoria.
