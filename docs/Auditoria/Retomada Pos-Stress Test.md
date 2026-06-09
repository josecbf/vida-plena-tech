---
tags:
  - auditoria
  - stress-test
  - retomada
atualizado: 2026-05-25
---

# Retomada Pos-Stress Test

## Resultado do stress test

O stress test mostrou que a Plataforma-Igrejas nao falha por falta de modulos. Ela falha se tentar operar igreja real sem:

- permissao sensivel por acao;
- RLS obrigatorio;
- classificacao LGPD por entidade;
- fluxos de excecao;
- operacao rapida no domingo;
- seguranca infantil forte;
- segregacao financeira;
- implantacao assistida.

## Melhorias aplicadas apos o stress test

### 1. Permissoes sensiveis

Criada a [[Técnico/Matriz Global de Permissoes Sensiveis]] e corrigido o padrao em matrizes de modulo para impedir que Admin da igreja ou Admin da plataforma recebam acesso sensivel automatico.

Modulos reforcados:

- Crianças.
- Financeiro.
- Apoio Pastoral SOM.

### 2. Tenancy e RLS

Atualizado [[Técnico/Permissoes Tenancy e Escopos]] para tornar RLS obrigatorio em tabelas operacionais de banco compartilhado e exigir `tenant_id NOT NULL`, chaves compostas e testes cross-tenant.

### 3. LGPD operacional

Atualizado [[Técnico/Seguranca Privacidade e LGPD]] com governanca operacional:

- finalidade;
- base legal;
- retencao;
- direitos do titular;
- incidentes;
- criancas e adolescentes;
- revisao de impacto.

### 4. Eventos e auditoria

Atualizado [[Técnico/Eventos de Dominio Auditoria e BI]] para impedir que eventos e logs virem vazamento de dados sensiveis.

Regras reforcadas:

- payload minimo;
- redaction/masking;
- catalogo unico de eventos;
- BI agregado separado de BI identificado.

### 5. Modulos criticos

Foram aprofundados:

- Pessoas: jornada de membresia.
- Cultos: domingo real.
- GCs: rotina semanal do lider e multiplicacao.
- Crianças: checkout, responsaveis e dados de cuidado.
- Voluntarios: escala, substituicao e descanso.
- SOM: protocolo pastoral e sigilo.
- Financeiro: dizimos, ofertas, PIX, prestacao de contas e segregacao.
- Comunicacao: consentimento, segmentos e limite de fadiga.

## Nova ordem de melhoria

Depois do stress test, a ordem correta nao e "criar mais modulos". A ordem e:

1. Fechar fundacao de dados, permissoes, LGPD e auditoria.
2. Validar Pessoas + GCs + Comunicacao + SOM leve com igrejas reais.
3. Prototipar modo domingo com Cultos, Voluntarios e Crianças.
4. Definir implantacao como produto.
5. So depois aprofundar Financeiro completo, Compras, Estoque e Equipamentos.

## Perguntas que ainda precisam de decisao pastoral/de negocio

1. Qual perfil de igreja deve ser o primeiro alvo comercial: pequena organizada, media em crescimento ou multi-campus?
2. A plataforma deve usar o termo "membro", "pessoa", "discípulo" ou permitir configuracao por igreja?
3. O SOM sera vendido como diferencial central ou como camada interna de cuidado pastoral?
4. Financeiro deve entrar cedo como modulo limitado de entradas/saidas ou esperar uma fase mais madura?
5. A igreja quer priorizar controle administrativo ou cuidado pastoral como promessa principal de venda?

