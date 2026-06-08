---
tags:
  - pessoas
  - produto
  - prd
---

# PRD Pessoas
## Plataforma-Igrejas

← [[000 - Hub Pessoas]]

---

## 1. Resumo executivo

O módulo Pessoas será a base de identidade da Plataforma-Igrejas. Ele deve permitir que uma igreja conheça, organize e acompanhe pessoas com segurança, clareza e utilidade pastoral, sem transformar o cadastro em um sistema genérico ou sem governança.

O módulo precisa sustentar:

- cadastro único por pessoa;
- vínculos familiares e responsáveis;
- múltiplos papéis ministeriais;
- contatos e endereços;
- status de relacionamento com a igreja;
- segmentos e tags;
- consentimentos;
- timeline de eventos relevantes;
- busca global;
- importação e deduplicação;
- permissões por escopo.

---

## 2. Problema

Igrejas costumam ter dados de pessoas espalhados em planilhas, sistemas isolados, listas de ministérios, grupos de WhatsApp, plataformas de ensino, check-in infantil e controles financeiros.

Isso gera:

- duplicidade;
- comunicação incorreta;
- perda de histórico;
- falta de visão pastoral;
- exposição indevida de dados;
- retrabalho administrativo;
- dificuldade para integrar módulos futuros.

---

## 3. Tese do produto

Pessoas deve funcionar como uma fonte confiável de identidade e contexto. Outros módulos podem adicionar eventos e vínculos, mas todos devem apontar para a mesma pessoa canônica.

Em uma frase:

> O módulo Pessoas transforma contatos dispersos em uma visão única, segura e pastoralmente acionável.

---

## 4. Perfis de usuário

### Admin da igreja

Gerencia cadastros, permissões, importações, deduplicação e configurações do módulo.

### Secretaria

Cria e corrige cadastros, mantém contatos, famílias, endereços e status básicos.

### Pastor ou liderança autorizada

Consulta pessoas dentro do escopo permitido, vê contexto relevante e acompanha histórico não sensível.

### Líder de ministério

Enxerga participantes e voluntários relacionados ao seu ministério.

### Responsável familiar

Atualiza dados próprios e de dependentes, quando o portal do membro estiver disponível.

---

## 5. Escopo v1

- Criar, editar, visualizar e arquivar pessoa.
- Registrar contatos: e-mail, telefone, WhatsApp.
- Registrar endereços.
- Criar família/casa e vínculos familiares.
- Registrar responsáveis por crianças/dependentes.
- Definir status: visitante, frequentador, membro, inativo, afastado, etc.
- Aplicar tags e segmentos.
- Registrar consentimentos.
- Exibir timeline inicial.
- Importar pessoas via planilha.
- Identificar possíveis duplicidades.
- Auditar alterações relevantes.
- Oferecer busca global.

### Jornada de membresia

A v1 deve preparar o ciclo de vida eclesiástico, mesmo que algumas etapas fiquem simples no início:

```text
visitante
→ frequentador
→ interessado em membresia
→ classe de membresia
→ entrevista pastoral
→ batismo/profissão de fé ou transferência
→ aprovação
→ membro
→ acompanhamento contínuo
```

Casos que precisam existir no modelo:

- transferência de outra igreja;
- carta de recomendação;
- reconciliação;
- afastamento;
- desligamento;
- restauração;
- histórico de batismo, profissão de fé, santa ceia e data de membresia.

Relatórios importantes:

- pessoas prontas para entrevista;
- membros sem GC;
- membros afastados há 90 dias;
- visitantes sem contato inicial;
- pessoas com dados incompletos.

---

## 6. Fora da v1

- Portal completo do membro.
- Score de engajamento por IA.
- Mesclagem automática sem revisão humana.
- Histórico pastoral sensível completo.
- Integrações complexas bidirecionais.
- App nativo.
- CRM de campanhas.

---

## 7. Regras de negócio essenciais

- Toda pessoa pertence a um tenant.
- Pessoa pode existir sem usuário de login.
- Usuário de login pode se vincular a uma pessoa.
- Pessoa pode ter vários papéis simultâneos.
- Criança/dependente precisa de vínculo com responsável quando aplicável.
- Consentimento deve registrar origem, finalidade, data e status.
- Alterações em dados sensíveis devem gerar auditoria.
- Arquivar pessoa não deve apagar histórico.
- Mesclagem de duplicidades deve preservar rastro de auditoria.
- Status de membresia precisa manter histórico, não apenas valor atual.
- CPF deve ser opcional e tratado como dado sensível quando coletado.
- Campos customizados precisam de governança para não virar depósito de dado sensível sem classificação.

---

## 8. Métricas de sucesso

- Percentual de cadastros duplicados reduzido.
- Percentual de pessoas com contato válido.
- Percentual de crianças com responsável definido.
- Tempo médio para localizar uma pessoa.
- Quantidade de alterações auditadas em dados sensíveis.
- Taxa de importações concluídas sem erro crítico.
