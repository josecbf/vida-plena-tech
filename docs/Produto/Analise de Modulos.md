---
tags:
  - produto
  - modularidade
  - comercial
  - arquitetura
atualizado: 2026-06-11
---

# Análise de Módulos — Vendável sozinho × Dependência de Pessoas

Quais módulos podem ser vendidos isoladamente e quais sempre dependem do módulo **Pessoas (01)**. Base conceitual: [[Modularidade e Identidade Plugavel]].

## O reframe que muda a resposta

Graças ao contrato `PeopleProvider`/`PersonRef`, "depender de Pessoas" se desdobra em três níveis:

- **Não precisa de pessoa** → só usuários/operadores do Core (ou identidade anônima). Vende sozinho de verdade.
- **Precisa só de identidade (`PersonRef`)** → o módulo guarda os dados *dele* (progresso, escala, frequência) chaveados por `personId`; a pessoa é só referência. Vende sozinho **com provider externo ou Lite** (plugável em outra plataforma).
- **Precisa da Pessoas canônica rica** (histórico, família, consentimento, jornada pastoral) → a riqueza do registro **é** o valor. Só faz sentido integrado.

## Classificação dos 16 módulos

### 🟢 Tier A — Vendem sozinhos de verdade (não precisam de Pessoas)
| # | Módulo | Identidade que precisa | Por quê |
|---|---|---|---|
| 16 | TAP e Engajamento | Nenhuma / anônima | Oferta e redirect por design não criam pessoa |
| 06 | Eventos | Leve (inscrito: nome/e-mail) | Inscrição + check-in estilo Eventbrite |
| 09 | Espaços e Recursos | Só operadores (Core) | Reserva de salas/recursos + aprovação |
| 10 | Estoque (WMS) | Só operadores | Itens e movimentações — não é sobre membros |
| 13 | Equipamentos Técnicos | Só operadores | Inventário + manutenção + reserva |
| 11 | Compras | Só operadores | Depende de Financeiro, não de Pessoas |

### 🟡 Tier B — Vendem sozinhos com provider externo/Lite (plugáveis)
| # | Módulo | Identidade que precisa | Por quê |
|---|---|---|---|
| 02 | Ensino | `PersonRef` (aluno) | Progresso/matrícula são dados próprios — caso de exemplo |
| 04 | Gestão de Cultos | `PersonRef` (voluntário) | Escalas e setlist são próprios; voluntário é referência |
| 08 | Ministérios e Voluntários | `PersonRef` (voluntário) | Escalas, requisitos, engajamento são próprios |
| 05 | Grupos de Crescimento | `PersonRef` (membro) | Frequência é própria — funciona, mas perde valor pastoral |
| 14 | Comunicação | `PersonRef` + contato | Funciona com lista externa; consentimento/segmentos idealmente em Pessoas |
| 12 | Financeiro | `PersonRef` quando identificado | Ledger/centros de custo são próprios; doador-pessoa é referência |

### 🔴 Tier C — Sempre dependem da Pessoas canônica
| # | Módulo | Por quê não dá para vender sozinho |
|---|---|---|
| 03 | Apoio Pastoral (SOM) | Jornada pastoral, sinais e histórico longitudinal são o produto |
| 07 | Crianças | Segurança de checkout exige família + responsável autoritativos e consentimento |
| 15 | Portal e App do Membro | É a visão do membro sobre si mesmo — pressupõe a pessoa |
| 01 | Pessoas | É o próprio núcleo / o provider |

## Leitura comercial (land & expand)

- **Produtos de entrada ("land"):** Tier A + Ensino (02). Vendem sozinhos, atrito baixo, plugáveis no que o cliente já usa. **TAP e Ensino são os melhores cavalos de entrada** — TAP por ser anônimo e ter dor aguda no domingo; Ensino por depender só de `personId`.
- **Produtos de ancoragem ("expand"):** Tier C. Forçam a adoção da Pessoas canônica — prendem o cliente no núcleo e reduzem churn. Crianças e SOM são "expand" de altíssimo valor pastoral.
- **Tier B é o meio de campo:** vende sozinho para entrar; o valor cresce quando o cliente liga a Pessoas nativa (Lite → Native).

## Nuance — a regra de ouro continua de pé

Mesmo no Tier B/C, o módulo **nunca reimplementa Pessoas**. Vendido sozinho, consome um provider **External** (plataforma hospedeira) ou **Lite** (mínimo). A dependência é do **contrato**, não de contratar o módulo 01. O TAP (16) é a prova viva: depende de **Financeiro via eventos**, sem embutir um ledger.

## Pontos em aberto para debate

- **GCs (05)**, **Comunicação (14)** e **Financeiro (12)** estão como "parciais" — a classificação pode subir/descer conforme a estratégia comercial.
