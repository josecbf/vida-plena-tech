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

## Multi-tenant

Cada registro operacional deve pertencer a um `tenantId`.

Quando houver multi-campus:

- `tenantId` identifica a igreja/organizacao contratante;
- `campusId` identifica unidade local;
- escopos de permissao controlam quem ve o que.

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

## Regra de ouro

Modulo pode ser vendido separado, mas nao pode reinventar pessoa, usuario, permissao, comunicacao, arquivo, auditoria ou agenda.

