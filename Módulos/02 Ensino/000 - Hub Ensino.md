---
tags:
  - plataforma-igrejas
  - modulo
  - ensino
  - hub
---

# Módulo Ensino
## Hub do módulo

> Ensino é o motor de formação da igreja. Ele organiza jornadas, cursos, trilhas, turmas, progresso e certificados sem reduzir discipulado a consumo de conteúdo.

---

## Papel na plataforma

O módulo Ensino permite que cada igreja estruture sua formação de forma clara: Jornada do Discípulo, cursos livres, trilhas ministeriais, turmas presenciais, pré-requisitos, avaliações simples, certificados e acompanhamento de progresso.

Na Plataforma-Igrejas, Ensino não é um sistema isolado. Ele depende do módulo Pessoas para identidade, vínculos, liderança e histórico; pode conversar com Eventos para encontros presenciais; com Financeiro para cursos pagos; com Comunicação para lembretes; e com SOM/Apoio Pastoral para sinais de avanço ou travamento na caminhada.

---

## Mapa do módulo

### Estratégia

| Nota | Descrição |
|------|-----------|
| [[Visão e Proposta de Valor - Ensino]] | O que o módulo resolve e por que existe |
| [[Antiobjetivos - Ensino]] | O que não deve entrar no módulo |
| [[Decisões de Produto - Ensino]] | Decisões assumidas para evitar retrabalho |
| [[Riscos do Módulo - Ensino]] | Riscos pastorais, operacionais e técnicos |

### Produto

| Nota | Descrição |
|------|-----------|
| [[PRD Ensino]] | Documento mestre do módulo |
| [[Arquitetura Funcional Ensino]] | Áreas, fluxos e capacidades funcionais |
| [[Sitemap e Mapa de Telas Ensino]] | Telas, navegação e experiência |
| [[Backlog Inicial Ensino]] | Épicos e histórias iniciais |
| [[Matriz de Permissões Ensino]] | Quem pode ver, editar, publicar e acompanhar |

### Técnico

| Nota | Descrição |
|------|-----------|
| [[Modelo Conceitual de Entidades Ensino]] | Vocabulário e relações do domínio |
| [[Backlog Técnico Ensino]] | Frentes técnicas do módulo |
| [[Decisões e Riscos Técnicos Ensino]] | ADRs e riscos de arquitetura |
| [[Plano de Trabalho Ensino]] | Sequência sugerida de execução |

---

## Estado atual

| Dimensão | Status |
|----------|--------|
| Estratégia | Base forte herdada do vault Ensino, adaptada para plataforma modular |
| PRD | Rascunho estruturado |
| Arquitetura funcional | Rascunho estruturado |
| Sitemap | Rascunho estruturado |
| Permissões | Rascunho estruturado |
| Modelo de entidades | Rascunho estruturado |
| Backlog técnico | Rascunho estruturado |
| Código | Não iniciado |

---

## Decisões de base

- Ensino é um módulo especializado, não o núcleo de cadastro da igreja.
- A Jornada do Discípulo deve ser configurável por igreja/tenant.
- O aluno sempre é uma pessoa do módulo Pessoas.
- Liderança e escopos de acompanhamento devem vir de vínculos estruturados, não de filtros manuais frágeis.
- Nem toda etapa de formação é digital; marcos presenciais e pastorais precisam existir no modelo.
- Cursos podem ser parte da jornada, livres, ministeriais, pagos ou internos.
- Conclusões oficiais não devem ser apagadas quando alguém revisita conteúdo.
- O módulo deve evitar virar marketplace genérico de cursos gospel.

---

## Fluxo macro

```text
Pessoa apta para ensino
→ jornada ou curso liberado
→ aluno consome conteúdo
→ motor avalia pré-requisitos
→ marcos presenciais ou pastorais complementam progresso
→ liderança acompanha avanço e travas
→ certificado ou próxima etapa é liberada
→ histórico formativo alimenta a plataforma
```
