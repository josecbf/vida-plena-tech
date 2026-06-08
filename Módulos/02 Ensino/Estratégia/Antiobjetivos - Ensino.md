---
tags:
  - plataforma-igrejas
  - ensino
  - estrategia
  - antiobjetivos
---

# Antiobjetivos - Ensino

← [[000 - Hub Ensino]]

---

## O que o módulo não deve ser

O módulo Ensino não deve tentar resolver toda a operação da igreja. Sua força está em formação, jornada, conteúdo, progresso e acompanhamento.

---

## Fora do escopo principal

- CRM completo de membros.
- Sistema de cuidado pastoral amplo.
- Gestão de GCs.
- Agenda geral da igreja.
- Plataforma social com feed, curtidas e comunidade aberta.
- Marketplace genérico de cursos.
- Substituto completo para YouTube, Vimeo ou ferramentas profissionais de vídeo.
- Sistema financeiro completo.
- Ferramenta de transmissão ao vivo.
- Gestão completa de voluntários.

---

## Cuidados de produto

- Não transformar discipulado em consumo frio de conteúdo.
- Não criar uma experiência administrativa pesada para líderes.
- Não permitir que qualquer pessoa publique conteúdo sem governança.
- Não criar regras de avanço hardcoded para uma única igreja.
- Não tratar presença em aula, batismo ou encontros pastorais como simples checkbox sem origem e auditoria.
- Não duplicar dados que pertencem ao módulo Pessoas.

---

## Fronteiras importantes

| Tema | Pertence a Ensino? | Observação |
|------|--------------------|------------|
| Dados pessoais completos | Não | Vêm de Pessoas |
| Cursos e lições | Sim | Núcleo do módulo |
| Jornada do Discípulo | Sim | Configurável por tenant |
| Check-in de evento presencial | Parcial | Pode consumir dados de Eventos |
| Pagamento de curso | Parcial | Financeiro executa pagamento; Ensino consome liberação |
| Acompanhamento pastoral profundo | Parcial | Ensino mostra sinais; SOM trata cuidado |
| Comunicação automática | Parcial | Ensino dispara eventos; Comunicação envia |
