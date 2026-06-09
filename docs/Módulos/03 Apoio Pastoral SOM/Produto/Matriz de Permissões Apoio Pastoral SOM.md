---
tags:
  - apoio-pastoral-som
  - produto
  - permissoes
---

# Matriz de Permissões Apoio Pastoral SOM

← [[000 - Hub Apoio Pastoral SOM]]

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
| `som.signal.view` | Liderança no escopo | Sinal explicável, sem nota confidencial |
| `som.case.open` | Coordenação pastoral | Abre caso com tipo e prioridade |
| `som.case.view_assigned` | Responsável pelo caso | Apenas casos atribuídos |
| `som.case.view_confidential` | Pastoria autorizada | Exige auditoria de leitura |
| `som.case.assign` | Coordenação pastoral | Encaminhamento rastreável |
| `som.ai.briefing.generate` | Usuário autorizado | Usa mínimo contexto necessário |

Admin da igreja não deve ver casos confidenciais apenas por ser admin.
