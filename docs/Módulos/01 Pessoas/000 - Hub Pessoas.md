---
tags:
  - plataforma-igrejas
  - modulo
  - pessoas
  - hub
---

# Módulo Pessoas
## Hub do módulo

> Pessoas é o cadastro vivo da igreja. Todo módulo depende dele para saber quem é a pessoa, qual é seu contexto, quais vínculos ela possui e que histórico precisa ser preservado.

---

## Papel na plataforma

O módulo Pessoas é o núcleo comum da Plataforma-Igrejas. Ele concentra identidade, vínculos familiares, contatos, consentimentos, status ministerial, segmentos, histórico e eventos relevantes da vida da pessoa dentro da igreja.

Ele não é apenas uma agenda de contatos. É a base relacional que sustenta Ensino, SOM/Apoio Pastoral, GCs, Cultos, Crianças, Voluntários, Eventos, Financeiro e Comunicação.

---

## Mapa do módulo

### Estratégia

| Nota | Descrição |
|------|-----------|
| [[Visão e Proposta de Valor - Pessoas]] | O que o módulo resolve e por que é central |
| [[Antiobjetivos - Pessoas]] | O que não deve entrar no módulo |
| [[Decisões de Produto - Pessoas]] | Decisões assumidas para evitar retrabalho |
| [[Riscos do Módulo - Pessoas]] | Riscos pastorais, operacionais e técnicos |

### Produto

| Nota | Descrição |
|------|-----------|
| [[PRD Pessoas]] | Documento mestre do módulo |
| [[Arquitetura Funcional Pessoas]] | Áreas, fluxos e capacidades funcionais |
| [[Sitemap e Mapa de Telas Pessoas]] | Telas, navegação e experiência |
| [[Backlog Inicial Pessoas]] | Épicos e histórias iniciais |
| [[Matriz de Permissões Pessoas]] | Quem pode ver, editar e administrar dados |

### Técnico

| Nota | Descrição |
|------|-----------|
| [[Modelo Conceitual de Entidades Pessoas]] | Vocabulário e relações do domínio |
| [[Backlog Técnico Pessoas]] | Frentes técnicas do módulo |
| [[Decisões e Riscos Técnicos Pessoas]] | ADRs e riscos de arquitetura |
| [[Plano de Trabalho Pessoas]] | Sequência sugerida de execução |

---

## Estado atual

| Dimensão | Status |
|----------|--------|
| Estratégia | Em amadurecimento |
| PRD | Rascunho estruturado |
| Arquitetura funcional | Rascunho estruturado |
| Sitemap | Rascunho estruturado |
| Permissões | Rascunho estruturado |
| Modelo de entidades | Rascunho estruturado |
| Backlog técnico | Rascunho estruturado |
| Código | Não iniciado |

---

## Decisões de base

- Pessoas é módulo fundacional, não opcional.
- Todo registro pertence a um tenant/igreja.
- Uma pessoa pode ter vários papéis ao mesmo tempo: membro, visitante, aluno, voluntário, líder, responsável, criança, doador, etc.
- Família/casa é vínculo estrutural, não apenas campo de texto.
- Timeline é compartilhada por origem, mas com controle de visibilidade por permissão.
- Dados sensíveis exigem governança, auditoria e consentimento.
- O módulo deve evitar virar um depósito de dados sem curadoria.

---

## Fluxo macro

```text
Pessoa criada/importada
→ vínculos e contatos normalizados
→ status e segmentos definidos
→ consentimentos registrados
→ demais módulos leem a pessoa
→ eventos relevantes alimentam timeline
→ liderança acompanha com escopo e permissão
```

