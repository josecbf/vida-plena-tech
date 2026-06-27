---
tags:
  - espacos-recursos
  - produto
  - permissoes
---

# Matriz de Permissões Espaços e Recursos

← [[000 - Hub Espaços e Recursos]]

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
