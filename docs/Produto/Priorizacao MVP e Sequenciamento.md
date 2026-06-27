---
tags:
  - produto
  - mvp
  - roadmap
atualizado: 2026-05-25
---

# Priorizacao MVP e Sequenciamento

## Regra principal

O MVP nao e uma versao pequena de 16 modulos. O MVP e a menor plataforma confiavel capaz de sustentar os primeiros modulos sem retrabalho.

## Fase -1 - Contratos antes de codigo

Objetivo: impedir que os modulos comecem a codar tomando decisoes locais sobre Pessoas, permissao, auditoria, eventos, LGPD e escopos.

Entregas:

- modelo canonico de `Person`, `Household`, `TenantMembership`, `RoleAssignment`, `UserScope`, `ConsentRecord`, `DomainEvent` e `AuditLog`;
- catalogo inicial de eventos;
- matriz de classificacao de dados por modulo;
- checklist de RLS, FKs compostas e testes cross-tenant;
- padrao de importacao/deduplicacao;
- padrao de leitura sensivel auditada;
- criterios de aceite por fase.

Gate de saida:

- nenhum modulo central possui entidade paralela de pessoa, usuario, permissao, arquivo, calendario ou auditoria;
- todos os modulos priorizados sabem quais eventos produzem e consomem;
- dados de criancas, financeiro e pastoral possuem permissao sensivel explicitamente nomeada.

## Fase 0 - Validacao com igrejas

Objetivo: validar problema, linguagem e fluxo antes de codigo pesado.

Entregas:

- entrevistas com pastores, secretaria, lideres de GC, ministerio infantil, tesouraria e voluntarios;
- prototipos navegaveis dos fluxos criticos;
- validacao de termos usados por igrejas;
- lista de processos que hoje vivem em WhatsApp e planilha.

## Fase 1 - Fundacao

Objetivo: construir o nucleo compartilhado.

Inclui:

- tenants e campus;
- usuarios e vinculo com pessoas;
- RBAC, ABAC e escopos;
- Pessoas;
- familias;
- consentimentos;
- auditoria;
- timeline operacional;
- classificacao de dados;
- importacao e deduplicacao;
- comunicacao basica;
- eventos de dominio;
- design system operacional.
- outbox/inbox de eventos de dominio.
- observabilidade operacional minima.
- exportacao e direito do titular LGPD.

## Fase 2 - Primeiro pacote vendavel

Objetivo: entregar valor pastoral e operacional rapido.

Modulos:

- Pessoas.
- Grupos de Crescimento.
- Apoio Pastoral SOM.
- Ensino.
- Comunicacao basica.

Gate de entrada:

- Pessoas tem deduplicacao e merge auditado.
- Comunicacao respeita consentimento e preferencia de canal.
- GCs, SOM e Ensino consomem Pessoas sem cadastro paralelo.
- Eventos criticos alimentam timeline sem payload sensivel aberto.

Por que:

- validam cadastro unico;
- geram uso semanal;
- atacam dores pastorais reais;
- criam historico de relacionamento com pessoas.

## Fase 3 - Domingo e seguranca infantil

Objetivo: provar operacao sob pressao.

Modulos:

- Gestao de Cultos.
- Ministerios e Voluntarios.
- Criancas.
- Portal/App responsivo.

Gate de entrada:

- Modo domingo testado com baixa conectividade e operadores leigos.
- Check-in/checkout infantil tem autorizacao, excecao e auditoria.
- Escalas possuem confirmacao, substituicao e restricao por requisito.

Por que:

- domingo e o teste de confiabilidade;
- criancas exigem seguranca alta;
- escalas e check-in geram valor visivel.

## Fase 4 - Eventos e administracao

Objetivo: ampliar receita e operacao.

Modulos:

- Eventos.
- Espacos e Recursos.
- Financeiro.
- Compras.

Gate de entrada:

- Segregacao de funcao financeira implementada.
- Eventos pagos usam gateway/Financeiro com idempotencia.
- Compras exigem centro de custo, aprovacao e recebimento quando aplicavel.

Por que:

- dependem de permissoes e auditoria maduras;
- podem gerar grande valor, mas aumentam risco operacional.

## Fase 5 - Operacao avancada

Objetivo: atender igrejas maiores.

Modulos:

- Estoque WMS.
- Equipamentos Tecnicos.
- BI avancado.
- APIs abertas.
- Integracoes externas.
- TAP e Engajamento Digital pode antecipar como produto satelite se seus contratos com Financeiro e Pessoas estiverem validados.

## Criterios para passar de fase

- Pelo menos 80% dos fluxos criticos testados com usuarios reais.
- Permissoes validadas por perfil e escopo.
- Dados sensiveis classificados.
- Auditoria funcionando em acoes relevantes.
- Relatorios essenciais respondem perguntas reais.
- Suporte consegue explicar o modulo sem depender do time tecnico.
