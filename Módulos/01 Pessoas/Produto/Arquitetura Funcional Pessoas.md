---
tags:
  - pessoas
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Pessoas

← [[000 - Hub Pessoas]]

---

## Áreas funcionais

### 1. Cadastro de pessoa

- Dados básicos.
- Foto/avatar.
- Data de nascimento.
- Gênero, quando necessário e permitido.
- Estado civil.
- Observações não sensíveis.
- Status principal na igreja.

### 2. Contatos e endereços

- E-mails.
- Telefones.
- WhatsApp preferencial.
- Endereço residencial.
- Contato principal.
- Preferência de comunicação.

### 3. Família e vínculos

- Casa/família.
- Cônjuge.
- Pai/mãe/responsável.
- Filhos/dependentes.
- Relações customizadas controladas.

### 4. Papéis e status

- Visitante.
- Frequentador.
- Membro.
- Líder.
- Voluntário.
- Aluno.
- Responsável.
- Criança/adolescente.
- Doador.
- Inativo/afastado.

### 5. Segmentos e tags

- Tags manuais.
- Segmentos salvos.
- Filtros por status, idade, ministério, grupo, curso, campus e vínculo.

### 6. Consentimentos

- Comunicação por e-mail/WhatsApp.
- Uso de imagem.
- Dados de crianças.
- Finalidades específicas.
- Revogação.

### 7. Timeline

- Eventos manuais simples.
- Eventos vindos de outros módulos.
- Filtro por origem.
- Filtro por sensibilidade.

### 8. Importação e deduplicação

- Upload de planilha.
- Validação de campos.
- Prévia antes de importar.
- Possíveis duplicidades.
- Mesclagem assistida.

---

## Fluxos principais

### Criar pessoa manualmente

```text
Usuário abre Pessoas
→ Nova pessoa
→ preenche dados mínimos
→ adiciona contato
→ define status
→ salva
→ sistema audita criação
```

### Criar família

```text
Ficha da pessoa
→ aba Família
→ criar ou vincular casa
→ definir relação
→ validar responsáveis
→ salvar vínculos
```

### Importar pessoas

```text
Upload de planilha
→ mapear colunas
→ validar dados
→ revisar erros e duplicidades
→ confirmar importação
→ gerar relatório
```

### Consultar pessoa

```text
Busca global
→ resultado filtrado por permissão
→ ficha da pessoa
→ abas: Resumo, Contatos, Família, Timeline, Consentimentos, Auditoria
```

---

## Integrações internas

| Módulo | Relação com Pessoas |
|--------|---------------------|
| Ensino | Aluno, progresso resumido, jornada |
| SOM/Apoio Pastoral | Contexto pastoral com acesso restrito |
| GCs | Participante, líder, supervisor |
| Cultos | Participação, escala, presença |
| Crianças | Criança, responsável, autorização |
| Voluntários | Perfil ministerial e disponibilidade |
| Eventos | Inscrição, presença, check-in |
| Financeiro | Doador/pagador, com privacidade reforçada |
| Comunicação | Segmentos e consentimentos |

