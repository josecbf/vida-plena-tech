---
tags:
  - grupos-crescimento
  - tecnico
  - riscos
---

# Decisões e Riscos Técnicos Grupos de Crescimento

← [[000 - Hub Grupos de Crescimento]]

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

- Não transformar GC em controle frio
- Não expor informações pastorais para todos
- Não medir saúde só por quantidade
