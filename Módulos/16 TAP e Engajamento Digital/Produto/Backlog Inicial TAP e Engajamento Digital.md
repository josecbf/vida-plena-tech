---
tags:
  - tap
  - engajamento
  - produto
  - backlog
---

# Backlog Inicial — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## Épicos

| ID | Épico | Fase |
|----|-------|------|
| E01 | Infraestrutura multi-tenant e autenticação | 1 |
| E02 | Dispositivos e grupos TAP | 1 |
| E03 | Redirect engine | 1 |
| E04 | Destinos — tipos básicos | 1 |
| E05 | Painel de comunicação | 1 |
| E06 | Fluxo de oferta digital — Pix | 2 |
| E07 | Fluxo de oferta digital — Cartão | Pós-MVP |
| E08 | Fluxo de oferta digital — Apple Pay / Google Pay | Pós-MVP |
| E09 | Gateway abstrato — Mercado Pago | 2 |
| E10 | Gateway abstrato — Stripe | 2 |
| E11 | Gateway abstrato — Asaas | 2 |
| E12 | Integração ProPresenter | 3 |
| E13 | Agendamento de trocas | 3 |
| E14 | Formulários pastorais | 3 |
| E15 | Dashboard de engajamento e financeiro | 3 |
| E16 | Gift entry | 3 |
| E17 | Pacotes e billing | 4 |
| E18 | Onboarding guiado | 4 |
| E19 | LGPD, consentimento e auditoria | 0 |
| E20 | Contrato financeiro e decisão de não cadastro | 0 |
| E21 | Observabilidade de culto | 2 |

---

## Histórias — Fase 0 — Contratos antes de UI

### E19 — LGPD, consentimento e auditoria

- Como organização, quero configurar textos de consentimento versionados para formulários pastorais, para coletar dados com finalidade explícita.
- Como pastor autorizado, quero que a leitura de pedidos sensíveis seja auditada, para preservar confiança pastoral.
- Como titular de dados, quero que meus dados possam ser exportados, corrigidos ou anonimizados quando cabível, para atender LGPD.

### E20 — Contrato financeiro e decisão de não cadastro

- Como sistema, quero publicar evento de doação confirmada com chave de idempotência, para que o Financeiro consolide sem duplicidade.
- Como sistema, quero manter formulários pastorais como registros operacionais do TAP, para não criar cadastro de Pessoas/visitantes no escopo atual.
- Como PO, quero registrar que integração com Pessoas é fase futura, para impedir que a implementação tome decisão de cadastro no código.

---

## Histórias — Fase 1 — Alpha operacional sem pagamento

### E01 — Infraestrutura

- Como admin da plataforma, quero que cada organização tenha seus dados isolados, para garantir segurança multi-tenant.
- Como admin de organização, quero me cadastrar com e-mail e senha, para começar a configurar minha conta.
- Como admin de organização, quero verificar meu e-mail antes de acessar o painel, para garantir que a conta é legítima.
- Como admin de organização, quero convidar usuários com papéis diferentes (admin, comunicação, financeiro), para distribuir responsabilidades sem compartilhar credenciais.

### E02 — Dispositivos e grupos

- Como admin, quero criar um grupo TAP associado a um campus e dar um nome a ele, para organizar meus dispositivos logicamente.
- Como admin, quero configurar um destino padrão opcional para o grupo, para ter fallback quando não houver override ativo.
- Como admin, quero registrar um dispositivo físico dentro de um grupo e receber uma URL única, para programar a moeda NFC.
- Como admin, quero ver o QR code equivalente da URL do dispositivo, para imprimir como fallback.
- Como admin, quero ver qual é o destino ativo de cada grupo em tempo real, para saber o que o TAP está apontando agora.
- Como comunicação, quero visualizar URL, QR e destino ativo sem poder excluir dispositivos, para operar o culto sem risco estrutural.
- Como admin, quero desativar ou arquivar grupo/dispositivo preservando histórico, para tirar itens de uso sem perder auditoria.

**Critérios de aceite E02:**
- [ ] Grupo TAP é criado com campus, nome, status e destino padrão opcional.
- [ ] Dispositivo TAP é criado dentro de um grupo e recebe `public_id` não enumerável.
- [ ] URL pública e QR code são gerados automaticamente e não editados manualmente.
- [ ] Comunicação consegue visualizar URL, QR e destino ativo, mas não cria/exclui grupos ou dispositivos.
- [ ] Grupo/dispositivo inativo ou arquivado não redireciona para destino ativo; cai em contingência.
- [ ] Validação impede referência cruzada entre tenants/campus.

### E03 — Redirect engine

- Como visitante, quero que quando toco o TAP, a tela correta abra em menos de 2 segundos, para não perder o momento.
- Como sistema, quero registrar cada tap (timestamp + device-id) sem coletar dados pessoais do visitante, para analytics sem violar privacidade.
- Como sistema, quero aplicar rate limit e marcar tráfego suspeito, para evitar analytics contaminado por automação.
- Como admin, quero ver uma página de contingência quando um dispositivo estiver inativo ou sem destino, para não expor erro técnico ao visitante.

**Critérios de aceite E03:**
- [ ] `GET /t/{device-id}` resolve dispositivo, grupo e destino ativo sem exigir login do visitante.
- [ ] Redirect de sucesso retorna `302` para destino publicado e válido.
- [ ] Cache hit não consulta banco e mantém p95 abaixo de 200ms em 500 requisições simultâneas.
- [ ] Cache miss consulta banco com timeout curto e atualiza cache quando a resolução for válida.
- [ ] Troca de destino invalida cache para que o próximo tap use o destino novo.
- [ ] Analytics é assíncrono e falha de `TapEvent` não bloqueia redirect.
- [ ] `TapEvent` não registra nome, e-mail, telefone, CPF ou identificador persistente de visitante.
- [ ] Device inexistente, inativo ou arquivado mostra contingência sem revelar detalhe técnico.
- [ ] Grupo inativo, sem destino ativo ou com destino inválido usa destino padrão válido ou página "Conteúdo em breve".
- [ ] Destino `draft`, `inactive`, `archived`, inválido ou externo reprovado não recebe redirect público.
- [ ] Rate limit marca tráfego suspeito sem contaminar analytics limpo e sem revelar se o device-id existe.
- [ ] Falha de cache ou banco degrada para banco, último destino válido ou contingência, nessa ordem.

### E04 — Destinos básicos

- Como comunicação, quero criar um destino do tipo "página própria" com imagem, título, texto e botão, para preparar a tela de uma campanha ou evento.
- Como admin, quero criar um destino do tipo "URL externa", para redirecionar para um formulário já existente.
- Como admin, quero ativar manualmente um destino em um grupo TAP, para controlar o que o TAP aponta.
- Como admin, quero configurar duração do override manual, para evitar que o TAP fique preso em um destino antigo.
- Como admin, quero exigir aprovação para URL externa fora da política, para reduzir risco de phishing.

**Critérios de aceite E04:**
- [ ] Destino `own_page` é criado como rascunho com título, texto principal, rótulo de botão, imagem opcional e URL de botão opcional.
- [ ] Publicação de `own_page` exige campos obrigatórios válidos e bloqueia HTML arbitrário, scripts e coleta de dados pessoais.
- [ ] Destino `external_url` é criado como rascunho com URL absoluta `https://`.
- [ ] Sistema bloqueia URL relativa, domínio inválido e schemes proibidos (`javascript:`, `data:`, `file:`, `mailto:`, `tel:`).
- [ ] Painel mostra preview do domínio normalizado antes da publicação de URL externa.
- [ ] URL externa fora da política fica pendente de aprovação ou exige permissão `tap.external_url.publish`.
- [ ] Destinos `draft` e `inactive` não podem ser selecionados como destino ativo de grupo TAP.
- [ ] Inativar destino usado por grupo TAP exige escolher substituto ou confirmar retorno ao destino padrão.
- [ ] Alterar URL externa publicada executa nova validação e registra auditoria.
- [ ] Criação, publicação, alteração sensível e despublicação de destino geram `AuditLog`.

### E05 — Painel de comunicação

- Como usuário com papel "comunicação", quero ver só os destinos e o controle de ativação, sem acessar dados financeiros, para focar no meu trabalho.
- Como comunicação, quero trocar o destino ativo de um grupo com um clique, para reagir rapidamente durante o culto.

---

## Histórias — Fase 2 — Beta Pix controlado

### E06 — Pix

- Como doador, quero selecionar um valor sugerido ou digitar outro, para escolher quanto dar.
- Como doador, quero ver um QR code Pix com o valor já preenchido, para não precisar digitá-lo no banco.
- Como doador, quero ver a confirmação da minha doação sem precisar voltar à tela anterior, para ter certeza de que funcionou.
- Como doador, quero ver quando o QR Pix expira e gerar outro, para não pagar uma cobrança inválida.
- Como doador, quero informar nome, e-mail e CPF opcionalmente, para receber recibo e relatório anual.
- Como admin, quero configurar os valores sugeridos de oferta, para adaptar ao perfil da minha congregação.
- Como admin, quero ser notificado via webhook quando uma doação for confirmada, para registrar em tempo real.
- Como sistema, quero processar webhook de forma idempotente, para não duplicar doações.

### E16 — Gift Entry básico

- Como tesoureiro, quero abrir um lote de culto, lançar doações físicas e fechar o lote, para consolidar o movimento financeiro.
- Como tesoureiro, quero reabrir um lote com auditoria, para corrigir erro sem perder rastreabilidade.

### E21 — Observabilidade de culto

- Como admin, quero ver saúde do redirect, gateway, webhooks e filas durante o culto, para agir antes que visitantes percebam falha.

### E07 — Cartão (pós-MVP)

- Como doador, quero inserir os dados do meu cartão de forma segura, para contribuir com cartão de crédito ou débito.
- Como sistema, quero nunca receber os dados do cartão diretamente — apenas o token do gateway, para garantir segurança PCI.

### E08 — Apple Pay / Google Pay (pós-MVP)

- Como doador com Apple Pay configurado, quero pagar com Face ID, para dar em 2 segundos.
- Como doador com Google Pay configurado, quero pagar com impressão digital, para dar sem digitar nada.

### E09/E10/E11 — Gateways

- Como admin, quero escolher meu gateway de pagamento no onboarding e inserir minhas credenciais, para usar o contrato que já tenho.
- Como admin, quero testar a conexão com meu gateway antes do primeiro culto, para garantir que vai funcionar no dia.

---

## Histórias — Fase 3 — Automação e engajamento

### E12 — ProPresenter

- Como admin, quero baixar o app auxiliar do ProPresenter direto do meu painel, para instalar sem buscar em outro lugar.
- Como admin, quero ver o status de conexão do app em tempo real, para saber se está funcionando antes do culto.
- Como admin, quero rotacionar e revogar token do app auxiliar, para conter vazamento de credencial.
- Como operador do ProPresenter, quero que ao colocar uma keyword na nota do slide, o TAP troque de destino automaticamente, para não precisar abrir outro sistema.
- Como admin, quero mapear keywords a grupos TAP e destinos, para configurar uma vez e esquecer.

### E13 — Agendamento

- Como comunicação, quero configurar que às 10:30 o TAP mude para a tela de oferta e às 11:45 mude para o formulário de visitante, para não depender de troca manual.
- Como comunicação, quero que agendamentos se repitam semanalmente, para configurar uma vez e usar por meses.

### E14 — Formulários pastorais

- Como visitante, quero preencher um cartão de visita tocando o TAP, para deixar meu contato sem papel.
- Como visitante, quero fazer um pedido de oração de forma discreta, para não precisar falar com ninguém pessoalmente no momento.
- Como pastor, quero receber os pedidos de oração no painel, para acompanhar e responder.
- Como liderança, quero que inscrições em célula sejam encaminhadas ao módulo GCs, para não perder o contato.

### E15 — Dashboard

- Como admin, quero ver o total arrecadado hoje e este mês, para acompanhar a saúde financeira do culto.
- Como liderança, quero ver quantas pessoas tocaram o TAP por culto, para medir o engajamento.
- Como financeiro, quero exportar relatório de doações por período em CSV, para conciliação.

### E16 — Gift entry

- Como tesoureiro, quero lançar manualmente uma doação em dinheiro com valor, fundo e data, para que o relatório financeiro seja completo.
- Como tesoureiro, quero agrupar lançamentos de um mesmo culto em um lote, para facilitar conciliação.

### E17 — Pacotes e billing

- Como owner, quero que o plano Essencial tenha pelo menos Dízimo, Oferta e Missões, para usar o TAP em culto real sem limite artificial.
- Como tesoureiro de igreja pequena, quero Gift Entry básico no Essencial, para registrar contribuições físicas sem precisar contratar plano avançado.
- Como admin, quero receber alerta ao chegar perto do limite do plano, para agir antes de bloquear configuração.
- Como visitante, quero que um TAP já publicado continue funcionando durante o culto mesmo se a organização atingir limite comercial, para não perder o momento de doação ou inscrição.
- Como owner, quero uma janela de graça após atingir limite, para fazer upgrade ou reduzir uso sem derrubar fluxos públicos.
- Como sistema, quero bloquear apenas criação/edição administrativa acima do limite, para preservar doações pendentes e destinos ativos.
