# Videira

Monorepo da **Videira** (nome provisório) — a **Plataforma Global para Igrejas**, uma solução modular e vendável para gestão eclesiástica. Reúne documentação de produto, a aplicação, pacotes compartilhados e os agentes de IA do projeto.

## Sobre o projeto

Plataforma SaaS inspirada no modelo do Planning Center: um núcleo comum de pessoas, identidade, agenda, comunicação e permissões; em volta dele, módulos especializados contratáveis isoladamente ou em pacotes.

**Norte do produto:** ajudar igrejas a operar com excelência sem perder o cuidado pastoral.

## Estrutura do monorepo

| Pasta | Conteúdo |
|---|---|
| `docs/` | Toda a documentação de produto, estratégia e técnica (ver abaixo) |
| `apps/demo/` | Demo navegável (Next.js) dos módulos 01 Pessoas e 02 Ensino → Vercel |
| `packages/ui/` | Design system (tokens, tema, componentes) |
| `packages/types/` | Modelo canônico de dados em TypeScript |
| `agents/` | Agentes de IA por papel (Squads), com modelo recomendado |

### Dentro de `docs/`

| Pasta | Conteúdo |
|---|---|
| `docs/PRELIMINARES/` | Visão executiva, princípios de produto, referências de mercado |
| `docs/Produto/` | Mapa de módulos, roadmap, modelo comercial, priorização MVP |
| `docs/Módulos/` | Documentação detalhada de cada módulo (estratégia, produto, backlog) |
| `docs/Técnico/` | Arquitetura, modelo de dados, segurança, LGPD, permissões, APIs |
| `docs/Operacao/` | Jornadas operacionais da igreja |
| `docs/Squads/` | Plano de squads e times |
| `docs/Auditoria/` | Auditorias, stress tests e rodadas de correção |
| `docs/Referências/` | Referências externas e benchmarks |

> Controle desta linha de trabalho: [`ze-start.md`](ze-start.md) (plano + todo) e [`CLAUDE-ZE.md`](CLAUDE-ZE.md) (log/handoff).

## Desenvolvimento — rodar localmente

Pré-requisitos: **Node 20+** e **pnpm 10+**.

```bash
# 1. Instalar dependências (na raiz do monorepo)
pnpm install

# 2. Subir a demo (módulos Pessoas + Ensino)
pnpm --filter @videira/demo dev
# abre em http://localhost:3000
```

Outros comandos úteis:

```bash
pnpm --filter @videira/demo build   # build de produção (valida tipos)
pnpm build                          # build de todos os workspaces (Turborepo)
```

Para encerrar e liberar a porta 3000:

```bash
pkill -f "next dev"
```

Na demo, use o alternador **Equipe ⟷ Membro** no topo: a visão Equipe traz Pessoas e Ensino (administrativo); a visão Membro abre a **área do aluno** com os cursos e o player de aula. Detalhes em [`apps/demo/README.md`](apps/demo/README.md).

## Módulos planejados

1. Pessoas *(núcleo)*
2. Ensino
3. Apoio Pastoral (SOM)
4. Gestão de Cultos
5. Grupos de Crescimento
6. Eventos
7. Crianças
8. Ministérios e Voluntários
9. Espaços e Recursos
10. Estoque (WMS)
11. Compras
12. Financeiro
13. Equipamentos Técnicos
14. Comunicação
15. Portal e App da Igreja
16. TAP e Engajamento Digital

## Gate antes de codar

Nenhum módulo deve iniciar implementação apenas por ter visão e backlog. Antes da primeira migration/tela, o módulo precisa ter:

- contrato explícito com Pessoas, permissões, auditoria e eventos de domínio;
- matriz LGPD por entidade e fluxo;
- critérios de aceite testáveis;
- regras de exceção e operação sob pressão;
- status no índice de qualidade como `Pronto para Fase 0` ou superior.

## Como usar este repositório

Monorepo com documentação de produto (`docs/`) e código da plataforma (`apps/`, `packages/`), além dos agentes de IA (`agents/`).

Para colaborar, leia primeiro:
- [`COLLABORATION.md`](COLLABORATION.md) — protocolo de trabalho para todos os colaboradores e agentes
- [`AI-INSTRUCTIONS.md`](AI-INSTRUCTIONS.md) — guia específico para agentes de IA

> Repositório privado. Acesso restrito à equipe do projeto.
