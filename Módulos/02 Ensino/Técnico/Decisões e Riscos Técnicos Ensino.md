---
tags:
  - plataforma-igrejas
  - ensino
  - tecnico
  - decisoes
  - riscos
---

# Decisões e Riscos Técnicos Ensino

← [[000 - Hub Ensino]]

---

## Decisões técnicas iniciais

| Decisão | Justificativa |
|---------|---------------|
| Usar `personId` como referência central do aluno | Evita duplicar cadastro dentro de Ensino |
| Separar progresso de conclusão oficial | Permite revisitar conteúdo sem apagar histórico |
| Modelar pré-requisitos como regras compostas | Evita lógica rígida por etapa |
| Registrar liberações manuais como entidade auditável | Mantém governança pastoral e técnica |
| Tratar jornada e curso como conceitos diferentes | Nem todo curso é etapa; nem toda etapa é curso |
| Validar permissões no backend | Segurança não pode depender da interface |

---

## Riscos técnicos

- Regras de acesso se tornarem difíceis de manter.
- Consultas de progresso ficarem pesadas com muitos alunos.
- Histórico de publicação de cursos ficar inconsistente.
- Dependência de vídeo/arquivo gerar custo alto.
- Escopo de liderança ser mal resolvido e vazar dados.
- Integrações externas bloquearem avanço quando estiverem fora do ar.

---

## Mitigações

- Começar com motor de regras simples e testável.
- Criar eventos de domínio para progresso e conclusão.
- Usar índices por tenant, pessoa, curso e etapa.
- Definir política de armazenamento antes de aceitar upload amplo.
- Manter liberações manuais auditadas como contingência.
- Escrever testes específicos para autorização por escopo.

---

## Perguntas em aberto

- A primeira versão hospedará vídeos ou apenas links privados?
- Certificados terão validação pública já no início?
- O módulo deve emitir notificações diretamente ou apenas publicar eventos para Comunicação?
- Turmas presenciais nascerão dentro de Ensino ou serão uma visão especializada de Eventos?
- Cursos pagos entram no primeiro ciclo técnico ou ficam para fase seguinte?
