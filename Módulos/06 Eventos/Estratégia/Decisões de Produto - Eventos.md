---
tags:
  - eventos
  - estrategia
  - decisoes
---

# Decisões de Produto - Eventos

← [[000 - Hub Eventos]]

## Decisões assumidas

- O módulo nasce multi-tenant desde o início.
- Todo registro relevante precisa de responsável, data e origem.
- Pessoas é a fonte canônica para identidade.
- Permissões devem considerar papel, escopo e sensibilidade da informação.
- Integrações internas devem acontecer por vínculos claros, não por cópia de dados.
- Relatórios devem responder perguntas operacionais reais antes de BI avançado.

## Decisões específicas

- Capacidades v1 priorizadas: Cadastro de evento, Lotes e inscrições, Formulários, Pagamentos.
- Integrações prioritárias: Pessoas, Financeiro, Comunicação, Espaços e Recursos.
- Métricas iniciais: Inscrições confirmadas, Taxa de check-in, Pagamentos pendentes.

## Decisões abertas

- Quais igrejas piloto validam este módulo primeiro?
- Quais campos são obrigatórios na implantação?
- Quais relatórios precisam existir antes do desenvolvimento?
- Quais integrações externas ficam fora da primeira versão?
