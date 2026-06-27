# Arquitetura — Demo Vida Plena Tech

Documento curto. O contexto completo de produto/arquitetura está em
[`../../docs/`](../../docs/) (Modelo de Dados Canônico, Permissões, LGPD, Eventos de Domínio).

## Princípio: monólito modular

Um único app/banco. O **Core** concentra as primitivas (tenant, campus, identidade,
pessoa, papéis, auditoria, eventos). Cada **módulo** (Pessoas, GCs, Eventos, Ensino
futuro) é separado por domínio em `src/modules/<modulo>`, mas **consome o Core** —
nenhum módulo reinventa pessoa, usuário, permissão ou auditoria.

Consequência prática: se um cliente contratar **só Ensino** no futuro, ele ainda usa um
`Person` mínimo do Core. O módulo Pessoas completo apenas **enriquece** esse cadastro.

## Multi-tenancy

- Toda entidade operacional tem `tenantId` (FK para `Tenant`).
- Uniques compostas por tenant (ex.: `@@unique([tenantId, cpf])`).
- O isolamento é aplicado em **duas camadas conceituais**; nesta demo, a primeira:
  1. **Aplicação (implementado):** todo acesso passa por `server/context.ts`, que
     resolve o `AuthContext` e filtra queries por `tenantId` + escopo do usuário.
  2. **Banco (produção):** adicionar **Postgres Row-Level Security (RLS)** com
     `tenant_id = current_setting(...)`, como exige o modelo canônico. Não habilitado
     na demo por usar Prisma sem variável de sessão por request.

A demo seeda **um tenant** (Comunidade Vida Plena), mas o schema já nasce multi-tenant.

## Permissões e escopo (RBAC + cadeia de liderança)

- Permissões no padrão `modulo.recurso.acao`, **deny-by-default**, validadas **no backend**
  (`server/rbac.ts` + guards em `server/context.ts`). A UI só esconde o que o backend já nega.
- **Papel ≠ status eclesiástico.** Papéis (ADMIN, GC_LEADER, …) ficam em `RoleAssignment`;
  o status (VISITOR, MEMBER, …) fica em `Person.status`. Uma pessoa pode ser `MEMBER`
  (status) e `GC_LEADER` (papel) ao mesmo tempo.
- **Escopo** = quem o usuário enxerga. Resolvido pela **cadeia de liderança do GC**
  (`leaderId`, `supervisorId`, `coordinatorId`, `areaPastorId`):
  - GC_LEADER → pessoas dos seus GCs (vínculos **ativos**);
  - SUPERVISOR/COORDINATOR/AREA_PASTOR → GCs onde figuram na cadeia;
  - SENIOR_PASTOR/ADMIN → tenant inteiro.
- **Líder antigo perde acesso** quando a pessoa muda de GC: o vínculo antigo recebe
  `leftAt` e sai do escopo; o histórico e os logs **permanecem** (só não são mais visíveis a ele).

### Dados sensíveis

- **CPF:** sensível. Mascarado (`***.***.***-XX`) para quem não tem `people.cpf.view_full`
  (na demo, só ADMIN). Não-admin nunca recebe o CPF completo nem consegue alterá-lo.
- **Observações pastorais:** `people.timeline_sensitive.view` é concedida **apenas** a
  AREA_PASTOR e SENIOR_PASTOR (decisão do dono). É a **exceção deliberada** ao "admin vê
  tudo" — segregação de função, alinhada ao doc de LGPD. As notas só são *carregadas* se
  o usuário pode vê-las (deny-by-default no servidor, não só na UI).

## Auditoria e eventos de domínio (outbox transacional)

`server/audit.ts` expõe `writeAudit`, `emitEvent` e `addTimeline`, sempre recebendo o
**mesmo `tx`** da mutação. Logo, a escrita de domínio, a auditoria, o evento canônico e a
linha do outbox vivem na **mesma transação** — ou tudo grava, ou nada grava (padrão outbox).

Na demo **não há publicador rodando**: o `DomainEventOutbox` acumula linhas `PENDING`.
Em produção, um **worker persistente** (ver ADR-0001 / Opção 1.5) lê `PENDING` e publica.

Eventos canônicos emitidos: `person.created`, `person.updated`, `person.status_changed`,
`person.family_linked`, `person.gc_changed`, `gc.created`*, `gc.meeting_created`,
`gc.attendance_recorded`, `event.created`, `event.registration_created`,
`event.registration_cancelled`. (*`gc.created` é seedado; criação de GC pela UI fica para depois.)

## Soft delete

Deleção operacional é **soft delete** (`archivedAt`/`deletedAt`/`leftAt`/`cancelledAt`,
conforme a entidade). Histórico (status, GC, família, presenças) nunca é apagado.

## Integração Prover (preparada, sem chamada real)

`src/modules/integrations/prover` traz a interface `ProverClient` (**somente leitura**),
tipos, leitura de config por env e um stub que recusa operar até haver configuração.
Entidades de suporte no schema: `ExternalMapping` (idempotência), `ImportBatch`,
`ImportBatchItem`. Tela `/prover` mostra o estado "aguardando configuração". O Prover virá
como ZIP de JSONs; **nunca escrevemos no Prover**.

## Decisões e divergências registradas

- **Auth de demonstração** (cookie JWT + bcrypt), não produção.
- **RLS adiado** para produção (isolamento por aplicação na demo).
- **Admin não vê nota pastoral** — segue o complemento do dono (item 10), divergindo do
  rascunho inicial que citava "AREA_PASTOR e ADMIN".
- **Status do Prover** que misturavam cargo e status foram **separados**: cargos viram
  `RoleKey`, status viram `EclesiasticalStatus` (mapa em `prover/types.ts`).

## Deploy futuro (Vercel + Neon)

- Banco gerenciado no **Neon** (Postgres serverless); `DATABASE_URL` aponta para lá.
- `pnpm db:migrate:deploy` aplica migrations no CI.
- App na **Vercel** com Root Directory = `apps/vida-plena-tech`.
- Habilitar **RLS** e mover o publicador do outbox para um worker persistente.
