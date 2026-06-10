# ze-start — Plano de Execução

Branch de transformação do repositório de **documentação** para um **monorepo de desenvolvimento** da plataforma **Videira** (nome provisório, mudável depois).

> Documento vivo. Marque os checkboxes conforme avançamos. O log narrativo de progresso fica em [`CLAUDE-ZE.md`](CLAUDE-ZE.md).

---

## Decisões travadas

| Tema | Decisão |
|---|---|
| Estrutura | **Monorepo**: `docs/` + `apps/` + `packages/` + `agents/` (pnpm workspaces + Turborepo) |
| Nome da plataforma | **Videira** (provisório — cores/nome podem mudar depois) |
| Demo módulos 01+02 | **Protótipo navegável com dados mock** (Next.js + Tailwind + shadcn/ui), deploy Vercel, sem banco/login |
| Identidade visual | Mínima, gerada como código (tokens, tema, logo SVG) |
| Agentes de IA | 1 agente por papel dos Squads em `agents/` + `.claude/agents/`, com modelo recomendado por papel |

---

## Estrutura-alvo do repositório

```
videira/  (este repo)
├─ docs/                ← TODA a doc atual (intacta)
│  ├─ PRELIMINARES/  Produto/  Módulos/  Técnico/ ...
│  └─ 000 - Hub.md
├─ apps/
│  └─ demo/            ← Next.js (módulos 01 Pessoas + 02 Ensino) → Vercel
├─ packages/
│  ├─ ui/              ← design system (tokens, tema, componentes)
│  └─ types/           ← modelo canônico de dados (TypeScript)
├─ agents/             ← agentes de IA por papel (fonte canônica)
├─ .claude/agents/     ← definições executáveis dos mesmos agentes
├─ CLAUDE-ZE.md        ← log de progresso / handoff entre chats
├─ ze-start.md         ← este arquivo
└─ package.json        ← workspaces + turbo
```

---

## Identidade visual inicial (Videira)

- **Paleta:** Índigo `#3D4E9E` (primária) · Âmbar `#F2A93B` (acento) · Verde-sálvia `#5B8C7B` (apoio) · Neutros `#0F172A` / `#475569` / `#F8FAFC`
- **Tipografia:** Inter (UI) + Fraunces/Spectral (títulos)
- **Logo:** marca geométrica evocando videira/folha; favicon escalável
- **Tom:** acolhedor, claro, confiável

---

## Agentes de IA por papel (modelo recomendado)

| Papel (Squad) | Modelo recomendado | Racional |
|---|---|---|
| Arquiteto de Software | Opus 4.8 | Design multi-tenant, ADRs, contratos transversais |
| Tech Lead Backend | Sonnet 4.6 (Opus p/ design crítico) | Cavalo de batalha de código |
| Tech Lead Frontend | Sonnet 4.6 | Geração de UI/React consistente |
| Product Designer/UX | Opus 4.8 | Fluxos complexos, sensibilidade de design |
| Analista de Negócios/PM | Sonnet 4.6 | User stories, critérios de aceite |
| Engenheiro de Dados/BI | Opus 4.8 (modelo) / Sonnet (pipelines) | Rigor no modelo canônico |
| Especialista Segurança/LGPD | Opus 4.8 | Bases legais, dados de crianças |
| QA | Sonnet 4.6 + Haiku 4.5 (checks) | Matrizes + verificação rápida |
| DevOps/Infra | Sonnet 4.6 | CI/CD, deploy |
| Especialista Operações de Igrejas | Opus 4.8 | Validação de domínio |

---

## Todo list (com estimativas)

### Fase 0 — Reorganização do repo · ~1–2h ✅
- [x] Mover doc para `docs/` preservando histórico (`git mv`)
- [x] Scaffold do monorepo (pnpm workspaces + Turborepo)
- [x] `package.json` raiz + `.gitignore` de node
- [x] Ajustar referências em `COLLABORATION.md` / `README.md`
- [x] Commit na branch `ze-start` (`e84840a`)

### Fase 1 — Identidade + design system · ~3–5h ✅
- [x] Tokens de cor/tipografia (`packages/ui`)
- [x] Tema Tailwind (v4) + componentes base (`apps/demo/components/ui.tsx`)
- [x] Logo (ícone videira/uva) — favicon pendente (opcional)
- [x] Página `/brand` na demo

### Fase 2 — Agentes de IA (Squads) · ~2–3h ✅
- [x] `agents/` com 1 arquivo por papel (10 papéis)
- [x] Definições executáveis em `.claude/agents/`
- [x] README explicando como acionar cada agente

### Fase 3 — Demo Pessoas + Ensino · ~8–12h ✅
- [x] `apps/demo` Next.js + shell + navegação multi-módulo
- [x] Mock data (`packages/types`)
- [x] Telas Pessoas (lista, perfil, famílias, timeline)
- [x] Telas Ensino (trilhas, curso, progresso)
- [x] Build de produção valida (22 páginas, 0 erros)

### Fase 4 — Deploy + polish · ~1–2h
- [x] README com instruções de deploy (`apps/demo/README.md`)
- [ ] Deploy na Vercel (passo manual do dono — Root Directory = `apps/demo`)
- [ ] Favicon + polish de responsividade fino

**Total estimado: ~15–24h**, faseável em PRs independentes.

---

## Próximos passos imediatos

1. Fase 0 (reorg + scaffold) — em andamento
2. Fase 2 (agentes) — destrava trabalho paralelo
3. Fase 1 + Fase 3 (identidade + demo)

---

## Frentes adicionais (10/06)

### Fase 5 — Arquitetura: modularidade e identidade plugável
Permitir que módulos satélites (ex.: Ensino 02) sejam contratados isolados e plugados em outra plataforma que traz as pessoas.
- [x] Modelo de arquitetura documentado (`docs/Técnico/Modularidade e Identidade Plugavel.md`)
- [x] Prompt de validação para Gemini e GPT (`docs/Técnico/Prompt - Validacao de Arquitetura (Gemini e GPT).md`)
- [ ] Rodar validação nos dois, comparar e registrar divergências como ADR
- [ ] Aprovar contrato `PersonRef`/`PeopleProvider` e protocolo de federação

### Fase 6 — Módulo 16 (novo)
- [ ] Receber a documentação do módulo 16 (fonte do usuário)
- [ ] Criar `docs/Módulos/16 <Nome>/` no mesmo formato (Estratégia/Produto/Técnico + Hub)
- [ ] Atualizar `docs/000 - Hub.md` e README com o novo módulo
