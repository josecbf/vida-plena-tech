---
tags:
  - eventos
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Eventos

← [[000 - Hub Eventos]]

## Áreas funcionais

### Configuração

Define parâmetros, categorias, papéis, status e padrões do módulo.

### Operação

Concentra os fluxos diários: Cadastro de evento, Lotes e inscrições, Formulários, Pagamentos, Check-in.

### Acompanhamento

Permite ver pendências, histórico, indicadores e alertas operacionais.

### Relatórios

Resume métricas como Inscrições confirmadas, Taxa de check-in, Pagamentos pendentes, Capacidade ocupada, No-show.

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
- Comunicação
- Espaços e Recursos
- Voluntários
- Portal/App
