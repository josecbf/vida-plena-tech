---
tags:
  - tecnico
  - checklist
  - qualidade
atualizado: 2026-05-25
---

# Checklist de Arquitetura e Qualidade

## Antes de implementar qualquer modulo

- O modulo aponta para `Person` e nao cria cadastro paralelo?
- Todo registro operacional tem `tenantId`?
- O modulo declara `campusId` ou outro escopo local quando aplicavel?
- O modulo define quais dados sao sensiveis?
- Ha permissao por papel, acao e escopo?
- Ha auditoria para criacao, edicao, exclusao logica e leitura sensivel?
- Ha contrato de eventos produzidos e consumidos?
- Ha idempotencia para webhooks, importacoes e eventos?
- Ha matriz LGPD por entidade?
- O modulo funciona sem depender de IA?
- O fluxo principal cabe em telas simples?
- Existem estados de erro, excecao e cancelamento?
- Ha eventos de dominio claros?
- Ha relatorios essenciais separados de relatorios avancados?
- Ha criterio objetivo de aceite para piloto?

## Gate de prontidao

Um modulo so pode sair para implementacao quando estiver pelo menos em `Pronto para Fase 0` no indice de qualidade.

Estados:

- `Inicial`: visao existe, mas ainda nao e codavel.
- `Em especificacao`: PRD e modelo existem, mas faltam contratos.
- `Pronto para Fase 0`: contratos, dados, permissoes e LGPD definidos.
- `Pronto para Alpha`: fluxo principal e excecoes testaveis.
- `Pronto para MVP`: piloto, observabilidade, suporte e criterios comerciais definidos.
- `Aprovado para GA`: pronto para venda ampla.

## Multi-tenancy

- Nenhuma query operacional pode existir sem filtro de tenant.
- Jobs, webhooks e integracoes precisam resolver tenant explicitamente.
- Logs nao devem vazar dados de outro tenant.
- Exportacoes precisam respeitar tenant, permissao e escopo.
- Ambiente de teste deve incluir tentativas de acesso cruzado entre tenants.
- FKs compostas ou validacoes transacionais devem impedir referencia cruzada.
- Testes devem incluir usuario com acesso a dois tenants e escopos diferentes.

## Permissoes

- Validar permissao no backend, nao apenas na interface.
- Separar visualizar, criar, editar, aprovar, exportar, excluir e administrar.
- Separar dados operacionais de dados pastorais confidenciais.
- Separar dados financeiros de dados de contribuicao individual.
- Separar dados de criancas e autorizacoes.
- Registrar leitura de dados sensiveis quando aplicavel.

## Dados

- Preferir exclusao logica em registros operacionais.
- Preservar historico em mesclagem de pessoas.
- Usar `ExternalMapping` para importacoes e integracoes.
- Diferenciar dado transacional, snapshot, metrica derivada e log.
- Planejar indices para buscas de pessoas, presencas, check-ins e relatorios.
- Definir retencao, exportacao e anonimização por tipo de dado.
- Nunca colocar dado sensivel completo em evento generico.

## Eventos e integracoes

- Usar outbox para publicar eventos de dominio.
- Usar inbox para consumidores idempotentes.
- Definir `schemaVersion`, `idempotencyKey`, produtor e consumidores.
- Webhook externo precisa de assinatura, timestamp, protecao contra replay e retry.
- Integracao externa precisa de `ExternalMapping` e log de sync.

## IA

- IA recebe apenas o minimo necessario.
- IA respeita permissao do usuario.
- IA nao aprova financeiro, nao libera crianca, nao decide cuidado pastoral e nao altera cadastro sem revisao.
- Sugestoes de IA devem ter explicacao e rastro.

## Operacao

- Fluxos de domingo devem ter baixa friccao.
- Check-in infantil deve ser mais seguro que rapido.
- Frequencia de GC e escala de voluntarios devem ser simples o bastante para lider leigo.
- Relatorios precisam responder perguntas reais de lideranca.
