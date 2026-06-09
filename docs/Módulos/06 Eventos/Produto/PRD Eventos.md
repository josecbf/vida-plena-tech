---
tags:
  - eventos
  - produto
  - prd
---

# PRD Eventos

← [[000 - Hub Eventos]]

## 1. Resumo executivo

Eventos deve entregar uma experiência clara para Organizador, Secretaria, Financeiro, Comunicação, Voluntários, Participantes. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

Eventos exigem inscrição, presença, pagamento, comunicação e logística; quando cada parte fica separada, a equipe perde controle.

## 3. Tese do produto

Planejar, divulgar, inscrever, cobrar quando necessário e acompanhar eventos da igreja com rastreabilidade.

## 4. Perfis de usuário

### Organizador

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Eventos dentro do seu escopo de responsabilidade.

### Secretaria

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Eventos dentro do seu escopo de responsabilidade.

### Financeiro

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Eventos dentro do seu escopo de responsabilidade.

### Comunicação

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Eventos dentro do seu escopo de responsabilidade.

### Voluntários

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Eventos dentro do seu escopo de responsabilidade.

### Participantes

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Eventos dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Cadastro de evento
- Lotes e inscrições
- Formulários
- Pagamentos
- Check-in
- Listas
- Comunicação
- Relatórios

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

- Inscrições confirmadas
- Taxa de check-in
- Pagamentos pendentes
- Capacidade ocupada
- No-show
