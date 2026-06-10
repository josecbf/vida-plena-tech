---
tags:
  - tap
  - engajamento
  - produto
  - permissoes
---

# Matriz de Permissões — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## Papéis no módulo

| Papel | Descrição |
|-------|-----------|
| `owner` | Fundador/pastor principal — acesso total, gerencia plano |
| `admin` | Administrador operacional — configurações, usuários, gateway |
| `comunicacao` | Equipe de comunicação — destinos, conteúdo, ativação |
| `financeiro` | Tesouraria/financeiro — doações, gift entry, relatórios |
| `pastoral` | Equipe pastoral autorizada — leitura e encaminhamento de formulários sensíveis |
| `viewer` | Liderança com visão — somente leitura de analytics |

Nenhum papel recebe acesso sensível por inferência. Acesso a dinheiro identificado, submissão pastoral, gateway, exportação e reembolso exige permissão explícita e escopo válido.

---

## Matriz

### Dispositivos e Grupos TAP

| Ação | owner | admin | comunicacao | financeiro | pastoral | viewer |
|------|-------|-------|-------------|------------|----------|--------|
| Criar grupo TAP | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar grupo TAP | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Excluir grupo TAP | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver grupos e dispositivos | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Registrar dispositivo físico | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver URL e QR de dispositivo | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Ver destino ativo de grupo | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

### Destinos

| Ação | owner | admin | comunicacao | financeiro | pastoral | viewer |
|------|-------|-------|-------------|------------|----------|--------|
| Criar destino | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Editar destino | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Excluir destino | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Publicar / despublicar destino | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Publicar URL externa sem aprovação | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Ativar destino em grupo | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Agendar troca de destino | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

`⚠️` significa permitido apenas quando a política da organização liberar; caso contrário exige aprovação de `admin` ou `owner`.

### ProPresenter

| Ação | owner | admin | comunicacao | financeiro | pastoral | viewer |
|------|-------|-------|-------------|------------|----------|--------|
| Ver status de conexão | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Configurar keywords | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Baixar app auxiliar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerar/rotacionar token do app | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Revogar token do app | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver log de eventos ProPresenter | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

### Financeiro e Doações

| Ação | owner | admin | comunicacao | financeiro | pastoral | viewer |
|------|-------|-------|-------------|------------|----------|--------|
| Ver total arrecadado agregado | ✅ | ⚠️ | ❌ | ✅ | ❌ | ⚠️ |
| Ver doações individualizadas | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ver CPF/e-mail de doador | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Exportar relatório CSV | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Gift entry em lote aberto | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Fechar lote de Gift Entry | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Reabrir lote fechado | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Solicitar reembolso | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Aprovar/executar reembolso | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ |
| Configurar fundos | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Configurar valores sugeridos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

Admin operacional não vê doações individualizadas por padrão. Se uma igreja quiser esse acúmulo de função, deve atribuir permissão financeira explicitamente.

### Formulários pastorais

| Ação | owner | admin | comunicacao | financeiro | pastoral | viewer |
|------|-------|-------|-------------|------------|----------|--------|
| Ver contagem agregada por formulário | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Ver submissão de visitante | ✅ | ⚠️ | ❌ | ❌ | ✅ | ❌ |
| Ver pedido de oração | ⚠️ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Ver decisão/batismo | ⚠️ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Encaminhar para equipe responsável | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Exportar submissões pastorais | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| Excluir/anonimizar submissão | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |

Leitura de pedido de oração, decisão e batismo gera `AuditLog` obrigatório.

Regras de segregação:
- `comunicacao` vê contagens e opera destinos, mas não acessa conteúdo individual de formulário pastoral.
- `financeiro` opera doações e Gift Entry, mas não acessa conteúdo pastoral.
- `pastoral` acessa submissões pastorais no escopo autorizado, mas não vê doações individualizadas nem CPF de doador.
- `admin` operacional não herda acesso sensível por padrão; precisa de permissão explícita adicional.
- `owner` pode ter acesso amplo, mas leitura sensível continua auditada.

### Configurações

| Ação | owner | admin | comunicacao | financeiro | pastoral | viewer |
|------|-------|-------|-------------|------------|----------|--------|
| Configurar gateway de pagamento | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Testar conexão do gateway | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ver credenciais do gateway | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Rotacionar credenciais do gateway | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar usuários e papéis | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar campus | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar plano de assinatura | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Escopo de visibilidade multi-campus

- Usuários têm permissões **por organização** por padrão
- É possível restringir um usuário a um campus específico
- O papel `comunicacao` restrito a um campus só vê e controla os grupos TAP daquele campus
- O papel `financeiro` restrito a um campus só vê doações daquele campus
- O papel `admin` pode ver tudo da organização independente de campus

---

## Dados do visitante final

O visitante que toca o TAP **não cria conta e não faz login**. Seus dados (se informados) são:
- Nome, e-mail, telefone em formulários pastorais → ficam como registro operacional do TAP no escopo atual
- Nome, e-mail e CPF para recibo de doação → usados para recibo e relatório anual quando aplicável
- Dados de pagamento → nunca armazenados na plataforma — processados pelo gateway

O TAP registra apenas: timestamp do tap, device-id, destination-id. Nenhum dado pessoal do visitante é coletado automaticamente pelo redirect.

## Permissões técnicas mínimas

| Permissão | Uso |
|---|---|
| `tap.destination.manage` | Criar, editar e publicar destinos |
| `tap.destination.activate` | Trocar destino ativo |
| `tap.external_url.publish` | Publicar URL externa sem aprovação |
| `tap.device.manage` | Criar grupos e dispositivos |
| `tap.analytics.view` | Ver analytics agregado |
| `tap.donation.view_aggregate` | Ver totais financeiros agregados |
| `tap.donation.view_identified` | Ver doações identificadas |
| `tap.donation.export` | Exportar doações |
| `tap.refund.manage` | Solicitar/aprovar reembolso |
| `tap.gift_entry.manage` | Lançar doações físicas |
| `tap.gift_batch.close` | Fechar lote financeiro |
| `tap.form_submission.view` | Ver submissões não sensíveis |
| `tap.form_submission.view_sensitive` | Ver submissões pastorais sensíveis |
| `tap.form_submission.export` | Exportar submissões pastorais |
| `tap.form_submission.anonymize` | Anonimizar/excluir submissões quando cabível |
| `tap.gateway.manage` | Configurar gateway |
| `tap.gateway.rotate_secret` | Rotacionar credenciais |
| `tap.propresenter.manage` | Configurar app, token e keywords |
| `tap.audit.view` | Ver logs auditáveis do módulo |

## Ações auditáveis obrigatórias

| Ação | Motivo |
|---|---|
| Visualizar pedido de oração, decisão ou batismo | Dado pastoral confidencial |
| Exportar submissões pastorais | Risco de extração em massa |
| Visualizar doação identificada, CPF ou e-mail de doador | Dado financeiro sensível |
| Exportar relatório financeiro | Prestação de contas e risco de vazamento |
| Criar, fechar ou reabrir lote de Gift Entry | Integridade financeira |
| Solicitar, aprovar ou executar reembolso | Integridade financeira |
| Alterar gateway ou rotacionar segredo | Segurança e risco financeiro |
| Trocar destino ativo ao vivo | Impacto operacional durante culto |
| Publicar URL externa fora da política | Risco de phishing |
| Alterar permissões sensíveis | Escalada de acesso |
| Anonimizar, excluir ou bloquear dado pessoal | Direito do titular e rastreabilidade |
