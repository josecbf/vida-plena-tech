---
tags:
  - pessoas
  - tecnico
  - decisoes
  - riscos
---

# Decisões e Riscos Técnicos Pessoas

← [[000 - Hub Pessoas]]

---

## Decisões técnicas iniciais

| Decisão | Justificativa |
|--------|---------------|
| `tenant_id` obrigatório em tudo | Isolamento multi-igreja |
| `Person` separado de `User` | Nem toda pessoa acessa o sistema |
| Consentimento histórico | Booleano simples não atende governança |
| Timeline com origem e sensibilidade | Evita vazamento e duplicação de domínio |
| Soft delete/arquivamento | Dados relacionais não devem sumir sem rastro |
| Auditoria em dados sensíveis | Necessário para confiança e LGPD |
| Segmentos com definição estruturada | Evita SQL manual ou filtros frágeis |

---

## Riscos técnicos

| Risco | Mitigação |
|------|-----------|
| Busca lenta em base grande | Índices, normalização e busca dedicada se necessário |
| Duplicidade difícil de resolver | Heurísticas progressivas e revisão humana |
| Permissões inconsistentes | Política centralizada e testes |
| Timeline virar acoplamento entre módulos | Contrato de evento resumido por domínio |
| Importação corromper dados | Prévia, validação e transação |
| Campos customizados virarem caos | Schema governado por tipo e escopo |
| Vazamento por exportação | Permissão específica, auditoria e limites |

---

## ADRs pendentes

- Estratégia final de busca: Postgres full-text, trigram ou serviço externo.
- Formato de telefone normalizado.
- Uso ou não de CPF como identificador auxiliar.
- Modelo de campos customizados por tenant.
- Política de retenção de dados arquivados.
- Contrato de eventos entre módulos.

