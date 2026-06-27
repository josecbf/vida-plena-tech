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

> **Senha de TODOS os logins: `demo1234`**

Cada papel enxerga um escopo diferente (validação real, no backend, não só na interface).
Os logins são criados pelo `pnpm db:seed` — se o login falhar com "Credenciais inválidas",
quase sempre o seed não rodou (ou o Postgres não está no ar).

### Logins principais

| Papel | E-mail | Senha | O que enxerga |
|---|---|---|---|
| Administrativo | `admin@vidaplena.org` | `demo1234` | Tudo do tenant — **exceto** observações pastorais sensíveis |
| Pastor Sênior | `senior@vidaplena.org` | `demo1234` | Tudo, **incluindo** observações pastorais |
| Pastor de Área | `pastor@vidaplena.org` | `demo1234` | Sua área — vê observações pastorais no escopo |
| Coordenador | `coordenador@vidaplena.org` | `demo1234` | GCs sob sua coordenação |
| Supervisor | `supervisor@vidaplena.org` | `demo1234` | GC Graça e GC Esperança (sua supervisão) |
| Líder de GC | `lider@vidaplena.org` | `demo1234` | Apenas o GC Graça e suas pessoas |
| Membro | `membro@vidaplena.org` | `demo1234` | Apenas seus próprios dados, eventos e inscrições |

### Logins extras (para testar diferença de escopo)

| Papel | E-mail | Senha | Escopo |
|---|---|---|---|
| Supervisor (2) | `supervisor2@vidaplena.org` | `demo1234` | GC Aliança e GC Restauração (não vê os do supervisor 1) |
| Líder de GC | `lider2@vidaplena.org` | `demo1234` | Apenas o GC Esperança |
| Líder de GC | `lider3@vidaplena.org` | `demo1234` | Apenas o GC Aliança |
| Líder de GC | `lider4@vidaplena.org` | `demo1234` | Apenas o GC Restauração |

> **Dica de teste de escopo:** entre como `lider@` (vê só o GC Graça), depois `supervisor@`
> (vê Graça + Esperança) e `supervisor2@` (vê Aliança + Restauração) — confirme que um não
> enxerga os GCs do outro. Como `admin@`/`senior@`, você vê o tenant inteiro.

### Páginas públicas (sem login)

- **Cadastro público:** `/cadastro`
- **Cadastro por link de GC (exemplo seedado):** `/cadastro/gc/gc-graca-demo`
- **Inscrição pública em evento:** `/e/[id]` (pegue o id no card "Inscrição pública" do detalhe do evento)

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
13. **Edição de contato persiste** — alterar e-mail/telefone/WhatsApp na edição da pessoa
    grava em `ContactMethod` e aparece na ficha; esvaziar o campo remove o contato.
14. **Endereço** — preencher rua/número/complemento/bairro/cidade/UF/CEP na edição grava em
    `Address` e aparece na ficha.
15. **Inscrição pública em evento** (`/e/[id]`) — sem login, cria visitante (origem
    `EVENT_PUBLIC`) e inscrição, com dedup por CPF e aviso de possível duplicidade.
16. **Auditoria de leitura de nota pastoral** — quando um pastor abre a ficha de quem tem
    observação pastoral, é gravado um `AuditLog` com `action: read_sensitive` em `/auditoria`.
17. **Transferência de pessoa fora do escopo é bloqueada** no backend — um líder não consegue
    transferir alguém de outro GC (exige `groups.membership.manage` + pessoa visível).
18. **Presença e inscrição validadas no backend** — `personId` fora do GC/escopo é recusado.
19. **`ExternalMapping` é polimórfico** (sem FK direta) — pronto para mapear Person, GC, Event,
    GrowthGroupMeeting, EventRegistration, Course etc. na importação Prover.

---

## Roteiro de teste das correções

1. **Edição de contato + endereço:** entre como `admin@` → uma pessoa → *Editar* → altere
   e-mail/telefone/WhatsApp e preencha o endereço → salvar. Veja os valores na ficha. Volte,
   apague o e-mail e salve → o contato some. (Em `/auditoria`, aparece `people.update`.)
2. **Inscrição pública em evento:** abra `/e/<id-de-evento-publicado>` numa aba anônima (pegue
   o id no card "Inscrição pública" do detalhe do evento, como `admin@`). Inscreva-se com nome
   + WhatsApp → confirma. Repita com um CPF já existente → reaproveita o cadastro. Veja a nova
   pessoa (origem *Inscrição em evento*) e a inscrição na ficha e em `/auditoria`.
3. **Auditoria de nota pastoral:** como `pastor@` ou `senior@`, abra a ficha de **Marcos Vieira**
   (tem observação pastoral seedada) → em `/auditoria` surge `people.read_sensitive` (CONFIDENTIAL).
   Como `admin@`/`lider@`, a observação **não** aparece.
4. **Transferência fora de escopo (bloqueio):** como `lider@` (GC Graça), tente transferir uma
   pessoa que não é do seu GC — a opção não aparece para pessoas fora do escopo, e qualquer
   tentativa forçada falha no backend. Como `admin@`/`senior@`, transfira qualquer pessoa.
5. **Presença validada no backend:** o registro de presença só aceita membros ativos do GC ou
   pessoas no seu escopo; ids fora disso são recusados.
6. **Batismo:** marque "Batizado" sem data → o backend recusa; desmarque → a data é zerada.

### Rodada pré-Prover (2ª) — novos ajustes

7. **Possível duplicidade NÃO bloqueia:** em `/cadastro`, cadastre alguém (nome + telefone).
   Repita com o **mesmo nome e telefone, sem CPF** → aparece o aviso amarelo **e** o botão
   **"Continuar mesmo assim"**. Clique → o cadastro é criado. Em `/auditoria`, o registro traz o
   motivo "criado apesar de possível duplicidade". Vale igual em `/cadastro/gc/[token]` e `/e/[id]`.
8. **CPF duplicado/ inválido ainda bloqueiam:** um CPF válido já existente → bloqueia (sem botão
   de continuar); CPF inválido → bloqueia.
9. **Captura de CPF pelo líder:** como `lider@`, edite uma pessoa do GC Graça **sem CPF** → o
   campo CPF fica **editável**; preencha um CPF válido e salve (em `/auditoria` surge
   `people.cpf_captured`, CONFIDENTIAL). Edite alguém que **já tem CPF** → o campo fica
   **bloqueado** (líder não altera CPF existente). Como `admin@`, o CPF é sempre editável.
10. **Pessoa via evento público é auditada em Pessoas:** ao se inscrever em `/e/[id]` sem cadastro
    prévio, `/auditoria` mostra **dois** registros — `people.create` (criação da pessoa) e
    `events.registration_created` (a inscrição).

> Planos preparados:
> [`docs/modules/prover-import-plan.md`](../../docs/modules/prover-import-plan.md) e
> [`docs/modules/leadership-unit-plan.md`](../../docs/modules/leadership-unit-plan.md).

---

## Importação Prover — Fase 1 (Pessoas), modo DRY-RUN

> **Dry-run NÃO cria nem altera pessoas.** Só lê o export, simula deduplicação/classificação e
> grava `ImportBatch` + `ImportBatchItem` para análise. Nunca escreve no Prover. O modo `apply`
> (criação real) **não** está implementado ainda — ver `docs/modules/prover-import-plan.md`.

### Onde colocar o export

O export do Prover é um **ZIP de JSONs**. Coloque-o em `apps/vida-plena-tech/data/` (essa pasta é
**gitignored** — exports reais contêm dados pessoais e **nunca** devem ser commitados). Esta fase
usa apenas o `pessoas.json` de dentro do ZIP.

### Comando

```bash
# precisa do banco no ar + seed (para o tenant existir)
pnpm prover:dry-run --file ./data/export_prover_2026-06-27.zip
```

Para um teste rápido sem ZIP, existe um sample **fictício** versionado:

```bash
pnpm prover:dry-run --file ./samples/prover/pessoas.sample.json
```

### Exemplo de saída

```
▶ Lendo export: ./samples/prover/pessoas.sample.json
  pessoas.json encontrado — 6 registro(s).
  Tenant: Comunidade Vida Plena (vida-plena)
  Modo: DRY-RUN — nenhuma pessoa será criada/alterada.

  RELATÓRIO DRY-RUN — Prover Pessoas (Fase 1)
  Total de registros lidos.................. 6
  Seriam criados (WOULD_CREATE)............. 5
  Match por ExternalMapping................. 0
  Match por CPF............................. 0
  Possível duplicidade (revisão)............ 0
  Falhas.................................... 1
  CPF válido / ausente / inválido / placeholder ... 2 / 3 / 0 / 1
  Membro sem CPF válido (pendência)......... 1
  Membro aguardando validação de GC......... 3
  Papéis pretendidos: GC_LEADER=1 ...
  ImportBatch criado: <id>  (consulte em /prover)
```

Os lotes ficam visíveis na tela **/prover** (admin). A classificação granular de cada item
(`WOULD_CREATE`, `MATCHED_BY_CPF`, `POSSIBLE_DUPLICATE_REVIEW`, …) fica no campo `message` do
`ImportBatchItem`.

### Testes das funções puras

```bash
pnpm prover:test     # valida CPF, normalização de status, separação papel/cargo, dedup…
```

### Próximos passos (modo apply — fora desta rodada)

Criar real de `Person`/contato/endereço + `ExternalMapping` idempotente, papéis pretendidos,
relatório de conflitos acionável e, depois, as fases de GC/eventos. Detalhe no plano.

---

## Telas

Login · Dashboard · Pessoas (lista, criar, editar [com contatos e endereço], ficha, família,
timeline) · Cadastro público · Cadastro por GC · **Inscrição pública em evento (`/e/[id]`)** ·
GCs (lista, detalhe, link de cadastro, criar encontro, registrar presença) · Eventos (lista,
criar, detalhe, minhas inscrições) · Auditoria · Usuários e papéis · Módulos · Importação Prover.

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
