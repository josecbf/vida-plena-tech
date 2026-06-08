---
tags:
  - pessoas
  - tecnico
  - backlog
---

# Backlog Técnico Pessoas

← [[000 - Hub Pessoas]]

---

## FT1 - Schema base

- Criar tabelas conceituais do núcleo: `people`, `contact_methods`, `addresses`.
- Garantir `tenant_id` obrigatório.
- Definir índices para busca por nome, e-mail e telefone.
- Definir soft delete/arquivamento.

## FT2 - Família e vínculos

- Criar `households`.
- Criar `household_members`.
- Criar `person_relationships`.
- Validar responsáveis e dependentes.

## FT3 - Status, tags e segmentos

- Criar catálogo de status por tenant.
- Criar tags por tenant.
- Criar segmentos salvos com definição estruturada.
- Implementar filtros principais.

## FT4 - Consentimentos

- Criar entidade histórica de consentimento.
- Modelar finalidade, canal, origem e evidência.
- Implementar revogação sem apagar histórico.

## FT5 - Timeline

- Criar `timeline_entries`.
- Definir contrato para outros módulos publicarem eventos.
- Implementar níveis de sensibilidade.
- Aplicar política de visibilidade.

## FT6 - Auditoria

- Auditar criação, edição, arquivamento, mesclagem e consentimentos.
- Registrar ator, antes/depois e horário.
- Restringir visualização de logs.

## FT7 - Importação

- Ler planilha.
- Mapear colunas.
- Validar linhas.
- Gerar prévia.
- Criar relatório de erros.

## FT8 - Deduplicação

- Criar heurística inicial por nome, telefone, e-mail e data de nascimento.
- Criar tela/endpoint de candidatos.
- Implementar mesclagem assistida com auditoria.

## FT9 - Permissões

- Definir permissões granulares.
- Aplicar escopo por liderança/ministério.
- Proteger exportação.
- Criar testes de acesso.

