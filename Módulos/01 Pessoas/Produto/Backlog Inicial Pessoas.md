---
tags:
  - pessoas
  - produto
  - backlog
---

# Backlog Inicial Pessoas

← [[000 - Hub Pessoas]]

---

## P0 - Fundação

### P0.1 Cadastro básico de pessoa

Como secretaria, quero cadastrar uma pessoa com dados mínimos para que ela exista no sistema como identidade única.

Critérios:

- nome é obrigatório;
- tenant é obrigatório;
- pessoa pode ser criada sem usuário de login;
- criação gera auditoria.

### P0.2 Lista e busca de pessoas

Como usuário autorizado, quero buscar pessoas por nome, e-mail ou telefone para localizar rapidamente um cadastro.

Critérios:

- resultados respeitam permissão;
- busca ignora acentos e caixa;
- lista mostra status e contato principal.

### P0.3 Contatos e endereços

Como secretaria, quero manter contatos e endereço para comunicação correta.

Critérios:

- múltiplos contatos por pessoa;
- indicação de contato principal;
- validação básica de e-mail e telefone.

### P0.4 Família e responsáveis

Como secretaria, quero vincular pessoas em famílias para representar relações reais.

Critérios:

- uma pessoa pode pertencer a uma casa;
- relações têm tipo;
- criança/dependente pode ter responsável definido.

### P0.5 Status, tags e segmentos

Como admin, quero classificar pessoas para organizar acompanhamento e comunicação.

Critérios:

- status principal controlado;
- tags administráveis;
- filtros salvos como segmentos.

### P0.6 Consentimentos

Como admin, quero registrar consentimentos para respeitar finalidade e LGPD.

Critérios:

- consentimento tem finalidade;
- registra data, origem e status;
- revogação preserva histórico.

### P0.7 Timeline básica

Como líder autorizado, quero ver eventos relevantes da pessoa para entender contexto.

Critérios:

- evento tem origem;
- evento tem nível de sensibilidade;
- exibição respeita permissão.

---

## P1 - Operação

- Importação via planilha.
- Pré-validação de duplicidade.
- Mesclagem assistida.
- Auditoria detalhada.
- Campos customizados governados.
- Relatórios de cadastro incompleto.

---

## P2 - Inteligência

- Deduplicação inteligente.
- Sugestões de segmentos.
- Score de engajamento.
- Alertas pastorais configuráveis.
- Portal do membro para atualização cadastral.

