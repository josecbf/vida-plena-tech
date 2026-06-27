# Aceite Integrado — Alpha Operacional TAP

## Status: EM VALIDAÇÃO

## Checklist go/no-go

- [x] Admin consegue criar campus, grupo, dispositivo e URL pública única
- [x] URL pública e QR equivalente abrem sem login do visitante (implementado)
- [x] Comunicação consegue criar/publicar destino permitido
- [x] Comunicação consegue trocar destino ativo com duração e retorno
- [x] Comunicação não acessa financeiro, gateway ou dados pastorais sensíveis
- [ ] Redirect abre destino ativo em < 2s (validar com device NFC real em staging)
- [ ] Endpoint público mantém p95 < 200ms com 500 requisições simultâneas (teste de carga pendente)
- [ ] Device/grupo/destino inválido não expõe erro técnico (validar em staging)
- [ ] Analytics de tap não bloqueia redirect (validar em produção/staging)
- [ ] Histórico/auditoria registra criação, publicação e troca manual
- [ ] Critérios cross-tenant/campus testados (testes automatizados criados, CI pendente)
- [ ] Plano de rollback documentado

## Próximos passos para completar aceite
1. Configurar Supabase + Vercel em staging
2. Programar moeda NFC com URL do device de teste
3. Executar teste de carga
4. Validar contingências com device NFC real

## Gate para Fase 2
Aceite completo antes de habilitar Pix real (issue #38).
