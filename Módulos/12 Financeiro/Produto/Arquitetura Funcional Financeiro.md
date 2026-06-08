---
tags:
  - financeiro
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Financeiro

← [[000 - Hub Financeiro]]

## Áreas funcionais

### Configuração

Define parâmetros, categorias, papéis, status e padrões do módulo.

### Operação

Concentra os fluxos diários: Receitas, Despesas, Centros de custo, Contas, Conciliação.

### Acompanhamento

Permite ver pendências, histórico, indicadores e alertas operacionais.

### Relatórios

Resume métricas como Conciliação em dia, Despesas por centro, Receitas por categoria, Pendências de aprovação, Orçamento realizado.

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
- Eventos
- Compras
- Estoque WMS
- Portal/App
- BI
