---
tags:
  - tecnico
  - arquitetura
  - multi-tenant
---

# Arquitetura Plataforma

## Estilo recomendado

Comecar como **monolito modular bem separado**, nao microservicos prematuros.

Razao:

- desenvolvimento inicial mais rapido;
- menos custo operacional;
- transacoes mais simples;
- compartilhamento natural do nucleo Pessoas;
- ainda permite separar servicos no futuro.

## Camadas

### 1. Core Platform

- tenants;
- organizacoes;
- campus;
- usuarios;
- permissoes;
- configuracoes;
- auditoria;
- billing;
- feature flags;
- modulos habilitados.

### 2. Core Domain

- pessoas;
- familias;
- grupos;
- agenda;
- comunicacao;
- arquivos;
- comentarios;
- historico;
- eventos de dominio.

### 3. Product Modules

Cada modulo com fronteira clara:

- rotas;
- componentes;
- regras de negocio;
- entidades especificas;
- APIs internas;
- permissoes;
- relatorios;
- eventos publicados.

### 4. Integration Layer

- APIs publicas;
- webhooks;
- conectores externos;
- importacao/exportacao;
- filas;
- logs de sync;
- mapeamento de IDs externos.

### 5. AI Layer

- agentes por modulo;
- RAG em documentacao autorizada;
- resumos de contexto;
- recomendacoes explicaveis;
- geracao de comunicados;
- copiloto de relatorios.

## Decisoes arquiteturais obrigatorias

### Monolito modular com contratos internos

Cada modulo pode ter rotas, componentes, tabelas especificas e servicos de dominio, mas consome primitivas centrais por contrato:

- Pessoas: `Person`, `Household`, deduplicacao, timeline.
- Core Platform: tenant, usuario, membership, permissoes, feature flags.
- Auditoria: `AuditLog` e leitura sensivel.
- Eventos: outbox/inbox e catalogo de eventos.
- Comunicacao: envio, templates, consentimento e preferencias.
- Arquivos: upload, classificacao, antivirus quando aplicavel e politica de acesso.

Modulo nao pode acessar tabela interna de outro modulo sem API interna, evento ou query autorizada documentada.

### Padrao transacional

Operacoes que alteram estado importante devem:

- validar permissao e escopo antes da escrita;
- gravar mudanca em transacao;
- registrar auditoria quando sensivel;
- publicar evento via outbox na mesma transacao;
- processar consumidores com inbox idempotente.

### Observabilidade minima

Desde o MVP, toda area critica precisa expor:

- latencia p95/p99 das rotas principais;
- taxa de erro por modulo;
- filas e eventos pendentes;
- falhas de integracao;
- tentativas negadas por permissao;
- exportacoes e leituras sensiveis.

## Multi-tenant

Cada registro operacional deve pertencer a um `tenantId`.

Quando houver multi-campus:

- `tenantId` identifica a igreja/organizacao contratante;
- `campusId` identifica unidade local;
- escopos de permissao controlam quem ve o que.

Regras de implementacao:

- tabelas operacionais usam `tenant_id NOT NULL`;
- FKs entre tabelas operacionais devem impedir referencia cruzada de tenant;
- `campus_id` e outros escopos nao substituem `tenant_id`;
- jobs, webhooks e integracoes resolvem tenant por credencial/assinatura confiavel;
- payload externo nunca define tenant sem validacao.

## Eventos de dominio

Tudo que importa deve gerar evento:

- pessoa criada;
- pessoa vinculada a familia;
- check-in realizado;
- voluntario escalado;
- evento criado;
- estoque movimentado;
- compra aprovada;
- pagamento recebido;
- equipamento enviado para manutencao.

Esses eventos alimentam auditoria, relatorios, automacoes e IA.

Eventos nao substituem permissao. Consumidor so processa evento se tiver permissao tecnica e finalidade documentada.

## Regra de ouro

Modulo pode ser vendido separado, mas nao pode reinventar pessoa, usuario, permissao, comunicacao, arquivo, auditoria ou agenda.

## Gate de arquitetura por modulo

Antes de codar um modulo:

- fronteira do modulo documentada;
- entidades centrais reutilizadas;
- eventos produzidos/consumidos definidos;
- tabelas com tenant, escopo e RLS planejados;
- auditoria sensivel definida;
- dependencias de outros modulos aceitas;
- fluxo offline/degradado definido quando houver operacao de domingo, criancas, financeiro ou check-in.
