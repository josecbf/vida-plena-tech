# COLLABORATION.md — Protocolo de Colaboração

Arquivo neutro lido por **todos os agentes e colaboradores**.
Define fluxo de trabalho, padrões de tasks, regras de git e coordenação entre equipes para a **Plataforma-Igrejas**.

---

## Colaboradores e agentes ativos

| Ator | Instruções específicas | Branch prefix |
|---|---|---|
| Agente Humano (owner/PO) | — | `human/` |
| Terceiro (colaborador externo) | `AGENTS.md` | `ext/` |
| Agentes de IA | `AI-INSTRUCTIONS.md` | `ai/` |
| Agentes do terceiro | `AGENTS.md` | `ext/` |

---

## Protocolo de início de sessão

Todo agente e colaborador, em toda sessão, antes de qualquer edição:

```bash
git status                  # verificar estado local
git pull --ff-only          # atualizar com o remoto sem merge automático
```

Se `git pull --ff-only` falhar (divergência), **parar e avisar o Agente Humano** antes de continuar.

---

## Regra fundamental: 1 issue = 1 task

- Cada unidade de trabalho corresponde a **exatamente uma issue no GitHub**
- Nenhum trabalho começa sem issue aberta
- Nenhuma issue é fechada sem o trabalho concluído e documentado
- Não agrupar trabalhos de naturezas distintas na mesma issue
- Não fracionar uma unidade lógica em múltiplas issues

---

## Padrão de elaboração de tasks (issues)

Quando qualquer agente criar ou refinar uma issue, ela **obrigatoriamente** deve conter:

### Título

```
[Área] Ação objetiva em linguagem de produto
```

Exemplos válidos:
- `[Pessoas] Definir modelo de dados de famílias`
- `[Core] Rever política de permissões por tenant`
- `[Técnico] Documentar contrato de API do módulo Financeiro`
- `[Produto] Mapear jornada de onboarding de nova igreja`

### Corpo da issue

```markdown
## Contexto
Por que isso precisa ser feito? Qual problema, lacuna ou decisão está sendo endereçado?
Quanto mais contexto, melhor. Agentes futuros lerão isso sem memória da conversa anterior.

## Objetivo
O que este trabalho deve produzir ao final?
Seja específico sobre o artefato esperado (arquivo, seção, decisão documentada).

## Escopo

**Incluído nesta task:**
- item 1
- item 2

**Fora do escopo (para outra task):**
- item X
- item Y

## Critérios de aceitação
- [ ] Critério 1 — verificável objetivamente
- [ ] Critério 2 — verificável objetivamente
- [ ] Critério 3

## Arquivos afetados / criados
- `Pasta/Arquivo.md` — criar / atualizar / revisar

## Dependências
- Depende de: #NNN (se houver)
- Bloqueia: #NNN (se houver)
- Contexto relacionado: #NNN (se houver)

## Observações adicionais
Decisões anteriores relevantes, links, benchmarks, restrições conhecidas.
```

> **Regra para agentes:** uma issue sem corpo completo **não pode ser iniciada**. Se a issue chegar incompleta, o agente deve completá-la antes de criar a branch.

---

## Fluxo de branches

- Cada issue gera uma branch própria com o prefixo do ator responsável:
  ```
  ai/issue-42-modelo-dados-pessoas
  ext/issue-17-jornada-onboarding
  human/issue-8-revisao-preliminares
  ```
- Commits pequenos e descritivos em português
- **O merge no `main` é sempre decisão do Agente Humano**
- Nunca fazer force push em `main`
- Branch é deletada após merge

---

## Ciclo de vida de uma task

```
Issue aberta → Corpo completo verificado → Branch criada → Em andamento → PR aberto → Review → Merge → Branch deletada
```

**Ao iniciar:**
1. Verificar se a issue tem corpo completo (padrão acima). Se não, completar.
2. Criar branch: `<prefix>/issue-<número>-slug`
3. Comentar na issue:
   ```
   Iniciando trabalho. Branch: <nome-da-branch>
   ```

**Ao concluir (task pronta para merge):**
1. Abrir PR da branch para `main` com `Closes #NNN` na descrição
2. Fechar a issue com comentário detalhado de conclusão (ver padrão abaixo)
3. Sinalizar ao Agente Humano para revisão e merge

**Ao adiar (task pausada por decisão):**
1. Aplicar label `adiado`: `gh issue edit <número> --add-label "adiado"`
2. Comentar na issue: o que foi feito, por que pausar, como retomar
3. Commitar progresso parcial com mensagem `wip: motivo do adiamento`

---

## Padrão de comentário de conclusão

Quando a task estiver pronta para merge, o agente fecha a issue com:

```bash
gh issue close <número> --comment "<comentário>"
```

O comentário deve seguir este modelo sem exceções:

```markdown
## Concluído ✓

**O que foi feito:**
Descrição clara do que foi produzido. Não repetir o título — explicar o resultado real,
o raciocínio por trás das escolhas e o nível de completude do trabalho.

**Decisões tomadas:**
Se houve decisões de escopo, abordagem ou conteúdo que não estavam explícitas na issue,
documentar aqui com justificativa. Se nenhuma decisão relevante, escrever "Nenhuma."

**Arquivos criados/modificados:**
- `Pasta/Arquivo.md` — criado com seções X, Y, Z
- `Pasta/Outro.md` — seção W atualizada, seção V removida (motivo)

**Critérios de aceitação verificados:**
- [x] Critério 1 — como foi verificado
- [x] Critério 2 — como foi verificado
- [x] Critério 3 — como foi verificado

**Pontos de atenção para revisão:**
O que o Agente Humano deve checar com atenção. Dúvidas abertas, decisões que precisam de validação,
dependências criadas. Se não houver nada especial, escrever "Nenhum."

**PR:** #NNN
```

> Comentários de conclusão rasos ou genéricos não são aceitáveis. O objetivo é que o Agente Humano possa revisar o PR com plena compreensão do que foi feito e por quê, sem precisar perguntar.

---

## Equipe e habilidades

Ver [`docs/Squads/Equipe-e-Papeis.md`](docs/Squads/Equipe-e-Papeis.md) para descrição detalhada dos papéis, habilidades e estrutura de squads. Os agentes de IA por papel ficam em [`agents/`](agents/).

---

## Arquivos que nunca devem ser editados simultaneamente

Antes de editar qualquer arquivo abaixo, verificar se há branch aberta de outro colaborador/agente tocando no mesmo arquivo:

| Arquivo / Pasta | Motivo |
|---|---|
| `docs/000 - Hub.md` | Ponto de entrada — afeta a navegação de todos |
| `docs/PRELIMINARES/` | Visão e princípios — mudanças têm impacto transversal |
| `docs/Técnico/` | Contratos centrais do sistema |
| `docs/Produto/` | Estrutura e roadmap do produto |
| `package.json` / `pnpm-workspace.yaml` / `turbo.json` | Configuração do monorepo |
| `COLLABORATION.md` | Este arquivo |
| `AI-INSTRUCTIONS.md` | Instruções para agentes de IA |
| `AGENTS.md` | Instruções dos agentes externos |

---

## O que nunca sobe para o Git

- `.env` e qualquer arquivo de segredos ou credenciais
- Arquivos temporários (`*.tmp`, `*.bak`, `~*`)
- Exports, dumps e artefatos de ferramentas locais
- Arquivos de configuração pessoal de editor
