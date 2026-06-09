---
tags:
  - produto
  - prd
  - global
---

# PRD Global Inicial

## Problema

Igrejas operam com informacoes espalhadas: planilhas, WhatsApp, sistemas isolados, cadernos, memoria de lideres e plataformas que nao conversam. Isso cria retrabalho, perda de contexto, falhas de comunicacao, risco com dados sensiveis e pouca visao sobre pessoas.

## Proposta

Criar uma suite modular para igrejas, vendida por modulos, mas sustentada por um nucleo comum de pessoas, identidade, permissoes, agenda, comunicacao, auditoria, integracoes e IA.

## Publicos

- Pastores.
- Lideres de GC.
- Supervisores.
- Administradores da igreja.
- Equipe financeira.
- Lideres de ministerio.
- Voluntarios.
- Professores.
- Pais e responsaveis.
- Membros.
- Visitantes.

## Cliente ideal inicial

O cliente inicial mais recomendado nao e "qualquer igreja". O primeiro foco deve ser igreja local de pequeno a medio porte, com lideranca organizada, ministerios ativos e dor clara em cadastro, GCs, comunicacao, cuidado pastoral e voluntarios.

Perfil ideal:

- 150 a 1.500 pessoas cadastradas ou acompanhadas.
- Secretaria, pastoria ou lideranca administrativa minimamente estruturada.
- Uso intenso de WhatsApp, planilhas e formularios soltos.
- Grupos de Crescimento, ensino, voluntarios ou ministerio infantil ja em funcionamento.
- Lideranca disposta a padronizar processos.

Igrejas muito pequenas podem usar o plano de entrada, mas nao devem ditar a primeira versao. Igrejas muito grandes e multi-campus devem influenciar arquitetura, mas nao devem puxar customizacao pesada antes da validacao.

## Tese de entrada no mercado

A primeira versao vendavel deve provar uma dor central: a igreja nao consegue cuidar bem de pessoas quando cadastro, frequencia, comunicacao e acompanhamento estao espalhados.

Pacote inicial recomendado:

1. Pessoas.
2. Grupos de Crescimento.
3. Comunicacao basica.
4. Apoio Pastoral SOM leve.
5. Portal/PWA simples para lideres e membros.

Criancas e Cultos devem entrar logo depois como prova de operacao de domingo. Financeiro completo, Compras, Estoque e Equipamentos devem esperar permissoes, auditoria e implantacao estarem maduras.

## MVP de plataforma

O MVP da plataforma nao e "todos os modulos prontos". O MVP correto e uma fundacao que permita os primeiros modulos nascerem sem retrabalho.

Inclui:

- tenant;
- usuarios;
- permissoes;
- pessoas;
- familias;
- timeline;
- auditoria;
- feature flags por modulo;
- comunicacao basica;
- eventos de dominio;
- integrações basicas;
- design system;
- relatorios iniciais.

## Criterios de pronto para construir

Nenhum modulo deve entrar em desenvolvimento sem:

- comprador e operador principal definidos;
- 5 fluxos reais escritos;
- fluxo de excecao documentado;
- dados sensiveis classificados;
- matriz de permissao revisada;
- 10 historias iniciais com criterio de aceite;
- telas essenciais especificas;
- metricas de ativacao e retencao;
- decisao clara do que fica fora da v1.

## Primeiros modulos recomendados

1. Pessoas.
2. Ensino.
3. SOM.
4. GCs.
5. Cultos.
6. Criancas.

## Nao escopo inicial

- Microservicos complexos.
- Marketplace publico de plugins.
- BI enterprise completo.
- Financeiro completo no primeiro ciclo.
- Aplicativo mobile nativo antes de validar web responsivo/PWA.
- IA tomando decisoes sensiveis.

## Metricas de sucesso

- tempo para cadastrar/importar pessoas;
- reducao de duplicidades;
- uso semanal por lideres;
- percentual de pessoas com familia/vinculo/status preenchidos;
- presencas registradas por semana;
- escalas confirmadas sem mensagens manuais;
- check-ins infantis com checkout correto;
- acoes pastorais geradas com explicacao;
- relatorios gerados sem suporte tecnico.

## Riscos

- tentar construir tudo ao mesmo tempo;
- duplicar cadastro de pessoas por modulo;
- permissao fraca;
- customizacao excessiva;
- dados pastorais expostos;
- IA com conclusoes fortes sobre dados incompletos;
- operacao lenta demais para domingo;
- relatorios pesados travando o sistema.
