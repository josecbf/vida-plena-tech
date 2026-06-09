---
tags:
  - plataforma-igrejas
  - ensino
  - produto
  - prd
---

# PRD Ensino

← [[000 - Hub Ensino]]

---

## Resumo

O módulo Ensino organiza a formação da igreja por meio de jornadas configuráveis, cursos, trilhas, turmas, progresso, pré-requisitos, certificados e acompanhamento por liderança.

Na Plataforma-Igrejas, ele deve nascer integrado ao núcleo comum, especialmente Pessoas, Identidade/Permissões, Comunicação, Eventos e Financeiro.

---

## Objetivos

- Estruturar a Jornada do Discípulo e outras trilhas formativas.
- Permitir cursos com módulos, lições e materiais.
- Controlar progresso individual e conclusão oficial.
- Liberar etapas por pré-requisitos configuráveis.
- Permitir acompanhamento por líderes e supervisores.
- Emitir certificados conforme regras definidas.
- Apoiar turmas presenciais e formações híbridas.

---

## Perfis principais

| Perfil | Necessidade |
|--------|-------------|
| Aluno | Ver jornada, acessar cursos, acompanhar progresso e próximos passos |
| Líder | Acompanhar progresso dos liderados e identificar travas |
| Supervisor/Pastor | Ver visão consolidada por escopo ministerial |
| Criador de conteúdo | Criar cursos, módulos, lições e materiais |
| Admin de ensino | Publicar, organizar jornadas, liberar exceções e gerar relatórios |
| Financeiro | Validar cursos pagos quando aplicável |

---

## Escopo inicial sugerido

- Jornada configurável.
- Cursos, módulos e lições.
- Conteúdo em vídeo, texto, PDF e link externo.
- Progresso por lição e curso.
- Pré-requisitos básicos.
- Liberação manual auditada.
- Turmas presenciais simples.
- Certificados simples.
- Relatórios essenciais.
- Matriz de permissões.

---

## Escopo futuro

- Avaliações e quizzes.
- Fóruns ou espaços de interação moderados.
- Marketplace privado entre igrejas.
- Certificados com validação pública.
- Inteligência de recomendação de próximos cursos.
- Importação avançada de progresso histórico.
- Aplicativo nativo.

---

## Regras de negócio essenciais

- Todo aluno deve estar vinculado a uma pessoa.
- Todo dado deve estar vinculado a um tenant/igreja.
- Uma jornada contém etapas ordenadas.
- Uma etapa pode apontar para curso digital, turma presencial, validação externa ou liberação administrativa.
- Um curso pode fazer parte de uma jornada ou existir como curso livre.
- Um curso publicado não deve ser alterado de forma que destrua histórico de conclusão.
- Toda liberação manual precisa registrar responsável, data e justificativa.
- Líder só pode ver alunos dentro do seu escopo.
- Certificado só pode ser emitido após conclusão oficial.

---

## Indicadores úteis

- Alunos ativos.
- Cursos iniciados.
- Cursos concluídos.
- Taxa de conclusão por curso.
- Pessoas travadas em pré-requisitos.
- Tempo médio por etapa da jornada.
- Certificados emitidos.
- Turmas presenciais com presença registrada.
