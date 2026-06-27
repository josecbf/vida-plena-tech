# Importação Prover — próximos passos (não implementado nesta demo)

A demo entrega **apenas a estrutura**: contrato `ProverClient` (somente leitura), tipos,
leitura de config por env, entidades de suporte (`ExternalMapping`, `ImportBatch`,
`ImportBatchItem`) e a tela `/prover` em estado "aguardando configuração".

**Nenhuma chamada real ao Prover é feita nesta fase.**

## Regras já fixadas (invariantes)

1. **Prover é somente leitura. NUNCA escrever no Prover.**
2. Importação **idempotente** — reprocessar o mesmo export não duplica pessoas
   (garantido por `ExternalMapping(tenantId, system, externalType, externalId)`).
3. Importação passa por **deduplicação**: por **CPF** (bloqueante) e, sem CPF, por
   **nome + contato** (sugestão, não bloqueante) — mesma política do cadastro público.
4. Cada execução gera um **`ImportBatch`** e um **`ImportBatchItem`** por registro, com
   status (`CREATED`/`MATCHED`/`SKIPPED`/`FAILED`) e mensagem.
5. **Chave de API fica em `.env.local`** (`PROVER_API_BASE_URL`, `PROVER_API_KEY`),
   **nunca no código**.
6. **Mapeamento de status:** os status do Prover que misturam cargo e situação são
   separados — situação → `EclesiasticalStatus`, cargo → `RoleKey`
   (mapa em `src/modules/integrations/prover/types.ts`).

## Formato de entrega

O Prover virá como **ZIP de JSONs**. O importador real implementaria `ProverClient`
lendo esses arquivos (não uma API HTTP, a princípio):

```
readManifest() → ProverExportManifest   // contagens e data do export
listPeople()   → ProverPerson[]          // pessoas a importar
```

## Fluxo de importação (a implementar)

1. Admin sobe o ZIP / aponta o caminho do export.
2. Cria um `ImportBatch` (status `PROCESSING`).
3. Para cada `ProverPerson`:
   - resolve `ExternalMapping` existente → se houver, **MATCHED** (atualiza, idempotente);
   - senão, deduplica por CPF / nome+contato;
   - cria `Person` (status mapeado) + `ExternalMapping`; registra `ImportBatchItem`.
   - emite `person.created`/`person.updated` via outbox; grava `AuditLog` (`action: import`).
4. Fecha o `ImportBatch` (`COMPLETED`/`FAILED`) com contadores.

## Telas futuras

- `/prover` evolui de "aguardando configuração" → upload do ZIP + histórico de lotes.
- Detalhe do lote com itens, status e conflitos de deduplicação para resolução manual.
