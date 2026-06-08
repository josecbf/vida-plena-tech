---
tags:
  - auditoria
  - stress-test
  - plataforma-igrejas
atualizado: 2026-05-25
---

# Stress Test - Plataforma-Igrejas

## Objetivo

Testar o planejamento contra cenarios ruins, comuns e caros em uma igreja real. O produto so deve ser considerado forte se continuar simples, seguro e util sob pressao.

## Cenario 1 - Domingo com pico de uso

### Situacao

Em 20 minutos, a igreja precisa registrar presencas, check-in infantil, escalas de voluntarios, comunicacao de ultima hora e ajustes de salas.

### Riscos

- Fila no check-in infantil.
- Lider sem permissao correta.
- Voluntario ausente sem substituto.
- Internet instavel.
- Dados duplicados de visitantes.

### Exigencias para o produto

- Fluxos rapidos com poucos campos obrigatorios.
- Modo de busca tolerante a erro.
- Confirmacao visual clara de check-in e checkout.
- Registro de acao mesmo quando houver excecao.
- Relatorio pos-culto com pendencias e incidentes.

## Cenario 2 - Crianca retirada por pessoa nao autorizada

### Situacao

Alguem tenta retirar uma crianca, mas nao consta como responsavel autorizado.

### Riscos

- Voluntario ceder por pressao.
- Falta de historico.
- Exposicao de informacao sensivel.

### Exigencias para o produto

- Bloqueio claro de checkout.
- Acionamento de coordenador.
- Registro de tentativa.
- Visibilidade minima para voluntario.
- Auditoria de quem autorizou excecao, caso exista.

## Cenario 3 - Dado pastoral sensivel vazando para lider errado

### Situacao

Um lider precisa ver frequencia e participacao, mas nao deveria ver anotacoes pastorais confidenciais.

### Riscos

- Permissao ampla demais.
- Dados sensiveis em timeline comum.
- Relatorio exportado com informacao indevida.

### Exigencias para o produto

- Separar timeline operacional de notas pastorais confidenciais.
- Permissao por tipo de dado, nao apenas por modulo.
- Auditoria de leitura em dados sensiveis.
- Exportacao respeitando escopo e classificacao.

## Cenario 4 - Financeiro com conflito de interesse

### Situacao

Uma despesa e solicitada, aprovada e paga pela mesma pessoa ou por pessoas sem separacao adequada.

### Riscos

- Fraude.
- Falta de transparencia.
- Relatorio sem rastro de aprovacao.

### Exigencias para o produto

- Regras de segregacao de funcao.
- Trilhas de aprovacao configuraveis.
- Auditoria imutavel de aprovacao, alteracao e pagamento.
- Relatorios para tesouraria, conselho e pastoria autorizada.

## Cenario 5 - Duplicidade de pessoa em varios modulos

### Situacao

Uma pessoa aparece como membro, responsavel por crianca, aluno e doador com registros separados.

### Riscos

- Comunicacao errada.
- Historico fragmentado.
- Relatorios inconsistentes.
- Consentimentos perdidos.

### Exigencias para o produto

- Pessoa canonica obrigatoria.
- Deduplicacao assistida.
- Mesclagem com auditoria.
- ExternalMapping para importacoes e integracoes.

## Cenario 6 - Lider sem familiaridade tecnica

### Situacao

Um lider de GC ou voluntario usa o sistema poucas vezes por semana e precisa registrar frequencia, confirmar escala ou enviar comunicado.

### Riscos

- Abandono do sistema.
- Volta para WhatsApp e planilha.
- Dados incompletos.

### Exigencias para o produto

- Telas pequenas e objetivas.
- Acao principal evidente.
- Linguagem de igreja, nao linguagem tecnica.
- Feedback imediato.
- Recuperacao simples de erro.

## Resultado do stress test

O planejamento passa no nivel estrategico, mas ainda exige reforco em:

- modo domingo;
- classificacao de dados;
- auditoria de leitura;
- segregacao de funcao no financeiro;
- fluxos de excecao em criancas;
- deduplicacao forte em Pessoas;
- simplicidade operacional para lideres leigos.

## Reinicio do ciclo de melhoria

As proximas melhorias devem priorizar:

1. Pessoas: deduplicacao, consentimentos, timeline separada por sensibilidade.
2. Criancas: check-in, checkout, autorizacoes, incidentes e excecoes.
3. Financeiro: aprovacao, segregacao, auditoria e relatorios por perfil.
4. GCs e Cultos: operacao rapida para frequencia e escalas.
5. Comunicacao: consentimento, preferencia de canal e historico.

