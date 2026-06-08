---
tags:
  - pessoas
  - produto
  - permissoes
---

# Matriz de Permissões Pessoas

← [[000 - Hub Pessoas]]

---

## Perfis iniciais

| Perfil | Descrição |
|--------|-----------|
| Admin da plataforma | Configura o módulo no tenant |
| Secretaria | Opera cadastro e manutenção |
| Pastor | Consulta contexto pastoral amplo conforme escopo |
| Líder | Consulta pessoas sob sua responsabilidade |
| Líder de ministério | Consulta pessoas vinculadas ao ministério |
| Comunicação | Usa segmentos autorizados e consentimentos |
| Auditor | Consulta histórico de alterações |

---

## Permissões funcionais

| Ação | Admin | Secretaria | Pastor | Líder | Ministério | Comunicação | Auditor |
|------|-------|------------|--------|-------|------------|-------------|---------|
| Ver lista de pessoas | Sim | Sim | Escopo | Escopo | Escopo | Segmentos | Não |
| Criar pessoa | Sim | Sim | Não | Não | Não | Não | Não |
| Editar dados básicos | Sim | Sim | Restrito | Não | Não | Não | Não |
| Editar contatos | Sim | Sim | Restrito | Não | Não | Não | Não |
| Ver família | Sim | Sim | Escopo | Escopo | Escopo | Não | Não |
| Editar família | Sim | Sim | Não | Não | Não | Não | Não |
| Ver timeline comum | Sim | Sim | Escopo | Escopo | Escopo | Não | Não |
| Ver timeline sensível | Sim | Não | Escopo especial | Não | Não | Não | Não |
| Gerenciar consentimentos | Sim | Sim | Não | Não | Não | Não | Não |
| Usar segmentos | Sim | Sim | Escopo | Escopo | Escopo | Sim | Não |
| Exportar dados | Sim | Restrito | Não | Não | Não | Restrito | Não |
| Ver auditoria | Sim | Não | Não | Não | Não | Não | Sim |

---

## Princípios

- Permissão deve ser verificada no backend.
- Escopo é tão importante quanto papel.
- Dados de crianças exigem regra específica.
- Exportação deve ser tratada como ação sensível.
- Timeline sensível não pode aparecer por acidente em visões genéricas.

