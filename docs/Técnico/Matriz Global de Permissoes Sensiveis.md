---
tags:
  - tecnico
  - permissoes
  - seguranca
  - dados-sensiveis
atualizado: 2026-05-25
---

# Matriz Global de Permissoes Sensiveis

## Principio

Administrar um modulo nao e o mesmo que acessar todo conteudo sensivel daquele modulo.

A plataforma deve separar:

- configuracao;
- operacao;
- aprovacao;
- leitura sensivel;
- exportacao;
- auditoria;
- acesso emergencial.

## Regra deny-by-default

Se uma permissao sensivel nao estiver explicitamente concedida, o acesso deve ser negado.

## Permissoes sensiveis iniciais

| Permissao | O que permite | Risco |
|---|---|---|
| `people.timeline_sensitive.view` | Ver itens sensiveis da timeline | Exposicao pastoral ou familiar |
| `people.merge.execute` | Mesclar pessoas | Perda ou mistura de historico |
| `som.case.view_confidential` | Ver caso pastoral confidencial | Exposicao de cuidado pastoral |
| `som.case.assign` | Atribuir caso pastoral | Encaminhamento indevido |
| `kids.child.view_health` | Ver alergias/restricoes | Dado sensivel de menor |
| `kids.checkout.perform` | Realizar checkout | Risco fisico e juridico |
| `kids.checkout.override` | Autorizar excecao de retirada | Alto risco operacional |
| `kids.incident.view` | Ver ocorrencias infantis | Exposicao de menor |
| `finance.donation.view_identified` | Ver doacao por pessoa | Sigilo financeiro |
| `finance.payment.approve` | Aprovar pagamento | Fraude ou conflito de interesse |
| `finance.report.export` | Exportar relatorios financeiros | Vazamento de dados |
| `audit.sensitive_log.view` | Ver logs sensiveis | Logs podem revelar dados protegidos |

## Break-glass

Acesso emergencial deve:

- exigir justificativa;
- registrar usuario, data, IP e recurso acessado;
- notificar responsavel quando aplicavel;
- entrar em relatorio de revisao;
- expirar automaticamente.

## Perfis que nunca devem ser amplos por padrao

- Admin da igreja.
- Secretaria.
- Lider de GC.
- Voluntario.
- Comunicacao.
- Tesouraria.

Cada um pode ter acesso forte dentro do seu papel, mas nao acesso irrestrito por conveniencia.

