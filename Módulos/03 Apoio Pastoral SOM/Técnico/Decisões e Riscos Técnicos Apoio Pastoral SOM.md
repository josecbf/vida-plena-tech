---
tags:
  - apoio-pastoral-som
  - tecnico
  - riscos
---

# Decisões e Riscos Técnicos Apoio Pastoral SOM

← [[000 - Hub Apoio Pastoral SOM]]

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

- Não rotular pessoas de forma definitiva
- Não decidir ação pastoral automaticamente
- Não expor dados sensíveis sem escopo
- Sempre mostrar origem e lacunas dos sinais
