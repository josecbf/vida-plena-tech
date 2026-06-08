---
tags:
  - auditoria
  - plataforma-igrejas
  - produto
  - qualidade
atualizado: 2026-05-25
---

# Auditoria Geral do Planejamento

## Veredito executivo

O projeto Plataforma-Igrejas tem uma fundacao promissora: modularidade clara, Pessoas como nucleo, preocupacao com permissoes, LGPD, auditoria e integracao entre ministerios. A estrutura documental tambem esta bem distribuida entre estrategia, produto e tecnico.

O principal risco encontrado nao e falta de estrutura. O risco e o planejamento virar uma colecao de documentos uniformes demais, com modulos diferentes descritos de forma parecida. Para competir com os melhores produtos do mercado, cada modulo precisa ter fluxo operacional especifico, criterios de qualidade, regras de excecao, indicadores de sucesso e limites claros de v1.

## Pontos fortes

- Pessoas foi definido corretamente como o centro canonico da plataforma.
- A visao modular evita construir um sistema unico inchado.
- Ha separacao inicial entre produto, tecnico, seguranca, permissoes e roadmap.
- O planejamento ja reconhece a sensibilidade de dados pastorais, criancas e financeiro.
- A decisao de evitar app nativo no inicio e pragmatica.
- O uso de eventos de dominio e auditoria desde cedo reduz retrabalho futuro.

## Fragilidades encontradas

### 1. PRDs de varios modulos ainda estao genericos

Alguns modulos descrevem capacidades, mas nao descrevem suficientemente:

- fluxo real de uso;
- excecoes operacionais;
- dores especificas por perfil;
- criterios de aceite;
- indicadores acionaveis;
- diferenca entre v1, v2 e futuro.

Isso e mais grave em Financeiro, Comunicacao, Compras, Estoque, Equipamentos, Espacos e Portal/App.

### 2. Falta uma tese comercial mais dura

O projeto menciona venda modular, mas precisa responder melhor:

- qual pacote vende primeiro;
- qual modulo gera maior tracao;
- qual modulo reduz churn;
- qual modulo exige maturidade operacional antes de ser vendido;
- qual e o caminho para igrejas pequenas, medias e grandes.

### 3. Operacao de domingo ainda precisa ser tratada como requisito critico

Cultos, Criancas, Voluntarios, Check-in, Comunicacao e Portal/App precisam suportar picos de uso, baixa conectividade, filas, usuarios com pouca familiaridade tecnica e necessidade de resposta rapida.

### 4. Dados sensiveis exigem classificacao formal

O vault reconhece LGPD, mas ainda precisa de uma matriz explicita por tipo de dado:

- publico interno;
- operacional restrito;
- pastoral confidencial;
- financeiro sensivel;
- menor de idade;
- credencial ou segredo tecnico.

### 5. IA precisa de limites de produto

A IA embarcada e uma vantagem competitiva, mas deve ser tratada como assistente auditavel, nao como decisora. A plataforma precisa registrar entrada, saida, permissao, contexto e justificativa quando IA apoiar decisoes pastorais, comunicacao ou analise de risco.

## Criterios de produto best-in-class

Um modulo so deve ser considerado maduro quando responder:

1. Quem opera o modulo no dia a dia?
2. Qual problema concreto ele resolve em menos tempo que WhatsApp e planilha?
3. Qual fluxo precisa funcionar sob pressao?
4. Quais dados sao sensiveis?
5. Quais acoes precisam de auditoria?
6. Qual permissao minima cada perfil precisa?
7. Que excecoes acontecem em uma igreja real?
8. Que relatorio ajuda decisao, nao apenas exibicao?
9. Qual dependencia existe com Pessoas, Agenda, Comunicacao e Financeiro?
10. O que deve ficar fora da v1 para o produto nascer utilizavel?

## Prioridades de correcao

### Prioridade 1 - Fundacao

- Reforcar PRD Global com tese comercial, ICP e criterios de maturidade.
- Reforcar Modelo Canonico com classificacao de dados.
- Reforcar Permissoes com matriz de escopos reais.
- Criar checklist de qualidade para modulos.

### Prioridade 2 - Modulos centrais

- Pessoas.
- Grupos de Crescimento.
- Apoio Pastoral SOM.
- Ensino.
- Gestao de Cultos.
- Criancas.
- Comunicacao.

Esses modulos validam o nucleo de pessoas, cuidado, presenca, ensino, escala, seguranca infantil e relacionamento.

### Prioridade 3 - Operacao e administracao

- Eventos.
- Ministerios e Voluntarios.
- Espacos e Recursos.
- Financeiro.
- Compras.
- Estoque WMS.
- Equipamentos Tecnicos.
- Portal e App da Igreja.

Esses modulos devem entrar quando a fundacao ja estiver confiavel, porque aumentam muito a complexidade de permissao, auditoria, relatorio e suporte.

## Decisao recomendada

Nao tentar construir os 15 modulos em paralelo. O melhor caminho e vender a visao completa, mas construir em ondas:

1. Plataforma base + Pessoas.
2. Operacao pastoral: SOM, GCs e Ensino.
3. Operacao de culto: Cultos, Voluntarios, Criancas e Comunicacao.
4. Eventos e Portal/App.
5. Administracao: Financeiro, Compras, Estoque, Espacos e Equipamentos.

## Resultado da auditoria

Estado atual apos esta auditoria:

- Estrutura: forte.
- Coerencia modular: boa.
- Profundidade por modulo: desigual.
- Prontidao para desenvolvimento: parcial.
- Prontidao para validacao com igrejas reais: boa se acompanhada de entrevistas.
- Prontidao para ser "melhor produto do mercado": ainda depende de validar fluxos reais, reduzir generalidade e priorizar execucao.

