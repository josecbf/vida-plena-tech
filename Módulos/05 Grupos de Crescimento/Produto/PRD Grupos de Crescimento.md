---
tags:
  - grupos-crescimento
  - produto
  - prd
---

# PRD Grupos de Crescimento

← [[000 - Hub Grupos de Crescimento]]

## 1. Resumo executivo

Grupos de Crescimento deve entregar uma experiência clara para Pastor de GCs, Supervisor, Líder de GC, Anfitrião, Secretaria. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

GCs crescem melhor quando liderança consegue acompanhar frequência, cuidado, multiplicação e lacunas sem depender de mensagens soltas.

## 3. Tese do produto

Dar visibilidade pastoral e operacional aos pequenos grupos, suas pessoas, encontros, líderes e saúde.

## 4. Perfis de usuário

### Pastor de GCs

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Grupos de Crescimento dentro do seu escopo de responsabilidade.

### Supervisor

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Grupos de Crescimento dentro do seu escopo de responsabilidade.

### Líder de GC

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Grupos de Crescimento dentro do seu escopo de responsabilidade.

### Anfitrião

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Grupos de Crescimento dentro do seu escopo de responsabilidade.

### Secretaria

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Grupos de Crescimento dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Cadastro de grupos
- Participantes
- Liderança
- Reuniões
- Frequência
- Saúde do grupo
- Multiplicação
- Encaminhamentos

### Rotina semanal do líder

O líder de GC precisa conseguir registrar a semana pelo celular em poucos minutos:

- reunião aconteceu ou foi cancelada;
- presentes;
- ausentes;
- visitantes;
- pedidos de oração;
- observação simples;
- próximo passo ou encaminhamento.

### Estrutura de supervisão

O módulo deve suportar:

- pastor de rede;
- supervisor;
- líder;
- líder em treinamento;
- anfitrião;
- participantes;
- visitantes recorrentes.

### Multiplicação

Critérios sugeridos:

- frequência média saudável;
- líder auxiliar preparado;
- anfitrião ou local disponível;
- participantes suficientes;
- baixa dependência de uma única pessoa;
- acompanhamento pastoral em dia.

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
- Líder vê apenas grupos dentro do seu escopo.
- Observações sensíveis não devem aparecer para todos os participantes da cadeia.
- Ausência recorrente pode gerar sinal pastoral, mas exige revisão humana.

## 8. Métricas de sucesso

- Frequência média
- Pessoas sem grupo
- Grupos sem reunião recente
- Líderes ativos
- Encaminhamentos concluídos
