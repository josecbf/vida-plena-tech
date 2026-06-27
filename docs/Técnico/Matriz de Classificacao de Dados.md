---
tags:
  - tecnico
  - lgpd
  - dados
  - seguranca
atualizado: 2026-05-25
---

# Matriz de Classificacao de Dados

## Objetivo

Definir o nivel de cuidado esperado para cada tipo de dado da Plataforma-Igrejas.

## Niveis

### Nivel 1 - Operacional comum

Exemplos:

- nome;
- telefone;
- email;
- participacao em turma;
- presenca em culto;
- escala publica de voluntarios.

Controles:

- permissao por modulo;
- escopo por igreja, campus, ministerio ou grupo;
- auditoria de alteracao.

### Nivel 2 - Operacional restrito

Exemplos:

- endereco;
- vinculo familiar;
- status de membresia;
- documentos;
- observacoes administrativas;
- historico de atendimento nao confidencial.

Controles:

- permissao granular;
- auditoria de leitura quando houver sensibilidade;
- exportacao restrita;
- minimizacao em telas de voluntarios.

### Nivel 3 - Pastoral confidencial

Exemplos:

- anotacoes pastorais sensiveis;
- acompanhamento do SOM;
- situacoes familiares delicadas;
- pedidos de cuidado confidenciais;
- sinais de risco pastoral.

Controles:

- acesso por perfil explicitamente autorizado;
- separacao da timeline operacional comum;
- auditoria de leitura;
- bloqueio em exportacoes genericas;
- uso de IA apenas com contexto minimo e justificativa.

### Nivel 4 - Menores de idade

Exemplos:

- dados de criancas;
- responsaveis autorizados;
- restricoes medicas;
- alergias;
- incidentes;
- check-in e checkout.

Controles:

- visibilidade minima para voluntarios;
- autorizacao clara de responsaveis;
- auditoria forte;
- historico protegido;
- regras de excecao documentadas.

### Nivel 5 - Financeiro sensivel

Exemplos:

- doacoes individuais;
- doacoes identificadas originadas no TAP;
- Gift Entry e lotes de contribuicoes fisicas;
- despesas;
- contas;
- dados bancarios;
- conciliacoes;
- aprovadores;
- comprovantes.

Controles:

- segregacao de funcoes;
- trilha de aprovacao;
- auditoria imutavel;
- relatorio por perfil;
- exportacao com registro.

### Nivel 6 - Segredos tecnicos

Exemplos:

- tokens de API;
- chaves de webhook;
- credenciais de integracao;
- segredos de pagamento;
- credenciais de gateway configuradas no TAP;
- connection strings.

Controles:

- nunca armazenar em texto puro;
- acesso apenas por servico autorizado;
- rotacao;
- mascaramento em logs;
- auditoria administrativa.

## Regra de desenho

Quando houver duvida, classificar no nivel mais restritivo ate validacao formal.

## Classificacao especifica do TAP

| Dado TAP | Nivel | Observacao |
|---|---:|---|
| TapEvent sem identificacao pessoal | 1/2 | Operacional; IP/user-agent devem ser hasheados quando coletados |
| Destino ativo, grupo TAP e dispositivo | 1 | Sem dado pessoal por padrao |
| Formulario de visitante | 2 | Contato operacional; nao cria Pessoa no escopo atual |
| Pedido de oracao | 3 | Pastoral confidencial, leitura auditada |
| Decisao por Jesus / batismo | 3 | Pastoral confidencial, leitura auditada |
| Inscricao em celula | 2 | Encaminhamento operacional; pode subir para nivel 3 se houver texto sensivel |
| Doacao identificada | 5 | Financeiro sensivel, acesso segregado |
| Gift Entry | 5 | Financeiro sensivel, auditoria forte |
| Credenciais de gateway | 6 | Segredo tecnico, nunca em texto puro |
