---
tags:
  - pessoas
  - estrategia
  - riscos
---

# Riscos do Módulo - Pessoas

← [[000 - Hub Pessoas]]

---

## Riscos principais

| Risco | Impacto | Mitigação |
|------|---------|-----------|
| Cadastro virar depósito bagunçado | Perda de confiança no sistema | Campos governados, deduplicação e revisão |
| Exposição de dados sensíveis | Risco pastoral, jurídico e reputacional | Permissões, auditoria e classificação |
| Pessoa duplicada | Histórico fragmentado e comunicação errada | Busca por similaridade e fluxo de mesclagem |
| Campos customizados sem critério | Produto fica inconsistente | Catálogo de campos e aprovação por admin |
| Timeline excessiva | Ruído para liderança | Filtros por tipo, origem e relevância |
| Integração externa sobrescrever dados bons | Perda de informação correta | Regras de precedência e revisão de conflito |
| Consentimento fraco | Problema com LGPD | Registrar finalidade, origem, data e revogação |

---

## Risco pastoral específico

Dados de pessoas não são neutros. O sistema pode revelar fragilidades familiares, situações pastorais, baixa frequência, histórico de acompanhamento e informações de crianças.

Por isso, o módulo precisa ser desenhado com a lógica:

> Quem precisa saber, para cuidar melhor, dentro de um escopo legítimo?

Não com a lógica:

> Quem tem cargo alto vê tudo.

---

## Sinais de alerta

- Muitas pessoas com nomes parecidos sem revisão.
- Campos livres virando substitutos de processo.
- Líderes pedindo exportações amplas sem finalidade clara.
- Dados de crianças acessíveis por perfis administrativos genéricos.
- Timeline usada como prontuário sensível sem controle específico.

