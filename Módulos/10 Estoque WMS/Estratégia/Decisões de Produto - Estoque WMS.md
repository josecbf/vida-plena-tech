---
tags:
  - estoque-wms
  - estrategia
  - decisoes
---

# Decisões de Produto - Estoque WMS

← [[000 - Hub Estoque WMS]]

## Decisões assumidas

- O módulo nasce multi-tenant desde o início.
- Todo registro relevante precisa de responsável, data e origem.
- Pessoas é a fonte canônica para identidade.
- Permissões devem considerar papel, escopo e sensibilidade da informação.
- Integrações internas devem acontecer por vínculos claros, não por cópia de dados.
- Relatórios devem responder perguntas operacionais reais antes de BI avançado.

## Decisões específicas

- Capacidades v1 priorizadas: Cadastro de itens, Locais, Entradas e saídas, Reservas.
- Integrações prioritárias: Compras, Financeiro, Eventos, Ministérios.
- Métricas iniciais: Rupturas, Divergências, Itens abaixo do mínimo.

## Decisões abertas

- Quais igrejas piloto validam este módulo primeiro?
- Quais campos são obrigatórios na implantação?
- Quais relatórios precisam existir antes do desenvolvimento?
- Quais integrações externas ficam fora da primeira versão?
