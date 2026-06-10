---
tags:
  - auditoria
  - stress-test
  - plataforma-igrejas
atualizado: 2026-06-09
---

# Stress Test Hard — Plataforma-Igrejas

## Veredito executivo

**Status original:** REPROVADO para desenvolvimento amplo.

**Status pós-correção documental:** EM REVALIDAÇÃO. A fundação global foi reforçada com gates, contratos, outbox/inbox, LGPD operacional, índice de prontidão e checklist técnico. O projeto ainda não deve codar todos os módulos; deve iniciar apenas pela Fase -1/Fase 0 e pelos módulos que aceitarem os contratos globais.

**Nota original de prontidão para codar:** 42/100.

**Nota pós-correção documental:** 68/100.

O projeto é estrategicamente forte. O risco não é falta de visão; é tentar transformar 16 módulos em código antes de fechar os contratos que evitam retrabalho: Pessoas, permissões, auditoria, eventos, LGPD, comunicação, arquivos, agenda e financeiro.

---

## Resultado quantitativo

| Severidade | Quantidade | Estado |
|---|---:|---|
| Bloqueadores globais | 10 | Corrigidos documentalmente, dependem de aceite intermodular |
| Críticos | 18 | Parcialmente corrigidos por gates e contratos |
| Lacunas por módulo | 32 | Mapeadas no índice de qualidade |
| Riscos operacionais | 14 | Convertidos em critérios de fase |
| Ajustes documentais | 12 | Aplicados nos documentos globais |

---

## BLOQUEADORES GLOBAIS

### B-01 — Módulos poderiam codar cadastros paralelos de pessoa

**Risco:** cada módulo criar seu próprio "participante", "aluno", "responsável", "doador" ou "voluntário", quebrando a tese central da plataforma.

**Correção aplicada:** reforço no Modelo de Dados Canônico: módulos não podem reinventar pessoa, usuário, família, permissões, arquivos, calendário, comentários, tarefas, notificações ou auditoria.

### B-02 — Faltava gate formal antes da primeira linha de código

**Risco:** começar por telas/backlog e descobrir contratos no meio da implementação.

**Correção aplicada:** PRD Global, Priorização, README e Checklist agora exigem Gate 0/Fase -1 com contratos globais, LGPD, eventos, permissões e dados.

### B-03 — Eventos de domínio estavam conceituais demais

**Risco:** eventos duplicarem efeitos, vazarem dados sensíveis ou acoplarem módulos por payload grande.

**Correção aplicada:** Eventos de Domínio agora exigem `event_id`, `schema_version`, `idempotency_key`, `sensitivity`, outbox, inbox e consumidores permitidos.

### B-04 — Permissões fortes existiam, mas não eram gate por módulo

**Risco:** permissões virarem só UI ou perfis amplos como "admin vê tudo".

**Correção aplicada:** Permissões/Tenancy agora exige gate por módulo, segregação de função, leitura sensível auditada e acesso negado definido.

### B-05 — LGPD estava certa na intenção, mas faltavam entidades operacionais

**Risco:** não conseguir atender acesso, correção, revogação, portabilidade, exclusão, incidente ou revisão de impacto.

**Correção aplicada:** LGPD agora exige `ConsentRecord`, `DataSubjectRequest`, `DataRetentionPolicy`, `ProcessingActivity`, `SecurityIncident` e `DpiaReview`.

### B-06 — Qualidade dos módulos usava rótulos subjetivos

**Risco:** "bom", "médio" e "forte" não dizem se pode codar.

**Correção aplicada:** Índice de Qualidade agora usa estados: Inicial, Em especificação, Pronto para Fase 0, Pronto para Alpha, Pronto para MVP e Aprovado para GA.

### B-07 — Operação de domingo não era gate de arquitetura

**Risco:** fluxo funcionar em demo e falhar em culto, check-in infantil, escala, comunicação urgente ou baixa conectividade.

**Correção aplicada:** Priorização e Checklist agora exigem fallback/degradação para domingo, crianças, financeiro e check-in.

### B-08 — Financeiro era dependência forte sem contrato global suficiente

**Risco:** Eventos, TAP, Compras e doações criarem fontes financeiras paralelas.

**Correção aplicada:** Eventos globais ganharam eventos financeiros canônicos; índice de qualidade coloca Financeiro como gate para aceitar eventos idempotentes.

### B-09 — IA tinha limites, mas faltava rastreabilidade por sensibilidade

**Risco:** IA consumir dado pastoral, infantil ou financeiro sem finalidade e sem rastro.

**Correção aplicada:** Segurança/LGPD agora exige registro quando IA usa dados de nível 3, 4 ou 5.

### B-10 — TAP foi adicionado, mas documentos globais ainda falavam em 15 módulos

**Risco:** roadmap, README e índice ignorarem um módulo já especificado.

**Correção aplicada:** README e Índice de Qualidade agora incluem TAP e Engajamento Digital.

---

## CRÍTICOS

1. Pessoas ainda precisa fechar algoritmo de deduplicação, merge review, confiança de match e rollback.
2. Financeiro precisa aceitar contrato de eventos de TAP, Eventos, Compras e doações.
3. Comunicação precisa virar serviço transversal de consentimento, preferência, template e histórico.
4. Crianças precisa detalhar exceção de checkout, incidente, responsáveis e visibilidade mínima.
5. Portal/App precisa ser definido como PWA de autosserviço, não app administrativo disfarçado.
6. Eventos pagos precisam depender de Financeiro, não processar pagamento isolado.
7. Compras precisa de alçada, centro de custo, recebimento e segregação.
8. Estoque precisa ser reduzido para estoque operacional antes de virar WMS completo.
9. Equipamentos precisa separar patrimônio, kit, manutenção e reserva de recurso comum.
10. Cultos precisa de modo culto com baixa fricção, offline/degradado e operador leigo.
11. GCs precisa de frequência semanal simples e sinais pastorais sem burocracia.
12. Ensino precisa evitar virar LMS genérico e se conectar à jornada pastoral.
13. SOM precisa manter explicabilidade, sigilo e revisão humana.
14. Relatórios precisam separar operacional, financeiro confirmado, BI identificado e BI agregado.
15. Exportações precisam registrar permissão, escopo, finalidade e arquivo gerado.
16. Integrações precisam de ExternalMapping, assinatura, replay protection e idempotência.
17. Arquivos precisam de classificação, escopo, expiração e política de acesso.
18. Suporte/implantação precisa ser tratado como produto, não tarefa pós-venda.

---

## Testes extremos obrigatórios

### Cenário 1 — Domingo com pico simultâneo

Culto começa, check-in infantil abre, voluntários confirmam escala, comunicação envia aviso urgente e líderes registram presença. O sistema precisa manter operação simples, permissões corretas e auditoria sem travar.

### Cenário 2 — Pessoa duplicada atravessando módulos

Maria aparece como visitante, mãe de criança, aluna, líder de GC e doadora. A plataforma deve propor merge, preservar histórico, consentimentos e auditoria.

### Cenário 3 — Dado pastoral sensível

Um líder de GC pode ver frequência, mas não nota confidencial do SOM. Exportação genérica não pode vazar esse dado.

### Cenário 4 — Criança retirada por não autorizado

Voluntário sob pressão tenta liberar checkout. Sistema deve bloquear, acionar coordenador, registrar tentativa e não expor informação além do necessário.

### Cenário 5 — Financeiro com conflito de interesse

Mesma pessoa solicita, aprova e tenta pagar uma despesa. Regra de segregação deve bloquear ou exigir aprovação adicional.

### Cenário 6 — Evento pago com webhook duplicado

Gateway reenvia pagamento confirmado. Evento e Financeiro não podem duplicar receita, inscrição ou recibo.

### Cenário 7 — Comunicação sem consentimento

Líder tenta enviar campanha ampla para segmento sem consentimento ou preferência de canal. Sistema deve bloquear ou exigir base legal/justificativa.

### Cenário 8 — IA com dado sensível

Usuário pede resumo pastoral com dados confidenciais. IA deve respeitar permissão, minimizar contexto e gerar trilha de uso.

### Cenário 9 — Integração externa errada

Importação de Planning Center/planilha cria pessoas, GCs e famílias. Sistema deve usar ExternalMapping, deduplicação e revisão manual quando ambíguo.

### Cenário 10 — Tenant/campus cruzado

Usuário com acesso a dois tenants ou campus tenta ver dados fora do escopo. RLS, backend e testes precisam negar.

---

## Correções aplicadas nesta rodada

- README atualizado com módulo 16 e gate antes de codar.
- PRD Global atualizado com Gate 0, Gate 1 e Gate 2.
- Priorização atualizada com Fase -1 de contratos antes de código.
- Arquitetura atualizada com contratos internos, outbox/inbox, observabilidade e gate por módulo.
- Modelo Canônico atualizado com `TenantMembership`, `RoleAssignment`, `UserScope`, `ConsentRecord`, `DataSubjectRequest`, outbox/inbox, importação e invariantes globais.
- Eventos/Auditoria atualizado com outbox, inbox, idempotência, sensibilidade e ações auditáveis.
- Permissões/Tenancy atualizado com gate por módulo e segregação de função.
- Segurança/LGPD atualizado com entidades operacionais e gate LGPD por módulo.
- Checklist atualizado com estados de prontidão e requisitos de eventos, LGPD, idempotência e integrações.
- Índice de Qualidade atualizado com estados acionáveis e inclusão do TAP.

---

## Gates restantes antes de codar produto real

1. Pessoas: aceitar contrato final de deduplicação, merge, consentimento e timeline sensível.
2. Financeiro: aceitar eventos financeiros idempotentes de Eventos, TAP e Compras.
3. Comunicação: aceitar contrato transversal de consentimento, preferência, template e histórico.
4. Crianças: fechar checkout, exceção e incidente com matriz de permissão.
5. Core: consolidar `TenantMembership`, `RoleAssignment`, `UserScope`, RLS e feature flags.
6. Arquivos: definir `FileAsset` com classificação, acesso e retenção.
7. Importação: definir `ImportBatch`, `ExternalMapping`, revisão de duplicidade e rollback.
8. Observabilidade: definir dashboard operacional mínimo por módulo crítico.

---

## Veredito de execução

O projeto pode avançar, mas não como "16 módulos em paralelo".

Caminho tecnicamente correto:

1. Fase -1: contratos globais e modelos canônicos.
2. Fase 0: validação com igrejas e protótipos dos fluxos críticos.
3. Fase 1: Core + Pessoas + Comunicação básica + eventos/auditoria.
4. Fase 2: GCs, SOM leve e Ensino.
5. Fase 3: Cultos, Voluntários e Crianças.
6. Fase 4: Eventos e administração.
7. Fase 5: operação avançada e módulos satélite como TAP conforme contratos.

O projeto agora tem régua suficiente para começar Fase -1/Fase 0 com seriedade. Ainda não tem sinal verde para codar todos os módulos.
