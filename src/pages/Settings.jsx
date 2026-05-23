import { useState, useEffect, useCallback } from 'react';
import { Save, Zap, Moon, Sun, Settings2, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import './Settings.css';

/* ──────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */
const CONFIG_KEYS = [
  'peak_hours_active',
  'peak_hours_start',
  'peak_hours_end',
  'night_peak_hours_active',
  'night_peak_start',
  'night_peak_end',
];

const DEFAULTS = {
  peak_hours_active:       'true',
  peak_hours_start:        '7',
  peak_hours_end:          '9',
  night_peak_hours_active: 'true',
  night_peak_start:        '18',
  night_peak_end:          '22',
};

function toBool(v) { return v === 'true' || v === true; }
function toStr(v)  { return String(v); }

/* ──────────────────────────────────────────────
   Toast
────────────────────────────────────────────── */
function Toast({ type, msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`settings-toast settings-toast--${type}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      <span>{msg}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Toggle Switch
────────────────────────────────────────────── */
function Toggle({ checked, onChange, id }) {
  return (
    <label className="settings-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="settings-toggle-track">
        <span className="settings-toggle-thumb" />
      </span>
    </label>
  );
}

/* ──────────────────────────────────────────────
   Hour Picker
────────────────────────────────────────────── */
function HourPicker({ label, value, onChange, disabled }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className={`settings-hour-picker ${disabled ? 'settings-hour-picker--disabled' : ''}`}>
      <span className="settings-hour-label">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="settings-hour-select"
      >
        {hours.map(h => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}:00
          </option>
        ))}
      </select>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Multiplier Card per vehicle
────────────────────────────────────────────── */
function VehicleMultiplierRow({ row, onChange }) {
  const peak      = Math.round((row.peak_multiplier ?? 0.4) * 100);
  const nightPeak = Math.round((row.night_peak_multiplier ?? 0.4) * 100);

  return (
    <div className="settings-vehicle-row">
      <div className="settings-vehicle-name">
        <span className="settings-vehicle-category">{row.category}</span>
        <span className="settings-vehicle-label">{row.name}</span>
      </div>
      <div className="settings-vehicle-inputs">
        <div className="settings-vehicle-field">
          <label>
            <Sun size={12} /> Pico Diurno
          </label>
          <div className="settings-percent-input">
            <input
              type="number"
              min={0}
              max={300}
              step={5}
              value={peak}
              onChange={e =>
                onChange(row.id, 'peak_multiplier', Number(e.target.value) / 100)
              }
            />
            <span>%</span>
          </div>
        </div>
        <div className="settings-vehicle-field">
          <label>
            <Moon size={12} /> Pico Noturno
          </label>
          <div className="settings-percent-input">
            <input
              type="number"
              min={0}
              max={300}
              step={5}
              value={nightPeak}
              onChange={e =>
                onChange(row.id, 'night_peak_multiplier', Number(e.target.value) / 100)
              }
            />
            <span>%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Component
────────────────────────────────────────────── */
export default function Settings() {
  const [config, setConfig]     = useState({ ...DEFAULTS });
  const [vehicles, setVehicles] = useState([]);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [loadingVeh, setLoadingVeh] = useState(true);
  const [savingCfg, setSavingCfg]   = useState(false);
  const [savingVeh, setSavingVeh]   = useState(false);
  const [toast, setToast]           = useState(null);
  const [dbError, setDbError]       = useState(false);

  const showToast = (type, msg) => setToast({ type, msg });

  /* ── Load app_config ── */
  const loadConfig = useCallback(async () => {
    setLoadingCfg(true);
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', CONFIG_KEYS);

    if (error) {
      setDbError(true);
      setLoadingCfg(false);
      return;
    }
    setDbError(false);
    const map = { ...DEFAULTS };
    (data || []).forEach(r => { map[r.key] = r.value; });
    setConfig(map);
    setLoadingCfg(false);
  }, []);

  /* ── Load vehicles ── */
  const loadVehicles = useCallback(async () => {
    setLoadingVeh(true);
    const { data, error } = await supabase
      .from('vehicle_pricing')
      .select('id, category, name, peak_multiplier, night_peak_multiplier, is_active')
      .order('category');

    if (!error) setVehicles(data || []);
    setLoadingVeh(false);
  }, []);

  useEffect(() => { loadConfig(); loadVehicles(); }, [loadConfig, loadVehicles]);

  /* ── Update vehicle multiplier locally ── */
  function handleVehicleChange(id, field, value) {
    setVehicles(prev =>
      prev.map(v => v.id === id ? { ...v, [field]: value } : v)
    );
  }

  /* ── Save app_config ── */
  async function saveConfig() {
    setSavingCfg(true);
    try {
      const upserts = CONFIG_KEYS.map(key => ({
        key,
        value: toStr(config[key]),
        description: DEFAULTS[key] !== undefined ? undefined : null,
      }));
      const { error } = await supabase
        .from('app_config')
        .upsert(upserts, { onConflict: 'key' });
      if (error) throw error;
      showToast('success', 'Configurações de horário salvas!');
    } catch (err) {
      showToast('error', 'Erro ao salvar: ' + err.message);
    } finally {
      setSavingCfg(false);
    }
  }

  /* ── Save vehicle multipliers ── */
  async function saveVehicles() {
    setSavingVeh(true);
    try {
      for (const v of vehicles) {
        const { error } = await supabase
          .from('vehicle_pricing')
          .update({
            peak_multiplier:       v.peak_multiplier ?? 0.4,
            night_peak_multiplier: v.night_peak_multiplier ?? 0.4,
          })
          .eq('id', v.id);
        if (error) throw error;
      }
      showToast('success', 'Multiplicadores de pico salvos!');
    } catch (err) {
      showToast('error', 'Erro ao salvar: ' + err.message);
    } finally {
      setSavingVeh(false);
    }
  }

  const peakActive      = toBool(config.peak_hours_active);
  const nightPeakActive = toBool(config.night_peak_hours_active);

  /* ── DB not ready banner ── */
  if (dbError) {
    return (
      <div className="settings-db-error">
        <AlertTriangle size={32} />
        <h2>Migration pendente</h2>
        <p>Execute o SQL abaixo no Supabase Dashboard → SQL Editor:</p>
        <pre>{`ALTER TABLE vehicle_pricing
  ADD COLUMN IF NOT EXISTS peak_multiplier       NUMERIC DEFAULT 0.40,
  ADD COLUMN IF NOT EXISTS night_peak_multiplier NUMERIC DEFAULT 0.40;

CREATE TABLE IF NOT EXISTS app_config (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key         TEXT        UNIQUE NOT NULL,
  value       TEXT        NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (key, value, description) VALUES
  ('peak_hours_active',       'true', 'Pico diurno ativo'),
  ('peak_hours_start',        '7',    'Início pico diurno'),
  ('peak_hours_end',          '9',    'Fim pico diurno'),
  ('night_peak_hours_active', 'true', 'Pico noturno ativo'),
  ('night_peak_start',        '18',   'Início pico noturno'),
  ('night_peak_end',          '22',   'Fim pico noturno')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read app_config"
  ON app_config FOR SELECT USING (true);
CREATE POLICY "Auth update app_config"
  ON app_config FOR UPDATE USING (auth.role() = 'authenticated');`}</pre>
        <Button onClick={() => { setDbError(false); loadConfig(); loadVehicles(); }}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {toast && (
        <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Horário de pico e tarifas dinâmicas</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* ────── Card: Horário de Pico Diurno ────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon settings-card-icon--day">
              <Sun size={18} />
            </div>
            <div>
              <h2 className="settings-card-title">Horário de Pico Diurno</h2>
              <p className="settings-card-sub">Tarifaço matinal — manhã de pico</p>
            </div>
            <Toggle
              id="peak-active"
              checked={peakActive}
              onChange={v => setConfig(c => ({ ...c, peak_hours_active: toStr(v) }))}
            />
          </div>

          <div className={`settings-card-body ${!peakActive ? 'settings-card-body--disabled' : ''}`}>
            <div className="settings-hours-row">
              <HourPicker
                label="Início"
                value={config.peak_hours_start}
                onChange={v => setConfig(c => ({ ...c, peak_hours_start: v }))}
                disabled={!peakActive}
              />
              <span className="settings-hours-sep">→</span>
              <HourPicker
                label="Fim"
                value={config.peak_hours_end}
                onChange={v => setConfig(c => ({ ...c, peak_hours_end: v }))}
                disabled={!peakActive}
              />
            </div>
          </div>
        </section>

        {/* ────── Card: Horário de Pico Noturno ────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon settings-card-icon--night">
              <Moon size={18} />
            </div>
            <div>
              <h2 className="settings-card-title">Horário de Pico Noturno</h2>
              <p className="settings-card-sub">Como no app — &quot;+40% Noturno&quot;</p>
            </div>
            <Toggle
              id="night-peak-active"
              checked={nightPeakActive}
              onChange={v => setConfig(c => ({ ...c, night_peak_hours_active: toStr(v) }))}
            />
          </div>

          <div className={`settings-card-body ${!nightPeakActive ? 'settings-card-body--disabled' : ''}`}>
            <div className="settings-hours-row">
              <HourPicker
                label="Início"
                value={config.night_peak_start}
                onChange={v => setConfig(c => ({ ...c, night_peak_start: v }))}
                disabled={!nightPeakActive}
              />
              <span className="settings-hours-sep">→</span>
              <HourPicker
                label="Fim"
                value={config.night_peak_end}
                onChange={v => setConfig(c => ({ ...c, night_peak_end: v }))}
                disabled={!nightPeakActive}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Save config button */}
      <div className="settings-save-row">
        <Button icon={Save} loading={savingCfg || loadingCfg} onClick={saveConfig}>
          Salvar Horários
        </Button>
      </div>

      {/* ────── Card: Multiplicadores por Veículo ────── */}
      <section className="settings-card settings-card--full">
        <div className="settings-card-header">
          <div className="settings-card-icon settings-card-icon--zap">
            <Zap size={18} />
          </div>
          <div>
            <h2 className="settings-card-title">Adicional por Veículo</h2>
            <p className="settings-card-sub">Porcentagem cobrada no horário de pico por categoria</p>
          </div>
        </div>

        <div className="settings-card-body">
          {loadingVeh ? (
            <div className="settings-skeleton-list">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="settings-skeleton-row" />
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '32px 0' }}>
              Nenhum veículo encontrado
            </p>
          ) : (
            <div className="settings-vehicle-list">
              {vehicles.map(v => (
                <VehicleMultiplierRow
                  key={v.id}
                  row={v}
                  onChange={handleVehicleChange}
                />
              ))}
            </div>
          )}
        </div>

        <div className="settings-card-footer">
          <Button icon={Save} loading={savingVeh || loadingVeh} onClick={saveVehicles}>
            Salvar Multiplicadores
          </Button>
        </div>
      </section>
    </div>
  );
}
