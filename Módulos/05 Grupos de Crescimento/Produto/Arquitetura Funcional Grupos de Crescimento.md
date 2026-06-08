---
tags:
  - grupos-crescimento
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Grupos de Crescimento

← [[000 - Hub Grupos de Crescimento]]

## Áreas funcionais

### Configuração

Define parâmetros, categorias, papéis, status e padrões do módulo.

### Operação

Concentra os fluxos diários: Cadastro de grupos, Participantes, Liderança, Reuniões, Frequência.

### Acompanhamento

Permite ver pendências, histórico, indicadores e alertas operacionais.

### Relatórios

Resume métricas como Frequência média, Pessoas sem grupo, Grupos sem reunião recente, Líderes ativos, Encaminhamentos concluídos.

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
- SOM
- Ensino
- Eventos
- Comunicação
- Portal/App
