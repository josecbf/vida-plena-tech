---
tags:
  - auditoria
  - stress-test
  - tap
  - engajamento
atualizado: 2026-06-10
---

# Stress Test Hard — Módulo 16: TAP e Engajamento Digital

## Veredito executivo

**Status original:** REPROVADO para início de desenvolvimento.

**Status pós-correção documental:** EM REVALIDAÇÃO COM DECISÕES DE PO. Os bloqueadores foram transformados em decisões, contratos e tarefas nos documentos do módulo. TAP fica definido como facilitador de inscrições e doações, sem criação de cadastro de Pessoas/visitantes no escopo atual.

O conceito é forte, vendável e tem diferenciação real no contexto brasileiro. O risco principal restante está em pagamento, LGPD, multi-tenant, ProPresenter e fronteira com Financeiro. A deduplicação com Pessoas deixa de bloquear o escopo atual porque TAP não criará cadastro de Pessoas/visitantes nesta etapa.

**Nota original de prontidão para codar:** 38/100.

Critério usado: se uma squad sênior pegasse a documentação original e começasse a codar, ainda teria que tomar decisões críticas no meio da implementação. Isso é exatamente o que este stress test elimina quando suas correções são aplicadas.

## Rodada de correção aplicada

Em 2026-06-09, os achados foram incorporados nos documentos-fonte do módulo:

- PRD corrigido com MVP comercial, Pix, LGPD, Gift Entry e contratos internos.
- Modelo conceitual corrigido com campos fiscais, consentimento, idempotência, `GiftBatch`, `PaymentWebhookEvent`, `PastoralFormSubmission` e invariantes.
- Permissões corrigidas com papéis e ações sensíveis para financeiro e pastoral.
- Arquitetura funcional corrigida com redirect seguro, ProPresenter por campus/máquina, observabilidade e contratos.
- Backlogs corrigidos com tarefas de Fase 0, Pix controlado, auditoria, retenção e observabilidade.
- Plano de trabalho corrigido com Alpha operacional, Beta Pix, MVP comercial e GA.
- Riscos e decisões de produto corrigidos para refletir gateway MVP, limites de plano e segurança de URL externa.

**Decisões do PO em 2026-06-10:**
- TAP é apenas um facilitador de inscrições e doações.
- TAP não gera cadastro de pessoas ou visitantes neste momento.
- MVP comercial deve priorizar Pix Mercado Pago, Gift Entry básico, contrato financeiro, LGPD e observabilidade.
- Plano Essencial deve comportar pelo menos três fundos e Gift Entry básico.
- Limites comerciais não devem derrubar TAP público durante culto; usar janela de graça e alerta administrativo.
- Piloto inicial: Comunidade Vida Plena.

**Gate restante:** Financeiro precisa aceitar os eventos idempotentes do TAP antes do MVP comercial. Pessoas passa a ser integração futura, não bloqueio do escopo atual.

---

## Resumo quantitativo

| Severidade | Quantidade | Definição |
|---|---:|---|
| Bloqueadores | 12 | Impedem início responsável do desenvolvimento |
| Críticos | 18 | Não impedem protótipo, mas impedem lançamento confiável |
| Lacunas de produto | 18 | Geram ambiguidade de UX, operação ou comercial |
| Lacunas técnicas | 16 | Geram retrabalho de arquitetura, schema, APIs ou testes |
| Ajustes documentais | 12 | Inconsistências entre arquivos |
| **Total** | **76** | Pontos que precisam decisão explícita |

---

## Critério de aprovação

O módulo só deve entrar em desenvolvimento quando cumprir todos os itens abaixo:

- Todos os bloqueadores B-01 a B-12 resolvidos no PRD, modelo conceitual, permissões e backlog técnico.
- Modelo de dados com invariantes, chaves únicas, escopo de tenant/campus e política de retenção.
- Contrato com Financeiro especificado por evento/API; Pessoas, Eventos e GCs apenas quando voltarem ao escopo de integração.
- Fluxo de pagamento Pix com idempotência, expiração, retry, conciliação e recibo.
- Fluxo de consentimento LGPD definido para formulários pastorais e dados financeiros identificáveis.
- ProPresenter especificado por campus, máquina, versão suportada, assinatura do app e modo de falha.
- Feature flags e limites dos planos definidos com comportamento ao atingir limite.
- Critérios de aceite testáveis por fase, não apenas por intenção de produto.

---

## BLOQUEADORES

### B-01 — Fronteira com Financeiro está conceitual, não contratual

**Problema:** A documentação diz que TAP "emite eventos para o Financeiro", mas não define contrato do evento, garantias, payload, idempotência, reconciliação, estorno, nem responsabilidade por relatórios oficiais. Isso cria risco de duas fontes de verdade: TAP e Financeiro.

**Impacto:** Integridade financeira, contabilidade, relatórios, reembolso, dashboard e auditoria.

**Correção obrigatória:**
- Definir evento `donation.confirmed`, `donation.failed`, `donation.refunded`, `gift_entry.created`.
- Definir se TAP armazena ledger próprio ou apenas staging operacional.
- Definir qual módulo gera relatórios oficiais e comprovantes.
- Definir reconciliação entre gateway, TAP e Financeiro.

### B-02 — Pagamento sem idempotência de ponta a ponta

**Problema:** `gateway_transaction_id` existe, mas não há invariante formal, unique index, contrato de webhook, nem deduplicação por evento. Gateways reenviam webhook. Usuário também pode recarregar tela, repetir pagamento, ou gerar múltiplas cobranças Pix.

**Impacto:** Duplicidade de doação, relatório inflado, recibo errado, suporte financeiro crítico.

**Correção obrigatória:**
- `unique(tenant_id, gateway_provider, gateway_transaction_id)`.
- `unique(tenant_id, gateway_provider, gateway_charge_id)` para cobranças pendentes.
- Tabela `payment_webhook_events` com `event_id`, assinatura, payload hash, status de processamento e retry.
- Webhook idempotente: processar uma vez, retornar sucesso em reenvio conhecido.

### B-03 — Modelo fiscal e recibo de doação insuficientes

**Problema:** A doação não captura nome/CPF opcional, e `Organization` não possui CNPJ/razão social no modelo do módulo. Sem isso, comprovante anual, exportação por doador e atendimento LGPD ficam quebrados.

**Impacto:** Produto financeiro incompleto para igrejas que precisam prestar contas ao membro/doador.

**Correção obrigatória:**
- Em `Donation`: `donor_name`, `donor_cpf_encrypted`, `donor_email`, `donor_person_id`, `receipt_requested`.
- Em `Organization/Tenant`: CNPJ, razão social, nome fantasia, endereço fiscal.
- Definir comprovante transacional e relatório anual por doador.

### B-04 — LGPD em formulários pastorais não está implementável

**Problema:** Formulários de oração, decisão, visitante e célula coletam dados pessoais e, em alguns casos, dados de convicção religiosa. A documentação não define consentimento explícito, base legal, finalidade, retenção, exclusão, portabilidade, nem quem acessa.

**Impacto:** Risco jurídico e pastoral antes do primeiro uso real.

**Correção obrigatória:**
- Checkbox obrigatório de consentimento por formulário, com texto versionado.
- Registro de `consent_version`, `consented_at`, `source`, `ip_hash` e `user_agent_hash`.
- Mapa LGPD por campo.
- Política de retenção por tipo de submissão.
- Fluxo de exclusão/anonimização quando juridicamente cabível.

### B-05 — Dados sensíveis pastorais sem matriz de acesso granular

**Problema:** A matriz de permissões fala de dashboard e financeiro, mas não define quem pode ler respostas individuais de oração, decisão por Jesus, visitante e célula. "Admin" não pode automaticamente ler tudo.

**Impacto:** Vazamento pastoral interno. Risco real em igrejas com múltiplas equipes.

**Correção obrigatória:**
- Permissões separadas: `tap.form_submission.view`, `tap.form_submission.view_sensitive`, `tap.form_submission.assign`, `tap.form_submission.export`.
- Escopo por campus/ministério/equipe pastoral.
- Auditoria de leitura em submissões sensíveis.

### B-06 — ProPresenter não tem contrato operacional seguro

**Problema:** O app auxiliar aparece como conceito, mas faltam versão mínima suportada, assinatura/notarização, token por campus, rotação de token, heartbeat, fallback, logs locais, atualização automática e modo offline.

**Impacto:** Falha em culto ao vivo, suporte caro e baixa confiança operacional.

**Correção obrigatória:**
- App configurado por tenant + campus + máquina.
- Token com escopo mínimo, expiração e rotação.
- Versão mínima do ProPresenter documentada.
- `.dmg` assinado e notarizado no macOS.
- Heartbeat backend com status por campus.
- Modo de falha: se perder conexão, não troca destino e alerta admin.

### B-07 — Multi-campus ainda permite erro silencioso

**Problema:** `TapGroup`, `GatewayConfig`, `Donation`, `ProPresenterKeyword` e permissões citam campus, mas não há invariantes contra referência cruzada. Um destino de um campus pode ser usado em grupo de outro sem regra explícita.

**Impacto:** Cultos simultâneos podem receber destino errado; doação pode cair em gateway ou campus incorreto.

**Correção obrigatória:**
- Definir se `Destination` é global por tenant ou escopado por campus.
- FKs compostas com `tenant_id` e, quando aplicável, `campus_id`.
- Validação de gateway efetivo por campus no momento da cobrança.
- Testes cross-campus obrigatórios.

### B-08 — Redirect engine não define segurança contra abuso

**Problema:** O endpoint `/t/{device-id}` é público. Não há rate limiting, bot filtering, assinatura de device id, detecção de abuso, proteção contra enumeração nem política de analytics adulterado.

**Impacto:** Analytics falso, custo de infra, scraping de destinos, potencial DDoS simples.

**Correção obrigatória:**
- IDs não enumeráveis.
- Rate limiting por IP/device fingerprint leve.
- Detecção de anomalia por device/campus.
- Inserção assíncrona de `TapEvent` com fila ou buffer.
- Separar métricas brutas de métricas confiáveis.

### B-09 — Pix sem ciclo de vida completo

**Problema:** O fluxo Pix não define TTL, expiração, cancelamento, polling máximo, regeneração, usuário que paga depois de sair da página, nem confirmação tardia.

**Impacto:** Doações ficam pendentes indefinidamente ou confirmam sem UX adequada.

**Correção obrigatória:**
- Estados: `created`, `pending`, `expired`, `confirmed`, `failed`, `cancelled`, `refunded`.
- TTL visível na tela.
- Botão "gerar novo Pix".
- Job de expiração de cobranças pendentes.
- Webhook confirma mesmo se usuário fechou a página.

### B-10 — Contrato com Pessoas não define deduplicação

**Problema:** "Encaminha dados ao módulo Pessoas" é insuficiente. Nome + telefone pode bater em várias pessoas; visitante pode preencher dados incompletos; pedido de oração pode ser anônimo.

**Impacto:** Duplicidade de pessoas, timeline errada, contato pastoral perdido.

**Status em 2026-06-10:** substituído por decisão de escopo. TAP não cria cadastro de Pessoas/visitantes neste momento; portanto deduplicação com Pessoas deixa de ser bloqueador do escopo atual e passa a ser requisito de uma integração futura.

**Correção obrigatória se Pessoas voltar ao escopo:**
- API/Evento `person_intake.submitted`.
- Estratégia de match: telefone normalizado, e-mail, CPF quando houver, nome + contexto.
- Estado `needs_review` quando ambíguo.
- Nunca criar `Person` automaticamente para oração anônima.
- Registrar origem e consentimento.

### B-11 — Planos comerciais contradizem uso real mínimo

**Problema:** Plano Essencial limita a 2 fundos, mas igreja real costuma precisar no mínimo de dízimo, oferta e missões. Além disso, Gift Entry fica só em plano superior, quando igrejas menores são justamente as que mais recebem dinheiro físico.

**Impacto:** Primeiro cliente pequeno já bate em limite artificial e sente que o produto não serve.

**Correção obrigatória:**
- Essencial com pelo menos 3 fundos.
- Gift Entry básico no Essencial ou justificar explicitamente como decisão comercial.
- Definir comportamento ao atingir limite: bloqueia, arquiva, exige upgrade ou permite excedente temporário?

### B-12 — Backlog e critérios de aceite não batem com fases

**Problema:** PRD exige doação via Pix no MVP, mas Plano de Trabalho coloca oferta na Fase 2. Se Fase 1 for "MVP", ela não cumpre o PRD. Se MVP for Fase 2, Fase 1 é apenas fundação.

**Impacto:** Squad começa sem saber qual release é vendável.

**Correção obrigatória:**
- Renomear Fase 1 para "Alpha operacional sem pagamento" ou incluir Pix nela.
- Definir MVP comercial mínimo.
- Separar critérios de aceite por release: Alpha, Beta piloto, MVP comercial, GA.

---

## CRÍTICOS

### C-01 — `Destination.config` é JSON livre demais

Sem schemas versionados por tipo, qualquer alteração quebra renderização antiga. Criar `destination_config_version` e validação Zod/JSON Schema por tipo.

### C-02 — Status de destino é ambíguo

`draft`, `active`, `inactive` não define se destino ativo em grupo pode virar rascunho, se inativar remove de grupos, ou se há publicação agendada.

### C-03 — Override manual não tem expiração

Uma troca manual pode ficar ativa até o culto seguinte. Definir duração, retorno ao destino padrão e tela de "culto encerrado".

### C-04 — Agendamento sem timezone operacional completo

Adicionar timezone IANA por campus/agendamento, tratamento de horário de verão quando aplicável, conflito entre recorrente e pontual, e ordem de prioridade testável.

### C-05 — ProPresenter keyword sem resolução de conflito

Duas keywords no mesmo slide, keyword duplicada, slide que volta, operador que pula slides e cultos simultâneos precisam regra clara.

### C-06 — Gateway abstrato promete demais na v1

Mercado Pago, Stripe, Asaas, Apple Pay, Google Pay e cartão na mesma janela elevam risco. Recomendação: v1 real com Mercado Pago + Pix; cartão e wallet só depois de contrato testado.

### C-07 — Apple Pay/Google Pay dependem de gateway e domínio

Não basta Payment Request API. Há verificação de domínio, suporte do gateway, certificados e regras por navegador. Documentar como investigação antes de promessa comercial.

### C-08 — Stripe Billing não resolve nota fiscal brasileira

Cobrar assinatura do SaaS via Stripe não emite NF brasileira. Decidir integração fiscal externa ou processo manual inicial.

### C-09 — GatewayConfig não define rotação e teste de credenciais

Credenciais expiram, são trocadas e podem ser inválidas. Precisa status, último teste, erro, rotação, auditoria e permissão sensível.

### C-10 — Gift Entry sem conferência e fechamento de lote

Lançamento manual financeiro precisa lote com status: aberto, em conferência, fechado, reaberto, exportado. Sem isso, qualquer correção vira edição solta.

### C-11 — Reembolso existe como status, mas não como processo

Definir quem solicita, quem aprova, quem executa no gateway, quem registra no Financeiro e como aparece no recibo/exportação.

### C-12 — Relatórios misturam analytics e financeiro

Taps e doações têm naturezas diferentes. Analytics pode ser estimado; financeiro não. Separar dashboards, fontes e níveis de precisão.

### C-13 — Upload de imagem sem política de arquivo

Destino tipo página própria usa imagem, mas não há limite de tamanho, formatos aceitos, compressão, storage path por tenant, moderação, expiração ou remoção.

### C-14 — URL externa pode virar vetor de phishing

Comunicação pode apontar TAP para qualquer URL. Precisa validação, allowlist opcional, alerta para domínio externo, preview e log.

### C-15 — NFC físico não tem checklist operacional verificável

O sistema diz para programar read-only, mas não há checklist, campo de confirmação, teste de leitura, impressão de QR, inventário mínimo ou status "instalado".

### C-16 — Sem observabilidade de culto

Para operação ao vivo, precisa painel de saúde: redirect p95, erro de gateway, ProPresenter heartbeat, webhooks atrasados, fila, taxa de taps, último destino por grupo.

### C-17 — Sem estratégia de ambientes

Gateways precisam sandbox/prod; ProPresenter app precisa staging/prod; tokens devem indicar ambiente. Sem isso, testes podem bater em produção.

### C-18 — Sem política de auditoria de ações sensíveis

Trocar destino, editar gateway, exportar doações, ver submissão pastoral, fazer reembolso e fechar lote precisam `AuditLog` obrigatório.

---

## LACUNAS DE PRODUTO

| ID | Lacuna | Decisão exigida |
|---|---|---|
| LP-01 | O que o visitante vê quando não há destino ativo? | Página padrão por organização/campus ou global |
| LP-02 | O que acontece ao fim do culto? | Estado "culto encerrado" ou retorno automático |
| LP-03 | Como usuário identifica doação para recibo? | Nome/CPF/e-mail opcionais com consentimento |
| LP-04 | Doação anônima é permitida? | Sim/não por organização e por fundo |
| LP-05 | Valor mínimo/máximo por método | Definir por gateway e por tenant |
| LP-06 | Fundo padrão quando há múltiplos fundos | Regra de seleção e ordenação |
| LP-07 | Como lidar com menor de idade em formulário pastoral? | Campo de idade/responsável quando aplicável |
| LP-08 | Pedido de oração pode ser anônimo? | Sim, e não cria Pessoa |
| LP-09 | Formulário de célula deve ir para GCs ou Pessoas? | Fora do escopo atual; manter como registro operacional TAP até contrato futuro |
| LP-10 | Inscrição de evento é link externo ou integração nativa? | Definir v1 e futuro |
| LP-11 | Comunicação pode ver analytics agregados? | Sim/não e quais métricas |
| LP-12 | Dashboard mostra valor financeiro para pastor/owner? | Permissão explícita |
| LP-13 | Domínio próprio muda NFC já gravado? | Estratégia de URLs permanentes |
| LP-14 | Cliente pode excluir dispositivo usado historicamente? | Soft delete obrigatório |
| LP-15 | Como trocar moeda física quebrada? | Processo de substituição preservando histórico |
| LP-16 | Como operar sem internet no culto? | Limites e fallback manual |
| LP-17 | Suporte a QR impresso por grupo ou por device? | Decisão operacional |
| LP-18 | Trial expira durante culto? | Nunca bloquear fluxo público ao vivo sem janela de graça |

---

## LACUNAS TÉCNICAS

| ID | Lacuna | Ação técnica |
|---|---|---|
| LT-01 | `tenant_id` vs `organization_id` inconsistente | Padronizar vocabulário com Core |
| LT-02 | FKs não impedem cross-tenant | Usar FKs compostas ou validação transacional |
| LT-03 | `TapEvent` pode crescer sem limite | Retenção, particionamento ou agregação |
| LT-04 | Insert de analytics no redirect pode afetar latência | Fazer fire-and-forget seguro ou fila |
| LT-05 | Cache KV sem estratégia de consistência | Definir chave, TTL, invalidação e fallback |
| LT-06 | Sem teste de carga realista | Cenários 500, 2.000 e 10.000 taps em pico |
| LT-07 | Sem contrato de DomainEvent | Nome, schema, versão, idempotency key |
| LT-08 | Sem migration checklist RLS | Toda tabela operacional com policy no mesmo PR |
| LT-09 | Sem secret management do Electron | Token nunca salvo em texto puro |
| LT-10 | Sem assinatura de webhook do ProPresenter app | Token bearer é insuficiente sem rotação e escopo |
| LT-11 | Sem normalização de telefone/CPF/e-mail | Necessário apenas se integração futura com Pessoas voltar ao escopo |
| LT-12 | Sem política de criptografia campo a campo | CPF, credenciais e possivelmente payload pastoral |
| LT-13 | Sem testes de autorização por papel/escopo | Matriz precisa virar teste |
| LT-14 | Sem estratégia de backup/restore para dados financeiros | Teste de restauração obrigatório |
| LT-15 | Sem versionamento de app auxiliar | Compatibilidade backend/app |
| LT-16 | Sem compatibilidade Edge Runtime validada | SDKs e libs devem ser compatíveis |

---

## Inconsistências documentais

| ID | Inconsistência | Arquivos afetados |
|---|---|---|
| AD-01 | PRD chama tipos `oferta`, `formulario_pastoral`, `pagina_propria`; modelo usa `offering`, `pastoral_form`, `own_page` | PRD, Modelo |
| AD-02 | PRD lista `inscricao_evento`; modelo não lista esse tipo no enum | PRD, Modelo |
| AD-03 | Hub promete gateway PagSeguro; backlog técnico não implementa | Hub, Decisões, Backlog |
| AD-04 | Antiobjetivos dizem "TAP não tem tela de relatório financeiro"; PRD/Sitemap têm `/financeiro` robusto | Antiobjetivos, PRD, Sitemap |
| AD-05 | PRD fala endpoint < 200ms p95; ADR fala < 100ms p95; backlog fala < 200ms | PRD, ADR, Backlog |
| AD-06 | Plano de Trabalho Fase 1 não entrega Pix, mas PRD inclui Pix no MVP | PRD, Plano |
| AD-07 | Modelo usa `Organization`; docs globais usam `Tenant` | Modelo TAP, Técnico global |
| AD-08 | `GatewayConfig.provider` inclui PagSeguro sem implementação v1 | Modelo, Backlog |
| AD-09 | ProPresenter body inclui `campus_id`, mas modelo de keyword não possui campus explícito | Arquitetura Funcional, Modelo |
| AD-10 | Dashboard financeiro no TAP conflita com responsabilidade do Financeiro | PRD, Antiobjetivos |
| AD-11 | GiftEntry referencia `GiftBatch`, mas entidade não foi definida | Modelo |
| AD-12 | `TapSchedule` permite estado inválido: recorrente sem dia, pontual sem data | Modelo |

---

## Testes extremos que a squad deve passar

### Cenário 1 — Culto com pico de oferta

500 pessoas tocam o TAP em 60 segundos. O redirect precisa manter p95 < 200ms, não derrubar banco, registrar analytics sem bloquear UX e não perder troca de destino feita no meio do pico.

### Cenário 2 — Webhook duplicado e fora de ordem

Gateway envia `payment.pending`, depois `payment.confirmed`, depois repete `payment.confirmed` 3 vezes. Sistema registra uma única doação confirmada e um único evento financeiro.

### Cenário 3 — Campus simultâneos

Campus A está em oferta. Campus B está em inscrição de evento. Ambos usam keyword `OFERTA` no ProPresenter. Nenhum evento pode atravessar campus.

### Cenário 4 — Gateway fora do ar

Usuário toca TAP durante oferta, escolhe Pix, gateway falha. Tela precisa explicar sem constrangimento, registrar erro operacional e não criar doação confirmada falsa.

### Cenário 5 — Pedido de oração sensível

Visitante envia pedido de oração com dado extremamente sensível. Comunicação não pode ler. Financeiro não pode ler. Acesso pastoral deve ser auditado.

### Cenário 6 — Token ProPresenter vazado

Alguém copia token do app e tenta trocar destinos via API. Escopo, rotação, revogação e auditoria precisam conter o dano.

### Cenário 7 — Trial vencido sábado à noite

Assinatura vence antes do culto de domingo. O sistema não pode quebrar TAP público já instalado sem política explícita de graça, aviso e bloqueio administrativo gradual.

### Cenário 8 — Link externo malicioso

Usuário de comunicação aponta destino para domínio falso de pagamento. Sistema deve alertar, logar e permitir política de bloqueio por admin.

### Cenário 9 — Pessoa duplicada (futuro)

Três formulários chegam como "Maria", "Maria Silva", "+55 11 99999-9999". No escopo atual, TAP registra submissões operacionais e não cria Pessoas. Se integração futura com Pessoas voltar ao escopo, o sistema não pode criar três pessoas sem revisão quando há evidência de match.

### Cenário 10 — Reembolso parcial

Doador contribui R$ 500 por engano e pede reembolso parcial de R$ 450. O modelo atual só prevê `refunded` total. Decidir se v1 suporta parcial; se não, documentar limitação.

---

## Decisões obrigatórias antes da primeira linha de código

1. Qual é o MVP comercial: TAP básico sem pagamento, ou TAP com Pix?
2. TAP armazena doações como fonte operacional ou Financeiro é a única fonte oficial?
3. Qual gateway entra primeiro em produção: Mercado Pago apenas, ou múltiplos?
4. `Destination` é global por tenant ou escopado por campus?
5. Gift Entry entra no Essencial?
6. Comunicação pode publicar URL externa sem aprovação?
7. Doação anônima é permitida? Em quais fundos?
8. Quem pode ver submissões pastorais sensíveis?
9. Qual é a política de retenção de `TapEvent`, `Donation`, `GiftEntry` e `FormSubmission`?
10. Como será emitido recibo/transação e relatório anual de doações?
11. Como o app ProPresenter será assinado, atualizado e revogado?
12. Como será feita NF da assinatura SaaS brasileira?

### Respostas aplicadas na correção documental

1. MVP comercial = TAP com Pix Mercado Pago, LGPD, Gift Entry básico e contrato com Financeiro.
2. TAP armazena operação de origem; Financeiro é a fonte contábil oficial.
3. Gateway de produção inicial = Mercado Pago + Pix. Stripe/Asaas pós-MVP.
4. `Destination` pode ser global por tenant ou escopado por campus, com invariantes explícitos.
5. Gift Entry básico entra no Essencial.
6. URL externa depende de política; fora da política exige aprovação.
7. Doação anônima é permitida quando configurada pela organização/fundo.
8. Submissões pastorais sensíveis exigem papel/permissão pastoral e auditoria.
9. Retenção foi definida conceitualmente por tipo de dado.
10. Recibo transacional e relatório anual foram previstos; relatório oficial fica no Financeiro.
11. ProPresenter exige app assinado/notarizado, token por campus/máquina, rotação e revogação.
12. NF brasileira da assinatura SaaS entrou como dependência técnica/comercial antes de GA.

---

## Plano de correção recomendado

### Sprint 0 — Contratos e segurança antes de tela

- Resolver B-01 a B-12.
- Padronizar `tenant_id`, `campus_id`, eventos e permissões.
- Especificar contrato com Financeiro e limites de comunicação/consentimento.
- Registrar que Pessoas fica fora do escopo atual de cadastro, criação ou match.
- Escrever schemas de `Destination.config`.
- Definir matriz LGPD e retenção.

### Sprint 1 — Alpha operacional

- Dispositivos, grupos, URL, QR, destinos `pagina_propria` e `url_externa`.
- Redirect engine com cache, rate limit e analytics seguro.
- Troca manual com auditoria.
- Sem pagamento ainda, se a decisão for reduzir risco.

### Sprint 2 — Pix real controlado

- Mercado Pago + Pix.
- Webhook idempotente.
- TTL e expiração.
- Recibo simples.
- Evento financeiro.
- Dashboard financeiro mínimo, claramente não-contábil se Financeiro ainda não estiver pronto.

### Sprint 3 — Piloto culto real

- Observabilidade ao vivo.
- Runbook de culto.
- Teste com 1 campus.
- Gift Entry básico.
- Correções de operação antes de ProPresenter.

### Sprint 4 — ProPresenter e automação

- App assinado.
- Token por campus.
- Heartbeat.
- Keywords com conflito resolvido.
- Teste com versão real do ProPresenter da organização piloto.

---

## Checklist de "pronto para codar"

- [x] PRD ajustado com MVP comercial claro.
- [x] Modelo de entidades sem campos ambíguos e com invariantes.
- [x] Schemas de configuração por tipo de destino.
- [x] Matriz de permissões granular para financeiro e pastoral.
- [x] Mapa LGPD por entidade e formulário.
- [x] Contrato de eventos com Financeiro documentado.
- [x] Decisão de não criar cadastro de Pessoas/visitantes no escopo atual documentada.
- [x] Fluxo Pix completo, incluindo expiração e idempotência.
- [x] ProPresenter com escopo de campus, token, assinatura e operação.
- [x] Feature flags e limites de plano com comportamento definido.
- [x] Testes cross-tenant e cross-campus especificados.
- [x] Observabilidade mínima definida.
- [ ] Contrato financeiro aceito pelo módulo Financeiro.

---

## Conclusão

O produto deve continuar. A tese é boa e a rodada documental corrigiu os bloqueadores internos do módulo.

O principal risco agora não é falta de especificação interna do TAP; é começar a codar o MVP comercial antes de validar o contrato financeiro.

O próximo passo correto é revisão intermodular do contrato financeiro e consolidação das regras LGPD/permissões. Com essa validação feita, a squad pode começar pela Fase 0/Alpha com risco bem menor de surpresa.
