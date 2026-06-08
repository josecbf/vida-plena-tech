---
tags:
  - criancas
  - produto
  - prd
---

# PRD Crianças

← [[000 - Hub Crianças]]

## 1. Resumo executivo

Crianças deve entregar uma experiência clara para Coordenação infantil, Voluntários, Responsáveis, Secretaria, Segurança. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

O ministério infantil lida com dados sensíveis, autorização e segurança; planilhas e etiquetas manuais deixam lacunas importantes.

## 3. Tese do produto

Cuidar do fluxo infantil com segurança, responsáveis, check-in, salas, restrições e histórico básico.

## 4. Perfis de usuário

### Coordenação infantil

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Crianças dentro do seu escopo de responsabilidade.

### Voluntários

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Crianças dentro do seu escopo de responsabilidade.

### Responsáveis

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Crianças dentro do seu escopo de responsabilidade.

### Secretaria

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Crianças dentro do seu escopo de responsabilidade.

### Segurança

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Crianças dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Cadastro da criança
- Responsáveis autorizados
- Check-in e checkout
- Salas e faixas etárias
- Alertas
- Ocorrências
- Etiquetas

### Segurança de retirada

Checkout infantil é fluxo crítico. A v1 precisa prever:

- etiqueta ou código de retirada;
- responsáveis autorizados;
- pessoas bloqueadas para retirada;
- registro de quem entregou e quem retirou;
- tentativa de retirada negada;
- exceção autorizada apenas por coordenador;
- histórico auditável por culto/evento.

### Dados de cuidado

O módulo deve tratar como sensível:

- alergias;
- restrições médicas;
- necessidades especiais;
- termo de imagem;
- autorização de participação;
- incidentes;
- restrições de guarda ou retirada.

### Operação de sala

- sala por faixa etária;
- limite de crianças por sala;
- razão adulto/criança;
- troca de sala registrada;
- chamada do responsável;
- fechamento do período com pendências.

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
- Voluntário vê somente dados necessários para cuidar da criança naquela sala.
- Admin da igreja não recebe acesso automático a dados sensíveis de crianças.
- Checkout por exceção exige motivo, usuário responsável e auditoria.

## 8. Métricas de sucesso

- Crianças com responsável válido
- Checkouts seguros
- Alertas revisados
- Voluntários por sala
- Tempo de fila
