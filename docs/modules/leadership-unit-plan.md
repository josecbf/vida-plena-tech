# Liderança por pessoa, dupla, casal/casa ou equipe — modelo `LeadershipUnit`

Documento de planejamento. **Não implementado nesta rodada** — a demo continua com
**líder principal + líder auxiliar** (`GrowthGroup.leaderId` + `assistantId`). Aqui fica o
modelo-alvo e o plano de migração, para não quebrar a demo agora e preparar a próxima migration.

## Por que mudar

Na prática da igreja, a liderança de GC / supervisão / coordenação / pastor de área quase
nunca é "uma pessoa". Costuma ser **um casal/casa** (`José | Bruna`), às vezes **uma equipe**,
e às vezes **uma pessoa só** (contextos de homens, mulheres, liderança individual).

Prender liderança a campos únicos (`leaderPersonId`, `supervisorPersonId`, …) modela errado o
domínio e gera retrabalho. O alvo é uma **unidade de liderança** reutilizável.

## Modelo-alvo

```
LeadershipUnit
  id            String   @id
  tenantId      String
  name          String   // nome público, ex.: "José | Bruna"
  type          LeadershipUnitType  // INDIVIDUAL | COUPLE | HOUSEHOLD | TEAM
  active        Boolean  @default(true)
  createdAt / updatedAt / archivedAt
  members       LeadershipUnitMember[]

LeadershipUnitMember
  id              String @id
  tenantId        String
  leadershipUnitId String
  personId        String           // pessoa real (Core)
  role            LeadershipMemberRole  // PRIMARY=Líder 1 | SECONDARY=Líder 2 | IN_TRAINING | SPOUSE | ASSISTANT(legado) | TEAM_MEMBER
  active          Boolean @default(true)
  @@unique([leadershipUnitId, personId])

enum LeadershipUnitType { INDIVIDUAL  DUAL  COUPLE  HOUSEHOLD  TEAM }
enum LeadershipMemberRole { PRIMARY  SECONDARY  SPOUSE  ASSISTANT  IN_TRAINING  TEAM_MEMBER }
```

> **Nomenclatura (regra de produto):** com duas pessoas na liderança, a segunda é **Líder 2**,
> não "auxiliar". `PRIMARY` = Líder 1, `SECONDARY` = Líder 2. O campo legado
> `GrowthGroup.assistantId` (antigo "auxiliar") corresponde ao conceito de **Líder 2**.

E os domínios passam a apontar para a unidade (não para uma pessoa):

```
GrowthGroup.leadershipUnitId   → LeadershipUnit
Supervision.leadershipUnitId   → LeadershipUnit   (nova entidade de supervisão)
Coordination.leadershipUnitId  → LeadershipUnit   (nova entidade de coordenação)
PastoralArea.leadershipUnitId  → LeadershipUnit   (nova entidade de área)
```

> Nesta demo, supervisão/coordenação/área ainda são modeladas como **campos na cadeia do GC**
> (`supervisorId`, `coordinatorId`, `areaPastorId` em `GrowthGroup`, apontando para
> `TenantMembership`). A evolução é extrair `Supervision`/`Coordination`/`PastoralArea` como
> entidades próprias, cada uma com sua `LeadershipUnit`.

## Princípio inegociável: permissão resolve por PESSOA

Mesmo quando a liderança é por casa/casal/equipe, **o acesso ao sistema é individual**:

- a `LeadershipUnit` agrupa pessoas, mas **não** concede acesso "à família";
- **só** os `LeadershipUnitMember` ativos (com `personId` ligado a um `User`/`TenantMembership`
  ativo) recebem o escopo daquela unidade;
- a resolução de escopo (hoje em `server/context.ts`) passaria a ser: "de quais unidades de
  liderança esta pessoa é membro ativo?" → e daí os GCs/supervisões/áreas correspondentes.

Exemplo: GC liderado pela casa `José | Bruna`. José e Bruna têm cada um seu usuário. Ambos
acessam o mesmo escopo de liderança **porque ambos são membros ativos da unidade** — não porque
são "família". Se Bruna sair da unidade, perde o acesso; o histórico permanece.

## Auditoria com `LeadershipUnit`

A auditoria deve registrar sempre **quem** executou, mesmo agindo "em nome" da unidade:

- `actorUserId` → usuário José
- `actorPersonId` → pessoa José
- contexto opcional → `leadershipUnitId` = José | Bruna

Ou seja: ação atribuída à **pessoa real** que clicou, com a unidade como contexto. (Hoje o
`AuditLog` já tem `actorUserId` + `actorPersonId`; bastaria acrescentar um campo opcional
`onBehalfOfLeadershipUnitId` quando a refatoração acontecer.)

## Plano de migração (próxima rodada, NÃO agora)

1. **Migration aditiva** — criar `LeadershipUnit` + `LeadershipUnitMember` + enums. Nada quebra
   (tabelas novas, vazias).
2. **Backfill** — para cada `GrowthGroup` atual: criar uma `LeadershipUnit` (`INDIVIDUAL` se só
   `leaderId`; `DUAL`/`TEAM` se houver `assistantId`/Líder 2), com membros `PRIMARY` (Líder 1) e
   `SECONDARY` (Líder 2 = antigo `assistantId`). Popular `GrowthGroup.leadershipUnitId`.
3. **Dupla escrita temporária** — manter `leaderId`/`assistantId` e `leadershipUnitId` em sincronia
   por um período (compatibilidade), com a leitura migrando para a unidade.
4. **Trocar a resolução de escopo** em `server/context.ts` para usar `LeadershipUnitMember`.
5. **Extrair** `Supervision`/`Coordination`/`PastoralArea` como entidades com `leadershipUnitId`,
   substituindo os campos `supervisorId`/`coordinatorId`/`areaPastorId` da cadeia do GC.
6. **Remover** os campos únicos antigos quando a leitura não depender mais deles.

## Prioridade desta rodada (cumprida)

1. ✅ **Não quebrar a demo** — schema atual mantido (`leaderId` + `assistantId`).
2. ✅ **Modelo planejado** — este documento.
3. ✅ **Permissão resolve por pessoa** — já é assim hoje (escopo via cadeia de liderança do GC,
   resolvido por `personId`/`membershipId`); o modelo futuro preserva esse princípio.
4. ✅ **Auditoria registra a pessoa que executou** — `AuditLog.actorUserId`/`actorPersonId` já
   fazem isso; o contexto de unidade entra como campo opcional na refatoração.

## Importação Prover e liderança (resumo — detalhe em `prover-import-plan.md`)

- importar **liderança individual primeiro**;
- Líder 1 + Líder 2 no Prover → **sugerir** `LeadershipUnit` `DUAL` (ou `COUPLE`/`HOUSEHOLD`/`TEAM`
  só com sinal confiável), para revisão humana;
- uma pessoa só → `LeadershipUnit` `INDIVIDUAL`;
- casal detectável (vínculo familiar / padrão de nome `A | B`) com **alta confiança** → sugerir
  agrupamento; caso contrário, importar individual e gerar relatório;
- **nunca** inferir casal automaticamente sem confiança alta.
