---
tags:
  - criancas
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Crianças

← [[000 - Hub Crianças]]

## Áreas funcionais

### Configuração

Define parâmetros, categorias, papéis, status e padrões do módulo.

### Operação

Concentra os fluxos diários: Cadastro da criança, Responsáveis autorizados, Check-in e checkout, Salas e faixas etárias, Alertas.

### Acompanhamento

Permite ver pendências, histórico, indicadores e alertas operacionais.

### Relatórios

Resume métricas como Crianças com responsável válido, Checkouts seguros, Alertas revisados, Voluntários por sala, Tempo de fila.

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
- Cultos
- Voluntários
- Comunicação
- Portal/App
