---
tags:
  - compras
  - produto
  - prd
---

# PRD Compras

← [[000 - Hub Compras]]

## 1. Resumo executivo

Compras deve entregar uma experiência clara para Solicitante, Aprovador, Compras, Financeiro, Recebedor. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

Compras sem fluxo claro geram retrabalho, falta de aprovação, notas perdidas e dificuldade de prestação de contas.

## 3. Tese do produto

Organizar requisições, cotações, aprovações, pedidos, recebimento e vínculo financeiro.

## 4. Perfis de usuário

### Solicitante

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Compras dentro do seu escopo de responsabilidade.

### Aprovador

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Compras dentro do seu escopo de responsabilidade.

### Compras

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Compras dentro do seu escopo de responsabilidade.

### Financeiro

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Compras dentro do seu escopo de responsabilidade.

### Recebedor

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Compras dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Requisição
- Cotação
- Aprovação
- Pedido
- Recebimento
- Fornecedor
- Anexos
- Status

## 6. Fora da v1

- Automações avançadas sem validação humana.
- Integrações externas complexas antes de estabilizar o domínio.
- App nativo dedicado apenas para este módulo.
- Relatórios executivos avançados antes dos relatórios operacionais.
- Customização profunda por igreja antes do padrão funcionar bem.

## 7. Regras de negócio essenciais

- Todo registro pertence a um tenant.
- Usuários só veem dados dentro do escopo permitido.
- Alterações relevantes geram auditoria.
- Cadastros de pessoa devem apontar para o módulo Pessoas.
- Ações críticas precisam de responsável claro.
- Dados históricos não devem ser apagados sem política de retenção.

## 8. Métricas de sucesso

- Requisições por status
- Tempo de aprovação
- Economia em cotações
- Pedidos recebidos
- Pendências financeiras
