---
tags:
  - ministerios-voluntarios
  - tecnico
  - riscos
---

# Decisões e Riscos Técnicos Ministérios e Voluntários

← [[000 - Hub Ministérios e Voluntários]]

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

- Não confundir membro com voluntário ativo
- Não escalar sem disponibilidade ou requisito
- Não expor avaliações sensíveis
