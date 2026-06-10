---
tags:
  - plataforma-igrejas
  - modulo
  - tap
  - engajamento
  - hub
---

# Módulo TAP e Engajamento Digital
## Hub do módulo

> Transformar cada toque de celular numa ação intencional: oferta, inscrição, oração ou conexão — tudo sem app, sem login e sincronizado com o que acontece no palco.

---

## Papel na plataforma

TAP e Engajamento Digital é o módulo de presença física e engajamento em tempo real da Plataforma-Igrejas. Enquanto os demais módulos gerenciam dados e processos internos, este é a interface com o visitante e o membro durante o culto e eventos presenciais.

Conecta dispositivos físicos NFC a destinos digitais configuráveis, com capacidade de trocar esses destinos em tempo real via integração com ProPresenter ou controle manual — sem reprogramar nenhuma moeda física.

Este módulo não substitui o módulo Financeiro. Ele captura a intenção e o pagamento digital; o Financeiro consolida, categoriza e presta contas. A comunicação entre os dois se dá por eventos de domínio.

---

## Mapa do módulo

### Estratégia

| Nota | Descrição |
|------|-----------|
| [[Visão e Proposta de Valor - TAP e Engajamento Digital]] | O que o módulo resolve e por que importa |
| [[Antiobjetivos - TAP e Engajamento Digital]] | O que não deve entrar no módulo |
| [[Decisões de Produto - TAP e Engajamento Digital]] | Decisões assumidas para evitar retrabalho |
| [[Riscos do Módulo - TAP e Engajamento Digital]] | Riscos pastorais, operacionais e técnicos |

### Produto

| Nota | Descrição |
|------|-----------|
| [[PRD TAP e Engajamento Digital]] | Documento mestre do módulo |
| [[Arquitetura Funcional TAP e Engajamento Digital]] | Áreas, fluxos e capacidades funcionais |
| [[Sitemap e Mapa de Telas TAP e Engajamento Digital]] | Telas, navegação e experiência |
| [[Backlog Inicial TAP e Engajamento Digital]] | Épicos e histórias iniciais |
| [[Matriz de Permissões TAP e Engajamento Digital]] | Quem pode ver, editar e administrar dados |

### Técnico

| Nota | Descrição |
|------|-----------|
| [[Modelo Conceitual de Entidades TAP e Engajamento Digital]] | Vocabulário e relações do domínio |
| [[Backlog Técnico TAP e Engajamento Digital]] | Frentes técnicas do módulo |
| [[Decisões e Riscos Técnicos TAP e Engajamento Digital]] | ADRs e riscos de arquitetura |
| [[Plano de Trabalho TAP e Engajamento Digital]] | Sequência sugerida de execução |

---

## Capacidades principais

- Dispositivos TAP (NFC) com redirecionamento dinâmico — a moeda nunca muda, o destino sim
- Destinos configuráveis: oferta digital, formulário pastoral, URL externa, página própria com imagem
- Fluxo de oferta MVP: Pix com QR dinâmico, TTL, webhook idempotente e recibo
- Cartão, Apple Pay e Google Pay como evolução pós-MVP
- Painel de comunicação sem código — upload de imagem, título, link do formulário, salvar
- Integração ProPresenter — keyword na nota do slide troca destino automaticamente após app assinado, token por campus e piloto validado
- Agendamento de trocas por horário (set it and forget it)
- Multi-campus e multi-grupo de TAP por organização
- Fundos e categorias de doação configuráveis (dízimo, oferta, missões, construção etc.)
- Formulários pastorais embutidos: cartão de visitante, pedido de oração, decisão por Jesus, inscrição em célula
- Gift entry — lançamento manual de doações físicas (dinheiro, cheque, Pix fora da plataforma)
- Gateway abstrato — MVP com Mercado Pago/Pix; Stripe e Asaas em fases posteriores
- Dashboard de engajamento: taps por grupo, destino mais acessado, doações por fundo, por período
- Contratos de domínio com Financeiro e Pessoas
- Consentimento LGPD e auditoria para dados sensíveis

---

## Conexões externas

| Módulo | Como se conecta |
|--------|----------------|
| Pessoas | Identifica doador recorrente; vincula formulário pastoral a pessoa existente |
| Financeiro | Emite evento de doação confirmada para consolidação e prestação de contas |
| Eventos | Destino de inscrição de evento gerenciado pelo módulo Eventos |
| Comunicação | Dispara confirmação de doação e recibo automático |
| Grupos de Crescimento | Destino de inscrição em célula gerenciado pelo módulo GCs |
| Core Platform | Multi-tenant, campus, usuários, permissões, billing, feature flags |

---

## Estado atual

| Dimensão | Status |
|----------|--------|
| Estratégia | Revisada pós-stress-test |
| PRD | Corrigido com MVP comercial e guardrails |
| Arquitetura funcional | Corrigida com contratos, segurança e observabilidade |
| Sitemap | Corrigido com consentimento, Pix TTL e Gift Entry por lote |
| Permissões | Corrigida com dados pastorais/financeiros sensíveis |
| Modelo de entidades | Corrigido com invariantes, idempotência e LGPD |
| Backlog técnico | Corrigido com tarefas de segurança, contratos e observabilidade |
| Plano de trabalho | Corrigido com Fase 0 e MVP comercial claro |

## Próximo gate

Antes de codar, executar o checklist do stress test em [[Stress Test - TAP e Engajamento Digital]] e garantir que os contratos com Financeiro e Pessoas foram aceitos pelos respectivos módulos.
