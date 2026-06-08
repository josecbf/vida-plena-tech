---
tags:
  - ministerios-voluntarios
  - produto
  - prd
---

# PRD Ministérios e Voluntários

← [[000 - Hub Ministérios e Voluntários]]

## 1. Resumo executivo

Ministérios e Voluntários deve entregar uma experiência clara para Líder de ministério, Coordenador de voluntários, Voluntário, Secretaria, Pastor. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

Voluntários servem melhor quando sabem onde estão escalados, quais requisitos precisam cumprir e quem lidera cada equipe.

## 3. Tese do produto

Organizar ministérios, equipes, voluntários, requisitos, escalas e engajamento com clareza.

## 4. Perfis de usuário

### Líder de ministério

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Ministérios e Voluntários dentro do seu escopo de responsabilidade.

### Coordenador de voluntários

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Ministérios e Voluntários dentro do seu escopo de responsabilidade.

### Voluntário

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Ministérios e Voluntários dentro do seu escopo de responsabilidade.

### Secretaria

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Ministérios e Voluntários dentro do seu escopo de responsabilidade.

### Pastor

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Ministérios e Voluntários dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Cadastro de ministérios
- Equipes
- Voluntários
- Requisitos
- Disponibilidade
- Escalas
- Confirmações
- Treinamentos

### Vida real do voluntário

O módulo precisa cobrir:

- disponibilidade por domingo, horário e campus;
- confirmação de escala;
- recusa justificada;
- pedido de substituição;
- aprovação de troca pelo líder;
- conflito entre ministérios;
- descanso mínimo;
- bloqueio por treinamento pendente;
- alerta de sobrecarga.

### Saúde do voluntariado

Indicadores importantes:

- pessoas escaladas domingos seguidos;
- voluntários inativos;
- funções com poucos substitutos;
- faltas sem aviso;
- recusas recorrentes;
- requisitos pendentes por função.

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
- Uma pessoa não deve ser escalada em funções conflitantes no mesmo horário.
- Requisitos por função podem bloquear escala.
- Substituição precisa preservar histórico de quem foi escalado, quem substituiu e quem aprovou.

## 8. Métricas de sucesso

- Escalas preenchidas
- Confirmações
- Voluntários ativos
- Requisitos pendentes
- Sobrecarga por pessoa
