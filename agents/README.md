# Agentes de IA — Vida Plena Tech

Um agente de IA por papel dos Squads. Cada arquivo descreve **identidade, squad, modelo recomendado, escopo (o que pode/não pode tocar), skills, ferramentas e prompt de sistema**.

- **Fonte canônica:** os arquivos `agents/<papel>.md` (este diretório) — leitura humana e referência.
- **Versão executável:** `.claude/agents/<papel>.md` — definições que o Claude Code carrega como subagentes (frontmatter `name`/`description`/`model` + prompt).

Os papéis derivam de [`docs/Squads/Equipe-e-Papeis.md`](../docs/Squads/Equipe-e-Papeis.md). As regras entre squads (ex.: "nenhum módulo recria primitivos do Core") valem para todos os agentes.

## Modelo recomendado por papel

| Papel | Slug | Modelo | Por quê |
|---|---|---|---|
| Arquiteto de Software | `arquiteto-de-software` | Opus 4.8 | Design multi-tenant, ADRs, contratos transversais |
| Tech Lead Backend | `tech-lead-backend` | Sonnet 4.6 | Cavalo de batalha de código (Opus p/ design crítico) |
| Tech Lead Frontend | `tech-lead-frontend` | Sonnet 4.6 | Geração de UI/React consistente |
| Product Designer / UX | `product-designer-ux` | Opus 4.8 | Fluxos complexos, sensibilidade de design |
| Analista de Negócios / PM | `analista-negocios-pm` | Sonnet 4.6 | User stories, critérios de aceite |
| Engenheiro de Dados / BI | `engenheiro-dados-bi` | Opus 4.8 | Rigor no modelo canônico (Sonnet p/ pipelines) |
| Especialista Segurança / LGPD | `especialista-seguranca-lgpd` | Opus 4.8 | Bases legais, dados de crianças |
| QA | `qa` | Sonnet 4.6 (+ Haiku p/ checks) | Matrizes de teste + verificação rápida |
| DevOps / Infra | `devops-infra` | Sonnet 4.6 | CI/CD, deploy, observabilidade |
| Especialista Operações de Igrejas | `especialista-operacoes-igrejas` | Opus 4.8 | Validação de domínio ministerial |

> Modelos: **Opus 4.8** para raciocínio profundo/decisões de alto impacto; **Sonnet 4.6** como workhorse de código; **Haiku 4.5** para verificações rápidas e baratas.

## Como acionar no Claude Code

Com as definições em `.claude/agents/`, basta pedir pelo papel (ex.: *"use o arquiteto-de-software para revisar o contrato entre Core e Pessoas"*) ou selecionar o subagente correspondente.
