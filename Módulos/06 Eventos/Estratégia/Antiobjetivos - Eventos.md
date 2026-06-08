---
tags:
  - eventos
  - estrategia
  - antiobjetivos
---

# Antiobjetivos - Eventos

← [[000 - Hub Eventos]]

## O que o módulo não deve ser

- Não duplicar cadastro de pessoas
- Não processar pagamento sem conciliação
- Não ignorar capacidade de espaço

## Limites de produto

- Não duplicar cadastro que já pertence ao módulo Pessoas.
- Não virar uma coleção de campos soltos sem fluxo de trabalho.
- Não criar permissões próprias desconectadas do modelo global.
- Não esconder decisões importantes em observações sem auditoria.
- Não tentar resolver todos os casos futuros na primeira versão.

## Sinal de alerta

Se o módulo começar a funcionar isolado, com usuários, cadastros, relatórios e permissões próprias, ele deixou de ser parte da Plataforma-Igrejas e virou outro produto.
