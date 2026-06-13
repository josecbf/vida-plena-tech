---
tags:
  - tap
  - engajamento
  - tecnico
  - plano-trabalho
---

# Plano de Trabalho — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## Princípio de sequenciamento

Entregar valor real o mais cedo possível. A Fase 1 já deve ser utilizável em um culto real. Cada fase seguinte adiciona capacidade sem quebrar o que já funciona.

---

## Fase 0 — Contratos, LGPD e fundação de segurança
**Objetivo:** Eliminar decisões implícitas antes da primeira migration.

**Entregáveis:**
- Contratos de eventos com Financeiro
- Decisão formal de não criar cadastro de Pessoas/visitantes no escopo atual
- Schemas versionados de `Destination.config`
- Mapa LGPD por entidade e formulário
- Matriz de permissões sensíveis
- Política de retenção e auditoria
- Decisão formal sobre MVP comercial

**Critério de aceite:** A squad consegue derivar migrations, policies RLS, contratos de eventos e testes de autorização sem tomar decisão de produto no código.

**Duração estimada:** 1 semana

## Fase 1 — Fundação e TAP Básico
**Objetivo:** Uma organização consegue configurar um TAP, trocar destino manualmente e redirecionar visitantes. Esta fase é **Alpha operacional sem pagamento**, não MVP comercial.

**Entregáveis:**
- Cadastro de organização + autenticação
- CRUD de campus, grupos TAP e dispositivos
- Geração de URL única por dispositivo + QR code
- Redirect engine (Edge Function + cache KV)
- Rate limit, device IDs não enumeráveis e analytics não bloqueante
- Destino tipo `external_url` e `own_page`
- Validação de URL externa e preview de domínio
- Painel de comunicação (editor simplificado)
- Troca manual de destino ativo
- Override manual com duração e retorno ao destino padrão
- Página de contingência para device/grupo/destino inválido

**Critério de aceite:** Uma moeda NFC programada com a URL redireciona corretamente para o destino configurado, em < 2s, sem login do visitante.

### Aceite integrado da Fase 1 — Alpha operacional

O Alpha operacional só é considerado pronto quando o roteiro abaixo for executado em ambiente de staging ou piloto controlado, com uma moeda NFC real ou QR equivalente programado com a URL pública do dispositivo.

**Papéis envolvidos:**
- `admin`: cria campus, grupo TAP, dispositivo, destino padrão e usuário de comunicação.
- `comunicacao`: cria/publica destino permitido e troca destino ativo do grupo durante o culto.
- visitante: toca a moeda NFC ou lê o QR sem login e recebe o destino ativo correto.

**Roteiro feliz ponta a ponta:**
1. Admin cria organização/campus de teste e confirma isolamento multi-tenant.
2. Admin cria grupo TAP ativo com destino padrão opcional.
3. Admin cadastra dispositivo TAP no grupo e copia URL pública `/t/{device-id}`.
4. Admin programa a URL em moeda NFC ou gera QR equivalente.
5. Comunicação cria destino `own_page` com título, texto, botão e imagem opcional.
6. Comunicação publica o destino após validação de campos.
7. Comunicação ativa o destino no grupo com duração definida e retorno ao destino padrão.
8. Visitante toca a moeda NFC sem login.
9. Redirect resolve dispositivo, grupo e destino ativo, registra analytics de forma não bloqueante e abre o destino correto.
10. Ao final da duração, o grupo retorna ao destino padrão ou ao estado confirmado.
11. Histórico mostra troca manual, retorno e usuário responsável.

**Cenários de falha obrigatórios:**
- Device inexistente ou com formato inválido: página de contingência genérica, sem revelar se o ID existe.
- Device inativo ou arquivado: página "TAP indisponível".
- Grupo inativo, arquivado ou fora do campus permitido: contingência segura.
- Grupo sem destino ativo e sem destino padrão: página "Conteúdo em breve" ou contingência genérica.
- Destino `draft`, `inactive`, `archived`, URL inválida ou domínio reprovado: bloqueio na ativação; se ocorrer em runtime, fallback para destino padrão válido ou contingência.
- Usuário `comunicacao` fora do campus: grupo não aparece e a ativação é bloqueada.
- Falha de analytics: redirect continua funcionando e erro fica observável internamente.
- Rate limit/tráfego suspeito: não contamina métrica limpa e não revela existência do device-id.

**Checklist go/no-go para piloto sem pagamento:**
- [ ] Admin consegue criar campus, grupo, dispositivo e URL pública única.
- [ ] URL pública e QR equivalente abrem sem login do visitante.
- [ ] Comunicação consegue criar/publicar destino permitido.
- [ ] Comunicação consegue trocar destino ativo com duração e retorno documentados.
- [ ] Comunicação não acessa financeiro, gateway, Gift Entry ou dados pastorais sensíveis.
- [ ] Redirect abre o destino ativo em menos de 2 segundos na experiência real do visitante.
- [ ] Endpoint público mantém p95 abaixo de 200ms em teste de 500 requisições simultâneas com cache hit.
- [ ] Device/grupo/destino inválido não expõe erro técnico ao visitante.
- [ ] Analytics de tap não bloqueia redirect e não coleta dado pessoal direto automaticamente.
- [ ] Histórico/auditoria registra criação, publicação, troca manual e retorno.
- [ ] Critérios cross-tenant/cross-campus foram testados para impedir referência cruzada.
- [ ] Plano de rollback existe: desativar dispositivo/grupo, voltar destino padrão ou servir contingência.

**Métricas mínimas para aceite:**
- Tempo percebido pelo visitante: destino ativo aberto em < 2s.
- Redirect engine: p95 < 200ms com 500 requisições simultâneas em cache hit.
- Taxa de erro público em roteiro feliz: 0%.
- Analytics: perda de evento aceitável apenas em falha controlada; redirect não pode falhar por causa de analytics.
- Segurança: nenhuma resposta pública exibe stack trace, ID interno, tenant interno ou detalhe de banco/cache.

**Duração estimada:** 2–3 semanas

---

## Fase 2 — Oferta Digital
**Objetivo:** Visitante consegue completar uma doação via Pix Mercado Pago com idempotência, expiração e evento financeiro.

**Pré-requisito:** Fase 1 concluída.

**Entregáveis:**
- Destino tipo `oferta` com seleção de valor e fundo
- Gateway abstrato — implementação Mercado Pago
- Fluxo Pix completo (cobrança → QR → polling → confirmação)
- TTL visível do Pix e regeneração
- Webhook idempotente com tabela de eventos
- Job de expiração de cobranças pendentes
- Identificação opcional do doador: nome, e-mail e CPF
- Recibo por e-mail (opcional)
- Gestão de fundos no painel admin
- Dashboard financeiro básico (total por fundo e período)
- Gift Entry básico com lote aberto/fechado
- Observabilidade de culto: redirect, gateway, webhooks e filas

**Critério de aceite:** Doação via Pix confirmada em menos de 30s, webhook duplicado não duplica doação, evento financeiro é emitido exatamente uma vez e lote físico pode ser fechado com auditoria.

**Duração estimada:** 2–3 semanas

---

## Fase 3 — Automação e Engajamento
**Objetivo:** A equipe configura uma vez e o TAP se gerencia durante o culto.

**Pré-requisito:** Fase 2 concluída.

**Entregáveis:**
- Agendamento de trocas de destino por horário (recorrente e pontual)
- App auxiliar ProPresenter (Electron, Mac) — **Backend implementado; app Electron pendente de issue separada**
- Integração ProPresenter → keywords → troca automática — **Backend implementado (issue #44)**
- Formulários pastorais (visitante, oração, decisão, célula)
- Consentimento versionado em formulários pastorais
- Registros operacionais de formulários sem criação de cadastro de Pessoas
- Leitura sensível com permissão e auditoria
- App ProPresenter assinado/notarizado, token por campus/máquina e heartbeat
- Gateway Stripe como segunda implementação, se Pix estiver estável
- Cartão tokenizado, se contrato de gateway estiver estável

**Critério de aceite:** Keyword no slide do ProPresenter troca o destino do TAP em < 3s. Formulários registram inscrições/manifestações no TAP com consentimento, sem criar cadastro de Pessoas.

**Duração estimada:** 3–4 semanas

---

## Fase 4 — Produto Comercial
**Objetivo:** Qualquer igreja brasileira consegue se cadastrar, onboardar e usar o produto de forma autônoma.

**Pré-requisito:** Fases 1–3 concluídas e validadas em uso real.

**Entregáveis:**
- Onboarding guiado (wizard 4 passos)
- Três pacotes com feature flags (Essencial, Crescimento, Missão)
- Plano Essencial com pelo menos 3 fundos e Gift Entry básico
- Janela de graça para limites comerciais sem derrubar TAP público em culto
- Alertas administrativos de limite em 80%, 100% e expiração da janela
- Trial de 14 dias automático
- Billing com Stripe Billing (assinatura mensal e anual)
- Upgrade/downgrade self-service
- Gateway Asaas como terceira implementação
- Apple Pay e Google Pay quando domínio/gateway estiverem validados
- Dashboard completo de engajamento e analytics
- Suporte a domínio próprio por organização (plano Missão)
- Estratégia de NF brasileira para assinatura SaaS
- Base de conhecimento e documentação pública

**Critério de aceite:** Uma organização consegue se cadastrar, completar o onboarding, configurar um TAP e receber uma doação sem intervenção da equipe da plataforma. Ao atingir limite comercial, o sistema bloqueia criação administrativa acima do limite, mas mantém TAP público, doações pendentes e lote aberto funcionando durante a janela de graça.

**Duração estimada:** 3–4 semanas

---

## Fase 5 — Inteligência (futuro)
**Objetivo:** Analytics avançado e IA conversacional para liderança financeira.

**Entregáveis:**
- Doações recorrentes com agendamento
- Relatórios de campanha / capital campaign
- Pledges e metas
- IA: perguntas em linguagem natural sobre dados financeiros
- App auxiliar ProPresenter para Windows
- Notificação push para liderança em tempo real

---

## Marcos e dependências críticas

```
Fase 1 ──────────────────────────────► Fase 2
(TAP + Redirect + Painel)              (Oferta + Gateway MP)
                                              │
                                              ▼
                                        Fase 3
                                  (ProPresenter + Agendamento
                                   + Formulários + Cartão opcional)
                                              │
                                              ▼
                                        Fase 4
                                  (Produto Comercial + Billing)
```

**Dependência crítica para Fase 3:** O app Electron precisa ser testado com a versão real do ProPresenter da organização piloto antes de ser distribuído.

**Dependência crítica para Fase 4:** Validar os três pacotes com pelo menos 3 igrejas reais antes de abrir cadastro público.

**Dependência crítica financeira:** O módulo Financeiro precisa aceitar eventos idempotentes do TAP antes do MVP comercial.

**Dependência crítica LGPD:** Formulários pastorais só podem ir a piloto com consentimento versionado, retenção definida e permissão sensível auditada.

**Dependência crítica Pessoas:** criação, match ou enriquecimento de Pessoas fica fora do escopo atual e só pode entrar após contrato próprio aprovado.

---

## Organização piloto

A primeira organização a usar o produto em produção é a **Comunidade Vida Plena**. Isso garante:
- Feedback real de uso em culto
- Identificação de bugs em ambiente real
- Validação dos fluxos de oferta com Mercado Pago Brasil
- Teste da integração ProPresenter antes de distribuição

Toda funcionalidade das Fases 1–3 deve ser validada internamente antes de abrir para outras organizações.
