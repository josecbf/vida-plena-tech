---
tags:
  - espacos-recursos
  - produto
  - prd
---

# PRD Espaços e Recursos

← [[000 - Hub Espaços e Recursos]]

## 1. Resumo executivo

Espaços e Recursos deve entregar uma experiência clara para Secretaria, Zeladoria, Líder de ministério, Organizador de evento, Admin. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

Igrejas têm múltiplos usos de salas, auditórios e recursos; conflitos aparecem quando reservas não são centralizadas.

## 3. Tese do produto

Controlar reservas de salas, ambientes e recursos compartilhados com aprovação, calendário e conflitos.

## 4. Perfis de usuário

### Secretaria

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Espaços e Recursos dentro do seu escopo de responsabilidade.

### Zeladoria

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Espaços e Recursos dentro do seu escopo de responsabilidade.

### Líder de ministério

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Espaços e Recursos dentro do seu escopo de responsabilidade.

### Organizador de evento

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Espaços e Recursos dentro do seu escopo de responsabilidade.

### Admin

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Espaços e Recursos dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Cadastro de espaços
- Recursos
- Reservas
- Aprovação
- Calendário
- Conflitos
- Preparação
- Checklist de entrega

## 6. Fora da v1

- Automações avançadas sem validação humana.
- Integrações externas complexas antes de estabilizar o domínio.
- App nativo dedicado apenas para este módulo.
- Relatórios executivos avançados antes dos relatórios operacionais.
- Customização profunda por igreja antes do padrão funcionar bem.

## 7. Regras de negócio essenciais

- Todo registro pertence a um tenant.
- Usuários só veem dados dentro do escopo permitido.
- Alterações relevantes geram auditoria.
- Cadastros de pessoa devem apontar para o módulo Pessoas.
- Ações críticas precisam de responsável claro.
- Dados históricos não devem ser apagados sem política de retenção.

## 8. Métricas de sucesso

- Conflitos evitados
- Reservas aprovadas
- Solicitações pendentes
- Uso por espaço
- Ocorrências de entrega
