---
tags:
  - tap
  - engajamento
  - estrategia
  - decisoes
---

# Decisões de Produto — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## DP-01 — Gateway financeiro abstrato, não acoplado

**Decisão:** O módulo é desenhado com gateway financeiro abstrato, mas o MVP comercial implementa primeiro Mercado Pago + Pix. Stripe, Asaas, cartão, Apple Pay e Google Pay entram por feature flag depois que o contrato de pagamento estiver estável.

**Motivação:** Igrejas brasileiras já têm contratos com gateways específicos. Forçar troca geraria atrito de onboarding. Além disso, o módulo não quer ser intermediário financeiro — isso cria responsabilidade legal, regulatória e operacional desproporcional ao escopo do produto.

**Consequência:** A camada de pagamento é uma interface com implementações plugáveis. Adicionar novo gateway = implementar a interface sem alterar o restante do módulo. A UI não deve permitir selecionar gateway sem implementação ativa.

---

## DP-02 — Redirecionamento dinâmico via URL única por dispositivo

**Decisão:** Cada dispositivo TAP físico armazena uma URL fixa. Quem muda é o destino associado no banco. A URL nunca muda — muda o que ela aponta.

**Motivação:** Reprogramar moedas NFC no campo é inviável operacionalmente. Além disso, tags NFC devem ser configuradas como somente leitura após a programação inicial para evitar adulteração.

**Consequência:** O endpoint de redirect deve responder em < 200ms p95 sob pico realista. Usar Edge Functions no Vercel para garantir isso.

---

## DP-03 — Web-only para o usuário final, sem App Clips

**Decisão:** A experiência do visitante é 100% web. Nenhum App Clip, nenhuma PWA com funcionalidade offline, nenhum app obrigatório.

**Motivação:** Links NFC dinâmicos funcionam em iOS 13+ e Android, não exigem instalação, não quebram o fluxo com ProPresenter e aceitam experiências multi-etapas. App Clips têm limitações de tamanho, plataforma e integração com redirect dinâmico que inviabilizam o modelo.

**Consequência:** A tela de oferta e os formulários pastorais devem ser otimizados para web mobile (tempo de carregamento < 2s, layout responsivo). Apple Pay/Google Pay entram apenas quando gateway, domínio e certificados estiverem validados.

---

## DP-04 — ProPresenter via app local, não via cloud

**Decisão:** A integração com ProPresenter é feita por um app auxiliar instalado no Mac que roda o ProPresenter. Esse app lê a API de rede local do ProPresenter e envia eventos para o backend da plataforma.

**Motivação:** O ProPresenter opera em rede local. Não há como integrá-lo diretamente via cloud sem expor a rede da igreja. O app local é a ponte: mantém os dados de apresentação locais enquanto comunica mudanças de slide para o backend.

**Consequência:** Cada organização precisa instalar o app auxiliar no Mac do ProPresenter. O suporte a Windows do ProPresenter é considerado escopo futuro.

---

## DP-05 — Painel de comunicação separado do painel administrativo

**Decisão:** Existe um painel simplificado para o perfil "Comunicação" — upload de imagem, título, texto, link do botão, keyword. Esse painel não expõe configurações de gateway, permissões, usuários ou dados financeiros.

**Motivação:** A equipe de comunicação não deve ter acesso a dados sensíveis e não precisa de interface complexa. Simplicidade é requisito funcional, não apenas de UX.

**Consequência:** Dois contextos de interface distintos: painel admin (configurações, financeiro, analytics) e painel de comunicação (destinos e conteúdo).

---

## DP-06 — Três pacotes, não plano por feature individual

**Decisão:** O módulo é vendido em três pacotes (Essencial, Crescimento, Missão) com fronteiras claras de capacidade por campus, número de TAPs, métodos de pagamento disponíveis e recursos de automação.

**Motivação:** Vender feature individual gera atrito de decisão e confusão. Os três pacotes mapeiam estágios reais de maturidade da igreja: pequena organizada, crescendo ativamente, multi-campus estruturada.

**Consequência:** Feature flags por plano controlam o que cada organização acessa. Upgrade de pacote é self-service.

---

## DP-07 — Pix com QR dinâmico, não Pix estático

**Decisão:** A tela de oferta gera um QR code Pix dinâmico para o valor selecionado pelo doador, via API do gateway. Não usamos chave Pix estática.

**Motivação:** Pix estático exige que o doador digite o valor no app do banco — etapa de fricção desnecessária. O QR dinâmico já carrega o valor, reduzindo os passos de 6 para 4 (tocar > selecionar valor > abrir banco > confirmar).

**Consequência:** O gateway configurado pela organização precisa suportar geração de cobranças Pix via API. No MVP, essa capacidade será validada primeiro com Mercado Pago.

---

## DP-08 — MVP comercial inclui Gift Entry básico

**Decisão:** Gift Entry básico entra no MVP comercial, inclusive no plano Essencial.

**Motivação:** Igrejas pequenas recebem doações físicas com frequência. Se o produto digital não permite consolidar esse movimento, o relatório de culto nasce incompleto.

**Consequência:** O módulo precisa de lote de lançamentos, fechamento auditado e evento para Financeiro desde o MVP comercial.

---

## DP-09 — Limite de plano não quebra culto ao vivo

**Decisão:** Ao atingir limite de plano ou expirar trial, o sistema bloqueia criação/edição administrativa acima do limite, mas não derruba TAP público já configurado durante uma janela de graça.

**Motivação:** Quebrar uma URL NFC durante culto é dano operacional e reputacional maior que o risco comercial de alguns dias de uso excedente.

**Consequência:** Billing precisa distinguir bloqueio administrativo de bloqueio de fluxo público.

---

## DP-10 — URL externa com governança

**Decisão:** Destino `external_url` é permitido, mas com validação, preview de domínio, log e allowlist opcional por organização.

**Motivação:** Um TAP físico carrega confiança da igreja. Link externo sem controle pode virar phishing ou erro público.

**Consequência:** Comunicação pode publicar links dentro da política configurada; links fora da política exigem aprovação.
