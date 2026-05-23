-- ══════════════════════════════════════════════════════════
-- Migration: Peak Hours Configuration
-- Adds peak_multiplier columns to vehicle_pricing
-- Creates app_config table for global app settings
-- ══════════════════════════════════════════════════════════

-- 1. Add peak hour multipliers to vehicle_pricing
ALTER TABLE vehicle_pricing
  ADD COLUMN IF NOT EXISTS peak_multiplier       NUMERIC DEFAULT 0.40,
  ADD COLUMN IF NOT EXISTS night_peak_multiplier NUMERIC DEFAULT 0.40;

-- 2. Create global app_config table (key/value store)
CREATE TABLE IF NOT EXISTS app_config (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key         TEXT        UNIQUE NOT NULL,
  value       TEXT        NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Seed default peak hours config
INSERT INTO app_config (key, value, description) VALUES
  ('peak_hours_active',       'true', 'Ativar adicional de horário de pico diurno'),
  ('peak_hours_start',        '7',    'Hora de início do pico diurno (0–23)'),
  ('peak_hours_end',          '9',    'Hora de fim do pico diurno (0–23)'),
  ('night_peak_hours_active', 'true', 'Ativar adicional de horário de pico noturno'),
  ('night_peak_start',        '18',   'Hora de início do pico noturno (0–23)'),
  ('night_peak_end',          '22',   'Hora de fim do pico noturno (0–23)')
ON CONFLICT (key) DO NOTHING;

-- 4. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_app_config_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_config_updated_at ON app_config;
CREATE TRIGGER trg_app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_app_config_timestamp();

-- 5. RLS — allow anon read, require auth for write
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read app_config" ON app_config;
CREATE POLICY "Public read app_config"
  ON app_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth update app_config" ON app_config;
DROP POLICY IF EXISTS "Auth write app_config" ON app_config;
CREATE POLICY "Auth write app_config"
  ON app_config FOR ALL USING (auth.role() = 'authenticated');
