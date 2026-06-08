---
tags:
  - produto
  - vaults
  - planejamento
---

# Estrategia de Vaults por Modulo

## Decisao

Manter este vault como **vault global da plataforma** e criar vaults ou dossies especializados para cada modulo grande quando o modulo entrar em planejamento profundo.

O vault global decide o que e compartilhado:

- multi-tenant;
- pessoas;
- usuarios;
- permissoes;
- auditoria;
- notificacoes;
- integracoes;
- design system;
- eventos de dominio;
- IA;
- billing;
- governanca.

Os vaults de modulo detalham produto, operacao e implementacao.

## Estrutura padrao para cada vault de modulo

```text
[NOME-DO-MODULO]/
├── 000 - Hub.md
├── 00 - PRELIMINARES/
├── 01 - Estrategia/
├── 02 - Produto/
├── 03 - Operacao/
├── 04 - UX e Conteudo/
├── 05 - Tecnico/
├── 06 - Dados e Integracoes/
├── 07 - Seguranca e Governanca/
├── 08 - Tasks/
├── 09 - Pesquisa e Referencias/
└── 99 - Arquivo/
```

## 000 - Hub

Conteudo obrigatorio:

- o que e o modulo em uma frase;
- para quem existe;
- qual problema resolve;
- o que nao e;
- links para documentos principais;
- status atual;
- decisoes nao reversiveis;
- proximo passo recomendado.

## 00 - PRELIMINARES

Arquivos recomendados:

- O que saber antes de iniciar.md
- Contexto pastoral e eclesiastico.md
- Problema atual na igreja.md
- Publico e perfis envolvidos.md
- DNA teologico e cultural.md
- Padroes de linguagem.md
- Pesquisa de referencias.md
- Benchmark de plataformas.md
- Regras de negocio preliminares.md
- Riscos pastorais iniciais.md
- Glossario do dominio.md

## 01 - Estrategia

Arquivos recomendados:

- Visao e Proposta de Valor.md
- Problema Central.md
- Tese do Produto.md
- Principios do Produto.md
- Antiobjetivos.md
- Posicionamento.md
- Heuristicas de Prioridade.md
- Riscos do Projeto.md
- Decisoes de Produto.md
- Lacunas e Decisoes Abertas.md
- Roadmap Estrategico.md

## 02 - Produto

Arquivos recomendados:

- PRD Avancado.md
- Arquitetura Funcional.md
- Mapa de Modulos.md
- Sitemap e Mapa de Telas.md
- Casos de Uso.md
- Perfis e Permissoes.md
- Backlog de Epicos.md
- Historias P0 Detalhadas.md
- Criterios de Aceite.md
- Estados e Fluxos.md
- Metricas de Sucesso.md
- Roadmap de Produto.md

## 03 - Operacao

Arquivos recomendados:

- Como o modulo funciona na rotina da igreja.md
- Papeis operacionais.md
- Rotina semanal.md
- Rotina mensal.md
- Playbook de implantacao.md
- Treinamento de usuarios.md
- Suporte e atendimento.md
- Processos manuais de contingencia.md
- Checklist de lancamento.md
- Checklist de piloto.md

## 04 - UX e Conteudo

Arquivos recomendados:

- Principios de UX.md
- Jornada do Usuario.md
- Mapa de Telas Detalhado.md
- Wireframes Textuais.md
- Design System.md
- Microcopy e Mensagens.md
- Empty States.md
- Mensagens de Erro.md
- Acessibilidade.md
- Responsividade Mobile.md
- Internacionalizacao e White Label.md

## 05 - Tecnico

Arquivos recomendados:

- Arquitetura Tecnica.md
- Stack e Decisoes Tecnicas.md
- Modelo Conceitual de Entidades.md
- Schema Inicial.md
- APIs e Contratos.md
- Autenticacao e Autorizacao.md
- Multi-tenant.md
- Feature Flags.md
- Plano de Trabalho MVP.md
- Backlog Tecnico.md
- ADRs/
- Riscos Tecnicos.md

## 06 - Dados e Integracoes

Arquivos recomendados:

- Fontes de Dados.md
- Integracao Prover.md
- Integracao MyKids.md
- Integracao WhatsApp.md
- Integracao Pagamentos.md
- Integracao Email.md
- Contratos de API.md
- Mapeamento de Entidades Externas.md
- Estrategia de Sincronizacao.md
- Logs de Sync.md
- Freshness dos Dados.md
- Plano de Migracao de Dados.md

## 07 - Seguranca e Governanca

Arquivos recomendados:

- Politica de Dados Sensiveis.md
- LGPD e Privacidade.md
- Matriz de Acesso.md
- Auditoria e Logs.md
- Backup e Restauracao.md
- Retencao de Dados.md
- Consentimentos.md
- Seguranca Operacional.md
- Acoes Destrutivas.md
- Incidentes e Resposta.md

## 08 - Tasks

Cada task deve ter:

```yaml
---
id:
status: todo
prioridade: P0
categoria:
fase:
responsavel:
github:
relacionado:
---
```

Corpo padrao:

- Contexto.
- O que fazer.
- Pronto quando.
- Dependencias.
- Riscos.
- Notas de execucao.
- Links para PR, issue ou decisao.

## Ritmo recomendado

1. Semana 0: preencher Preliminares, Estrategia e Antiobjetivos.
2. Semana 1: fechar PRD, Arquitetura Funcional e Perfis/Permissoes.
3. Semana 2: fechar Modelo de Entidades, Sitemap e Backlog P0.
4. Semana 3 em diante: squads trabalham por tasks.

Nada entra em desenvolvimento sem criterio de aceite.

