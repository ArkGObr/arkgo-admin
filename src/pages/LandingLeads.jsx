import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Filter, Mail, Phone, Users, X, Trash2, Pencil, Save, RefreshCw } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import { hasLandingSupabaseConfig, landingSupabase } from '../lib/landingSupabase';
import { formatDateTime, formatRelative } from '../utils/formatDate';
import './OperationsPages.css';
import './LandingLeads.css';

/* ─── Status Metadata ───────────────────────────────────── */
const INTEREST_META = {
  fila:        { label: 'Fila',        color: 'var(--warning)', bg: 'rgba(255,184,0,0.1)',  border: 'rgba(255,184,0,0.2)' },
  duvida:      { label: 'Dúvida',      color: 'var(--info)',    bg: 'rgba(59,158,255,0.1)', border: 'rgba(59,158,255,0.2)' },
  parceria:    { label: 'Parceria',    color: 'var(--success)', bg: 'rgba(153,235,9,0.1)',  border: 'rgba(153,235,9,0.2)' },
  conversado:  { label: 'Conversado',  color: '#a78bfa',        bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  atendido:    { label: 'Atendido',    color: '#10b981',        bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)' },
};

const INTEREST_OPTIONS = [
  { value: '',           label: 'Todos os motivos/status' },
  { value: 'fila',       label: 'Fila' },
  { value: 'duvida',     label: 'Dúvida' },
  { value: 'parceria',   label: 'Parceria' },
  { value: 'conversado', label: 'Conversado' },
  { value: 'atendido',   label: 'Atendido' },
];

const ATENDIMENTO_OPTIONS = [
  { value: '',           label: 'Todos os atendimentos' },
  { value: 'pendente',   label: 'Não Atendido (Pendente)', color: 'var(--warning)' },
  { value: 'conversado', label: 'Conversado', color: '#a78bfa' },
  { value: 'atendido',   label: 'Atendido', color: '#10b981' },
];

/* ─── Filter Custom Selects ────────────────────────────── */
function InterestSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = INTEREST_OPTIONS.find(o => o.value === value) || INTEREST_OPTIONS[0];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="ll-select" ref={ref}>
      <button
        type="button"
        className={`ll-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {value && INTEREST_META[value] && (
          <span className="ll-select-dot" style={{ background: INTEREST_META[value].color }} />
        )}
        <span>{selected.label}</span>
        <ChevronDown size={14} className={`ll-select-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="ll-select-dropdown">
          {INTEREST_OPTIONS.map(opt => {
            const meta = INTEREST_META[opt.value];
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`ll-select-option ${isActive ? 'active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {meta
                  ? <span className="ll-select-dot" style={{ background: meta.color }} />
                  : <span className="ll-select-dot empty" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AtendimentoSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = ATENDIMENTO_OPTIONS.find(o => o.value === value) || ATENDIMENTO_OPTIONS[0];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="ll-select" ref={ref}>
      <button
        type="button"
        className={`ll-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {selected.color && (
          <span className="ll-select-dot" style={{ background: selected.color }} />
        )}
        {!selected.color && selected.value === '' && (
          <span className="ll-select-dot empty" />
        )}
        <span>{selected.label}</span>
        <ChevronDown size={14} className={`ll-select-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="ll-select-dropdown">
          {ATENDIMENTO_OPTIONS.map(opt => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`ll-select-option ${isActive ? 'active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {opt.color ? (
                  <span className="ll-select-dot" style={{ background: opt.color }} />
                ) : (
                  <span className="ll-select-dot empty" />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Modal Status Select ──────────────────────────────── */
function ModalStatusSelect({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  const options = INTEREST_OPTIONS.filter(o => o.value !== '');
  const selected = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="ll-modal-status-select-container" ref={ref}>
      <span className="ll-meta-label">Status / Motivo</span>
      <div className="ll-modal-status-select-wrapper">
        <button
          type="button"
          className={`ll-modal-status-select-trigger ${open ? 'open' : ''}`}
          onClick={() => !disabled && setOpen(o => !o)}
          disabled={disabled}
        >
          {INTEREST_META[value] && (
            <span className="ll-select-dot" style={{ background: INTEREST_META[value].color }} />
          )}
          <span className="ll-modal-status-label">{selected.label}</span>
          <ChevronDown size={14} className={`ll-select-chevron ${open ? 'rotated' : ''}`} />
        </button>

        {open && (
          <div className="ll-modal-status-dropdown">
            {options.map(opt => {
              const meta = INTEREST_META[opt.value];
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`ll-modal-status-option ${isActive ? 'active' : ''}`}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                >
                  <span className="ll-select-dot" style={{ background: meta.color }} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Confirm Delete Dialog ────────────────────────────── */
function ConfirmDelete({ onConfirm, onCancel, loading }) {
  return (
    <div className="ll-confirm-overlay" onClick={onCancel}>
      <div className="ll-confirm" onClick={e => e.stopPropagation()}>
        <div className="ll-confirm-icon">
          <Trash2 size={24} />
        </div>
        <h3 className="ll-confirm-title">Excluir lead?</h3>
        <p className="ll-confirm-desc">
          Esta ação é permanente e não pode ser desfeita. O lead será removido da base de dados.
        </p>
        <div className="ll-confirm-actions">
          <button className="ll-confirm-cancel" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button className="ll-confirm-delete" onClick={onConfirm} disabled={loading}>
            {loading ? <RefreshCw size={14} className="ops-spinner" /> : <Trash2 size={14} />}
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Lead Detail Modal (slide-in) ──────────────────────── */
function LeadModal({ row, onClose, onUpdateStatus, onUpdateData, onDelete }) {
  const [currentInterest, setCurrentInterest] = useState(row.interest);
  const [editMode, setEditMode]               = useState(false);
  const [editFields, setEditFields]           = useState({
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    city: row.city || '',
    message: row.message || '',
  });
  const [saveLoading, setSaveLoading]         = useState(false);
  const [statusLoading, setStatusLoading]     = useState(false);
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError]                     = useState('');

  useEffect(() => {
    setCurrentInterest(row.interest);
    setEditFields({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      city: row.city || '',
      message: row.message || '',
    });
  }, [row]);

  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    setError('');
    try {
      await onUpdateStatus(row.id, newStatus);
      setCurrentInterest(newStatus);
    } catch (err) {
      setError(err.message || 'Erro ao atualizar status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setError('');
    try {
      await onUpdateData(row.id, editFields);
      setEditMode(false);
    } catch (err) {
      setError(err.message || 'Erro ao salvar dados.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError('');
    try {
      await onDelete(row.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao excluir.');
      setDeleteLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const meta = INTEREST_META[currentInterest] || INTEREST_META.fila;

  return (
    <div className="ll-modal-overlay" onClick={onClose}>
      <div className="ll-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ll-modal-header">
          <div className="ll-modal-header-info">
            <Badge label={meta.label} color={meta.color} bg={meta.bg} border={meta.border} />
            <div>
              <h2 className="ll-modal-name">{row.name || '—'}</h2>
              <span className="ll-modal-sub">{row.city || '—'}</span>
            </div>
          </div>
          <div className="ll-modal-header-actions">
            {!editMode ? (
              <button
                className="ll-modal-action-btn edit"
                onClick={() => setEditMode(true)}
                title="Editar Informações"
              >
                <Pencil size={15} />
              </button>
            ) : (
              <div className="ll-modal-edit-actions">
                <button className="ll-edit-btn cancel" onClick={() => { setEditMode(false); setError(''); }} disabled={saveLoading}>
                  Cancelar
                </button>
                <button className="ll-edit-btn save" onClick={handleSave} disabled={saveLoading}>
                  {saveLoading ? <RefreshCw size={12} className="ops-spinner" /> : <Save size={12} />}
                  Salvar
                </button>
              </div>
            )}
            <button
              className="ll-modal-action-btn delete"
              onClick={() => setShowConfirmDelete(true)}
              title="Excluir Lead"
            >
              <Trash2 size={15} />
            </button>
            <button className="ll-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="ll-modal-body">
          {error && (
            <div className="ops-error" style={{ margin: '0 0 16px 0', padding: '12px', background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}

          {/* Status Edit */}
          <div className="ll-section">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <ModalStatusSelect value={currentInterest} onChange={handleStatusChange} disabled={statusLoading} />
              {statusLoading && <RefreshCw size={14} className="ops-spinner" style={{ color: 'var(--primary)', marginTop: 20 }} />}
            </div>
          </div>

          {/* Fields */}
          {editMode ? (
            <div className="ll-edit-fields-container">
              <div className="ll-edit-field">
                <label className="ll-meta-label">Nome</label>
                <input
                  type="text"
                  className="ll-edit-input"
                  value={editFields.name}
                  onChange={e => setEditFields(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="ll-edit-field">
                <label className="ll-meta-label">Email</label>
                <input
                  type="email"
                  className="ll-edit-input"
                  value={editFields.email}
                  onChange={e => setEditFields(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="ll-edit-field">
                <label className="ll-meta-label">Telefone</label>
                <input
                  type="text"
                  className="ll-edit-input"
                  value={editFields.phone}
                  onChange={e => setEditFields(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="ll-edit-field">
                <label className="ll-meta-label">Cidade</label>
                <input
                  type="text"
                  className="ll-edit-input"
                  value={editFields.city}
                  onChange={e => setEditFields(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="ll-edit-field full-width">
                <label className="ll-meta-label">Mensagem</label>
                <textarea
                  className="ll-edit-textarea"
                  value={editFields.message}
                  onChange={e => setEditFields(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Meta grid */}
              <div className="ll-meta-grid">
                <div className="ll-meta-item">
                  <span className="ll-meta-label">Email</span>
                  <a className="ll-meta-link" href={`mailto:${row.email}`}>{row.email || '—'}</a>
                </div>
                <div className="ll-meta-item">
                  <span className="ll-meta-label">Telefone</span>
                  {row.phone
                    ? <a className="ll-meta-link" href={`tel:${row.phone}`}>{row.phone}</a>
                    : <span className="ll-meta-value">—</span>}
                </div>
                <div className="ll-meta-item">
                  <span className="ll-meta-label">Cidade</span>
                  <span className="ll-meta-value">{row.city || '—'}</span>
                </div>
                <div className="ll-meta-item">
                  <span className="ll-meta-label">Entrada</span>
                  <span className="ll-meta-value">{formatDateTime(row.created_at)}</span>
                </div>
                <div className="ll-meta-item">
                  <span className="ll-meta-label">Há quanto tempo</span>
                  <span className="ll-meta-value">{formatRelative(row.created_at)}</span>
                </div>
              </div>

              {/* Message */}
              {row.message && (
                <div className="ll-section">
                  <div className="ll-section-title">Mensagem</div>
                  <div className="ll-message-box">{row.message}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showConfirmDelete && (
        <ConfirmDelete
          onConfirm={handleDelete}
          onCancel={() => setShowConfirmDelete(false)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

/* ─── Stat card ────────────────────────────────────────── */
function Stat({ children, label, value }) {
  return (
    <Card className="ops-stat">
      <div className="ops-stat-icon">{children}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </Card>
  );
}

/* ─── Main page ────────────────────────────────────────── */
export default function LandingLeads() {
  const [data, setData]                     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [atendimentoFilter, setAtendimentoFilter] = useState('');
  const [selectedRow, setSelectedRow]       = useState(null);
  const [leadToDelete, setLeadToDelete]     = useState(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  useEffect(() => {
    let alive = true;

    async function fetchLeads() {
      if (!hasLandingSupabaseConfig) {
        setError('Credenciais da landing não encontradas no .env.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const { data: rows, error: queryError } = await landingSupabase
        .from('arkgo_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!alive) return;

      if (queryError) {
        setError(queryError.message);
        setData([]);
      } else {
        setData(rows || []);
      }

      setLoading(false);
    }

    fetchLeads();
    return () => { alive = false; };
  }, []);

  /* Filter items based on both filters */
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // Interest filter (Motivo)
      const matchesInterest = !interestFilter || row.interest === interestFilter;
      
      // Atendimento filter
      let matchesAtendimento = true;
      if (atendimentoFilter) {
        if (atendimentoFilter === 'pendente') {
          matchesAtendimento = ['fila', 'duvida', 'parceria'].includes(row.interest);
        } else {
          matchesAtendimento = row.interest === atendimentoFilter;
        }
      }
      
      return matchesInterest && matchesAtendimento;
    });
  }, [data, interestFilter, atendimentoFilter]);

  const stats = useMemo(() => {
    const total = data.length;
    const atendidos = data.filter(r => r.interest === 'atendido').length;
    const conversando = data.filter(r => r.interest === 'conversado').length;
    const pendentes = total - atendidos - conversando;
    return {
      total,
      pendentes,
      atendidos,
    };
  }, [data]);

  /* Database Operations */
  const handleUpdateLeadStatus = async (id, newStatus) => {
    const { error: updateError } = await landingSupabase
      .from('arkgo_leads')
      .update({ interest: newStatus })
      .eq('id', id);

    if (updateError) throw updateError;

    setData(prev => prev.map(item => item.id === id ? { ...item, interest: newStatus } : item));
    if (selectedRow && selectedRow.id === id) {
      setSelectedRow(prev => ({ ...prev, interest: newStatus }));
    }
  };

  const handleUpdateLeadData = async (id, updatedFields) => {
    const { error: updateError } = await landingSupabase
      .from('arkgo_leads')
      .update(updatedFields)
      .eq('id', id);

    if (updateError) throw updateError;

    setData(prev => prev.map(item => item.id === id ? { ...item, ...updatedFields } : item));
    if (selectedRow && selectedRow.id === id) {
      setSelectedRow(prev => ({ ...prev, ...updatedFields }));
    }
  };

  const handleDeleteLead = async (id) => {
    const { error: deleteError } = await landingSupabase
      .from('arkgo_leads')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    setData(prev => prev.filter(item => item.id !== id));
    if (selectedRow && selectedRow.id === id) {
      setSelectedRow(null);
    }
  };

  const handleTableDeleteConfirm = async () => {
    if (!leadToDelete) return;
    setDeleteLoading(true);
    try {
      await handleDeleteLead(leadToDelete.id);
      setLeadToDelete(null);
    } catch (err) {
      setError(err.message || 'Erro ao excluir lead.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Nome',
      className: 'text-primary',
      sortKey: row => row.name,
    },
    {
      key: 'contact',
      label: 'Contato',
      render: row => (
        <div className="ops-contact">
          <span><Mail size={13} />{row.email}</span>
          {row.phone && <span><Phone size={13} />{row.phone}</span>}
        </div>
      ),
      sortKey: row => row.email,
    },
    {
      key: 'city',
      label: 'Cidade',
      render: row => row.city || '-',
    },
    {
      key: 'interest',
      label: 'Motivo',
      render: row => {
        const meta = INTEREST_META[row.interest] || INTEREST_META.fila;
        return <Badge label={meta.label} color={meta.color} bg={meta.bg} border={meta.border} />;
      },
      sortKey: row => row.interest,
    },
    {
      key: 'atendimento',
      label: 'Atendimento',
      render: row => {
        if (row.interest === 'atendido') {
          return <Badge label="Atendido" color="#10b981" bg="rgba(16,185,129,0.1)" border="rgba(16,185,129,0.2)" />;
        }
        if (row.interest === 'conversado') {
          return <Badge label="Conversado" color="#a78bfa" bg="rgba(167,139,250,0.1)" border="rgba(167,139,250,0.2)" />;
        }
        return <Badge label="Não Atendido" color="var(--warning)" bg="rgba(255,184,0,0.1)" border="rgba(255,184,0,0.2)" />;
      },
      sortKey: row => {
        if (row.interest === 'atendido') return 2;
        if (row.interest === 'conversado') return 1;
        return 0;
      }
    },
    {
      key: 'message',
      label: 'Mensagem',
      render: row => (
        <span className="ops-ellipsis">{row.message || '-'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Entrada',
      render: row => (
        <div className="ops-date">
          <span>{formatDateTime(row.created_at)}</span>
          <small>{formatRelative(row.created_at)}</small>
        </div>
      ),
      sortKey: row => row.created_at,
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      render: row => (
        <button
          className="ops-action-btn delete"
          onClick={e => {
            e.stopPropagation();
            setLeadToDelete(row);
          }}
          title="Excluir lead"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fila da Landing</h1>
          <p className="page-subtitle">Leads interessados, dúvidas e parcerias vindos da landing page</p>
        </div>
      </div>

      <div className="stats-grid">
        <Stat label="Total de leads" value={stats.total}><Users size={18} /></Stat>
        <Stat label="Não Atendidos"  value={stats.pendentes}><Filter size={18} /></Stat>
        <Stat label="Atendidos"      value={stats.atendidos}><Phone size={18} /></Stat>
      </div>

      <div className="filters-row">
        <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
        <div className="ll-filters-group">
          <div className="ll-filter-wrapper">
            <span className="ll-filter-label">Filtrar por Motivo</span>
            <InterestSelect value={interestFilter} onChange={setInterestFilter} />
          </div>
          <div className="ll-filter-wrapper">
            <span className="ll-filter-label">Filtrar por Atendimento</span>
            <AtendimentoSelect value={atendimentoFilter} onChange={setAtendimentoFilter} />
          </div>
        </div>
        {error && <span className="ops-error">{error}</span>}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        searchKeys={['name', 'email', 'phone', 'city', 'message']}
        searchPlaceholder="Buscar por nome, email, telefone ou cidade..."
        emptyMessage="Nenhum lead encontrado"
        onRowClick={row => setSelectedRow(row)}
        alwaysShowPagination
      />

      {selectedRow && (
        <LeadModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onUpdateStatus={handleUpdateLeadStatus}
          onUpdateData={handleUpdateLeadData}
          onDelete={handleDeleteLead}
        />
      )}

      {leadToDelete && (
        <ConfirmDelete
          onConfirm={handleTableDeleteConfirm}
          onCancel={() => setLeadToDelete(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
