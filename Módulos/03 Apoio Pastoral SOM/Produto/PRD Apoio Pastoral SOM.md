---
tags:
  - apoio-pastoral-som
  - produto
  - prd
---

# PRD Apoio Pastoral SOM

← [[000 - Hub Apoio Pastoral SOM]]

## 1. Resumo executivo

Apoio Pastoral SOM deve entregar uma experiência clara para Pastor, Líder de GC, Coordenador pastoral, Equipe de cuidado. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

A liderança pastoral costuma perceber riscos tarde demais porque presença, frequência, vínculos, ausências e histórico ficam espalhados em sistemas e conversas.

## 3. Tese do produto

Transformar dados dispersos em sinais pastorais explicáveis, sem substituir discernimento humano.

## 4. Perfis de usuário

### Pastor

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Apoio Pastoral SOM dentro do seu escopo de responsabilidade.

### Líder de GC

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Apoio Pastoral SOM dentro do seu escopo de responsabilidade.

### Coordenador pastoral

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Apoio Pastoral SOM dentro do seu escopo de responsabilidade.

### Equipe de cuidado

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Apoio Pastoral SOM dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Radar pastoral
- Ficha pastoral da pessoa
- Saúde de GCs
- Ausentes e sem conexão
- Casos pastorais
- Fila semanal de ação
- Briefing para liderança

### Protocolo de caso pastoral

O SOM deve tratar caso pastoral como fluxo humano e confidencial:

1. Sinal nasce de ausência, pedido, encaminhamento, GC, ensino, evento ou observação autorizada.
2. Sinal recebe tipo, origem, evidências e nível de sensibilidade.
3. Coordenador pastoral revisa e decide se abre caso.
4. Caso recebe responsável, prioridade e prazo de primeiro contato.
5. Ações são registradas com resumo mínimo.
6. Caso é encerrado com próximo passo ou acompanhamento futuro.

Tipos iniciais:

- ausência recorrente;
- luto;
- enfermidade;
- crise familiar;
- aconselhamento;
- visita hospitalar;
- novo convertido;
- pedido de oração sensível;
- risco de afastamento.

### Níveis de sigilo

- operacional: líder autorizado pode ver;
- pastoral restrito: apenas pastoria ou equipe designada;
- confidencial: acesso explícito, auditoria de leitura e justificativa.

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
- IA pode resumir e sugerir, mas não decide gravidade nem encaminhamento final.
- Todo sinal precisa mostrar origem e explicação.
- Acesso a caso confidencial exige permissão explícita e auditoria de leitura.

## 8. Métricas de sucesso

- Casos acompanhados
- Ausentes acionados
- Tempo até primeira ação
- Sinais com origem rastreável
- Ações pastorais concluídas
