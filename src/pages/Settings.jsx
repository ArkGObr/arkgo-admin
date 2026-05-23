import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Save, Zap, Moon, Sun, Settings2, AlertTriangle, CheckCircle, ChevronDown, Minus, Plus, ArrowRight } from 'lucide-react';
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
  }, [onClose, msg]);

  return createPortal(
    <div className={`settings-toast settings-toast--${type}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      <span>{msg}</span>
    </div>,
    document.body
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
   Hour Picker — custom dropdown (shp-*)
────────────────────────────────────────────── */
function HourPicker({ label, value, onChange, disabled }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (!isOpen) return;
    function handleOutsideClick(e) {
      const clickedPortal = e.target.closest('.shp-dropdown');
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        !clickedPortal
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const activeHourStr = String(value);

  return (
    <div className={`shp-wrap ${disabled ? 'shp-wrap--disabled' : ''} ${isOpen ? 'shp-wrap--open' : ''}`}>
      <span className="shp-label">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="shp-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="shp-value">
          {activeHourStr.padStart(2, '0')}:00
        </span>
        <ChevronDown className="shp-chevron" size={16} />
      </button>

      {isOpen && !disabled && createPortal(
        <div
          className="shp-dropdown"
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 10000,
          }}
        >
          <div className="shp-list">
            {hours.map(h => {
              const strH = String(h);
              const isActive = activeHourStr === strH;
              return (
                <button
                  key={h}
                  type="button"
                  className={`shp-option ${isActive ? 'shp-option--active' : ''}`}
                  onClick={() => {
                    onChange(strH);
                    setIsOpen(false);
                  }}
                >
                  {strH.padStart(2, '0')}:00
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Percent Stepper — ＋/－ (pct-*)
────────────────────────────────────────────── */
function PercentStepper({ label, value, onChange, min = 0, max = 300, step = 5, icon: Icon }) {
  const handleDecrement = () => {
    onChange(Math.max(min, value - step));
  };
  const handleIncrement = () => {
    onChange(Math.min(max, value + step));
  };

  return (
    <div className="pct-field">
      <span className="pct-label">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      <div className="pct-stepper">
        <button
          type="button"
          className="pct-btn pct-btn--minus"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          <Minus size={14} />
        </button>
        <div className="pct-value">
          <span>{value}</span>
          <span className="pct-unit">%</span>
        </div>
        <button
          type="button"
          className="pct-btn pct-btn--plus"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          <Plus size={14} />
        </button>
      </div>
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
        <PercentStepper
          label="Pico Diurno"
          value={peak}
          icon={Sun}
          onChange={val => onChange(row.id, 'peak_multiplier', val / 100)}
        />
        <PercentStepper
          label="Pico Noturno"
          value={nightPeak}
          icon={Moon}
          onChange={val => onChange(row.id, 'night_peak_multiplier', val / 100)}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Component
────────────────────────────────────────────── */
export default function Settings() {
  const [config, setConfig]           = useState({ ...DEFAULTS });
  const [savedConfig, setSavedConfig] = useState({ ...DEFAULTS });
  const [vehicles, setVehicles]       = useState([]);
  const [savedVehicles, setSavedVehicles] = useState([]);
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
    setSavedConfig(map);
    setLoadingCfg(false);
  }, []);

  /* ── Load vehicles ── */
  const loadVehicles = useCallback(async () => {
    setLoadingVeh(true);
    const { data, error } = await supabase
      .from('vehicle_pricing')
      .select('id, category, name, peak_multiplier, night_peak_multiplier, is_active')
      .order('category');

    if (!error) {
      setVehicles(data || []);
      setSavedVehicles(JSON.parse(JSON.stringify(data || [])));
    }
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
      setSavedConfig(config);
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
      setSavedVehicles(JSON.parse(JSON.stringify(vehicles)));
      showToast('success', 'Multiplicadores de pico salvos!');
    } catch (err) {
      showToast('error', 'Erro ao salvar: ' + err.message);
    } finally {
      setSavingVeh(false);
    }
  }

  const peakActive      = toBool(config.peak_hours_active);
  const nightPeakActive = toBool(config.night_peak_hours_active);

  const isConfigDirty = CONFIG_KEYS.some(key => config[key] !== savedConfig[key]);
  const isVehiclesDirty = vehicles.some((v, idx) => {
    const saved = savedVehicles.find(s => s.id === v.id);
    if (!saved) return true;
    return (
      (v.peak_multiplier ?? 0.4) !== (saved.peak_multiplier ?? 0.4) ||
      (v.night_peak_multiplier ?? 0.4) !== (saved.night_peak_multiplier ?? 0.4)
    );
  });

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

DROP POLICY IF EXISTS "Public read app_config" ON app_config;
CREATE POLICY "Public read app_config"
  ON app_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth update app_config" ON app_config;
DROP POLICY IF EXISTS "Auth write app_config" ON app_config;
CREATE POLICY "Auth write app_config"
  ON app_config FOR ALL USING (auth.role() = 'authenticated');`}</pre>
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
              <div className="settings-hours-sep">
                <ArrowRight size={18} />
              </div>
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
              <div className="settings-hours-sep">
                <ArrowRight size={18} />
              </div>
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
        <Button
          icon={Save}
          loading={savingCfg || loadingCfg}
          onClick={saveConfig}
          disabled={!isConfigDirty || savingCfg || loadingCfg}
        >
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
          <Button
            icon={Save}
            loading={savingVeh || loadingVeh}
            onClick={saveVehicles}
            disabled={!isVehiclesDirty || savingVeh || loadingVeh}
          >
            Salvar Multiplicadores
          </Button>
        </div>
      </section>
    </div>
  );
}
