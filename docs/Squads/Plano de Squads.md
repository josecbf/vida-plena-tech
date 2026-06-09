---
tags:
  - squads
  - execucao
---

# Plano de Squads

## Papéis centrais

- Arquiteto de software.
- Engenheiro de dados.
- Tech lead frontend.
- Tech lead backend.
- Analista de negocios.
- Product manager.
- Product designer/UX.
- Especialista em operacao de igrejas.
- Especialista em seguranca/LGPD.
- QA.
- DevOps/infra.

## Squads recomendados

### Squad Core

Responsavel por tenant, usuarios, permissoes, auditoria, billing, feature flags, configuracoes e shell da plataforma.

### Squad Pessoas

Responsavel por cadastro, familias, timeline, tags, consentimentos, busca, importacao e historico.

### Squad Cuidado e Discipulado

Responsavel por SOM, Ensino, GCs e jornada do discipulo.

### Squad Domingo

Responsavel por Cultos, Criancas, Ministerios, Voluntarios e check-ins.

### Squad Operacoes

Responsavel por Eventos, Espacos, Estoque, Compras, Equipamentos e Financeiro.

### Squad IA e Dados

Responsavel por modelo canonico, BI, eventos de dominio, relatorios, IA embarcada e qualidade de dados.

## Regra de trabalho paralelo

Nenhum squad deve criar seu proprio cadastro de pessoa, permissao, agenda ou auditoria. Esses contratos pertencem ao Core e ao Pessoas.

## Primeira semana de trabalho

1. Congelar modelo canonico v0.
2. Definir contratos entre Core e modulos.
3. Desenhar sitemap da plataforma.
4. Criar design system inicial.
5. Detalhar PRD de Pessoas.
6. Detalhar MVP de SOM, Ensino, GCs, Cultos e Criancas.
7. Mapear riscos LGPD.
8. Definir stack tecnica.

