# Vida Plena Tech — Demo local

Plataforma modular para igrejas. Esta é a **primeira demo local funcional**, com o
**Core** + os módulos **Pessoas**, **Grupos de Crescimento** e **Eventos (básico)**,
auditoria, eventos de domínio e estrutura preparada para Prover e Ensino/EAD.

> **Norte:** ajudar igrejas a operar com excelência sem perder o cuidado pastoral.

Arquitetura = **monólito modular** (não microsserviços). Um Core comum; cada módulo
é separado por domínio mas consome o mesmo Core. **Nenhum módulo cria cadastro
paralelo de pessoa** — tudo aponta para o `Person` canônico.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **PostgreSQL** + **Prisma** (ORM/migrations)
- **Tailwind CSS v4** + componentes no estilo **shadcn/ui** (código no repo)
- **Docker Compose** (Postgres local)
- Autenticação **de demonstração** (cookie httpOnly assinado + bcrypt)
- Pronto para deploy futuro em **Vercel + Neon**

---

## Como rodar (do zero)

Pré-requisitos: **Node 20+**, **pnpm**, **Docker** (para o Postgres).

```bash
# a partir da raiz do monorepo
pnpm install

cd apps/vida-plena-tech

# 1) variáveis de ambiente
cp .env.example .env.local
cp .env.example .env        # o Prisma CLI lê o .env

# 2) sobe o Postgres local (porta 5433)
docker compose up -d

# 3) cria o schema no banco
pnpm db:migrate             # aplica as migrations (prisma migrate dev)

# 4) popula com dados fictícios
pnpm db:seed

# 5) roda o app
pnpm dev                    # http://localhost:3000
```

> A partir da **raiz do monorepo** também funciona via Turborepo:
> `pnpm --filter @vidaplena/web dev`.

### Scripts úteis

| Script | O que faz |
|---|---|
| `pnpm dev` | Sobe o Next em modo desenvolvimento |
| `pnpm build` | Build de produção (roda `prisma generate` antes) |
| `pnpm db:migrate` | Aplica migrations em dev |
| `pnpm db:migrate:deploy` | Aplica migrations em produção/CI |
| `pnpm db:seed` | Popula o banco com os dados de demo |
| `pnpm db:reset` | **Apaga** o banco, reaplica migrations e roda o seed |
| `pnpm db:studio` | Abre o Prisma Studio |
| `pnpm typecheck` | `tsc --noEmit` |

---

## Credenciais de demonstração

Todos os logins usam a senha **`demo1234`**. Cada papel enxerga um escopo diferente
(validação real, no backend, não só na interface).

| Papel | E-mail | O que enxerga |
|---|---|---|
| Administrativo | `admin@vidaplena.org` | Tudo do tenant — **exceto** observações pastorais sensíveis |
| Pastor Sênior | `senior@vidaplena.org` | Tudo, **incluindo** observações pastorais |
| Pastor de Área | `pastor@vidaplena.org` | Sua área — vê observações pastorais no escopo |
| Coordenador | `coordenador@vidaplena.org` | GCs sob sua coordenação |
| Supervisor | `supervisor@vidaplena.org` | GCs sob sua supervisão (GC Graça, GC Esperança) |
| Líder de GC | `lider@vidaplena.org` | Apenas o seu GC (GC Graça) e suas pessoas |
| Membro | `membro@vidaplena.org` | Apenas seus próprios dados, eventos e inscrições |

Cadastro público (sem login):
- **Formulário público:** `/cadastro`
- **Link por GC (exemplo seedado):** `/cadastro/gc/gc-graca-demo`

---

## O que dá para validar (critérios de aceite)

1. **Roda local com Docker** — `docker compose up -d` + migrate + seed.
2. **Cadastro público funciona** (`/cadastro`) e cria pessoa como **Visitante**.
3. **Link de GC vincula a pessoa ao GC** (`/cadastro/gc/gc-graca-demo`).
4. **Visitante só vira Membro com GC + CPF** (tente promover sem um deles → bloqueia).
5. **Líder vê só o seu GC**; **Supervisor não vê GC fora do escopo** (compare `lider@` × `supervisor@` × `supervisor2@`).
6. **Membro vê apenas os próprios dados**; **Admin vê tudo**.
7. **Mudança de GC e de status geram AuditLog** (veja em `/auditoria`).
8. **Inscrição em evento gera AuditLog + Timeline** (ficha da pessoa).
9. **Observação pastoral não aparece** para membro/líder/admin — só pastores.
10. **CPF aparece mascarado** para não-admin (`***.***.***-XX`).
11. **Estrutura Prover existe sem chamada real** (`/prover`).
12. **Ensino/EAD documentado** como próxima fase, não implementado.

---

## Telas

Login · Dashboard · Pessoas (lista, criar, editar, ficha, família, timeline) ·
Cadastro público · Cadastro por GC · GCs (lista, detalhe, link de cadastro,
criar encontro, registrar presença) · Eventos (lista, criar, detalhe, minhas
inscrições) · Auditoria · Usuários e papéis · Módulos · Importação Prover.

---

## Estrutura do código (separação por domínio)

```
src/
  app/                      # rotas (App Router)
    (app)/                  # área autenticada (layout com sidebar por permissão)
    login/  cadastro/       # rotas públicas
  server/                   # transversais do Core
    db.ts                   # Prisma client (singleton)
    auth.ts                 # sessão (cookie JWT) + bcrypt — DEMO
    context.ts              # AuthContext + escopo (quem vê o quê)
    rbac.ts                 # permissões modulo.recurso.acao, deny-by-default
    audit.ts                # writeAudit + emitEvent + addTimeline (transacionais)
  modules/                  # domínios isolados
    core/                   # auth actions
    people/                 # ações de Pessoas + cadastro público
    groups/                 # GCs (encontro, presença, transferência, link)
    events/                 # Eventos básico
    integrations/prover/    # contrato Prover (somente leitura, sem chamada real)
  components/ui/            # componentes estilo shadcn
  lib/                      # utils, máscara de CPF, rótulos
prisma/
  schema.prisma            # modelo canônico
  migrations/              # migration inicial
  seed.ts                  # dados fictícios
```

Veja também:
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — decisões de arquitetura da demo.
- [`../../docs/modules/ensino-ead-next.md`](../../docs/modules/ensino-ead-next.md) — próximo módulo (Ensino/EAD).
- [`../../docs/modules/prover-import-next.md`](../../docs/modules/prover-import-next.md) — próximos passos da importação Prover.

---

## Avisos importantes

- **Autenticação é de DEMONSTRAÇÃO.** Cookie de sessão assinado + bcrypt, estruturado
  perto de produção, mas sem refresh tokens, rate-limit, verificação de e-mail nem MFA.
  Não use como está em produção.
- **Isolamento multi-tenant** é garantido aqui na **camada de aplicação** (todo acesso
  passa por `tenantId` e pelo escopo do usuário). Em produção, somar **Postgres RLS** —
  ver [`ARCHITECTURE.md`](ARCHITECTURE.md).
- **Nenhum segredo é commitado.** Segredos vivem em `.env.local` (no `.gitignore`).
  `AUTH_SECRET` e `PROVER_*` nunca aparecem no código.
- **Prover é somente leitura.** Nunca escrevemos no Prover.
