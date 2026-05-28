# Auditoria de sincronizacao App ArkGO/UrbGO x Painel Admin

Data: 2026-05-28

## Ajustes aplicados no painel

- Pricing: a pagina `Precos` deixou de depender de `vehicle_pricing` e agora lista `pricing_rules`, que e a tabela remota consumida pelo app para pricing dinamico.
- Categorias: o painel passou a usar as categorias oficiais do app: `motoboy`, `car`, `bike`, `mototaxi`, `van`, `truck`.
- Entregadores: leituras de status online agora aceitam `online` e `is_online`, evitando painel zerado quando o schema do app usa `online`.
- Saldo do entregador: exibicao e recarga manual agora aceitam `wallet_balance`, `saldo` ou `balance`.
- Dashboard: contagem de entregadores online e recargas foi ajustada para nao depender rigidamente de `is_online` nem de filtro direto em `gateway_status`.
- Recargas: status agora aceita `gateway_status` ou `status`; texto operacional foi corrigido para Pagar.me.
- Transacoes: painel reconhece `commission_debit` e `delivery_commission`; saldo posterior aceita `balance_after` ou `current_balance`.
- Mapa ao vivo: pontos sem latitude/longitude deixaram de ser renderizados para evitar erro em entregas incompletas.
- Settings de tarifas: deixou de buscar categorias em `vehicle_pricing`; usa o inventario fixo alinhado ao app.

## Pontos sincronizados com o relatorio do app

- Fonte de pricing dinamico: `pricing_rules`.
- Categorias multi-veiculo: `motoboy`, `car`, `bike`, `mototaxi`, `van`, `truck`.
- Financeiro do entregador: `recharges`, `transactions`, `motoboys`.
- Operacao principal: `deliveries`, `users`, `motoboys`.
- Storage/documentos continuam na trilha existente do painel: `driver-documents` e `document_ai_reviews`.

## Pontos que ainda exigem alinhamento app/backend

- A recarga manual do painel ainda faz insert/update direto. O fluxo ideal e expor uma RPC administrativa atomica, semelhante a `credit_wallet_if_pending`, para evitar corrida entre painel, polling e webhook.
- Se o app definitivo padronizar saldo como `saldo`, migrar ou criar view/alias para `wallet_balance`, porque o historico do painel ainda precisa compatibilidade.
- Se o app definitivo padronizar online como `online`, criar migration para remover dependencia operacional de `is_online` ou manter view de compatibilidade.
- O painel nao exibe ainda `route_sessions`, `route_cache`, `delivery_notification_targets`, `delivery_messages` e `delivery_ratings`; esses modulos existem no app/backend e podem virar telas administrativas futuras.
- A tarifa base do app parece estar em constantes/codigo Flutter, enquanto o painel agora administra apenas `pricing_rules`. Para editar tarifa base pelo painel, o app precisa passar a consumir uma tabela remota especifica ou Edge Function de pricing.

## Validacao

- `npm run build`: aprovado.
- `npm run lint`: aprovado, sem erros.
