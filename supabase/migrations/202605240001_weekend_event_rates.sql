-- ══════════════════════════════════════════════════════════
-- Migration: Weekend and Event Rates Configuration
-- Adds weekend_multiplier and event_multiplier columns to vehicle_pricing
-- Seeds default configurations in app_config
-- ══════════════════════════════════════════════════════════

-- 1. Add weekend and event rate multipliers to vehicle_pricing
ALTER TABLE vehicle_pricing
  ADD COLUMN IF NOT EXISTS weekend_multiplier NUMERIC DEFAULT 0.40,
  ADD COLUMN IF NOT EXISTS event_multiplier   NUMERIC DEFAULT 0.40;

-- 2. Seed default configurations in app_config
INSERT INTO app_config (key, value, description) VALUES
  ('weekend_rate_active', 'true', 'Ativar adicional de final de semana (sábado e domingo)'),
  ('event_rate_active',   'true', 'Ativar adicional de dias de eventos'),
  ('event_dates',         '',     'Datas de eventos cadastradas no formato AAAA-MM-DD separadas por vírgula')
ON CONFLICT (key) DO NOTHING;
