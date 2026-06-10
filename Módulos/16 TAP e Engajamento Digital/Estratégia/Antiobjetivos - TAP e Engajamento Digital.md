---
tags:
  - tap
  - engajamento
  - estrategia
  - antiobjetivos
---

# Antiobjetivos — TAP e Engajamento Digital

← [[000 - Hub TAP e Engajamento Digital]]

---

## O que este módulo não faz

### Não é um sistema de pagamento

O módulo não processa dinheiro. Não armazena dados de cartão. Não é intermediário financeiro entre doador e organização. Todo o processamento financeiro é delegado ao gateway configurado pela organização. O módulo captura a intenção e a confirmação; o gateway executa a transação.

### Não substitui o módulo Financeiro

Doações registradas via TAP emitem eventos de domínio para o módulo Financeiro. A consolidação, conciliação, orçamento e prestação de contas são responsabilidade do Financeiro. O TAP pode ter dashboard operacional de receitas e Gift Entry, mas não é a fonte contábil oficial. Relatórios financeiros oficiais, conciliação e prestação de contas final pertencem ao Financeiro.

### Não é construtor de formulários completo

O módulo oferece tipos de destino pré-definidos (cartão de visitante, pedido de oração, inscrição em célula etc.) com campos específicos. Não é um form builder genérico. Formulários complexos de evento são gerenciados pelo módulo Eventos e linkados como destino externo.

### Não é sistema de CRM ou cadastro

O TAP pode capturar nome, e-mail e telefone num formulário pastoral. Esses dados são encaminhados ao módulo Pessoas para criação ou atualização de perfil. O TAP não mantém base de pessoas própria.

### Não é app

Toda a experiência do usuário final (visitante, membro) é 100% web — sem necessidade de instalar nada. Não existe App Clip nem PWA com funcionalidades offline. A decisão de não usar App Clips foi deliberada: links NFC dinâmicos funcionam em iOS e Android, não quebram o fluxo com ProPresenter e aceitam experiências multi-etapas.

### Não gerencia o hardware NFC

O módulo não fabrica, vende nem faz inventário de moedas/placas NFC. A gestão de dispositivos físicos (quantidade, localização, validade) é responsabilidade operacional da equipe de cada organização. O sistema registra os dispositivos como entidades lógicas, mas não rastreia estoque físico.

### Não é plataforma de streaming ou mídia

O destino de um TAP pode ser um link para transmissão ao vivo, mas o módulo não hospeda vídeos nem integra diretamente com YouTube ou Vimeo.

### Não cobre todas as restrições de dispositivo

iPhones com iOS anterior a 13 e alguns Androids sem chip NFC ou com NFC desabilitado não podem usar TAP. O módulo oferece QR code como fallback no mesmo suporte físico, mas não resolve limitações de hardware do usuário final.
