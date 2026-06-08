---
tags:
  - tecnico
  - api
  - integracoes
---

# APIs Abertas e Integracoes

## Objetivo

Permitir que igrejas, parceiros e ferramentas externas conectem dados sem gambiarra, planilhas manuais ou acesso direto ao banco.

## API publica v1

Recursos iniciais:

- pessoas;
- grupos;
- eventos;
- check-ins;
- escalas;
- inscricoes;
- doacoes/pagamentos;
- estoque;
- compras;
- equipamentos;
- relatorios.

## Webhooks

Eventos recomendados:

- `person.created`
- `person.updated`
- `event.created`
- `event.registration.created`
- `checkin.completed`
- `volunteer.scheduled`
- `volunteer.confirmed`
- `group.attendance.submitted`
- `course.completed`
- `purchase.approved`
- `inventory.low_stock`
- `equipment.maintenance_due`

## Integracoes alvo

- WhatsApp Business.
- E-mail transacional.
- SMS.
- Prover.
- Planning Center.
- MyKids.
- Voluts.
- InPeace.
- Stripe/Pagar.me/Mercado Pago.
- Google Calendar.
- YouTube/Vimeo.
- Cifra Club/Spotify/Deezer para culto e ensaio.

## Regras

- Toda integracao externa precisa de `ExternalMapping`.
- Toda sincronizacao precisa de log.
- Importacao deve ser idempotente.
- Falhas devem ser visiveis para operador.
- Webhooks precisam de assinatura e reprocessamento.

## Contrato de seguranca

Toda API ou integracao externa deve definir:

- tenant resolvido por credencial, rota ou assinatura confiavel;
- OAuth ou API key por tenant;
- scopes granulares;
- rate limit;
- rotacao e revogacao de segredo;
- assinatura de webhook com timestamp;
- protecao contra replay;
- `idempotencyKey` obrigatoria para escrita externa;
- logs sem payload sensivel;
- permissao especifica para exportacao;
- registro de compartilhamento com terceiros quando houver dado pessoal.

Para WhatsApp, pagamento, e-mail, SMS e integracoes de terceiros, documentar quem atua como controlador, operador ou suboperador dos dados.
