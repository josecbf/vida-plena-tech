---
tags:
  - squads
  - equipe
  - papeis
---

# Equipe e Papéis — Plataforma-Igrejas

Descrição dos papéis necessários, habilidades esperadas e estrutura de squads para o desenvolvimento da Plataforma Global para Igrejas.

---

## Filosofia da equipe

A Plataforma-Igrejas é construída com a convicção de que **tecnologia serve à missão**.
Cada decisão técnica, de produto e de design deve ser orientada pela realidade operacional das igrejas e pelo cuidado pastoral com as pessoas.

A equipe ideal reúne pessoas que dominam sua área técnica **e** entendem — ou estão genuinamente dispostas a aprender — o contexto ministerial. Não é suficiente construir bem; é preciso construir o que as igrejas realmente precisam.

---

## Papéis centrais

### Product Owner — Marcos Amorim
Dono do produto, visão estratégica e decisão final sobre escopo, prioridade e merge.

Responsabilidades:
- Definir e priorizar o backlog
- Aprovar PRs e autorizar merges no `main`
- Validar que a plataforma serve às igrejas reais
- Tomar decisões de produto em caso de conflito entre squads

---

### Arquiteto de Software
**Perfil:** Sênior. Experiência comprovada com SaaS multi-tenant, modelagem de domínio e escalabilidade.

Habilidades obrigatórias:
- Multi-tenancy — isolamento de dados por organização com segurança
- Design de APIs — contratos versionados, evolução sem breaking changes
- Modelagem de dados relacional (PostgreSQL) e eventos de domínio
- Segurança por design — RBAC, LGPD, trilha de auditoria
- Documentação de decisões de arquitetura (ADRs)

Responsabilidades neste projeto:
- Guardar o modelo canônico de dados e garantir sua integridade
- Definir contratos entre squads (especialmente entre Core e módulos)
- Revisar decisões com impacto transversal
- Garantir que nenhum módulo reinvente primitivos do Core

---

### Tech Lead Frontend
**Perfil:** Sênior. Especialista em aplicações web modernas, design systems e experiência do usuário.

Habilidades obrigatórias:
- React / Next.js (App Router, Server Components)
- Design systems — componentes, tokens de design, acessibilidade (WCAG 2.1)
- Performance de UI — carregamento, responsividade, PWA
- TypeScript rigoroso
- Sensibilidade para contextos de uso ministerial (mobile, conexões lentas, usuários não-técnicos)

---

### Tech Lead Backend
**Perfil:** Sênior. Especialista em APIs, banco de dados e integrações.

Habilidades obrigatórias:
- Node.js / TypeScript (ou stack equivalente definida)
- PostgreSQL — queries complexas, índices, otimização
- Filas e processamento assíncrono (notificações, relatórios)
- Integração com sistemas externos (ERPs, plataformas de doação, WhatsApp, calendários)
- Background jobs e automações ministeriais

---

### Product Designer / UX
**Perfil:** Pleno/Sênior. Experiência com produtos B2B SaaS e sensibilidade para contextos de baixa familiaridade técnica.

Habilidades obrigatórias:
- Design de fluxos complexos (gestão pastoral, financeiro, eventos, permissões)
- Prototipagem de alta fidelidade (Figma ou equivalente)
- Research com usuários — especialmente lideranças de igrejas
- Construção e manutenção de design system
- Acessibilidade e inclusão digital

Diferencial para este projeto:
- Experiência com contextos ministeriais ou organizações do terceiro setor

---

### Analista de Negócios / Product Manager
**Perfil:** Pleno. Ponte entre o mundo pastoral e o produto.

Habilidades obrigatórias:
- Levantamento e refinamento de requisitos com usuários não-técnicos
- Escrita de user stories e critérios de aceitação precisos e verificáveis
- Mapeamento de jornadas operacionais de igrejas
- Priorização de backlog com critérios claros
- Capacidade de dizer não a escopo — e explicar o porquê

Diferencial:
- Vivência prática em estrutura ministerial (células, discipulado, cultos, equipes de serviço)

---

### Especialista em Operações de Igrejas
**Perfil:** Consultor / Parceiro de produto. Experiência prática na gestão de igrejas.

Responsabilidades:
- Validar se os fluxos documentados refletem a realidade ministerial
- Identificar lacunas entre o produto pensado e as necessidades reais
- Testar protótipos com lentes operacionais
- Ser o "usuário avançado" permanente da equipe

> Não precisa ter perfil técnico — precisa conhecer profundamente como igrejas funcionam no dia a dia.

---

### Especialista em Segurança / LGPD
**Perfil:** Consultor. Especialista em proteção de dados e conformidade legal brasileira.

Responsabilidades:
- Revisar o modelo de dados sob a ótica da LGPD
- Definir políticas de consentimento, retenção e exclusão de dados de membros
- Auditar permissões, acessos e fluxos de dados sensíveis
- Documentar as bases legais para tratamento de dados pessoais e de crianças (módulo Crianças)

---

### Engenheiro de Dados / BI
**Perfil:** Pleno/Sênior.

Responsabilidades:
- Modelo canônico de dados — consistência e qualidade entre módulos
- Pipelines para relatórios e dashboards pastorais
- IA embarcada — análise de frequência, saúde de GCs, alertas de ausência, padrões de engajamento
- Governança de dados — quem produz, quem consome, como evoluir sem quebrar

---

### QA (Quality Assurance)
**Perfil:** Pleno.

Responsabilidades:
- Revisar critérios de aceitação de tasks antes de iniciar
- Validar que os critérios foram de fato verificados antes do fechamento
- Criar e manter matrizes de teste por módulo
- Para o repo de docs: verificar consistência interna entre módulos (ex.: módulo A descreve permissão que contradiz o que Core documenta)

---

### DevOps / Infra
**Perfil:** Pleno/Sênior.

Habilidades obrigatórias:
- CI/CD — GitHub Actions, automações de deploy
- Cloud multi-tenant com isolamento seguro entre organizações
- Observabilidade — logs, métricas, alertas, dashboards operacionais
- Segurança de infraestrutura — HTTPS, gestão de secrets, backup e recovery

---

## Estrutura de squads

### Squad Core
**Missão:** Fundação da plataforma. Sem o Core, nenhum módulo funciona.

Escopo: tenant, usuários, permissões, auditoria, billing, feature flags, configurações globais, shell da plataforma.

Papéis mínimos: Arquiteto de Software, Tech Lead Backend, Product Designer.

> **Regra inviolável:** nenhum outro squad cria sua própria gestão de pessoa, permissão, agenda ou auditoria. Esses contratos pertencem ao Core.

---

### Squad Pessoas
**Missão:** O coração do produto. Toda a plataforma gira em torno do cadastro de pessoas.

Escopo: cadastro, famílias, timeline pastoral, tags, consentimentos LGPD, busca, importação, histórico de relacionamento.

Papéis mínimos: Analista de Negócios, Tech Lead Backend, Product Designer, Especialista em Operações.

---

### Squad Cuidado e Discipulado
**Missão:** A dimensão pastoral da plataforma.

Escopo: Apoio Pastoral (SOM), Ensino, Grupos de Crescimento, jornada do discípulo.

Papéis mínimos: Especialista em Operações de Igrejas, Analista de Negócios, Tech Lead Backend.

---

### Squad Domingo
**Missão:** Tudo que envolve o culto e a vivência presencial da igreja.

Escopo: Gestão de Cultos, Crianças, Ministérios, Voluntários, check-ins.

Papéis mínimos: Especialista em Operações, Analista de Negócios, Product Designer.

---

### Squad Operações
**Missão:** A gestão administrativa e de recursos da igreja.

Escopo: Eventos, Espaços e Recursos, Estoque (WMS), Compras, Equipamentos Técnicos, Financeiro.

Papéis mínimos: Analista de Negócios, Arquiteto de Software, Tech Lead Backend.

---

### Squad IA e Dados
**Missão:** Inteligência que serve o cuidado pastoral — não tecnologia pela tecnologia.

Escopo: modelo canônico de dados, BI, eventos de domínio, relatórios pastorais, IA embarcada (alertas de ausência, saúde de GCs, análise de engajamento), qualidade e governança de dados.

Papéis mínimos: Engenheiro de Dados, Arquiteto de Software, Especialista em Operações.

---

## Regras de trabalho entre squads

1. **Nenhum módulo recria primitivos do Core.** Precisa de permissão, pessoa ou agenda — usa o contrato do Core.
2. **Contratos entre squads são documentados antes de implementar.** Nenhuma dependência implícita ou assumida.
3. **Squad Pessoas tem prioridade de fusão.** Se um módulo e Pessoas tocam no mesmo modelo, Pessoas decide.
4. **Mudanças transversais passam pelo Arquiteto.** Impacto em 2 ou mais squads requer validação do Arquiteto de Software antes do merge.
5. **Squad IA e Dados não cria dados — consome contratos já existentes.** Nenhum pipeline que inventa modelo novo sem aprovação do Core.
