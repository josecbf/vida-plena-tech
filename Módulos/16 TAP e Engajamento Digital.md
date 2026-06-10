---
tags:
  - modulo
  - tap
  - engajamento
  - ofertas-digitais
---

# Módulo 16 — TAP e Engajamento Digital

Planejamento detalhado: [[000 - Hub TAP e Engajamento Digital]]

## Resumo

Transformar cada toque de celular numa ação intencional — oferta, inscrição, pedido de oração ou conexão — sem app, sem login, sincronizado com o que acontece no palco.

TAP é um facilitador de inscrições e doações. No escopo atual, ele não é fonte de cadastro de pessoas ou visitantes.

## Problema

A igreja perde dezenas de momentos de engajamento em cada culto porque o caminho entre a intenção e a ação exige passos demais: abrir app do banco, localizar leitor QR, digitar valor, confirmar. Quando o processo é lento, a pessoa desiste.

## Capacidades v1

- Dispositivos TAP (NFC) com redirecionamento dinâmico
- Destinos configuráveis: oferta, formulário pastoral, URL externa, página própria
- Fluxo de oferta digital com Pix dinâmico no MVP comercial
- Cartão, Apple Pay e Google Pay em fases posteriores por feature flag
- Painel simplificado para equipe de comunicação (sem código)
- Integração com ProPresenter via keywords em notas de slide após piloto Pix estável
- Agendamento de trocas de destino por horário
- Fundos e categorias de doação configuráveis
- Formulários pastorais: visitante, oração, batismo, célula
- Gift entry para doações físicas (dinheiro, cheque, Pix externo)
- Dashboard de engajamento e receitas
- Consentimento LGPD versionado e auditoria para dados sensíveis
- Contrato explícito com Financeiro para eventos de doação e Gift Entry
- Integração com Pessoas apenas em fase futura, após contrato próprio

## Conexões

- Financeiro
- Eventos
- Comunicação
- Grupos de Crescimento
- Pessoas (futuro)
- Core Platform (multi-tenant, campus, permissões)

## Guardrails

- Não processar dinheiro diretamente — usar gateway da própria organização
- Não exigir app ou login para dar ou se conectar
- Não duplicar módulo Financeiro — integrar via eventos de domínio
- Não armazenar dados de cartão — delegar integralmente ao gateway
- Não criar cadastro de pessoa ou visitante no escopo atual
- Não iniciar codificação antes de resolver contratos, permissões e invariantes do módulo
