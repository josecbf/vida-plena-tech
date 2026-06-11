---
tags: [tecnico, arquitetura, adr, multi-tenant, lgpd]
status: Aceito
atualizado: 2026-06-11
---

# ADR-0004 — Isolamento multi-tenant (RLS)

**Status:** Aceito (convergência GPT + Claude). Sub-decisão service-role vs JWT em aberto.

## Contexto
Banco compartilhado com `tenant_id` + RLS. Com dado pastoral/financeiro de 24k pessoas sob LGPD, vazamento cross-tenant é catastrófico. RLS só protege se a query rodar no contexto certo; **service-role bypassa RLS**.

## Decisão
1. Toda tabela tenant-scoped: `tenant_id NOT NULL`, FK composta quando fizer sentido, **índice começando por `tenant_id`**, RLS habilitado.
2. **Teste automatizado de isolamento cross-tenant** obrigatório em todo PR que cria tabela tenant-scoped (a rede de segurança).
3. Promoção a **schema/DB dedicado** só por **compliance/SLA/contrato enterprise ou noisy-neighbor** — nunca por tamanho. Construir a disciplina de `tenant_id` agora para poder extrair um tenant depois.
4. **Multi-campus** modelado explicitamente (a âncora tem 8 pastores/multi-campus): definir se campus é sub-escopo dentro do tenant e como a RLS trata acesso por campus (ex.: pastor do campus A não vê aconselhamento do campus B).

## Em aberto
- **service-role vs JWT do usuário no backend.** Se usar service-role, é obrigatório `SET app.tenant_id` por requisição + políticas RLS lendo esse contexto + os testes de isolamento. Recomendação: **evitar service-role no caminho de dados do tenant**; usá-la só em tarefas administrativas controladas.

## Consequências
- Custo de disciplina alto, mas é o que torna o banco compartilhado seguro e barato até a escala enterprise.
