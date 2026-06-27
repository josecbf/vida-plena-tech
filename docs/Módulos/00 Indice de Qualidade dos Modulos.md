---
tags:
  - modulos
  - qualidade
  - auditoria
atualizado: 2026-05-25
---

# Indice de Qualidade dos Modulos

## Como usar

Cada modulo deve ser avaliado pela mesma regua. A nota nao mede quantidade de arquivos; mede clareza, utilidade e prontidao para execucao.

## Criterios

| Criterio | Pergunta |
|---|---|
| Problema real | O modulo resolve uma dor concreta da igreja? |
| Fluxo principal | O fluxo mais importante esta claro? |
| Perfis | Os operadores reais foram definidos? |
| Permissoes | Ha separacao por papel, acao e escopo? |
| Dados sensiveis | Os dados criticos foram classificados? |
| Integracoes | Dependencias com outros modulos estao claras? |
| Relatorios | Os indicadores ajudam decisao real? |
| Excecoes | Ha regras para erro, cancelamento e casos incomuns? |
| MVP | A v1 esta enxuta e vendavel? |
| Stress | O modulo funciona sob pressao operacional? |

## Estados de prontidao

| Estado | Significado |
|---|---|
| Inicial | Visao existe, mas ainda nao e codavel |
| Em especificacao | Ha PRD/modelo, mas faltam contratos ou excecoes |
| Pronto para Fase 0 | Contratos, dados, permissoes e LGPD definidos |
| Pronto para Alpha | Fluxo principal, excecoes e testes essenciais definidos |
| Pronto para MVP | Piloto, observabilidade, suporte e criterio comercial definidos |
| Aprovado para GA | Pronto para venda ampla |

## Avaliacao pos-auditoria

| Modulo | Estado | Risco principal | Proxima melhoria |
|---|---|---|---|
| Pessoas | Pronto para Fase 0 | Deduplicacao e dados sensiveis | Fechar merge auditado, consentimento e timeline por sensibilidade |
| Ensino | Em especificacao | Virar LMS generico | Amarrar trilhas a jornada pastoral e Pessoas |
| Apoio Pastoral SOM | Pronto para Fase 0 | Expor dados confidenciais | Formalizar leitura sensivel e explicabilidade |
| Gestao de Cultos | Em especificacao | Domingo sob pressao | Modo culto, baixa conectividade e escala rapida |
| Grupos de Crescimento | Em especificacao | Frequencia virar burocracia | Fluxo semanal simples para lider leigo |
| Eventos | Em especificacao | Escopo crescer demais | Inscricao, check-in, pagamento simples e capacidade |
| Criancas | Em especificacao | Checkout inseguro | Autorizacao, excecao, incidente e auditoria forte |
| Ministerios e Voluntarios | Em especificacao | Escalas complexas demais | Confirmacao, substituicao e requisito por funcao |
| Espacos e Recursos | Em especificacao | Conflito de reservas | Calendario unificado, aprovacao e regra de conflito |
| Estoque WMS | Inicial | Complexidade de WMS antes da hora | Reduzir para estoque operacional e inventario simples |
| Compras | Inicial | Aprovacao fraca | Alcada, centro de custo, recebimento e segregacao |
| Financeiro | Em especificacao | Exposicao e conflito de interesse | Segregacao, eventos idempotentes e relatorios por perfil |
| Equipamentos Tecnicos | Inicial | Virar inventario sem manutencao | Reserva, responsavel e ciclo de vida |
| Comunicacao | Em especificacao | Spam e consentimento fraco | Preferencias, segmentos, fadiga e historico |
| Portal e App | Em especificacao | Virar app grande demais | PWA focado em autosservico essencial |
| TAP e Engajamento Digital | Em revalidacao | Contratos com Financeiro e Pessoas | Validar contratos intermodulares antes de codar |

## Ordem recomendada de aprofundamento

1. Pessoas.
2. Criancas.
3. Financeiro.
4. Grupos de Crescimento.
5. Gestao de Cultos.
6. Comunicacao.
7. Apoio Pastoral SOM.
8. Ensino.
9. Eventos.
10. Ministerios e Voluntarios.
11. Portal e App.
12. Compras.
13. Espacos e Recursos.
14. Equipamentos Tecnicos.
15. Estoque WMS.
16. TAP e Engajamento Digital.

## Gate atual recomendado

O projeto inteiro deve concentrar a proxima rodada em:

1. Pessoas: fechar contrato de deduplicacao, merge e consentimentos.
2. Financeiro: aceitar eventos financeiros idempotentes de Eventos, TAP e Compras.
3. Comunicacao: aceitar consentimento, preferencia de canal e historico de envio.
4. Criancas: fechar checkout, excecao e leitura de dados de menor.
5. Core: consolidar `TenantMembership`, `RoleAssignment`, `UserScope`, `DomainEvent`, `AuditLog` e `ConsentRecord`.
