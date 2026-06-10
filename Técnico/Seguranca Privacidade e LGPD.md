---
tags:
  - tecnico
  - seguranca
  - lgpd
---

# Seguranca Privacidade e LGPD

## Dados sensiveis esperados

- dados pessoais;
- dados de criancas;
- vinculos familiares;
- historico pastoral;
- presenca;
- doacoes;
- dados financeiros;
- documentos;
- autorizacoes;
- contatos de emergencia.

## Regras fundamentais

- Controle de acesso por modulo, papel e escopo.
- Auditoria de leitura e alteracao em dados sensiveis.
- Consentimento registrado para comunicacao e dados de menores.
- Politica de retencao e exclusao.
- Exportacao de dados por tenant.
- Separacao entre notas operacionais e notas pastorais confidenciais.
- Criptografia em transito e repouso.
- Backups testados.

## Governanca LGPD operacional

Antes do schema final, cada entidade deve ter um mapa LGPD:

- dado coletado;
- finalidade;
- base legal;
- nivel de sensibilidade;
- quem acessa;
- origem;
- compartilhamento com terceiros;
- tempo de retencao;
- forma de exclusao, anonimização ou bloqueio;
- possibilidade de portabilidade;
- impacto em criancas e adolescentes.

Fluxos obrigatorios:

- solicitacao de acesso pelo titular;
- correcao de dado;
- revogacao de consentimento;
- portabilidade;
- exclusao ou anonimização quando juridicamente cabivel;
- resposta a incidente de seguranca;
- registro de encarregado/DPO ou responsavel interno;
- revisao de impacto para dados sensiveis, criancas, pastoral e financeiro.

Entidades LGPD obrigatorias:

- `ConsentRecord` — consentimento, revogacao, versao do texto e finalidade;
- `DataSubjectRequest` — acesso, correcao, portabilidade, exclusao/anonimizacao e status;
- `DataRetentionPolicy` — retencao por tipo de dado, modulo e base legal;
- `ProcessingActivity` — finalidade, controlador, operador, suboperador e compartilhamento;
- `SecurityIncident` — incidente, impacto, medidas e comunicacoes;
- `DpiaReview` — revisao de impacto para dados sensiveis, menores, financeiro e IA.

Gate LGPD por modulo:

- listar campos pessoais e sensiveis;
- definir finalidade e base legal;
- definir quem acessa;
- definir retencao;
- definir exclusao, anonimização ou bloqueio;
- definir exportacao/portabilidade;
- definir compartilhamento com terceiros;
- definir se IA pode acessar e em qual nivel;
- definir se ha menores de idade;
- definir auditoria de leitura.

Observacao legal: dados de criancas e adolescentes devem ser tratados no melhor interesse deles, com cuidado proprio e verificacao razoavel de consentimento do responsavel quando aplicavel.

## Criancas

Modulo de Criancas exige nivel extra:

- responsaveis autorizados;
- check-in e checkout auditados;
- registro de quem entregou e retirou;
- controle de alergias e observacoes;
- restricao severa de visibilidade;
- relatorios de incidentes;
- historico acessivel apenas a perfis autorizados.

## IA

IA nao deve receber todo dado por padrao. Ela deve receber apenas o minimo necessario para a tarefa, respeitando permissao do usuario e nivel de sensibilidade.

Quando IA usar dado de nivel 3, 4 ou 5, registrar finalidade, usuario, escopo, resumo da resposta e acao humana posterior quando houver.

## Retencao minima recomendada

| Tipo de dado | Retencao conceitual | Observacao |
|---|---|---|
| Cadastro de pessoa | enquanto houver relacao legitima | arquivar em vez de apagar quando houver historico operacional |
| Consentimentos | historico permanente enquanto necessario | preservar prova de concessao e revogacao |
| Check-in infantil | periodo definido pela politica da igreja | manter auditoria e incidentes por prazo maior |
| Notas pastorais | revisar periodicamente | acesso restrito e possibilidade de minimizacao |
| Financeiro | conforme obrigacao contabil/fiscal | exportacao e auditoria controladas |
| Logs tecnicos | prazo curto e finalidade clara | sem payload sensivel sempre que possivel |
