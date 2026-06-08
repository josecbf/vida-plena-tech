---
tags:
  - plataforma-igrejas
  - ensino
  - produto
  - arquitetura-funcional
---

# Arquitetura Funcional Ensino

← [[000 - Hub Ensino]]

---

## Áreas funcionais

### 1. Experiência do aluno

- Minha jornada.
- Meus cursos.
- Próxima etapa.
- Conteúdo da lição.
- Progresso.
- Certificados.

### 2. Gestão de jornadas

- Criar jornada.
- Definir etapas.
- Ordenar progressão.
- Configurar pré-requisitos.
- Ativar/desativar jornada.

### 3. Gestão de cursos

- Criar curso.
- Organizar módulos e lições.
- Anexar materiais.
- Definir publicação.
- Arquivar curso.

### 4. Turmas presenciais

- Criar turma.
- Vincular curso ou etapa.
- Definir datas.
- Registrar presença.
- Concluir turma.

### 5. Motor de acesso

- Avaliar pré-requisitos.
- Explicar bloqueios.
- Liberar etapas disponíveis.
- Registrar liberações manuais.
- Consumir sinais externos.

### 6. Acompanhamento de liderança

- Visão por liderado.
- Pessoas travadas.
- Progresso por jornada.
- Progresso por curso.
- Alertas para intervenção pastoral.

### 7. Governança editorial

- Rascunho.
- Revisão.
- Publicação.
- Arquivamento.
- Histórico de alterações relevantes.

### 8. Relatórios

- Visão geral do módulo.
- Conclusões.
- Travas.
- Certificados.
- Turmas e presença.

---

## Fluxos principais

```text
Admin cria jornada
→ define etapas
→ vincula cursos/turmas/marcos
→ configura pré-requisitos
→ publica jornada
→ alunos elegíveis enxergam o próximo passo
```

```text
Aluno inicia curso
→ consome lições
→ progresso é registrado
→ curso é concluído oficialmente
→ motor libera próxima etapa
→ liderança acompanha
```

```text
Aluno fica travado
→ sistema registra motivo
→ líder visualiza pendência
→ ação pastoral ou administrativa acontece
→ etapa é concluída, sincronizada ou liberada
```

---

## Integrações internas

| Módulo | Integração |
|--------|------------|
| Pessoas | Aluno, líder, vínculos, contatos, histórico |
| Identidade e Permissões | Papéis, escopos e autorização |
| Eventos | Encontros presenciais e presença |
| Comunicação | E-mails, WhatsApp, push e lembretes |
| Financeiro | Cursos pagos, pedidos e liberação de acesso |
| SOM/Apoio Pastoral | Sinais de avanço, travamento e cuidado |
| Portal/App | Interface do aluno |
