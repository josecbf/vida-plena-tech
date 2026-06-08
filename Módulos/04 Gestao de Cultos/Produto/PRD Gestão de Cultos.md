---
tags:
  - cultos
  - produto
  - prd
---

# PRD Gestão de Cultos

← [[000 - Hub Gestão de Cultos]]

## 1. Resumo executivo

Gestão de Cultos deve entregar uma experiência clara para Pastor, Diretor de culto, Líder de louvor, Técnica, Comunicação, Voluntários. O módulo precisa resolver o problema central sem criar cadastros paralelos, mantendo conexão com Pessoas, permissões, auditoria e comunicação.

## 2. Problema

Cultos envolvem muitas equipes e detalhes; quando ficam em planilhas, grupos e arquivos soltos, a execução depende demais de memória e improviso.

## 3. Tese do produto

Organizar planejamento, escala, repertório, mídia e execução do culto em uma operação clara e integrada.

## 4. Perfis de usuário

### Pastor

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Gestão de Cultos dentro do seu escopo de responsabilidade.

### Diretor de culto

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Gestão de Cultos dentro do seu escopo de responsabilidade.

### Líder de louvor

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Gestão de Cultos dentro do seu escopo de responsabilidade.

### Técnica

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Gestão de Cultos dentro do seu escopo de responsabilidade.

### Comunicação

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Gestão de Cultos dentro do seu escopo de responsabilidade.

### Voluntários

Usa o módulo para executar, acompanhar ou decidir ações relacionadas a Gestão de Cultos dentro do seu escopo de responsabilidade.

## 5. Escopo v1

- Planejamento de culto
- Cronograma e ordem
- Repertório
- Escalas
- Confirmações
- Arquivos e mídias
- Modo ao vivo

### Fluxo real de domingo

O módulo precisa cobrir a rotina prática do culto:

1. Planejar culto com data, horário, campus, pregador, tema, texto bíblico e série.
2. Montar ordem do culto: abertura, oração, louvor, ceia, oferta, avisos, pregação, apelo, encerramento e pós-culto.
3. Vincular equipes: louvor, som, projeção, transmissão, recepção, intercessão, diaconia, estacionamento e kids.
4. Confirmar escalas e sinalizar faltas.
5. Anexar arquivos, mídias, letras, cifras e slides.
6. Usar modo culto para acompanhar tempo, pendências e mudanças.
7. Registrar pós-culto: visitantes, decisões, pedidos de oração, ocorrências e faltas na escala.

### Exceções esperadas

- Pregador troca texto ou tema perto do culto.
- Voluntário falta sem avisar.
- Música muda após ensaio.
- Mídia ou slide está faltando.
- Culto tem ceia, batismo, apresentação de criança ou evento especial.
- Internet falha durante operação.

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
- Alterações na ordem do culto precisam registrar responsável.
- Escalas devem respeitar disponibilidade, requisitos e conflito com outros ministérios.
- Pós-culto deve gerar pendências acionáveis para Pessoas, Comunicação, SOM ou Voluntários.

## 8. Métricas de sucesso

- Escalas confirmadas
- Planos fechados no prazo
- Pendências por culto
- Arquivos completos
- Ocorrências pós-culto
