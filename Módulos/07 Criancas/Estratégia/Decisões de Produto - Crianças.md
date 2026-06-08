---
tags:
  - criancas
  - estrategia
  - decisoes
---

# Decisões de Produto - Crianças

← [[000 - Hub Crianças]]

## Decisões assumidas

- O módulo nasce multi-tenant desde o início.
- Todo registro relevante precisa de responsável, data e origem.
- Pessoas é a fonte canônica para identidade.
- Permissões devem considerar papel, escopo e sensibilidade da informação.
- Integrações internas devem acontecer por vínculos claros, não por cópia de dados.
- Relatórios devem responder perguntas operacionais reais antes de BI avançado.

## Decisões específicas

- Capacidades v1 priorizadas: Cadastro da criança, Responsáveis autorizados, Check-in e checkout, Salas e faixas etárias.
- Integrações prioritárias: Pessoas, Eventos, Cultos, Voluntários.
- Métricas iniciais: Crianças com responsável válido, Checkouts seguros, Alertas revisados.

## Decisões abertas

- Quais igrejas piloto validam este módulo primeiro?
- Quais campos são obrigatórios na implantação?
- Quais relatórios precisam existir antes do desenvolvimento?
- Quais integrações externas ficam fora da primeira versão?
