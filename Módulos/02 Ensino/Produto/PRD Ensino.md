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

O módulo Ensino organiza a formação da igreja por meio de cursos, jornadas, progresso individual e acompanhamento por liderança. Ele permite que qualquer igreja configure suas trilhas formativas — da integração de novos membros ao desenvolvimento de líderes — sem depender de suporte técnico.

Na Plataforma-Igrejas, nasce integrado ao núcleo comum, especialmente Pessoas, Identidade/Permissões, Comunicação, Eventos e Financeiro.

---

## Objetivos

- Estruturar a Jornada do Discípulo e outras trilhas formativas configuráveis por tenant.
- Permitir cursos com módulos, lições e materiais em múltiplos formatos.
- Controlar progresso individual e registrar conclusões com auditoria.
- Liberar etapas por pré-requisitos configuráveis.
- Permitir acompanhamento por líderes e supervisores dentro de seus escopos.
- Emitir certificados conforme regras definidas pela igreja.
- Apoiar turmas presenciais e formações híbridas.

> Os objetivos representam a visão completa do módulo. O que está disponível no MVP está detalhado em **Escopo do MVP (Fase 1)**.

---

## Perfis principais

### Aluno

**O que precisa:** ver os cursos disponíveis, saber onde está na formação e registrar progresso lição a lição.

**Exemplo real:** Maria, 28 anos, entrou para a célula há 3 meses. Quer saber quais são os próximos passos formativos na igreja. Acessa o módulo Ensino, vê que "Fundamentos da Fé" está disponível para ela, se inscreve e assiste às lições no próprio ritmo. Ao terminar cada lição, o sistema registra o avanço e ela vê quanto falta para concluir o curso.

**Disponível no MVP (Fase 1):** inscrição em cursos publicados, consumo de lições (vídeo, texto, PDF, link), visualização de progresso individual.

---

### Líder

**O que precisa:** acompanhar o progresso dos liderados, identificar quem está atrasado e agir pastoralmente.

**Exemplo real:** João, líder de célula com 12 liderados. Toda semana acessa o módulo e verifica quais membros ainda não completaram o módulo 1 de "Fundamentos da Fé". Com essa informação, inclui o tema na conversa do próximo encontro de célula e oferece ajuda a quem está travado.

**Disponível no MVP (Fase 1):** lista de liderados com progresso por curso, dentro do escopo pastoral atribuído no módulo Pessoas.

---

### Supervisor / Pastor

**O que precisa:** visão consolidada do andamento formativo em seu escopo ministerial para tomada de decisão estratégica e pastoral.

**Exemplo real:** Paulo, pastor de área responsável por 8 células. Antes do conselho pastoral, verifica quantas pessoas em sua área já concluíram o curso obrigatório de integração. Identifica que 40% ainda não concluíram e define isso como meta para o trimestre.

**Disponível no MVP (Fase 1):** visão agregada de progresso por curso dentro do escopo do pastor. O detalhamento por liderado individual fica com o líder direto de cada célula.

---

### Criador de conteúdo

**O que precisa:** criar cursos, módulos, lições e materiais sem depender de suporte técnico.

**Exemplo real:** Ana, coordenadora de ensino. Cria o curso "Liderança de Célula" com 4 módulos e 20 lições. Carrega vídeos, PDFs de apoio e links para textos externos. Organiza a sequência das lições, salva como rascunho e encaminha para o admin publicar.

**Disponível no MVP (Fase 1):** criação e edição de cursos, módulos, lições e materiais (vídeo, texto, PDF, link externo); salvar como rascunho. Publicação requer ação do admin de ensino.

---

### Admin de ensino

**O que precisa:** controlar o catálogo, publicar cursos, gerenciar inscrições, liberar exceções e ter visão geral do módulo.

**Exemplo real:** Carlos, administrador do módulo Ensino da igreja. Recebe o curso da coordenadora de ensino, revisa e publica no catálogo. Quando um membro pede acesso manual a um curso restrito, avalia a solicitação e libera com justificativa registrada. Arquiva cursos obsoletos sem apagar o histórico de quem já concluiu.

**Disponível no MVP (Fase 1):** ativação e configuração básica do módulo, publicação e arquivamento de cursos, gestão de inscrições, liberação manual com registro obrigatório de justificativa.

---

### Financeiro

**O que precisa:** validar pagamentos para liberar acesso a cursos pagos.

**Exemplo real:** Tereza, coordenadora financeira. Confirma o pagamento de um curso específico e o sistema libera o acesso ao aluno.

**Disponível no MVP:** **não ativo no MVP.** Cursos pagos entram na Fase 4 (integração com módulo Financeiro). Este perfil não tem função no módulo Ensino até essa fase.

---

## Escopo do MVP (Fase 1) — Cursos e Progresso

**Objetivo:** uma pessoa consegue se inscrever em um curso, consumir lições e ter o progresso registrado. Um líder consegue acompanhar.

**Pré-requisito:** módulo Pessoas consolidado.

| Épico | O que está incluído |
|---|---|
| Ativação do módulo | Admin ativa Ensino para o tenant e define parâmetros básicos (nome do catálogo, visibilidade padrão) |
| Catálogo de cursos | Criador cria curso com módulos, lições e materiais (vídeo, texto, PDF, link externo); salva como rascunho |
| Publicação | Admin publica ou arquiva cursos; cursos arquivados preservam histórico de conclusões |
| Inscrição | Aluno se inscreve em curso publicado disponível para seu perfil/tenant |
| Progresso | Sistema registra progresso por lição com timestamp; curso marcado como concluído quando todas as lições ativas são concluídas |
| Acompanhamento básico | Líder vê lista de liderados com progresso por curso, dentro do seu escopo pastoral |
| Permissões | Isolamento completo por tenant; restrições por papel (aluno, líder, criador, admin); criador não publica sem admin |
| Auditoria mínima | Toda conclusão de lição registra identificador do aluno, timestamp e canal de origem |

---

## Fora do MVP

Itens abaixo foram explicitamente avaliados e excluídos da Fase 1. Cada um tem fase-alvo definida no Roadmap.

| Item | Fase-alvo | Motivo da exclusão do MVP |
|---|---|---|
| Jornadas configuráveis | Fase 2 | Requer motor de etapas e pré-requisitos; complexidade desnecessária antes de validar cursos simples |
| Pré-requisitos | Fase 2 | Motor de regras a ser projetado após a Fase 1 estável em uso real |
| Turmas presenciais | Fase 3 | Depende de integração com módulo Eventos; fora do recorte digital da Fase 1 |
| Certificados | Fase 3 | Dependem de conclusão oficial validada e template configurável; não prioritários para provar o ciclo básico |
| Notificações automáticas | Fase 3 | Dependem do módulo Comunicação estar disponível |
| Cursos pagos | Fase 4 | Dependem de integração com módulo Financeiro; não necessários para validar o ciclo de aprendizado |
| Avaliações e quizzes | Fase 4 | Aumentam complexidade do conteúdo sem ser essenciais para o ciclo básico |
| Recomendação inteligente | Fase 4 | Depende de base de dados suficiente para gerar recomendações confiáveis |
| Marketplace entre igrejas | Fase 5 | Escopo estratégico; sem data definida |
| Importação de progresso histórico | Fase 5 | Sem padrão externo consolidado; avaliado após validação do módulo em produção |
| Aplicativo nativo | Fase 5 | Web responsivo é o canal prioritário inicial (decisão registrada em Decisões de Produto) |

---

## Decisões pendentes

Itens abaixo não bloqueiam o MVP funcionalmente, mas devem ser resolvidos antes do início da implementação da Fase 1.

| Decisão | Responsável | Prazo |
|---|---|---|
| Padrão de hospedagem de vídeos (plataforma, custos, limites de tamanho por tenant) | Agente Humano + Squad Técnico | Antes do kickoff da Fase 1 |
| Nível de proteção de vídeos por tenant (URL direta vs. player embarcado com controle de acesso) | Agente Humano | Antes do kickoff da Fase 1 |

> Estas são decisões técnicas; não alteram o escopo funcional do MVP. Resolvidas aqui, devem ser registradas em `Técnico/Decisões e Riscos Técnicos Ensino.md`.

---

## Regras de negócio

1. Todo aluno deve estar vinculado a uma pessoa cadastrada no módulo Pessoas do mesmo tenant.
2. Todo dado (curso, inscrição, progresso, conclusão) está vinculado a exatamente um tenant e não pode ser migrado entre tenants.
3. Um curso só pode ser publicado quando tem ao menos um módulo com ao menos uma lição com conteúdo válido (vídeo, texto, PDF ou link externo).
4. Uma lição que possui ao menos um registro de conclusão não pode ser excluída; pode ser desativada. Lições desativadas não contam para o cálculo de progresso de nenhuma inscrição (ativa ou nova).
5. O progresso de um aluno em um curso é calculado como: lições ativas concluídas pelo aluno ÷ total de lições ativas do curso × 100.
6. Um curso é marcado como concluído quando todas as lições ativas foram concluídas pelo aluno. Desativar uma lição após a conclusão de um aluno não reverte o status de conclusão.
7. Toda conclusão de lição registra: identificador do aluno, identificador da lição, timestamp da conclusão e canal de origem.
8. Toda liberação manual de inscrição ou acesso registra: identificador do admin responsável, timestamp e justificativa textual (campo obrigatório, mínimo de 10 caracteres).
9. Um líder só pode visualizar progresso de alunos dentro do escopo pastoral atribuído a ele no módulo Pessoas.
10. Um criador de conteúdo cria e edita cursos em rascunho; a publicação requer ação explícita de um admin de ensino.
11. Um admin de ensino gerencia apenas cursos e inscrições do seu próprio tenant.

---

## Indicadores

### Disponíveis no MVP (Fase 1)

- Alunos ativos por curso (ao menos uma lição concluída nos últimos 30 dias)
- Cursos iniciados por aluno (inscrições com ao menos uma lição concluída)
- Cursos concluídos por aluno (todas as lições ativas do curso concluídas)
- Taxa de conclusão por curso (concluídos ÷ inscritos × 100)
- Progresso médio por curso (média do percentual de progresso de todos os inscritos)

### Disponíveis em fases posteriores

- Pessoas travadas em pré-requisitos (Fase 2)
- Tempo médio por etapa da jornada (Fase 2)
- Certificados emitidos (Fase 3)
- Turmas presenciais com presença registrada (Fase 3)
