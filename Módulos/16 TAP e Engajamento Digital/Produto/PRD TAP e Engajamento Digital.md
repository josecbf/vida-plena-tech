---
tags:
  - tap
  - engajamento
  - produto
  - prd
---

# PRD — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## 1. Resumo executivo

TAP e Engajamento Digital é o módulo que conecta o momento presencial do culto ao mundo digital. Um visitante toca o celular numa moeda NFC, a tela certa abre, e em segundos ele doa, se inscreve ou envia uma manifestação operacional — sem app, sem login, sem fricção.

TAP é um facilitador de inscrições e doações. No escopo atual, ele não cria cadastro de pessoas ou visitantes; qualquer integração futura com Pessoas deve passar por contrato próprio.

O módulo é composto por três camadas:
1. **Hardware lógico** — registro e gestão de dispositivos NFC físicos
2. **Redirect engine** — serviço de redirecionamento dinâmico com latência mínima
3. **Destinos** — páginas e fluxos configuráveis (oferta, formulários, URLs externas)

### Release comercial

Para evitar ambiguidade entre fundação técnica e produto vendável, este PRD separa quatro marcos:

| Marco | Objetivo | Vendável? |
|---|---|---|
| Alpha operacional | TAP, QR, destinos simples e troca manual | Não |
| Beta piloto | Pix Mercado Pago, recibo simples e observabilidade de culto | Piloto controlado |
| MVP comercial | Pix estável, contrato com Financeiro, LGPD e Gift Entry básico | Sim |
| GA | ProPresenter, agendamentos, múltiplos gateways e automações avançadas | Sim |

O **MVP comercial** deste módulo inclui oferta via Pix com Mercado Pago, Gift Entry básico, controle de destinos, consentimento LGPD nos formulários e integração documental com Financeiro. Cartão, Apple Pay, Google Pay, múltiplos gateways, ProPresenter e criação/match de Pessoas pertencem a fases posteriores, salvo decisão explícita de antecipação.

---

## 2. Problema

A igreja perde dezenas de momentos de engajamento por culto porque o caminho da intenção à ação tem passos demais. Quando o processo é lento, a intenção esfria.

Situações concretas que este módulo resolve:

- Pastor convida para oferta → pessoa precisa abrir banco, ler QR, digitar valor → 40 segundos → desiste
- Aviso sobre acampamento → pessoa ouve a URL → chega em casa → esqueceu
- Apelo de oração → pastor pede para preencher cartão → papel não encontrado → momento perdido
- Inscrição para ECD aberta → 5 eventos simultâneos no mesmo culto → como trocar o QR entre os avisos?

---

## 3. Perfis de usuário

### Administrador da organização
Configura gateways de pagamento, cria campus, define fundos e categorias, gerencia usuários e papéis, acessa relatórios completos e controla plano de assinatura.

### Líder de comunicação
Cria e edita destinos (imagem, título, texto, botão, link), configura keywords do ProPresenter, define agendamentos de troca. Não acessa dados financeiros individuais.

### Operador do ProPresenter
Adiciona keywords nas notas dos slides. Não acessa o painel da plataforma diretamente — sua ação no ProPresenter dispara mudanças automáticas.

### Tesoureiro / Financeiro
Acessa dashboard de receitas, exporta relatórios, realiza gift entry de doações físicas, reconcilia com módulo Financeiro.

### Visitante / Membro (usuário final — sem login)
Toca o TAP, age na tela que abre. Não cria conta. Não faz login. Pode opcionalmente informar dados em formulários ou recibos, mas isso não gera cadastro de Pessoa/visitante no escopo atual.

---

## 4. Escopo v1

### 4.1 Gestão de dispositivos TAP

- Cadastro de grupos TAP por campus (ex: "Cadeiras Bloco A", "Altar", "Recepção")
- Registro de dispositivos físicos dentro de cada grupo
- Geração de URL única por dispositivo (ex: `{slug}.plataforma.com.br/t/{device-id}`)
- Configuração de tag como leitura apenas (instrução operacional)
- QR code equivalente gerado automaticamente para fallback impresso

### 4.2 Destinos

Tipos de destino suportados na v1:

| Tipo | Descrição |
|------|-----------|
| `offering` | Tela de doação com seleção de valor, fundo e método de pagamento |
| `event_registration` | Link ou integração futura com inscrição de evento |
| `pastoral_form` | Formulário embutido: visitante, oração, decisão, batismo, célula |
| `external_url` | Redirect direto para URL configurada, com validação de segurança |
| `own_page` | Landing page simples: imagem, título, texto, botão com link |

No Alpha operacional, os destinos implementáveis são somente `own_page` e `external_url`. `offering`, `event_registration` e `pastoral_form` permanecem no vocabulário do produto, mas não fazem parte desta entrega.

Cada destino tem:
- Nome interno (visível só no painel)
- Conteúdo configurável por tipo
- Status: ativo / inativo / rascunho
- Versão de schema de configuração
- Escopo: organização inteira ou campus específico

`Destination.config` não é JSON livre. Cada tipo possui schema versionado e validado antes de persistir. Alterações futuras criam nova versão de schema e migração explícita.

**Destino `own_page` no Alpha:**
- Campos obrigatórios: título, texto principal e rótulo do botão.
- Campos opcionais: imagem, texto alternativo da imagem e URL do botão.
- Quando houver URL no botão, ela usa as mesmas validações de URL externa.
- A página própria é hospedada pela plataforma, não coleta dados pessoais e não cria cadastro de visitante.
- Publicar exige conteúdo válido, sem HTML arbitrário e com tamanho dentro dos limites do editor.

**Destino `external_url` no Alpha:**
- Aceita apenas URLs `https://` absolutas.
- Bloqueia esquemas como `javascript:`, `data:`, `file:`, `mailto:`, `tel:` e URLs relativas.
- Normaliza a URL antes de salvar: remove espaços, aplica lowercase no host e preserva path/query.
- Exibe preview do domínio final antes da publicação.
- Pode usar allowlist opcional por organização; domínio fora da política exige aprovação de owner/admin ou permissão `tap.external_url.publish`.
- Alterar a URL de um destino já publicado volta o destino para validação de publicação.

**Estados e transições:**
- `draft`: editável, não pode ser usado como destino ativo.
- `active`: validado, publicado e elegível para grupos TAP.
- `inactive`: preservado para histórico, mas não pode receber novos redirects.
- `draft -> active` exige schema válido e, no caso de URL externa fora da política, aprovação.
- `active -> inactive` é permitido somente se o destino não estiver ativo em nenhum grupo ou se o usuário escolher substituto/retorno ao destino padrão.
- `inactive -> active` executa novamente as validações do tipo e registra auditoria.

### 4.3 Controle de destino ativo

Cada grupo TAP tem um destino ativo a cada momento. O destino pode ser trocado por:

1. **Troca manual** — admin ou comunicação troca pelo painel em tempo real
2. **Agendamento** — troca automática por horário configurado (ex: 10:30 → oferta)
3. **Keyword ProPresenter** — keyword na nota do slide dispara troca automática

Hierarquia de prioridade (maior sobrescreve menor):
1. Troca manual
2. Keyword ProPresenter
3. Agendamento
4. Destino padrão

Regras obrigatórias:
- Troca manual exige duração: até próxima troca, até horário definido, até fim do culto ou permanente.
- Se a duração expirar, o grupo retorna ao destino padrão ou ao agendamento vigente.
- Inativar um destino ativo exige escolher substituto ou confirmar retorno ao destino padrão.
- Ao fim do culto, a organização pode configurar retorno automático para destino padrão ou tela de "culto encerrado".

### 4.4 Fluxo de oferta digital

**Passo 1 — Seleção de valor**
Botões de valores sugeridos configuráveis pela organização + campo "Outro valor". Não há valor obrigatório pré-preenchido.

**Passo 2 — Seleção de fundo** (se a organização tiver mais de um fundo ativo)
Ex: Dízimo, Oferta, Missões, Construção. Opcional se só houver um fundo.

**Passo 3 — Método de pagamento**
- Pix — gera QR dinâmico para o valor exato selecionado (MVP comercial)
- Cartão de crédito / débito (fase posterior ao Pix estável)
- Apple Pay (fase posterior, condicionado a domínio/gateway)
- Google Pay (fase posterior, condicionado a domínio/gateway)

**Passo 4 — Confirmação**
Tela de confirmação com valor, fundo e instrução de recibo. Recibo enviado por e-mail se informado.

**Dados mínimos coletados:** valor, fundo, método. Nome, e-mail e CPF são opcionais e usados para recibo e relatório anual quando aplicável. No escopo atual, esses dados não criam cadastro de Pessoa/visitante.

**Ciclo de vida Pix:**
- Estados: `created`, `pending`, `expired`, `confirmed`, `failed`, `cancelled`, `refunded`.
- QR Pix tem TTL visível ao doador.
- Ao expirar, a tela oferece "Gerar novo Pix".
- Webhook confirma pagamento mesmo se o doador fechar a tela.
- Cobranças pendentes expiradas são atualizadas por job.
- Webhook de gateway é idempotente por `gateway_provider`, `gateway_transaction_id` e `gateway_event_id`.

**Recibos e identificação:**
- Doação pode ser anônima quando permitido pela organização e pelo fundo.
- Doador pode informar nome, e-mail e CPF para recibo.
- CPF é armazenado criptografado.
- Relatório anual por doador depende de CPF; vínculo com Pessoa fica para fase futura, após contrato próprio.
- Comprovante transacional não substitui contabilidade oficial do módulo Financeiro.

### 4.5 Formulários pastorais

Quatro tipos na v1:

| Formulário | Campos |
|------------|--------|
| Cartão de visitante | Nome, telefone, e-mail, bairro, como conheceu, interesse em próximos passos |
| Pedido de oração | Nome (opcional), pedido de oração (texto livre), autorização de compartilhamento |
| Decisão por Jesus | Nome, contato, tipo de decisão (primeira vez, reconciliação, batismo) |
| Inscrição em célula | Nome, telefone, bairro/região preferida, disponibilidade de dia e horário |

Dados capturados permanecem como registros operacionais do TAP no escopo atual. Eles não criam nem atualizam cadastro de Pessoas/visitantes.

Todos os formulários pastorais exigem consentimento explícito antes do envio. O texto de consentimento é versionado e registra finalidade, retenção e compartilhamento com a igreja.

Regras:
- Pedido de oração pode ser anônimo e, nesse caso, não cria Pessoa.
- Dados sensíveis pastorais exigem permissão específica para leitura.
- Comunicação não vê conteúdo individual sensível de oração ou decisão.
- Integração futura com Pessoas exige contrato próprio antes de qualquer criação, match ou revisão de cadastro.

### 4.6 Integração ProPresenter

- App auxiliar instalado no Mac do ProPresenter (download disponível no painel admin)
- Autenticação via token escopado por organização, campus e máquina
- Lê slide notes via API de rede local do ProPresenter (porta configurável)
- Detecta keywords registradas → envia evento para backend → backend atualiza destino ativo
- Status de conexão visível no dashboard (conectado / desconectado / última sincronização)
- Override manual sempre disponível
- Versão mínima suportada do ProPresenter deve ser documentada antes da distribuição
- App distribuído como `.dmg` assinado e notarizado no macOS
- Token pode ser revogado e rotacionado pelo painel
- Heartbeat identifica campus, máquina, versão do app e última conexão
- Conflitos de keyword são resolvidos por prioridade explícita e logados

### 4.7 Gift entry

- Lançamento manual de doação: valor, fundo, método (dinheiro, cheque, Pix externo), data, observação
- Lote de lançamentos por culto (batch)
- Emite evento para módulo Financeiro da mesma forma que doação digital
- Lote possui estados: aberto, em conferência, fechado, reaberto e exportado
- Fechamento de lote exige permissão financeira
- Correções após fechamento geram auditoria
- Gift Entry básico faz parte do MVP comercial

### 4.8 Dashboard de engajamento

- Total de taps por período
- Destinos mais acessados
- Taps por grupo e campus
- Doações: total, por fundo, por método, por período
- Formulários pastorais submetidos (quantidade por tipo, sem expor dados individuais por padrão)
- Histórico de trocas de destino

Separação de precisão:
- Analytics de taps é métrica operacional e pode ser filtrada contra abuso.
- Dados financeiros confirmados vêm de eventos idempotentes de gateway/Financeiro.
- Relatório contábil oficial pertence ao módulo Financeiro.

### 4.9 Contratos com outros módulos

#### Financeiro

TAP publica eventos de domínio; Financeiro consolida, concilia e presta contas.

Fronteira de responsabilidade:

| Responsabilidade | TAP | Financeiro |
|---|---|---|
| Criar cobrança Pix no gateway | Sim | Não |
| Receber e validar webhook do gateway | Sim | Não |
| Guardar staging operacional da origem da doação | Sim | Consome por evento |
| Emitir recibo transacional simples quando houver e-mail | Sim | Pode complementar no futuro |
| Ser ledger contábil oficial | Não | Sim |
| Conciliar gateway, caixa físico e relatórios oficiais | Não | Sim |
| Produzir prestação de contas oficial | Não | Sim |
| Exibir dashboard operacional de culto | Sim | Pode consumir dados consolidados |

O dashboard financeiro do TAP é operacional. Ele ajuda a equipe durante culto e piloto, mas não substitui relatório oficial, fechamento contábil, conciliação bancária ou prestação de contas do módulo Financeiro.

Eventos mínimos:
- `tap.donation.confirmed`
- `tap.donation.failed`
- `tap.donation.refunded`
- `tap.gift_entry.created`
- `tap.gift_batch.closed`

Cada evento inclui `event_id`, `schema_version`, `tenant_id`, `campus_id`, `occurred_at`, `idempotency_key`, entidade de origem e payload mínimo. O payload financeiro não deve expor CPF completo, credenciais de gateway ou dados de cartão.

Idempotência mínima:
- Doação confirmada usa `idempotency_key = tenant_id + gateway_provider + gateway_transaction_id`.
- Cobrança Pix pendente usa `tenant_id + gateway_provider + gateway_charge_id`.
- Webhook usa `tenant_id + gateway_provider + gateway_event_id`.
- Gift Entry usa `tenant_id + gift_entry_id`.
- Fechamento de lote usa `tenant_id + gift_batch_id + closed_at`.
- Reenvio de evento já processado pelo Financeiro não pode duplicar receita, doação ou lançamento contábil.

Gate de aceite: Pix, dashboard financeiro confirmado e Gift Entry só podem sair de piloto quando o módulo Financeiro aceitar esses eventos e registrar consumo idempotente em inbox.

#### Pessoas

No escopo atual, TAP não publica intake para criação ou match de Pessoas. Formulários pastorais e inscrições permanecem como registros operacionais do TAP, com consentimento e retenção definidos.

Integração futura com Pessoas exige contrato próprio antes de implementação, incluindo regras de match, revisão de duplicidade, consentimento e auditoria.

#### Comunicação

Comunicação recebe eventos de confirmação quando houver e-mail/telefone autorizado:
- recibo de doação;
- agradecimento de formulário;
- notificação interna para equipe responsável.

### 4.10 LGPD, retenção e auditoria

Todo dado pessoal coletado pelo módulo deve ter finalidade explícita.

| Fluxo / dado | Dados coletados | Finalidade | Sensibilidade | Quem acessa | Retenção conceitual |
|---|---|---|---|---|---|
| TapEvent sem identificação | device-id, destination-id, timestamp, IP/user-agent hasheados | Analytics operacional, abuso e saúde do redirect | Operacional comum/restrito | Admin, comunicação e viewer em agregado | 12 meses bruto; agregado/anônimo após isso |
| Doação Pix anônima | valor, fundo, método, gateway, status | Confirmação operacional e evento financeiro | Financeiro sensível sem identificação pessoal | Financeiro e owner; admin só agregado | Conforme obrigação contábil/fiscal via Financeiro |
| Doação identificada | nome, e-mail, CPF criptografado, valor, fundo, gateway | Recibo, relatório anual e prestação de contas | Financeiro sensível | Financeiro e owner; leitura auditada | Conforme obrigação contábil/fiscal via Financeiro |
| GiftEntry | valor, fundo, método físico/externo, data, operador, observação | Prestação de contas e conciliação de culto | Financeiro sensível | Financeiro e owner; admin apenas lançamento em lote aberto quando permitido | Conforme obrigação contábil/fiscal via Financeiro |
| Formulário de visitante | nome, telefone, e-mail, bairro e interesses | Acompanhamento solicitado pela pessoa | Operacional restrito | Pastoral e owner; admin apenas se autorizado | Política da igreja, com revisão periódica |
| Pedido de oração | nome opcional e texto livre de oração | Cuidado pastoral solicitado | Pastoral confidencial | Pastoral e owner; leitura auditada | Política da igreja, com revisão periódica e minimização |
| Decisão/batismo | nome, contato e tipo de decisão | Acompanhamento pastoral solicitado | Pastoral confidencial | Pastoral e owner; leitura auditada | Política da igreja, com revisão periódica |
| Inscrição em célula | nome, telefone, bairro/região, disponibilidade | Encaminhamento operacional para equipe responsável | Operacional restrito | Pastoral/equipe responsável e owner | Política da igreja, com revisão periódica |
| Consentimento | versão do texto, finalidade, aceite, timestamp, origem | Prova de autorização e revogação | Operacional restrito | Admin autorizado, owner e auditoria | Enquanto necessário para comprovação |

Regras obrigatórias:
- Todo formulário pastoral exige consentimento explícito antes do envio.
- O texto de consentimento registra finalidade, retenção, compartilhamento interno e canal de contato da igreja.
- Comunicação não acessa conteúdo individual de formulários pastorais nem doações identificadas.
- Financeiro não acessa pedidos de oração, decisão, batismo ou conteúdo pastoral sensível.
- Pastoral não acessa doações individualizadas, CPF, gateway ou exportações financeiras.
- Owner pode ter acesso amplo, mas leitura de dado pastoral sensível ou financeiro identificado continua auditada.

Ações sensíveis exigem `AuditLog`: visualizar submissão pastoral sensível, exportar submissões, exportar doações, visualizar doação identificada, visualizar CPF/e-mail de doador, alterar gateway, rotacionar credenciais, trocar destino ao vivo, reembolsar, fechar/reabrir lote, alterar permissões e executar anonimização/exclusão.

---

## 5. Pacotes comerciais

### Essencial
- 1 campus
- Até 5 grupos TAP
- Pix via gateway suportado
- Troca manual de destino
- Mínimo de 3 fundos: Dízimo, Oferta e Missões
- Destinos: oferta e URL externa
- Gift Entry básico
- Suporte por base de conhecimento

### Crescimento
- Até 3 campus
- Até 20 grupos TAP
- Pix e cartão
- Troca manual + agendamento + ProPresenter
- Até 5 fundos
- Todos os tipos de destino
- Formulários pastorais
- Dashboard completo
- Suporte por e-mail

### Missão
- Campus ilimitados
- Grupos TAP ilimitados
- Todos os métodos de pagamento
- Todos os recursos de automação
- Fundos ilimitados
- Gift entry
- Múltiplos gateways por campus
- Domínio próprio
- Analytics com IA
- Suporte prioritário

### Limites, alertas e janela de graça

Ao atingir limite de plano, o sistema não quebra fluxos públicos já instalados durante culto. O bloqueio é administrativo: impede criar novos recursos acima do limite, exibe alerta e oferece upgrade.

Regras obrigatórias:
- TAP público já configurado continua redirecionando durante a janela de graça.
- Doações Pix já iniciadas continuam até confirmação, expiração ou falha do gateway.
- Gift Entry em lote aberto pode ser concluído; novos lotes podem ser bloqueados após a janela.
- Atingir limite bloqueia criação administrativa de novos grupos, destinos, fundos acima do limite ou automações, mas não derruba destino ativo.
- Alertas administrativos aparecem para `owner` e `admin` ao atingir 80%, 100% e após expirar a janela de graça.
- Durante culto ativo ou janela operacional configurada, o sistema nunca troca o destino público para tela de cobrança, erro comercial ou bloqueio.
- Após a janela de graça, recursos existentes continuam em modo leitura/execução essencial; criação/edição acima do limite permanece bloqueada até upgrade, arquivamento ou redução de uso.
- Credenciais de gateway, recibos, webhooks e confirmação de doações não podem ser suspensos por limite comercial enquanto houver transação pendente.

Limites avançados por uso, como múltiplos gateways por campus, domínio próprio, automações ProPresenter, métodos de pagamento adicionais e IA, pertencem às fases comerciais futuras e devem ser controlados por feature flags.

---

## 6. Escopo futuro

- Doações recorrentes com agendamento automático
- Perfil do doador com histórico (opt-in)
- Relatórios por campanha / capital campaign
- Pledges e metas de campanha
- App auxiliar ProPresenter para Windows
- Integração com Planning Center Giving como gateway
- Wearables NFC (pulseiras para eventos)
- Notificação push para liderança em tempo real durante culto
- IA: "Quais fundos caíram este mês?", "Quem não contribuiu nos últimos 90 dias?"

---

## 7. Critérios de aceite do MVP

- [ ] Uma organização configura campus, grupo TAP, dispositivo, QR e destino padrão em menos de 10 minutos.
- [ ] Um visitante toca o TAP e abre o destino ativo em menos de 2 segundos no mobile.
- [ ] Um visitante completa uma doação via Pix Mercado Pago, com QR dinâmico, TTL visível e confirmação por webhook idempotente.
- [ ] Doação confirmada emite evento para Financeiro exatamente uma vez.
- [ ] Formulário pastoral registra consentimento versionado antes do envio.
- [ ] Submissão pastoral sensível só é visível a papéis autorizados e gera auditoria de leitura.
- [ ] Dados de uma organização não são visíveis para outra; RLS e testes cross-tenant verificados.
- [ ] Dados de um campus não atravessam outro campus quando o usuário tem escopo restrito.
- [ ] O endpoint de redirect responde em menos de 200ms em p95 sob 500 taps simultâneos.
- [ ] Gift Entry básico permite abrir, lançar e fechar lote com auditoria.
- [ ] Limites do plano bloqueiam criação administrativa, sem quebrar TAP público já configurado.
