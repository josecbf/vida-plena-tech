---
tags:
  - estoque-wms
  - produto
  - prd
---

# PRD Estoque WMS

← [[000 - Hub Estoque WMS]]

## 1. Resumo executivo

Estoque WMS deve entregar uma experiência clara para Almoxarifado, Compras, Financeiro, Líder de ministério, Organizador de evento. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

Materiais somem ou acabam sem aviso quando não há rastreabilidade de estoque, responsáveis e consumo.

## 3. Tese do produto

Controlar itens, almoxarifado, entradas, saídas, reservas, inventário e consumo por ministério ou evento.

## 4. Perfis de usuário

### Almoxarifado

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Estoque WMS dentro do seu escopo de responsabilidade.

### Compras

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Estoque WMS dentro do seu escopo de responsabilidade.

### Financeiro

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Estoque WMS dentro do seu escopo de responsabilidade.

### Líder de ministério

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Estoque WMS dentro do seu escopo de responsabilidade.

### Organizador de evento

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Estoque WMS dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Cadastro de itens
- Locais
- Entradas e saídas
- Reservas
- Inventário
- Níveis mínimos
- Solicitações
- Relatórios

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

- Rupturas
- Divergências
- Itens abaixo do mínimo
- Tempo de atendimento
- Consumo por centro
