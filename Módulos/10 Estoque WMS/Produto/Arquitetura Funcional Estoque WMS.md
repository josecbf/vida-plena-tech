---
tags:
  - estoque-wms
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Estoque WMS

← [[000 - Hub Estoque WMS]]

## Áreas funcionais

### Configuração

Define parâmetros, categorias, papéis, status e padrões do módulo.

### Operação

Concentra os fluxos diários: Cadastro de itens, Locais, Entradas e saídas, Reservas, Inventário.

### Acompanhamento

Permite ver pendências, histórico, indicadores e alertas operacionais.

### Relatórios

Resume métricas como Rupturas, Divergências, Itens abaixo do mínimo, Tempo de atendimento, Consumo por centro.

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

- Compras
- Financeiro
- Eventos
- Ministérios
- Espaços e Recursos
