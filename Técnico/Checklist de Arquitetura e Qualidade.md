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
- O modulo define quais dados sao sensiveis?
- Ha permissao por papel, acao e escopo?
- Ha auditoria para criacao, edicao, exclusao logica e leitura sensivel?
- O modulo funciona sem depender de IA?
- O fluxo principal cabe em telas simples?
- Existem estados de erro, excecao e cancelamento?
- Ha eventos de dominio claros?
- Ha relatorios essenciais separados de relatorios avancados?

## Multi-tenancy

- Nenhuma query operacional pode existir sem filtro de tenant.
- Jobs, webhooks e integracoes precisam resolver tenant explicitamente.
- Logs nao devem vazar dados de outro tenant.
- Exportacoes precisam respeitar tenant, permissao e escopo.
- Ambiente de teste deve incluir tentativas de acesso cruzado entre tenants.

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

