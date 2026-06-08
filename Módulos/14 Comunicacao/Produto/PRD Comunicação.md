---
tags:
  - comunicacao
  - produto
  - prd
---

# PRD Comunicação

← [[000 - Hub Comunicação]]

## 1. Resumo executivo

Comunicação deve entregar uma experiência clara para Comunicação, Secretaria, Pastores, Líderes autorizados, Membros. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

Comunicação dispersa em grupos e listas manuais gera ruído, mensagens duplicadas e perda de histórico.

## 3. Tese do produto

Centralizar segmentos, campanhas, templates, envios e histórico de comunicação da igreja.

## 4. Perfis de usuário

### Comunicação

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Comunicação dentro do seu escopo de responsabilidade.

### Secretaria

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Comunicação dentro do seu escopo de responsabilidade.

### Pastores

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Comunicação dentro do seu escopo de responsabilidade.

### Líderes autorizados

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Comunicação dentro do seu escopo de responsabilidade.

### Membros

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Comunicação dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Segmentos
- Campanhas
- Templates
- Canais
- Agendamento
- Aprovação
- Histórico
- Métricas

### Governança de comunicação

O módulo precisa reduzir ruído, não apenas enviar mais mensagens.

Regras de produto:

- consentimento por canal;
- preferência de comunicação por pessoa;
- aprovação para envio a toda igreja;
- calendário editorial;
- limite de fadiga por pessoa;
- histórico de mensagens na ficha da pessoa;
- separação entre comunicação transacional, pastoral e institucional.

Segmentos práticos:

- visitantes dos últimos 30 dias;
- pais de crianças;
- líderes de GC;
- voluntários escalados;
- alunos de uma turma;
- membros sem GC;
- inscritos em evento.

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
- Descadastro ou revogação de consentimento deve ser respeitado por canal.
- Comunicação pastoral sensível exige cuidado de permissão e histórico.
- Mensagem externa em massa precisa de aprovação e rastro.

## 8. Métricas de sucesso

- Envios entregues
- Falhas por canal
- Preferências atualizadas
- Campanhas aprovadas
- Descadastros
