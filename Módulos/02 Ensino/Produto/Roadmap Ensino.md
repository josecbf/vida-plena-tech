---
tags:
  - plataforma-igrejas
  - ensino
  - produto
  - roadmap
atualizado: 2026-06-08
---

# Roadmap — Módulo Ensino

← [000 - Hub Ensino](../000%20-%20Hub%20Ensino.md)

---

## Estado atual da documentação

| Documento | Estado |
|---|---|
| Visão e Proposta de Valor | Consolidado |
| Antiobjetivos | Consolidado |
| Decisões de Produto | Rascunho |
| Riscos do Módulo | Rascunho |
| PRD | Rascunho estruturado |
| Arquitetura Funcional | Rascunho estruturado |
| Sitemap e Mapa de Telas | Rascunho estruturado |
| Backlog Inicial | Rascunho estruturado |
| Matriz de Permissões | Rascunho estruturado |
| Modelo Conceitual de Entidades | Rascunho estruturado |
| Backlog Técnico | Rascunho estruturado |
| Decisões e Riscos Técnicos | Rascunho estruturado |
| Plano de Trabalho | Rascunho estruturado |
| **Roadmap** | **Este documento** |

---

## Dependência crítica

> O módulo Ensino depende do módulo **Pessoas** estar consolidado.
> Nenhuma fase de implementação começa sem o contrato de identidade, vínculos e escopos do módulo Pessoas fechado.

---

## Fase 0 — Documentação pronta para execução

**Objetivo:** levar todos os rascunhos ao estado "pronto para implementar" — sem ambiguidades, sem lacunas, sem decisões adiadas.

Esta fase acontece **neste repositório**, antes de qualquer linha de código.

### 0.1 Fechar o PRD

- Detalhar todos os perfis com exemplos reais de uso
- Confirmar escopo do MVP com o Agente Humano
- Remover itens indefinidos ou marcá-los explicitamente como fora do MVP

### 0.2 Refinar o modelo de entidades

- Validar cada entidade contra o modelo canônico em `Técnico/Modelo de Dados Canonico.md`
- Confirmar os campos obrigatórios de cada entidade
- Definir quais entidades pertencem ao Core vs. ao módulo Ensino
- Fechar nomes canônicos (sem sinônimos soltos na documentação)

### 0.3 Fechar a matriz de permissões

- Cruzar cada papel (aluno, líder, supervisor, criador, admin) com cada ação
- Confirmar escopos (tenant, escopo pastoral, turma)
- Validar contra `Técnico/Permissoes Tenancy e Escopos.md`

### 0.4 Detalhar o backlog P0

- Quebrar cada épico P0 em histórias pequenas e independentes
- Escrever critérios de aceitação verificáveis para cada história
- Mapear dependências entre histórias
- Separar histórias de produto de tarefas técnicas

### 0.5 Validar integrações obrigatórias do MVP

- Confirmar com os responsáveis quais contratos do módulo Pessoas já estão fechados
- Documentar quais eventos do módulo Comunicação o Ensino precisa disparar
- Confirmar se Eventos precisa estar pronto para as turmas presenciais do MVP

### 0.6 Revisar arquitetura funcional e sitemap

- Validar os fluxos principais contra o PRD fechado
- Confirmar telas mínimas com o Product Designer
- Eliminar telas que não são P0

---

## Fase 1 — MVP: Cursos e Progresso

**Objetivo:** uma pessoa consegue se inscrever em um curso, consumir lições e ter o progresso registrado. Um líder consegue acompanhar.

**Pré-requisito:** módulo Pessoas consolidado. Fase 0 concluída.

### Escopo

| Épico | Descrição |
|---|---|
| Ativação do módulo | Admin ativa Ensino para o tenant e configura parâmetros básicos |
| Catálogo de cursos | Criador cria curso com módulos, lições e materiais (vídeo, texto, PDF, link) |
| Publicação | Admin publica ou arquiva cursos |
| Inscrição | Aluno se inscreve em curso disponível |
| Progresso | Sistema registra progresso por lição; curso concluído quando todas as lições são concluídas |
| Acompanhamento básico | Líder vê lista de liderados com progresso por curso |
| Permissões | Isolamento por tenant; restrições por papel |
| Auditoria mínima | Toda conclusão registra timestamp e fonte |

### O que fica fora da Fase 1

- Jornadas configuráveis
- Pré-requisitos
- Turmas presenciais
- Certificados
- Notificações automáticas
- Cursos pagos

---

## Fase 2 — Jornada Configurável e Pré-requisitos

**Objetivo:** a igreja consegue definir sua Jornada do Discípulo com etapas ordenadas, pré-requisitos e acompanhamento de progresso na trilha.

**Pré-requisito:** Fase 1 estável em produção.

### Escopo

| Épico | Descrição |
|---|---|
| Criação de jornadas | Admin cria jornada com etapas ordenadas |
| Tipos de etapa | Etapa pode ser: curso digital, turma presencial, validação externa, liberação manual |
| Motor de pré-requisitos | Sistema avalia pré-requisitos antes de liberar etapa |
| Explicação de bloqueio | Aluno entende por que uma etapa está bloqueada |
| Liberação manual auditada | Admin libera etapa com registro de responsável, data e justificativa |
| Visão da jornada | Aluno vê sua posição atual e próximo passo |
| Acompanhamento por jornada | Líder vê progresso dos liderados na jornada, incluindo pessoas travadas |

### O que fica fora da Fase 2

- Certificados
- Turmas presenciais completas (só como tipo de etapa referenciado)
- Notificações automáticas
- Cursos pagos

---

## Fase 3 — Formação Completa

**Objetivo:** fechar o ciclo formativo — presença, certificado e comunicação integrados.

**Pré-requisito:** Fase 2 estável. Módulo Comunicação disponível.

### Escopo

| Épico | Descrição |
|---|---|
| Turmas presenciais | Admin cria turma, define sessões, registra presença |
| Certificados simples | Sistema emite certificado após conclusão oficial; template configurável |
| Notificações | Lembretes de início, alertas de atraso, confirmação de conclusão |
| Cursos livres | Aluno acessa cursos fora de qualquer jornada |
| Relatórios essenciais | Visão geral, conclusões, travas, certificados emitidos, turmas e presença |

---

## Fase 4 — Inteligência e Escala

**Objetivo:** tornar o módulo mais inteligente, escalável e integrado ao ecossistema maior.

**Pré-requisito:** Fase 3 estável. Squad IA e Dados disponível.

### Escopo

| Épico | Descrição |
|---|---|
| Cursos pagos | Integração com Financeiro para liberação de acesso pós-pagamento |
| Avaliações e quizzes | Perguntas simples vinculadas a lições ou etapas |
| Sinais para SOM | Progresso e travamento como sinais para o módulo Apoio Pastoral |
| Relatórios exportáveis | Exportação em CSV/PDF das métricas principais |
| Recomendação inteligente | Sugestão de próximos cursos com base em perfil e histórico |
| Certificados com validação pública | Código de validação verificável externamente |

---

## Fase 5 — Expansão (pós-consolidação)

Escopo futuro, sem data definida. Avaliado após a Fase 4 estar consolidada.

- Marketplace privado de conteúdo entre igrejas da mesma rede
- Trilhas ministeriais avançadas com progressão multi-tenant
- Importação de progresso histórico
- Aplicativo nativo com experiência offline

---

## Sequência resumida

```
Pessoas consolidado
→ Fase 0: documentação pronta
→ Fase 1: cursos e progresso (MVP)
→ Fase 2: jornada configurável e pré-requisitos
→ Fase 3: formação completa (presença, certificado, notificações)
→ Fase 4: inteligência e escala
→ Fase 5: expansão
```

---

## Critérios para avançar de fase

| De | Para | Critério |
|---|---|---|
| Fase 0 | Fase 1 | Todos os documentos da lista 0.1–0.6 marcados como prontos; Pessoas consolidado |
| Fase 1 | Fase 2 | MVP em produção sem bugs críticos abertos; feedback de pelo menos uma igreja piloto |
| Fase 2 | Fase 3 | Jornada em uso real; pelo menos uma igleja com jornada completa configurada |
| Fase 3 | Fase 4 | Ciclo formativo completo testado com presença, certificado e notificação |
| Fase 4 | Fase 5 | Decisão estratégica do Agente Humano baseada em uso real e demanda |
