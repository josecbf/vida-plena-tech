---
tags:
  - compras
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Compras

← [[000 - Hub Compras]]

## Áreas funcionais

### Configuração

Define parâmetros, categorias, papéis, status e padrões do módulo.

### Operação

Concentra os fluxos diários: Requisição, Cotação, Aprovação, Pedido, Recebimento.

### Acompanhamento

Permite ver pendências, histórico, indicadores e alertas operacionais.

### Relatórios

Resume métricas como Requisições por status, Tempo de aprovação, Economia em cotações, Pedidos recebidos, Pendências financeiras.

## Fluxo macro

```text
Configuração inicial
→ cadastro ou solicitação
→ vínculo com Pessoas e escopos
→ execução do fluxo principal
→ registro de histórico
→ relatório e acompanhamento
```

## Integrações internas

- Pessoas
- Financeiro
- Estoque WMS
- Eventos
- Ministérios
