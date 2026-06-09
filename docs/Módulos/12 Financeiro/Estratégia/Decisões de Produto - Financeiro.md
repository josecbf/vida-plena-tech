---
tags:
  - financeiro
  - estrategia
  - decisoes
---

# Decisões de Produto - Financeiro

← [[000 - Hub Financeiro]]

## Decisões assumidas

- O módulo nasce multi-tenant desde o início.
- Todo registro relevante precisa de responsável, data e origem.
- Pessoas é a fonte canônica para identidade.
- Permissões devem considerar papel, escopo e sensibilidade da informação.
- Integrações internas devem acontecer por vínculos claros, não por cópia de dados.
- Relatórios devem responder perguntas operacionais reais antes de BI avançado.

## Decisões específicas

- Capacidades v1 priorizadas: Receitas, Despesas, Centros de custo, Contas.
- Integrações prioritárias: Pessoas, Eventos, Compras, Estoque WMS.
- Métricas iniciais: Conciliação em dia, Despesas por centro, Receitas por categoria.

## Decisões abertas

- Quais igrejas piloto validam este módulo primeiro?
- Quais campos são obrigatórios na implantação?
- Quais relatórios precisam existir antes do desenvolvimento?
- Quais integrações externas ficam fora da primeira versão?
