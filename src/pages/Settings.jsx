import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Save, Zap, Moon, Sun, Settings2, AlertTriangle, CheckCircle, ChevronDown, Minus, Plus, ArrowRight, Calendar, Sparkles, Trash2, Edit, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { VEHICLE_CATEGORY_OPTIONS } from '../utils/constants';
import './Settings.css';

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */
const WEEKDAYS = [
  { label: 'D', value: '0' },
  { label: 'S', value: '1' },
  { label: 'T', value: '2' },
  { label: 'Q', value: '3' },
  { label: 'Q', value: '4' },
  { label: 'S', value: '5' },
  { label: 'S', value: '6' }
];

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
  const hours = Array.from({ length: 25 }, (_, i) => i); // 0 to 24 (since a rule can end at 24:00)
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
   Main Component
   ────────────────────────────────────────────── */
export default function Settings() {
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [toast, setToast] = useState(null);
  const [dbError, setDbError] = useState(false);

  // Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  const showToast = (type, msg) => setToast({ type, msg });

  /* ── Fetch Rules ── */
  const loadRules = useCallback(async () => {
    setLoadingRules(true);
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      setDbError(true);
    } else {
      setDbError(false);
      setRules(data || []);
    }
    setLoadingRules(false);
  }, []);

  useEffect(() => { queueMicrotask(loadRules); }, [loadRules]);

  const categories = VEHICLE_CATEGORY_OPTIONS.map(option => option.value);

  /* ── Toggle Rule Status ── */
  async function handleToggleRule(rule) {
    const newActive = !rule.is_active;
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: newActive } : r));

    const { error } = await supabase
      .from('pricing_rules')
      .update({ is_active: newActive })
      .eq('id', rule.id);

    if (error) {
      showToast('error', 'Erro ao alterar status: ' + error.message);
      loadRules();
    } else {
      showToast('success', `Regra "${rule.name}" ${newActive ? 'ativada' : 'desativada'}!`);
    }
  }

  /* ── Open Delete Confirm Modal ── */
  const handleOpenDeleteConfirm = (rule) => {
    setRuleToDelete(rule);
    setDeleteModalOpen(true);
  };

  /* ── Confirm Delete Rule ── */
  async function handleConfirmDelete() {
    if (!ruleToDelete) return;
    try {
      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', ruleToDelete.id);
      if (error) throw error;
      showToast('success', 'Regra excluída com sucesso!');
      setDeleteModalOpen(false);
      setRuleToDelete(null);
      loadRules();
    } catch (err) {
      showToast('error', 'Erro ao excluir regra: ' + err.message);
    }
  }

  /* ── Open Create Rule Modal ── */
  const handleOpenCreate = () => {
    const defaultMultipliers = {};
    categories.forEach(cat => { defaultMultipliers[cat] = 0.40; });

    setEditingRule({
      name: '',
      rule_type: 'weekly',
      days: '1,2,3,4,5', // Seg a Sex
      start_hour: '18',
      end_hour: '22',
      multipliers: defaultMultipliers,
      is_active: true,
    });
    setRuleModalOpen(true);
  };

  /* ── Open Edit Rule Modal ── */
  const handleOpenEdit = (rule) => {
    const baseMultipliers = { ...(rule.multipliers || {}) };
    categories.forEach(cat => {
      if (baseMultipliers[cat] === undefined) {
        baseMultipliers[cat] = 0.40;
      }
    });

    setEditingRule({
      ...rule,
      start_hour: String(rule.start_hour),
      end_hour: String(rule.end_hour),
      multipliers: baseMultipliers,
    });
    setRuleModalOpen(true);
  };

  /* ── Toggle Day Selection in Modal ── */
  const handleToggleDay = (dayValue) => {
    const currentDays = editingRule.days ? editingRule.days.split(',').filter(Boolean) : [];
    let newDays;
    if (currentDays.includes(dayValue)) {
      newDays = currentDays.filter(d => d !== dayValue);
    } else {
      newDays = [...currentDays, dayValue];
    }
    setEditingRule(prev => ({
      ...prev,
      days: newDays.sort().join(','),
    }));
  };

  /* ── Save Rule (Insert/Update) ── */
  async function handleSaveRule() {
    if (!editingRule.name.trim()) {
      showToast('error', 'Por favor, insira um nome para a regra.');
      return;
    }
    if (editingRule.rule_type === 'weekly' && !editingRule.days) {
      showToast('error', 'Selecione pelo menos um dia da semana.');
      return;
    }
    if (editingRule.rule_type === 'specific_date' && !editingRule.days) {
      showToast('error', 'Por favor, selecione uma data.');
      return;
    }

    setSavingRule(true);
    try {
      const payload = {
        name: editingRule.name,
        rule_type: editingRule.rule_type,
        days: editingRule.days,
        start_hour: parseInt(editingRule.start_hour),
        end_hour: parseInt(editingRule.end_hour),
        multipliers: editingRule.multipliers,
        is_active: editingRule.is_active,
      };

      let error;
      if (editingRule.id) {
        const res = await supabase
          .from('pricing_rules')
          .update(payload)
          .eq('id', editingRule.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('pricing_rules')
          .insert([payload]);
        error = res.error;
      }

      if (error) throw error;

      showToast('success', 'Regra de tarifa salva!');
      setRuleModalOpen(false);
      setEditingRule(null);
      loadRules();
    } catch (err) {
      showToast('error', 'Erro ao salvar regra: ' + err.message);
    } finally {
      setSavingRule(false);
    }
  }

  // Format Rule Validity String for UI
  const formatValidity = (rule) => {
    const hours = `${String(rule.start_hour).padStart(2, '0')}:00 às ${String(rule.end_hour).padStart(2, '0')}:00`;
    if (rule.rule_type === 'specific_date') {
      const [year, month, day] = rule.days.split('-');
      return `Data: ${day}/${month}/${year} das ${hours}`;
    }

    const currentDays = rule.days ? rule.days.split(',').filter(Boolean) : [];
    if (currentDays.length === 7) return `Todos os dias, das ${hours}`;
    if (currentDays.length === 5 && !currentDays.includes('0') && !currentDays.includes('6')) {
      return `Segunda a Sexta, das ${hours}`;
    }
    if (currentDays.length === 2 && currentDays.includes('0') && currentDays.includes('6')) {
      return `Fins de Semana, das ${hours}`;
    }

    const dayLabels = currentDays.map(d => {
      const w = WEEKDAYS.find(x => x.value === d);
      return w ? w.label : '';
    });
    return `Dias [${dayLabels.join(', ')}], das ${hours}`;
  };

  /* ── DB not ready banner ── */
  if (dbError) {
    return (
      <div className="settings-db-error">
        <AlertTriangle size={32} />
        <h2>Estrutura de Regras de Tarifas Pendente</h2>
        <p>Execute o SQL de criação da tabela de regras no Supabase Dashboard → SQL Editor:</p>
        <pre>{`CREATE TABLE IF NOT EXISTS pricing_rules (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  rule_type   TEXT        NOT NULL,
  days        TEXT        NOT NULL,
  start_hour  INTEGER     NOT NULL DEFAULT 0,
  end_hour    INTEGER     NOT NULL DEFAULT 24,
  multipliers JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read pricing_rules" ON pricing_rules;
CREATE POLICY "Public read pricing_rules"
  ON pricing_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth write pricing_rules" ON pricing_rules;
CREATE POLICY "Auth write pricing_rules"
  ON pricing_rules FOR ALL USING (auth.role() = 'authenticated');`}</pre>
        <Button onClick={() => { setDbError(false); loadRules(); }}>
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Configurações de Tarifas</h1>
          <p className="page-subtitle">Gerencie regras customizadas de tarifas dinâmicas por dia, horário e categoria</p>
        </div>
        <Button icon={PlusCircle} onClick={handleOpenCreate}>
          Nova Regra
        </Button>
      </div>

      {/* ────── Rules List ────── */}
      <section className="settings-card settings-card--full" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="settings-card-header">
          <div className="settings-card-icon settings-card-icon--zap">
            <Zap size={18} />
          </div>
          <div>
            <h2 className="settings-card-title">Regras de Tarifas Dinâmicas Ativas</h2>
            <p className="settings-card-sub">Regras em vigor que definem multiplicadores sob condições específicas</p>
          </div>
        </div>

        <div className="settings-card-body" style={{ padding: 0 }}>
          {loadingRules ? (
            <div className="settings-skeleton-list">
              {[1, 2, 3].map(i => (
                <div key={i} className="settings-skeleton-row" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '48px 0' }}>
              Nenhuma regra de tarifa cadastrada. Clique em "Nova Regra" acima para criar.
            </div>
          ) : (
            <div className="settings-rules-table-list">
              {rules.map(rule => (
                <div key={rule.id} className="settings-rule-item-row">
                  <div className="settings-rule-item-main">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="settings-rule-item-name">{rule.name}</span>
                      {rule.rule_type === 'specific_date' ? (
                        <span className="settings-rule-badge settings-rule-badge--event">Data Única</span>
                      ) : (
                        <span className="settings-rule-badge settings-rule-badge--weekly">Recorrente</span>
                      )}
                    </div>
                    <span className="settings-rule-item-details">{formatValidity(rule)}</span>
                  </div>

                  <div className="settings-rule-item-multipliers-preview">
                    {Object.entries(rule.multipliers || {}).map(([cat, val]) => (
                      <div key={cat} className="settings-rule-preview-chip">
                        <span className="settings-rule-preview-cat">{cat}</span>
                        <span className="settings-rule-preview-val">+{Math.round(val * 100)}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="settings-rule-item-actions">
                    <Toggle
                      id={`rule-active-${rule.id}`}
                      checked={rule.is_active}
                      onChange={() => handleToggleRule(rule)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={Edit}
                      onClick={() => handleOpenEdit(rule)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={Trash2}
                      onClick={() => handleOpenDeleteConfirm(rule)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ────── Modal: Create/Edit Rule ────── */}
      <Modal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={editingRule?.id ? `Editar Regra: ${editingRule.name}` : 'Criar Nova Regra de Tarifa'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRuleModalOpen(false)}>
              Cancelar
            </Button>
            <Button icon={Save} loading={savingRule} onClick={handleSaveRule}>
              Salvar Regra
            </Button>
          </>
        }
      >
        {editingRule && (
          <div className="settings-rule-form">
            {/* Rule Name */}
            <div className="settings-form-group">
              <label className="settings-form-label">Nome da Regra</label>
              <input
                type="text"
                placeholder="Ex: Pico da Manhã, Véspera de Natal, etc."
                className="settings-rule-name-input"
                value={editingRule.name}
                onChange={e => setEditingRule(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Rule Type Selector */}
            <div className="settings-form-group">
              <label className="settings-form-label">Frequência</label>
              <div className="settings-form-type-row">
                <button
                  type="button"
                  className={`settings-type-btn ${editingRule.rule_type === 'weekly' ? 'settings-type-btn--active' : ''}`}
                  onClick={() => setEditingRule(p => ({ ...p, rule_type: 'weekly', days: '1,2,3,4,5' }))}
                >
                  Repetir Semanalmente
                </button>
                <button
                  type="button"
                  className={`settings-type-btn ${editingRule.rule_type === 'specific_date' ? 'settings-type-btn--active' : ''}`}
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setEditingRule(p => ({ ...p, rule_type: 'specific_date', days: todayStr }));
                  }}
                >
                  Data Específica (Única)
                </button>
              </div>
            </div>

            {/* Days Selector based on Type */}
            {editingRule.rule_type === 'weekly' ? (
              <div className="settings-form-group">
                <label className="settings-form-label">Dias da Semana Aplicáveis</label>
                <div className="settings-form-weekdays">
                  {WEEKDAYS.map(w => {
                    const isSelected = (editingRule.days || '').split(',').includes(w.value);
                    return (
                      <button
                        key={w.value}
                        type="button"
                        className={`settings-weekday-bubble ${isSelected ? 'settings-weekday-bubble--active' : ''}`}
                        onClick={() => handleToggleDay(w.value)}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="settings-form-group">
                <label className="settings-form-label">Selecione a Data</label>
                <input
                  type="date"
                  className="settings-date-input"
                  value={editingRule.days || ''}
                  onChange={e => setEditingRule(p => ({ ...p, days: e.target.value }))}
                />
              </div>
            )}

            {/* Hours range selection */}
            <div className="settings-form-group">
              <label className="settings-form-label">Intervalo de Horário</label>
              <div className="settings-hours-row" style={{ marginTop: '4px' }}>
                <HourPicker
                  label="Início"
                  value={editingRule.start_hour}
                  onChange={v => setEditingRule(p => ({ ...p, start_hour: v }))}
                />
                <div className="settings-hours-sep" style={{ paddingBottom: '12px' }}>
                  <ArrowRight size={18} />
                </div>
                <HourPicker
                  label="Fim"
                  value={editingRule.end_hour}
                  onChange={v => setEditingRule(p => ({ ...p, end_hour: v }))}
                />
              </div>
            </div>

            {/* Multipliers steppers per category */}
            <div className="settings-form-group">
              <label className="settings-form-label" style={{ marginBottom: '8px' }}>
                Adicional por Categoria (+%)
              </label>
              <div className="settings-modal-multipliers-grid">
                {categories.length === 0 ? (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                    Carregando categorias de veículos...
                  </span>
                ) : (
                  categories.map(cat => {
                    const value = Math.round((editingRule.multipliers?.[cat] ?? 0.40) * 100);
                    return (
                      <PercentStepper
                        key={cat}
                        label={cat}
                        value={value}
                        onChange={val => {
                          setEditingRule(p => ({
                            ...p,
                            multipliers: {
                              ...(p.multipliers || {}),
                              [cat]: val / 100
                            }
                          }));
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* ────── Modal: Delete Confirmation ────── */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirmar Exclusão"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              style={{ background: 'var(--error)', borderColor: 'var(--error)', color: '#fff' }}
              onClick={handleConfirmDelete}
            >
              Excluir Regra
            </Button>
          </>
        }
      >
        {ruleToDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6' }}>
              Tem certeza que deseja excluir a regra de tarifa <strong>"{ruleToDelete.name}"</strong>?
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', lineHeight: '1.5' }}>
              Esta ação é permanente e não poderá ser desfeita. O aplicativo deixará de aplicar os multiplicadores vinculados a esta regra imediatamente.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
