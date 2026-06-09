---
tags:
  - equipamentos-tecnicos
  - estrategia
  - decisoes
---

# Decisões de Produto - Equipamentos Técnicos

← [[000 - Hub Equipamentos Técnicos]]

## Decisões assumidas

- O módulo nasce multi-tenant desde o início.
- Todo registro relevante precisa de responsável, data e origem.
- Pessoas é a fonte canônica para identidade.
- Permissões devem considerar papel, escopo e sensibilidade da informação.
- Integrações internas devem acontecer por vínculos claros, não por cópia de dados.
- Relatórios devem responder perguntas operacionais reais antes de BI avançado.

## Decisões específicas

- Capacidades v1 priorizadas: Cadastro de equipamentos, Kits, Reservas, Manutenções.
- Integrações prioritárias: Cultos, Eventos, Espaços e Recursos, Compras.
- Métricas iniciais: Equipamentos indisponíveis, Manutenções abertas, Reservas por período.

## Decisões abertas

- Quais igrejas piloto validam este módulo primeiro?
- Quais campos são obrigatórios na implantação?
- Quais relatórios precisam existir antes do desenvolvimento?
- Quais integrações externas ficam fora da primeira versão?
