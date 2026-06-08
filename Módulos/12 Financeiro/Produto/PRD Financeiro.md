---
tags:
  - financeiro
  - produto
  - prd
---

# PRD Financeiro

← [[000 - Hub Financeiro]]

## 1. Resumo executivo

Financeiro deve entregar uma experiência clara para Tesouraria, Financeiro, Pastoria autorizada, Líder com orçamento, Conselho. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

A igreja precisa de transparência e controle financeiro sem expor dados sensíveis ou depender de controles paralelos.

## 3. Tese do produto

Consolidar receitas, despesas, centros de custo, conciliação e relatórios com governança.

## 4. Perfis de usuário

### Tesouraria

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Financeiro dentro do seu escopo de responsabilidade.

### Financeiro

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Financeiro dentro do seu escopo de responsabilidade.

### Pastoria autorizada

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Financeiro dentro do seu escopo de responsabilidade.

### Líder com orçamento

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Financeiro dentro do seu escopo de responsabilidade.

### Conselho

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Financeiro dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Receitas
- Despesas
- Centros de custo
- Contas
- Conciliação
- Orçamento
- Relatórios
- Aprovações

### Financeiro eclesiástico brasileiro

A v1 deve modelar a realidade da igreja no Brasil:

- dízimos;
- ofertas;
- campanhas;
- missões;
- ação social;
- eventos pagos;
- PIX;
- dinheiro;
- cartão;
- boleto quando aplicável;
- envelopes e comprovantes;
- conciliação por extrato, comprovante PIX e lançamento manual.

### Prestação de contas

Relatórios essenciais:

- entradas por categoria e período;
- despesas por centro de custo;
- realizado versus orçado;
- pendências de aprovação;
- campanhas com saldo e destino;
- visão agregada para membros quando a igreja optar por transparência pública;
- visão restrita para doações individualizadas.

### Segregação de funções

O sistema deve evitar que a mesma pessoa solicite, aprove, pague e concilie uma despesa sem regra explícita.

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
- Doação individualizada é dado financeiro sensível.
- Nem todo pastor, admin ou tesoureiro deve ver doador identificado por padrão.
- Aprovação, pagamento, cancelamento e exportação precisam de auditoria forte.
- Reembolso precisa de comprovante, centro de custo e aprovador.

## 8. Métricas de sucesso

- Conciliação em dia
- Despesas por centro
- Receitas por categoria
- Pendências de aprovação
- Orçamento realizado
