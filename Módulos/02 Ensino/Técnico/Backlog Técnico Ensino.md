---
tags:
  - plataforma-igrejas
  - ensino
  - tecnico
  - backlog
---

# Backlog Técnico Ensino

← [[000 - Hub Ensino]]

---

## Frentes técnicas iniciais

### FT1. Integração com Pessoas

- Resolver aluno por `personId`.
- Ler vínculos de liderança e escopos.
- Registrar eventos relevantes no histórico da pessoa.

### FT2. Modelagem de cursos

- Entidades de curso, módulo, lição e anexos.
- Estados de rascunho, publicado e arquivado.
- Versionamento mínimo para proteger histórico.

### FT3. Jornada configurável

- Entidades de jornada e etapas.
- Ordenação e tipos de etapa.
- Associação com cursos, turmas, marcos externos e liberações.

### FT4. Progresso

- Registro por lição.
- Agregação por curso.
- Conclusão oficial.
- Eventos de progresso.

### FT5. Motor de acesso

- Regras AND/OR.
- Condições por curso, etapa, presença, pagamento, validação externa e liberação manual.
- Resultado explicável para aluno e liderança.

### FT6. Permissões

- RBAC por papel.
- Escopo por liderança.
- Autorização no backend.
- Logs de ações sensíveis.

### FT7. Turmas presenciais

- Turma, sessão, participantes e presença.
- Possível integração futura com Eventos.

### FT8. Certificados

- Template simples.
- Emissão.
- Código de validação.
- Reemissão controlada.

### FT9. Relatórios

- Progresso por jornada.
- Conclusões por curso.
- Travas por pré-requisito.
- Certificados emitidos.

---

## Dependências técnicas

- Modelo canônico de Pessoas.
- Serviço global de permissões.
- Eventos de domínio/auditoria.
- Estratégia de armazenamento de arquivos.
- Estratégia de envio de notificações.
- Padrão de integração com Financeiro para cursos pagos.
