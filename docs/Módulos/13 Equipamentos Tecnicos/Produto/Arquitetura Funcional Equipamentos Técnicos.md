---
tags:
  - equipamentos-tecnicos
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Equipamentos Técnicos

← [[000 - Hub Equipamentos Técnicos]]

## Áreas funcionais

### Configuração

Define parâmetros, categorias, papéis, status e padrões do módulo.

### Operação

Concentra os fluxos diários: Cadastro de equipamentos, Kits, Reservas, Manutenções, Responsáveis.

### Acompanhamento

Permite ver pendências, histórico, indicadores e alertas operacionais.

### Relatórios

Resume métricas como Equipamentos indisponíveis, Manutenções abertas, Reservas por período, Ocorrências recorrentes, Custo de manutenção.

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

- Cultos
- Eventos
- Espaços e Recursos
- Compras
- Estoque WMS
- Pessoas
