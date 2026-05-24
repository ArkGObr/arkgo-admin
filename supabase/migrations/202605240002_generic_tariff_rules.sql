-- ══════════════════════════════════════════════════════════
-- Migration: Generic Pricing/Tariff Rules Table
-- Creates pricing_rules table for dynamic custom pricing rules
-- Seeds initial rules (Pico Diurno, Pico Noturno, Fim de Semana)
-- ══════════════════════════════════════════════════════════

-- 1. Create the pricing_rules table
CREATE TABLE IF NOT EXISTS pricing_rules (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  rule_type   TEXT        NOT NULL, -- 'weekly' or 'specific_date'
  days        TEXT        NOT NULL, -- comma-separated weekdays '0,6' or YYYY-MM-DD
  start_hour  INTEGER     NOT NULL DEFAULT 0,
  end_hour    INTEGER     NOT NULL DEFAULT 24,
  multipliers JSONB       NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"comfort": 0.40, "standard": 0.30}
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Public read pricing_rules" ON pricing_rules;
CREATE POLICY "Public read pricing_rules"
  ON pricing_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth write pricing_rules" ON pricing_rules;
CREATE POLICY "Auth write pricing_rules"
  ON pricing_rules FOR ALL USING (auth.role() = 'authenticated');

-- 4. Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_pricing_rules_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER trg_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_pricing_rules_timestamp();

-- 5. PL/pgSQL Dynamic Seeder Block
DO $$
DECLARE
  default_multipliers JSONB;
BEGIN
  -- Create a JSONB object with all active vehicle categories and default 0.40
  SELECT jsonb_object_agg(category, 0.40)
  INTO default_multipliers
  FROM (
    SELECT DISTINCT category 
    FROM vehicle_pricing 
    WHERE is_active = true
  ) categories;

  -- Fallback if no categories are found
  IF default_multipliers IS NULL THEN
    default_multipliers := '{"Comfort": 0.40, "Standard": 0.40}'::jsonb;
  END IF;

  -- Seed "Pico Diurno" (Monday to Friday, 7am to 9am)
  INSERT INTO pricing_rules (name, rule_type, days, start_hour, end_hour, multipliers, is_active)
  VALUES ('Pico Diurno', 'weekly', '1,2,3,4,5', 7, 9, default_multipliers, true)
  ON CONFLICT DO NOTHING;

  -- Seed "Pico Noturno" (Monday to Friday, 6pm to 10pm)
  INSERT INTO pricing_rules (name, rule_type, days, start_hour, end_hour, multipliers, is_active)
  VALUES ('Pico Noturno', 'weekly', '1,2,3,4,5', 18, 22, default_multipliers, true)
  ON CONFLICT DO NOTHING;

  -- Seed "Fim de Semana" (Saturday and Sunday, all day)
  INSERT INTO pricing_rules (name, rule_type, days, start_hour, end_hour, multipliers, is_active)
  VALUES ('Fim de Semana', 'weekly', '0,6', 0, 24, default_multipliers, true)
  ON CONFLICT DO NOTHING;
END $$;
