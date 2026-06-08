---
tags:
  - pessoas
  - estrategia
  - decisoes
---

# Decisões de Produto - Pessoas

← [[000 - Hub Pessoas]]

---

## Decisões assumidas

| Decisão | Motivo |
|--------|--------|
| Pessoa é entidade central da plataforma | Todos os módulos dependem de identidade confiável |
| Tenant é obrigatório em todo dado protegido | A plataforma é multi-igreja desde a base |
| Pessoa não é igual a usuário de login | Muitas pessoas existem sem acesso ao sistema |
| Família/casa é entidade própria | Vínculos familiares impactam crianças, comunicação e pastoreio |
| Papéis são acumuláveis | A mesma pessoa pode ser aluno, líder, voluntário e responsável |
| Timeline é federada | Outros módulos podem escrever eventos sem Pessoas copiar seus bancos |
| Dados sensíveis têm classificação | Nem todo líder pode ver tudo |
| Consentimento é registro auditável | LGPD exige histórico e finalidade |
| Deduplicação é parte do produto | Cadastro duplicado destrói confiança no sistema |

---

## Decisões ainda abertas

| Tema | Pergunta |
|------|----------|
| Portal do membro | Entra na v1 ou fica para v2? |
| Importação | Começa por planilha, API ou ambos? |
| Identificador único | CPF será usado, opcional ou evitado? |
| Multi-campus | Vem no modelo desde a v1 ou como expansão? |
| Campos customizados | Serão permitidos por tenant? Com qual governança? |
| Integração externa | Qual sistema será o primeiro integrador real? |

---

## Decisões que não devem ser reabertas sem motivo forte

- Não misturar usuário de login com pessoa.
- Não permitir acesso total a dados sensíveis por conveniência.
- Não transformar Pessoas em módulo pastoral completo.
- Não iniciar outros módulos sem modelo mínimo de Pessoas.
- Não tratar família como texto solto.

