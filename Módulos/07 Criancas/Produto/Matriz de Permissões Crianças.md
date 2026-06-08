---
tags:
  - criancas
  - produto
  - permissoes
---

# Matriz de Permissões Crianças

← [[000 - Hub Crianças]]

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
| `kids.child.view_basic` | Coordenação, voluntário da sala | Dados mínimos para operação |
| `kids.child.view_health` | Coordenação e voluntário autorizado | Alergias e restrições médicas |
| `kids.guardian.manage` | Coordenação e secretaria autorizada | Responsáveis e autorizações |
| `kids.checkout.perform` | Voluntário autorizado no contexto | Exige sessão ativa e código/etiqueta |
| `kids.checkout.override` | Coordenação | Exige motivo e auditoria forte |
| `kids.incident.view` | Coordenação e liderança autorizada | Dado sensível de menor |

Admin da igreja e admin da plataforma não recebem essas permissões automaticamente.
