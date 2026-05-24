import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronDown,
  ExternalLink,
  FileSearch,
  FileText,
  Filter,
  Pencil,
  Play,
  RefreshCw,
  Save,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../hooks/useRealtime';
import { useSupabase } from '../hooks/useSupabase';
import { formatDateTime, formatRelative } from '../utils/formatDate';
import './OperationsPages.css';
import './DocumentReviews.css';

/* ─── Status meta ──────────────────────────────────────────── */
const STATUS_META = {
  pending:    { label: 'Pendente',   color: 'var(--warning)', bg: 'rgba(255,184,0,0.1)',    border: 'rgba(255,184,0,0.2)' },
  processing: { label: 'Analisando', color: 'var(--info)',    bg: 'rgba(59,158,255,0.1)',   border: 'rgba(59,158,255,0.2)' },
  completed:  { label: 'Analisado',  color: 'var(--success)', bg: 'rgba(153,235,9,0.1)',    border: 'rgba(153,235,9,0.2)' },
  failed:     { label: 'Falhou',     color: 'var(--error)',   bg: 'rgba(255,59,59,0.1)',    border: 'rgba(255,59,59,0.2)' },
};

const STATUS_OPTIONS = [
  { value: '',           label: 'Todos os status' },
  { value: 'pending',    label: 'Pendente' },
  { value: 'processing', label: 'Analisando' },
  { value: 'completed',  label: 'Analisado' },
  { value: 'failed',     label: 'Falhou' },
];

/* ─── ReviewBadge ──────────────────────────────────────────── */
function ReviewBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return <Badge label={meta.label} color={meta.color} bg={meta.bg} border={meta.border} />;
}

/* ─── Stat card ────────────────────────────────────────────── */
function Stat({ children, label, value, onClick }) {
  return (
    <Card 
      className={`ops-stat ${onClick ? 'clickable' : ''}`} 
      onClick={onClick}
      style={onClick ? { cursor: 'pointer', transition: 'all 0.2s ease-out' } : {}}
    >
      <div className="ops-stat-icon">{children}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </Card>
  );
}

/* ─── Custom Status Select ─────────────────────────────────── */
function StatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="dr-select" ref={ref}>
      <button
        type="button"
        className={`dr-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {value && STATUS_META[value] && (
          <span className="dr-select-dot" style={{ background: STATUS_META[value].color }} />
        )}
        <span>{selected.label}</span>
        <ChevronDown size={14} className={`dr-select-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="dr-select-dropdown">
          {STATUS_OPTIONS.map(opt => {
            const meta = STATUS_META[opt.value];
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`dr-select-option ${isActive ? 'active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {meta
                  ? <span className="dr-select-dot" style={{ background: meta.color }} />
                  : <span className="dr-select-dot empty" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Confirm Delete Dialog ────────────────────────────────── */
function ConfirmDelete({ onConfirm, onCancel, loading }) {
  return createPortal(
    <div className="dr-confirm-overlay" onClick={onCancel}>
      <div className="dr-confirm" onClick={e => e.stopPropagation()}>
        <div className="dr-confirm-icon">
          <Trash2 size={24} />
        </div>
        <h3 className="dr-confirm-title">Apagar registro?</h3>
        <p className="dr-confirm-desc">
          Esta ação é permanente e não pode ser desfeita. O registro será removido da fila de documentos.
        </p>
        <div className="dr-confirm-actions">
          <button className="dr-confirm-cancel" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button className="dr-confirm-delete" onClick={onConfirm} disabled={loading}>
            {loading ? <RefreshCw size={14} /> : <Trash2 size={14} />}
            {loading ? 'Apagando...' : 'Apagar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main page ────────────────────────────────────────────── */
export default function DocumentReviews() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [clientsModalOpen, setClientsModalOpen] = useState(false);
  const [runningId, setRunningId]       = useState('');
  const [actionError, setActionError]   = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  const filters = [];
  if (statusFilter) filters.push({ column: 'status', operator: 'eq', value: statusFilter });
  if (clientFilter) filters.push({ column: 'user_id', operator: 'eq', value: clientFilter });

  const { data, loading, error, refetch } = useSupabase('document_ai_reviews', {
    select: '*, users:user_id(name, email, phone, document, status, is_released)',
    filters,
    order: { column: 'created_at', ascending: false },
  });

  useRealtime('document_ai_reviews', {
    onInsert: () => refetch(),
    onUpdate: () => refetch(),
  });

  const stats = useMemo(() => ({
    total:      data.length,
    pending:    data.filter(r => r.status === 'pending').length,
    processing: data.filter(r => r.status === 'processing').length,
    completed:  data.filter(r => r.status === 'completed').length,
  }), [data]);

  const uniqueClients = useMemo(() => {
    const map = new Map();
    data.forEach(row => {
      if (row.users && row.user_id && !map.has(row.user_id)) {
        map.set(row.user_id, { ...row.users, documentId: row.id });
      }
    });
    return Array.from(map.entries()).map(([id, user]) => ({ id, ...user }));
  }, [data]);

  async function runReview(row) {
    setRunningId(row.id);
    setActionError('');
    const { error: invokeError } = await supabase.functions.invoke('analyze-document', {
      body: { reviewId: row.id },
    });
    if (invokeError) setActionError(invokeError.message);
    await refetch();
    setRunningId('');
  }

  async function deleteRow(id) {
    const { error: delError } = await supabase
      .from('document_ai_reviews')
      .delete()
      .eq('id', id);
    if (delError) throw new Error(delError.message);
    await refetch();
  }

  const columns = [
    {
      key: 'status',
      label: 'Status',
      width: '145px',
      render: row => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ReviewBadge status={row.status} />
          {row.users && (
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 600, 
              color: row.users.is_released ? 'var(--success)' : 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                background: row.users.is_released ? 'var(--success)' : 'var(--text-tertiary)' 
              }} />
              {row.users.is_released ? 'Acesso Liberado' : 'Acesso Bloqueado'}
            </span>
          )}
        </div>
      ),
      sortKey: row => row.status,
    },
    {
      key: 'driver',
      label: 'Motorista/Cliente',
      render: row => (
        <div className="ops-person">
          <strong>{row.users?.name || row.subject_name || '-'}</strong>
          <span>{row.users?.phone || row.users?.email || row.subject_document || '-'}</span>
        </div>
      ),
      sortKey: row => row.users?.name || row.subject_name,
    },
    {
      key: 'document_type',
      label: 'Documento',
      render: row => row.document_type || '-',
    },
    {
      key: 'vehicle',
      label: 'Veículo',
      render: row =>
        row.extracted_data?.vehicle_plate || row.extracted_data?.vehicle_model
          ? `${row.extracted_data?.vehicle_plate || ''} ${row.extracted_data?.vehicle_model || ''}`.trim()
          : '-',
      sortKey: row => row.extracted_data?.vehicle_plate || row.extracted_data?.vehicle_model,
    },
    {
      key: 'updated_at',
      label: 'Andamento',
      render: row => (
        <div className="ops-date">
          <span>{formatDateTime(row.updated_at || row.created_at)}</span>
          <small>{formatRelative(row.updated_at || row.created_at)}</small>
        </div>
      ),
      sortKey: row => row.updated_at || row.created_at,
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: row => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button
            size="sm"
            variant={row.status === 'completed' ? 'ghost' : 'primary'}
            onClick={event => { event.stopPropagation(); runReview(row); }}
            disabled={runningId === row.id || row.status === 'processing'}
            title="Analisar documento"
          >
            {runningId === row.id ? <RefreshCw size={14} /> : <Play size={14} />}
            {row.status === 'completed' ? 'Reanalisar' : 'Analisar'}
          </Button>
          <button
            className="ops-action-btn delete"
            title="Apagar"
            onClick={e => {
              e.stopPropagation();
              setDeleteTargetId(row.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Análise de Documentos</h1>
          <p className="page-subtitle">Fila OCR com Gemini, status por documento e dados extraídos</p>
        </div>
      </div>

      <div className="stats-grid">
        <Stat label="Documentos" value={stats.total} onClick={() => setClientsModalOpen(true)}><FileSearch size={18} /></Stat>
        <Stat label="Pendentes"  value={stats.pending} onClick={() => setStatusFilter('pending')}><Filter size={18} /></Stat>
        <Stat label="Em análise" value={stats.processing} onClick={() => setStatusFilter('processing')}><RefreshCw size={18} /></Stat>
        <Stat label="Analisados" value={stats.completed} onClick={() => setStatusFilter('completed')}><UserCheck size={18} /></Stat>
      </div>

      <div className="filters-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
        <StatusSelect value={statusFilter} onChange={setStatusFilter} />
        {clientFilter && (
          <Badge 
            label="Cliente Filtrado" 
            color="var(--primary)" 
            bg="var(--primary-glow)" 
            border="rgba(102, 235, 0, 0.4)" 
          />
        )}
        {(statusFilter || clientFilter) && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => { setStatusFilter(''); setClientFilter(''); }}
            style={{ marginLeft: 'auto' }}
          >
            <X size={14} /> Limpar Filtros
          </Button>
        )}
        {(error || actionError) && (
          <span className="ops-error">{error || actionError}</span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKeys={['users.name', 'users.phone', 'users.email', 'subject_name', 'subject_document', 'document_type']}
        searchPlaceholder="Buscar por motorista, cliente, contato ou documento..."
        emptyMessage="Nenhum documento na fila"
        onRowClick={row => navigate(`/documents/${row.id}`)}
        alwaysShowPagination
      />

      {clientsModalOpen && (
        <div className="dr-modal-overlay" onClick={() => setClientsModalOpen(false)}>
          <div className="dr-modal" style={{ width: 400, height: 'auto', maxHeight: '80vh', margin: 'auto', padding: 0 }} onClick={e => e.stopPropagation()}>
            <div className="dr-modal-header" style={{ borderBottom: '1px solid var(--surface-border)', flexShrink: 0 }}>
              <h3 className="dr-modal-name" style={{ margin: 0 }}>Clientes com Documentos</h3>
              <button className="dr-modal-close" onClick={() => setClientsModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="dr-modal-body" style={{ padding: 16, overflowY: 'auto', gap: 8, display: 'flex', flexDirection: 'column' }}>
              {uniqueClients.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>Nenhum cliente encontrado.</p>
              ) : (
                uniqueClients.map(client => (
                  <button
                    key={client.id}
                    style={{
                      padding: 12,
                      background: 'var(--surface-high)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 8,
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--surface-border)'}
                    onClick={() => {
                      setClientsModalOpen(false);
                      navigate(`/documents/${client.documentId}`);
                    }}
                  >
                    <strong style={{ fontSize: 14 }}>{client.name || 'Sem Nome'}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{client.email || client.phone || client.document || 'Sem Contato'}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <ConfirmDelete
          onConfirm={async () => {
            setDeleteLoading(true);
            try {
              await deleteRow(deleteTargetId);
              setDeleteTargetId(null);
            } catch (err) {
              setActionError(err.message || 'Erro ao excluir.');
            } finally {
              setDeleteLoading(false);
            }
          }}
          onCancel={() => setDeleteTargetId(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
