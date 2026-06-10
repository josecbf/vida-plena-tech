---
tags:
  - tap
  - engajamento
  - estrategia
  - riscos
---

# Riscos do Módulo — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## Riscos pastorais

### RP-01 — Monetização percebida como exploração
**Risco:** Membros ou visitantes podem perceber negativamente uma experiência de doação altamente otimizada, interpretando como pressão financeira.
**Mitigação:** A tela de oferta deve ser discreta, sem gatilhos de urgência ou linguagem de marketing. O valor da doação é sempre escolha do doador — não há valor pré-preenchido obrigatório.

### RP-02 — Exclusão digital de membros mais velhos
**Risco:** Parte da congregação não usa smartphone, tem NFC desabilitado ou não sabe como usar. O TAP pode gerar sensação de exclusão.
**Mitigação:** O TAP é complementar, não substituto. A coleta física (envelope, dinheiro) deve continuar. O gift entry no painel garante que doações físicas entrem no mesmo sistema.

### RP-03 — Excesso de automação no culto
**Risco:** Integração com ProPresenter mal configurada pode trocar o destino do TAP no momento errado, criando confusão durante o culto.
**Mitigação:** Painel de controle manual sempre disponível para override. Teste obrigatório antes do culto. Log de trocas visível no dashboard.

### RP-04 — Vazamento de pedido pastoral sensível
**Risco:** Pedido de oração, decisão ou batismo pode conter informação íntima e ser visto por comunicação, financeiro ou admin operacional sem necessidade pastoral.
**Mitigação:** Permissão granular para submissões sensíveis, escopo pastoral, auditoria de leitura e exportação bloqueada por padrão.

### RP-05 — Confiança quebrada por link externo malicioso
**Risco:** Um destino externo publicado sem validação pode apontar para phishing, formulário errado ou página que não representa a igreja.
**Mitigação:** URL externa exige HTTPS, preview de domínio, auditoria, allowlist opcional e aprovação quando fora da política da organização.

---

## Riscos operacionais

### RO-01 — TAP removido ou adulterado fisicamente
**Risco:** Alguém remove a moeda NFC ou reprograma a URL se a tag não estiver bloqueada.
**Mitigação:** Programar todas as tags como somente leitura (read-only) após configuração. Usar suportes físicos fixados (parafuso, adesivo permanente). Monitorar taps com anomalia de volume ou origem.

### RO-02 — App ProPresenter não conectado no dia do culto
**Risco:** O app auxiliar do ProPresenter não está rodando ou perdeu conexão com o backend. O TAP fica preso no último destino configurado.
**Mitigação:** Dashboard mostra status de conexão em tempo real. Notificação de desconexão para admin. Fallback: troca manual via painel.

### RO-03 — Gateway da organização com problema
**Risco:** O gateway de pagamento da organização está fora do ar ou com credenciais expiradas durante o culto.
**Mitigação:** Monitoramento de health do gateway antes do culto. Alerta via e-mail/notificação push quando credenciais estão para expirar. Mensagem amigável ao doador se o gateway falhar.

### RO-04 — iPhone com iOS < 13 ou Android sem NFC
**Risco:** Parte dos visitantes não consegue usar o TAP.
**Mitigação:** QR code impresso no mesmo suporte físico como fallback. URL curta visível para digitação manual como último recurso.

### RO-05 — Trial ou limite de plano vence durante culto
**Risco:** O TAP público para de funcionar no domingo por limite comercial atingido ou trial expirado.
**Mitigação:** Bloqueio por plano é administrativo, não derruba fluxo público já configurado durante janela de graça. Alertas antecipados para owner/admin.

### RO-06 — Lote financeiro físico fechado com erro
**Risco:** Tesoureiro lança dinheiro/cheque incorretamente e fecha lote sem conferência, contaminando relatório financeiro.
**Mitigação:** Gift Entry usa lote com estados, conferência, fechamento auditado e reabertura controlada.

---

## Riscos técnicos

### RT-01 — Latência no redirect compromete a experiência
**Risco:** O endpoint de redirect demora mais de 500ms. A pessoa pensa que "não funcionou" e tenta de novo.
**Mitigação:** Edge Function no Vercel (< 200ms p95 sob pico realista). Cache do destino ativo com TTL de 10s. Monitoramento de p95/p99 de latência.

### RT-02 — Dado de cartão mal gerenciado
**Risco:** Dados sensíveis de pagamento tratados pelo backend da plataforma em vez de pelo gateway.
**Mitigação:** Todos os dados de cartão são tratados diretamente pelo SDK do gateway no frontend (Mercado Pago JS, Stripe.js etc.). O backend recebe apenas o token gerado pelo gateway. Nunca recebe número de cartão, CVV ou data de validade.

### RT-03 — Vazamento de dados entre tenants
**Risco:** Uma organização acessa dados de destinos, doações ou formulários de outra.
**Mitigação:** Row Level Security (RLS) no Supabase garante isolamento por `organization_id`. Toda query inclui o tenant do contexto autenticado. Auditoria periódica de políticas RLS.

### RT-04 — Volume de taps simultâneos em eventos grandes
**Risco:** 500+ pessoas tocam o TAP ao mesmo tempo durante o momento de oferta. O redirect enfileira ou falha.
**Mitigação:** Edge Functions são stateless e escalam horizontalmente no Vercel. O único ponto de contenção é a consulta ao banco — usar cache de destino ativo (Redis ou KV store) para eliminar a consulta em cada request.

### RT-05 — Dependência de Mac para ProPresenter
**Risco:** A organização troca de computador ou reinstala o sistema operacional e perde a configuração do app auxiliar.
**Mitigação:** O app auxiliar é configurado via token de organização (não por máquina). Reinstalar = reautenticar com o mesmo token. Documentação clara de setup.

### RT-06 — LGPD em dados pastorais e financeiros identificáveis
**Risco:** Formulários pastorais e doações identificadas coletam dados pessoais e sensíveis sem consentimento, finalidade, retenção ou trilha de auditoria.
**Mitigação:** Consentimento versionado, mapa LGPD por entidade, retenção documentada, anonimização quando cabível e auditoria de acesso sensível.

### RT-07 — Webhook duplicado gera doação duplicada
**Risco:** Gateway reenvia webhook e o sistema registra a mesma doação mais de uma vez.
**Mitigação:** Persistir todo webhook em tabela própria, validar assinatura e processar com chaves idempotentes por evento, transação e cobrança.

### RT-08 — Analytics de tap contaminado por bots
**Risco:** Endpoint público pode receber tráfego automatizado e inflar métricas de engajamento.
**Mitigação:** IDs não enumeráveis, rate limiting, flag de evento suspeito, agregação limpa e separação entre analytics operacional e financeiro confirmado.
