---
tags:
  - produto
  - mvp
  - roadmap
atualizado: 2026-05-25
---

# Priorizacao MVP e Sequenciamento

## Regra principal

O MVP nao e uma versao pequena de 15 modulos. O MVP e a menor plataforma confiavel capaz de sustentar os primeiros modulos sem retrabalho.

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

## Fase 2 - Primeiro pacote vendavel

Objetivo: entregar valor pastoral e operacional rapido.

Modulos:

- Pessoas.
- Grupos de Crescimento.
- Apoio Pastoral SOM.
- Ensino.
- Comunicacao basica.

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

## Criterios para passar de fase

- Pelo menos 80% dos fluxos criticos testados com usuarios reais.
- Permissoes validadas por perfil e escopo.
- Dados sensiveis classificados.
- Auditoria funcionando em acoes relevantes.
- Relatorios essenciais respondem perguntas reais.
- Suporte consegue explicar o modulo sem depender do time tecnico.

