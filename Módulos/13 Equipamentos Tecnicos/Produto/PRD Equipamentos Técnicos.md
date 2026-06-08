---
tags:
  - equipamentos-tecnicos
  - produto
  - prd
---

# PRD Equipamentos Técnicos

← [[000 - Hub Equipamentos Técnicos]]

## 1. Resumo executivo

Equipamentos Técnicos deve entregar uma experiência clara para Equipe técnica, Líder de mídia, Patrimônio, Organizador de evento, Compras. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

Equipamentos de som, luz, vídeo e TI precisam de controle porque falhas aparecem justamente em cultos e eventos.

## 3. Tese do produto

Controlar patrimônio técnico, reservas, manutenção, responsáveis, kits e disponibilidade operacional.

## 4. Perfis de usuário

### Equipe técnica

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Equipamentos Técnicos dentro do seu escopo de responsabilidade.

### Líder de mídia

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Equipamentos Técnicos dentro do seu escopo de responsabilidade.

### Patrimônio

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Equipamentos Técnicos dentro do seu escopo de responsabilidade.

### Organizador de evento

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Equipamentos Técnicos dentro do seu escopo de responsabilidade.

### Compras

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Equipamentos Técnicos dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Cadastro de equipamentos
- Kits
- Reservas
- Manutenções
- Responsáveis
- Status
- Checklists
- Histórico

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

- Equipamentos indisponíveis
- Manutenções abertas
- Reservas por período
- Ocorrências recorrentes
- Custo de manutenção
