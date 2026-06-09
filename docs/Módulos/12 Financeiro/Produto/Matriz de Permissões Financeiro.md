---
tags:
  - financeiro
  - produto
  - permissoes
---

# Matriz de Permissões Financeiro

← [[000 - Hub Financeiro]]

## Perfis iniciais

| Perfil | Ver | Criar/Editar | Aprovar/Administrar | Observações |
|--------|-----|--------------|---------------------|-------------|
| Admin da plataforma | Configuração técnica | Não por padrão | Configuração e suporte | Sem leitura sensível por padrão |
| Admin da igreja | Conforme escopo | Conforme escopo | Administração limitada | Sem acesso sensível automático |
| Coordenação do módulo | Sim | Sim | Parcial | Conforme escopo ministerial |
| Liderança autorizada | Parcial | Parcial | Não | Acesso limitado ao seu escopo |
| Usuário comum/membro | Próprio | Próprio quando aplicável | Não | Via Portal/App quando existir |

## Regras

- Permissão deve ser concedida por tenant, papel e escopo.
- Dados sensíveis precisam de permissão explícita.
- Ações administrativas devem ser auditadas.
- Relatórios agregados não devem permitir inferir dado sensível sem permissão.

## Permissões sensíveis obrigatórias

| Permissão | Quem pode receber | Observação |
|---|---|---|
| `finance.transaction.view` | Tesouraria e financeiro | Conforme centro de custo e escopo |
| `finance.donation.view_aggregate` | Pastoria/conselho autorizados | Sem identificar doador |
| `finance.donation.view_identified` | Perfil explicitamente aprovado | Dado financeiro sensível |
| `finance.expense.request` | Líder com orçamento | Não aprova a própria solicitação |
| `finance.payment.approve` | Aprovador autorizado | Segregação de função |
| `finance.payment.execute` | Tesouraria | Separado de aprovação |
| `finance.report.export` | Perfil autorizado | Exportação auditada |

Admin da igreja e admin da plataforma não recebem visão de doações individualizadas por padrão.
