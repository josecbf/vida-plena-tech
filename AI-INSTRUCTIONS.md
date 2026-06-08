# AI-INSTRUCTIONS.md — Guia para Agentes de IA

Este arquivo é lido por qualquer agente de IA que trabalhe neste repositório.
Leia-o integralmente antes de iniciar qualquer sessão de trabalho.

---

## O que é este projeto

A **Plataforma-Igrejas** é um produto SaaS modular para gestão eclesiástica — uma solução completa e vendável para igrejas de qualquer tamanho. Sua referência de mercado é o Planning Center: um núcleo comum de identidade, pessoas, agenda, comunicação e permissões, com módulos especializados contratáveis isoladamente ou em pacotes.

**Norte do produto:** ajudar igrejas a operar com excelência sem perder o cuidado pastoral. Tecnologia a serviço da missão.

Este repositório contém **exclusivamente documentação e planejamento de produto**. Não há código aqui. O vault foi criado no Obsidian — mas todo agente de IA deve conseguir lê-lo e editá-lo via ferramentas de arquivo padrão.

---

## Protocolo de início de sessão

Toda sessão começa com:

```bash
git status
git pull --ff-only
```

Se `git pull --ff-only` falhar, parar e avisar o Agente Humano antes de continuar.

Antes de qualquer trabalho, ler:
1. `COLLABORATION.md` — regras de fluxo, tasks e coordenação
2. Este arquivo — contexto do projeto e padrões de escrita
3. O arquivo diretamente relacionado à task em execução

---

## Estrutura do vault

```
000 - Hub.md              ← ponto de entrada; leia sempre que precisar se orientar
PRELIMINARES/             ← visão, princípios e referências de mercado
Produto/                  ← mapa de módulos, roadmap, modelo comercial, MVP
Módulos/                  ← documentação detalhada de cada módulo (15 módulos)
Técnico/                  ← arquitetura, dados, segurança, LGPD, permissões, APIs, IA
Operacao/                 ← jornadas operacionais da igreja
Squads/                   ← equipe, papéis, plano de squads
Auditoria/                ← auditorias, stress tests e rodadas de correção
Referências/              ← referências externas e benchmarks
```

### Navegação dentro de um módulo

Cada módulo em `Módulos/` tem dois elementos:
- Um arquivo `.md` de mesmo nome — sumário e índice do módulo
- Uma pasta de mesmo nome — documentos internos do módulo

Ao trabalhar em um módulo, leia o arquivo `.md` raiz do módulo antes de editar qualquer documento interno.

---

## Decisão estrutural central

O módulo **Pessoas** é o coração de toda a plataforma. Todos os demais módulos dependem dele para representar qualquer entidade humana. Nenhum módulo cria seu próprio cadastro de pessoa — consome o contrato do módulo Pessoas.

Da mesma forma, permissões, agenda, auditoria e tenancy pertencem ao **Core** (Squad Core). Nenhum módulo reimplementa essas primitivas.

Antes de propor qualquer modelagem de entidade em um módulo, verificar se ela já existe em `Técnico/Modelo de Dados Canonico.md`.

---

## Padrão de escrita para este vault

### Tom e linguagem

- Português brasileiro, linguagem de produto — clara, direta, sem jargão desnecessário
- Orientado à prática: o leitor deve conseguir implementar ou validar o que está descrito
- Sensível ao contexto ministerial: termos como "membro", "pastor", "célula", "GC", "discipulado" têm significado específico — use-os com precisão

### Estrutura de documentos de módulo

Todo documento de módulo bem formado deve conter:

```markdown
## Problema
O que esta funcionalidade resolve para a igreja?

## Público e operadores
Quem usa? Quem administra?

## Escopo do MVP
O mínimo necessário para a funcionalidade ser útil.

## Escopo futuro
O que vem depois — mas não agora.

## Entidades principais
Quais objetos de dados este módulo gerencia?

## Telas esperadas
Lista das telas ou interfaces principais.

## Regras de negócio
Invariantes, validações, fluxos condicionais.

## Integrações
Com quais outros módulos ou sistemas externos se conecta?

## Permissões
Quem pode ver, criar, editar, excluir — e em qual escopo.

## Relatórios
Quais dados precisam ser consultáveis?

## Riscos
O que pode dar errado? O que é tecnicamente difícil?

## Histórias iniciais
User stories no formato: Como [ator], quero [ação], para [objetivo].
```

Se um documento existente estiver incompleto, completá-lo faz parte do trabalho da task — não é escopo extra.

### Qualidade de conteúdo

- Não inventar dados, estimativas ou comportamentos de mercado sem fonte
- Não criar integrações ou dependências entre módulos sem verificar que o módulo de destino existe e está documentado
- Ao citar concorrentes ou referências (Planning Center, Church Community Builder, etc.), ser preciso — não especular sobre funcionalidades que não foram verificadas
- Decisões de escopo que não estavam na issue devem ser registradas no comentário de conclusão, não silenciadas

---

## Fluxo de trabalho com tasks

O protocolo completo está em `COLLABORATION.md`. Resumo operacional:

1. Cada task = uma issue no GitHub
2. Issue sem corpo completo não pode ser iniciada — completar primeiro
3. Branch: `ai/issue-<número>-slug-da-task`
4. Ao concluir: abrir PR + fechar issue com comentário de conclusão detalhado
5. Nunca fazer merge direto no `main` — aguardar revisão do Agente Humano

---

## Checklist antes de fechar qualquer task

Antes de abrir o PR e fechar a issue, verificar:

- [ ] O documento criado ou editado tem todas as seções esperadas para seu tipo
- [ ] Nenhuma entidade foi criada sem verificar o modelo canônico em `Técnico/`
- [ ] Links internos (wikilinks `[[...]]`) apontam para arquivos que existem
- [ ] Nenhuma decisão de escopo foi tomada silenciosamente — tudo está no comentário de conclusão
- [ ] O documento é legível por alguém sem contexto da conversa que originou a task
- [ ] Os critérios de aceitação da issue foram verificados um a um

---

## Arquivos de referência obrigatória por área de trabalho

| Área | Leia antes de começar |
|---|---|
| Qualquer módulo | `Produto/Mapa de Modulos.md` + arquivo raiz do módulo |
| Modelagem de dados | `Técnico/Modelo de Dados Canonico.md` |
| Permissões | `Técnico/Permissoes Tenancy e Escopos.md` + `Técnico/Matriz Global de Permissoes Sensiveis.md` |
| Segurança / LGPD | `Técnico/Seguranca Privacidade e LGPD.md` + `Técnico/Matriz de Classificacao de Dados.md` |
| Arquitetura | `Técnico/Arquitetura Plataforma.md` |
| APIs e integrações | `Técnico/APIs Abertas e Integracoes.md` |
| IA embarcada | `Técnico/IA Embarcada.md` |
| Visão de produto | `PRELIMINARES/Visao Executiva.md` + `PRELIMINARES/Principios de Produto.md` |
| MVP e roadmap | `Produto/Priorizacao MVP e Sequenciamento.md` + `Produto/Roadmap de Execucao Paralela.md` |
| Qualidade geral | `Auditoria/Auditoria Geral do Planejamento.md` |

---

## O que nunca fazer

- Nunca fazer merge direto no `main`
- Nunca fechar uma issue antes do trabalho estar concluído e verificado
- Nunca criar entidades de dados sem consultar o modelo canônico
- Nunca inventar referências de mercado, dados estatísticos ou comportamentos de sistemas externos
- Nunca ignorar seções faltantes em documentos de módulo — completar faz parte do trabalho
- Nunca commitar arquivos de segredos, exports ou artefatos temporários
