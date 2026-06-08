---
tags:
  - plataforma-igrejas
  - ensino
  - produto
  - permissoes
---

# Matriz de Permissões Ensino

← [[000 - Hub Ensino]]

---

## Papéis principais

| Papel | Descrição |
|------|-----------|
| Aluno | Consome cursos e acompanha a própria jornada |
| Líder | Acompanha alunos sob seu cuidado |
| Supervisor/Pastor | Acompanha visão ampliada por escopo |
| Criador de conteúdo | Cria e edita cursos em rascunho |
| Admin de ensino | Publica, configura jornadas, gerencia turmas e libera exceções |
| Admin global | Configura módulo, papéis, integrações e políticas |
| Financeiro | Visualiza dados necessários para cursos pagos |

---

## Permissões funcionais

| Ação | Aluno | Líder | Supervisor | Criador | Admin ensino | Admin global |
|------|-------|-------|------------|---------|--------------|--------------|
| Ver própria jornada | Sim | Não | Não | Não | Sim | Sim |
| Ver liderados | Não | Escopo | Escopo ampliado | Não | Sim | Sim |
| Criar curso | Não | Não | Não | Sim | Sim | Sim |
| Publicar curso | Não | Não | Não | Não | Sim | Sim |
| Criar jornada | Não | Não | Não | Não | Sim | Sim |
| Editar pré-requisitos | Não | Não | Não | Não | Sim | Sim |
| Registrar presença em turma | Não | Escopo | Escopo | Não | Sim | Sim |
| Liberar etapa manualmente | Não | Não | Opcional | Não | Sim | Sim |
| Emitir certificados | Próprio | Escopo | Escopo | Não | Sim | Sim |
| Ver relatórios | Próprio | Escopo | Escopo ampliado | Não | Sim | Sim |
| Configurar integrações | Não | Não | Não | Não | Não | Sim |

---

## Regras de segurança

- Toda permissão deve ser validada no backend.
- Permissões de acompanhamento dependem de escopo, não apenas de papel.
- Liberações manuais exigem justificativa.
- Dados de alunos não devem ser visíveis para líderes fora do vínculo autorizado.
- Relatórios exportáveis precisam respeitar escopo e LGPD.
- Criador de conteúdo não publica sozinho, salvo decisão explícita do tenant.
