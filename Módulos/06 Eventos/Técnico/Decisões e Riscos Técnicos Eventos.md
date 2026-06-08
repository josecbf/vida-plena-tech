---
tags:
  - eventos
  - tecnico
  - riscos
---

# Decisões e Riscos Técnicos Eventos

← [[000 - Hub Eventos]]

## Decisões técnicas iniciais

- Usar modelo multi-tenant desde o primeiro desenho.
- Centralizar identidade em Pessoas.
- Registrar eventos de domínio para auditoria e BI.
- Evitar campos JSON livres quando houver regra relacional clara.
- Separar dados operacionais de observações sensíveis.

## Riscos

- RLS incompleta expondo dados fora do escopo.
- Entidades excessivamente genéricas dificultando relatórios.
- Acoplamento forte com outro módulo antes do contrato estar claro.
- Falta de índices para telas de lista e relatórios.

## Guardrails técnicos

- Não duplicar cadastro de pessoas
- Não processar pagamento sem conciliação
- Não ignorar capacidade de espaço
