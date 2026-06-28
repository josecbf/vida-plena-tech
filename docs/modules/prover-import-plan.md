# Plano técnico de importação Prover → Vida Plena Tech

**Status: PLANO. Nada é importado ainda.** Esta rodada entrega só o plano, os tipos/base e o
contrato. A importação real é a próxima fase, começando **por Pessoas**.

Complementa [`prover-import-next.md`](prover-import-next.md) (visão geral) e
[`leadership-unit-plan.md`](leadership-unit-plan.md) (liderança por casa/casal/equipe).

## Premissas (invariantes)

- **Prover é somente leitura. NUNCA escrever no Prover.**
- Export vem como **ZIP de JSONs**.
- Importador **idempotente** (reprocessar o mesmo export não duplica).
- Usa `ExternalMapping` (polimórfico), `ImportBatch` e `ImportBatchItem`.
- **Primeira importação real começa por Pessoas**, não por GC/eventos/ensino.
- Chave de API / arquivos ficam fora do código (`.env.local`); nada de segredo commitado.

## Arquivos do export (primeira fase)

| Arquivo | Entidade Prover | Fase |
|---|---|---|
| `pessoas.json` | Pessoas | 1 |
| `grupos.json` | GCs | 2 |
| `grupos_participantes.json` | Participantes de GC | 2 |
| `grupos_visitantes.json` | Visitantes de GC | 2 |
| `grupos_encontros.json` | Encontros | 3 |
| `grupos_encontros_participantes.json` | Presenças (membros) | 3 |
| `grupos_encontros_visitantes.json` | Presenças (visitantes) | 3 |
| `evento_eventos.json` | Eventos | 4 |
| `evento_inscritos_eventos.json` | Inscrições | 4 |
| `evento_presenca_eventos.json` | Presença em evento | 4 |

Ensino/EAD → fase futura (fora desta importação).

---

## 1. Ordem de importação (por fases)

1. **Pessoas** (`pessoas.json`) — base de tudo; cria `Person` + `ExternalMapping`.
2. **GCs** (`grupos.json`) — cria `GrowthGroup`; liderança vinculada **depois** de Pessoas.
3. **Participação em GC** (`grupos_participantes.json`, `grupos_visitantes.json`).
4. **Encontros e presenças** (`grupos_encontros*.json`).
5. **Eventos** (`evento_*.json`) — `Event` + `EventRegistration` (+ presença simples).

Cada fase só roda depois da anterior concluída, porque depende dos `ExternalMapping` criados.

## 2. Mapeamento Prover → Vida Plena Tech

### Pessoas (`pessoas.json`)

| Campo Prover | Destino VPT |
|---|---|
| `pessoa_uuid` | `ExternalMapping.externalId` (externalType=`person`) |
| `pessoa_nome` | `Person.fullName` |
| `pessoa_cpf` | `Person.cpf` — **apenas se válido** (ver §5/§6) |
| `pessoa_nascimento` | `Person.birthDate` |
| `pessoa_sexo` | `Person.sex` (`Sex`) |
| `estadocivil` | `Person.maritalStatus` (`MaritalStatus`) |
| `pessoa_email` | `ContactMethod` `EMAIL` |
| `pessoa_celular` | `ContactMethod` `WHATSAPP` (fallback `PHONE`) |
| endereço (rua/número/bairro/cidade/uf/cep) | `Address` (um principal) |
| `pessoa_status` (ATIVO/INATIVO) | status eclesiástico (ver §3) |
| `pessoa_tipo` / `pessoa_subtipo` | status **e/ou** papel — **nunca copiar cru** (§3/§4) |
| ocorrências / flags | batismo, TD, tags ou histórico, conforme disponível |

### GCs (`grupos.json`)

| Campo Prover | Destino VPT |
|---|---|
| `grupo_id` | `ExternalMapping.externalId` (externalType=`growth_group`) |
| `grupo_nome` | `GrowthGroup.name` |
| `grupo_status` | `GrowthGroup.active` |
| Líder 1 / Líder 2 (UUIDs de pessoa) | liderança (ver §15) — vincular após Pessoas |
| endereço/local | `GrowthGroup.location` |
| supervisor/coordenador/área (UUIDs) | cadeia de escopo (`supervisorId`/`coordinatorId`/`areaPastorId`) |

## 3. Normalização de status (eclesiástico)

- `pessoa_tipo = Visitante` → `VISITOR`
- `pessoa_subtipo = MEMBRO` → `MEMBER` **somente se** os dados mínimos permitirem (CPF válido +
  GC); senão, importar como `REGULAR_ATTENDER` e gerar **pendência** (ver §6).
- `pessoa_status = INATIVO` → `INACTIVE` (salvo regra mais específica futura).
- excluído/transferido → `ARCHIVED` ou `TRANSFERRED`, **se houver campo confiável**; sem campo
  confiável, não inventar — manter status atual e marcar para revisão.

## 4. Separação status × papel/cargo (regra dura)

**Nunca** transformar cargo em status. `LIDER GC`, `SUPERVISOR`, `COORDENADOR(A)`,
`PASTOR DE AREA`, `PASTOR SENIOR` **não** são status eclesiástico — viram **papel**
(`RoleAssignment`):

| Valor Prover | `RoleAssignment.role` |
|---|---|
| `LIDER GC` | `GC_LEADER` |
| `SUPERVISOR` | `SUPERVISOR` |
| `COORDENADOR(A)` | `COORDINATOR` |
| `PASTOR DE AREA` | `AREA_PASTOR` |
| `PASTOR SENIOR` | `SENIOR_PASTOR` |

Uma pessoa pode ter **status `MEMBER` + papel `GC_LEADER`** ao mesmo tempo. O papel exige um
`User`/`TenantMembership` (acesso individual) — criado/convidado à parte; a importação registra
a **intenção de papel** e o escopo, mas não cria login automaticamente sem decisão.

## 5. Validação de CPF

- CPF passa por validação de dígitos verificadores (mesma de `lib/format.ts:isValidCpf`).
- **CPF válido = chave forte de deduplicação.**
- CPF válido que conflita com **outra** pessoa já existente → **conflito** para revisão (§11),
  nunca merge automático.

## 6. CPF inválido / zerado / placeholder = CPF ausente

Tratar como **ausente** (não bloquear a importação da pessoa, só não gravar o CPF):

- `00000000000` e sequências repetidas (`11111111111`, …);
- vazio / nulo / espaços;
- placeholders (`12345678900`, máscaras sem dígitos, texto);
- qualquer valor que **não** passe na validação.

Regra de membresia: visitante pode ficar sem CPF. **Membro oficial precisa de CPF válido** — se
vier `MEMBRO` sem CPF válido, importar como frequentador/membro-pendente e **gerar relatório de
pendência** (não promover a `MEMBER` sem CPF).

## 7. Deduplicação

Ordem de chaves:

1. **`ExternalMapping`** (`pessoa_uuid`) — se já importado antes, é a mesma pessoa (idempotência).
2. **CPF válido** — bate com pessoa existente → mesma pessoa (ou conflito se divergir do mapping).
3. **Sem CPF** — heurística nome + contato (telefone/e-mail) → **sugestão** de duplicidade para
   revisão humana; **não** mesclar automaticamente (alinhado ao fluxo público "Continuar mesmo
   assim").

## 8. `ExternalMapping` (idempotência)

- `system = "PROVER"`, `externalType` (`person`/`growth_group`/`event`/…), `externalId` (uuid Prover),
  `internalType` + `internalId` (entidade VPT). É **polimórfico** (sem FK) — já preparado no schema.
- Unique `[tenantId, system, externalType, externalId]` garante que reprocessar não duplica.
- Antes de criar qualquer entidade, **consultar** o mapping; se existir, **atualizar** (não criar).

## 9. `ImportBatch` / `ImportBatchItem`

- Cada execução = um `ImportBatch` (status `PROCESSING` → `COMPLETED`/`FAILED`, contadores
  `total/created/matched/skipped/failed`).
- Cada registro = um `ImportBatchItem` (`rawJson`, `externalId`, `status`
  `CREATED`/`MATCHED`/`SKIPPED`/`FAILED`, `message`).
- Permite auditar, reprocessar e gerar relatório por lote.

## 10. Modo dry-run

- **Padrão da primeira execução = dry-run.** Lê os JSONs, roda toda a lógica (validação, dedup,
  mapeamento, detecção de conflito) e **grava só o `ImportBatch`/`ImportBatchItem` simulados**
  — **não** cria `Person`/`GC`/etc.
- Saída: relatório do que *seria* criado/atualizado/pulado + lista de conflitos e pendências.
- Só após revisão humana do dry-run, rodar a importação real (`apply`).

## 11. Relatório de conflitos

Gerado ao fim de cada lote (dry-run e real), por categoria:

- CPF válido conflitando com pessoa diferente;
- possível duplicidade por nome + contato (sugestão);
- membro sem CPF válido (pendência de membresia);
- pessoa com mais de um GC ativo (§13);
- liderança ambígua / sugestão de `LeadershipUnit` (§15);
- status/cargo não mapeável com confiança.

Cada item aponta o `externalId`, o motivo e a ação sugerida — para decisão humana.

## 12. Rollback lógico

- Toda entidade criada por um lote fica rastreável via `ExternalMapping` + `ImportBatchItem`.
- "Desfazer um lote" = **soft delete** (arquivar) das entidades criadas por aquele `batchId` que
  não tenham dependências novas — **nunca** hard delete; histórico/auditoria preservados.
- Eventos de domínio e auditoria registram a operação de rollback.

## 13. Importação incremental (futuro)

- Exports seguintes reusam os `ExternalMapping`: `externalId` conhecido → **update** idempotente;
  novo → create. Assim, importações periódicas não duplicam.
- Guardar carimbo do export (data/manifesto) por lote para diffs.

## 14. Fora da primeira importação

- Ensino/EAD; pagamento, lotes e regras financeiras de eventos; check-in avançado; serviços;
  integrações complexas; criação automática de logins/usuários; merge automático de duplicados.

## 15. Liderança: individual, dupla, casal/casa, equipe

Ver [`leadership-unit-plan.md`](leadership-unit-plan.md). Regra segura para a 1ª importação:

- importar **liderança individual primeiro**;
- Líder 1 + Líder 2 → **sugerir** `LeadershipUnit` (`DUAL`/`COUPLE`/`HOUSEHOLD`/`TEAM`) — sem
  inferência agressiva; vai para o relatório de revisão;
- só um líder → `LeadershipUnit` `INDIVIDUAL`;
- casal detectável (vínculo familiar ou padrão `Nome A | Nome B`) com **alta confiança** →
  sugerir agrupamento; senão, importar individual e relatar;
- **nunca** inferir casal sem confiança alta.

> Enquanto `LeadershipUnit` não existir no schema (ver plano), a importação preenche
> `GrowthGroup.leaderId` (+ `assistantId` quando houver) e registra no relatório a sugestão de
> agrupamento para a futura migração.

---

## Participação, encontros e eventos (mapeamento de apoio)

### Participação em GC (`grupos_participantes.json`, `grupos_visitantes.json`)
- cria `GrowthGroupMembership`; preserva `data_entrada` → `joinedAt`, `data_saida` → `leftAt`
  (nula = vínculo ativo);
- **uma pessoa só pode ter um GC principal ativo**; mais de um vínculo ativo → conflito (§11);
- visitante de GC → `VISITOR` ou `REGULAR_ATTENDER` (configurável).

### Encontros e presenças (`grupos_encontros*.json`)
- cria `GrowthGroupMeeting`; importa presenças;
- `presenca = 1` → `PRESENT`; `presenca = 0` → `ABSENT`; preservar anotações;
- visitante de encontro sem pessoa mapeada → `visitorName` (ou cadastro mínimo, conforme decisão).

### Eventos (`evento_*.json`)
- 1ª fase: `Event` + `EventRegistration` (+ presença simples se houver estrutura);
- **não** importar: pagamento, lotes, regras financeiras, serviços, integrações, ensino.

---

## Tipos/base já existentes no código

- `src/modules/integrations/prover/types.ts` — `ProverPerson`, `PROVER_STATUS_MAP` (status→eclesiástico).
- `src/modules/integrations/prover/client.ts` — interface `ProverClient` (somente leitura) + stub.
- Schema: `ExternalMapping` (polimórfico), `ImportBatch`, `ImportBatchItem` prontos.

**Próximo passo (fase de implementação, fora desta rodada):** escrever o leitor do ZIP + o
pipeline por fases com dry-run, começando por `pessoas.json`.
