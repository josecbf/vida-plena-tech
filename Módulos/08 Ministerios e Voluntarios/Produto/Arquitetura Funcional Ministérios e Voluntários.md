---
tags:
  - ministerios-voluntarios
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Ministérios e Voluntários

← [[000 - Hub Ministérios e Voluntários]]

## Áreas funcionais

### Configuração

Define parâmetros, categorias, papéis, status e padrões do módulo.

### Operação

Concentra os fluxos diários: Cadastro de ministérios, Equipes, Voluntários, Requisitos, Disponibilidade.

### Acompanhamento

Permite ver pendências, histórico, indicadores e alertas operacionais.

### Relatórios

Resume métricas como Escalas preenchidas, Confirmações, Voluntários ativos, Requisitos pendentes, Sobrecarga por pessoa.

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
- Cultos
- Eventos
- Ensino
- Comunicação
- Portal/App
