---
tags:
  - tecnico
  - permissoes
  - tenancy
---

# Permissoes Tenancy e Escopos

## Tenancy

Cada registro operacional deve carregar `tenantId`, exceto tabelas globais estritamente controladas.

Resolucao de tenant:

- subdominio;
- dominio customizado;
- sessao do usuario;
- token de API;
- webhook assinado;
- job de integracao.

## Estrategia inicial

Comecar com PostgreSQL compartilhado e `tenantId` obrigatorio. Usar isolamento logico forte, filtros obrigatorios no backend e Row Level Security obrigatorio em tabelas operacionais.

Para a primeira implementacao:

- `tenant_id NOT NULL` em toda tabela operacional.
- chaves unicas compostas por tenant, como `unique(tenant_id, slug)`;
- FKs compostas quando necessario para impedir referencia cruzada entre tenants;
- RLS habilitado e testado em tabelas com dados de tenant;
- testes automatizados tentando acesso cross-tenant;
- jobs, webhooks e tokens de API resolvendo tenant explicitamente;
- nenhum payload externo deve definir tenant sem validacao de assinatura, token ou rota confiavel.

Evolucao:

1. banco compartilhado com `tenantId`;
2. schema dedicado para clientes grandes;
3. banco dedicado para enterprise;
4. clusters regionais para plataforma global.

## Modelo de permissao

Combinar:

- RBAC: papeis como Admin, Pastor, Lider, Financeiro, Professor, Voluntario.
- ABAC: regras contextuais como "somente pessoas do meu GC".
- Escopo hierarquico: igreja, campus, area, ministerio, supervisao, GC.
- Permissoes por modulo.
- Permissoes por acao.

## Politica deny-by-default

Nenhum usuario recebe acesso sensivel apenas por ser "admin". Administracao de configuracao e diferente de leitura de dados sensiveis.

Regra:

- sem permissao explicita, negar;
- sem escopo valido, negar;
- sem modulo ativo, negar;
- sem justificativa em acoes sensiveis, negar ou exigir confirmacao;
- acesso emergencial deve usar break-glass auditado, com motivo e revisao posterior.

Exemplos de permissoes sensiveis:

- `people.timeline_sensitive.view`
- `som.case.view_confidential`
- `som.case.assign`
- `kids.child.view_health`
- `kids.checkout.perform`
- `kids.checkout.override`
- `finance.donation.view_identified`
- `finance.payment.approve`
- `finance.report.export`
- `audit.sensitive_log.view`

## Entidades

- User.
- Person.
- UserPersonLink.
- Role.
- Permission.
- RoleAssignment.
- UserScope.
- OrganizationUnit.
- ModuleSubscription.
- FeatureFlag.

## Exemplo

Maria pode ter simultaneamente:

- Supervisora no SOM apenas da Supervisao A.
- Aluna no Ensino.
- Voluntaria no Ministerio Kids.
- Sem acesso ao Financeiro.

## Permissoes granulares

Formato sugerido:

```text
modulo.recurso.acao
```

Exemplos:

- `people.person.view`
- `people.person.edit`
- `som.signal.view`
- `som.case.manage`
- `finance.transaction.view`
- `finance.transaction.approve`
- `kids.checkout.perform`
- `inventory.stock.adjust`
- `events.registration.export`

## Regra tecnica

Permissao nunca pode existir apenas na interface. Toda rota, action, query e API precisa validar tenant, modulo ativo, papel, permissao e escopo.

## Gate de permissao por modulo

Antes de implementar qualquer modulo, documentar:

- papeis operacionais reais;
- permissoes por recurso e acao;
- escopos aplicaveis;
- dados sensiveis visiveis por papel;
- acoes que exigem justificativa;
- acoes que exigem dupla aprovacao;
- exportacoes permitidas;
- leitura sensivel auditada;
- comportamento de acesso negado.

## Segregacao de funcao

Fluxos financeiros, infantis e administrativos criticos devem impedir concentracao indevida de poder.

Exemplos:

- quem solicita despesa nao deve aprovar e pagar sozinho;
- quem cadastra responsavel de crianca nao deve autorizar excecao sem trilha;
- quem cria campanha de comunicacao pode precisar de aprovacao para envio amplo;
- quem administra modulo nao recebe automaticamente leitura sensivel;
- break-glass exige justificativa, expiracao e revisao posterior.

## Usuario global e membresia no tenant

O usuario de login deve ser tratado como identidade global, separado da participacao em uma igreja.

Modelo conceitual recomendado:

- `Account` ou `User` global: identidade, email, provedores de login, status global.
- `TenantMembership`: usuario dentro de um tenant, com status, papel base e vinculo opcional com `Person`.
- `RoleAssignment`: papel atribuido por tenant, campus, ministerio, GC ou area.
- `UserScope`: limites de atuacao.

Isso permite que uma pessoa participe de mais de uma igreja ou que um operador autorizado administre mais de um tenant sem duplicar identidade de login.
