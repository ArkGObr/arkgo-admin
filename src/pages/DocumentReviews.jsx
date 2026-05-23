import { useMemo, useState } from 'react';
import { FileSearch, Filter, Play, RefreshCw, UserCheck } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import { Select } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../hooks/useRealtime';
import { useSupabase } from '../hooks/useSupabase';
import { formatDateTime, formatRelative } from '../utils/formatDate';
import './OperationsPages.css';

const STATUS_META = {
  pending: { label: 'Pendente', color: 'var(--warning)', bg: 'rgba(255,184,0,0.1)', border: 'rgba(255,184,0,0.2)' },
  processing: { label: 'Analisando', color: 'var(--info)', bg: 'rgba(59,158,255,0.1)', border: 'rgba(59,158,255,0.2)' },
  completed: { label: 'Analisado', color: 'var(--success)', bg: 'rgba(153,235,9,0.1)', border: 'rgba(153,235,9,0.2)' },
  failed: { label: 'Falhou', color: 'var(--error)', bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.2)' },
};

function ReviewBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return <Badge label={meta.label} color={meta.color} bg={meta.bg} border={meta.border} />;
}

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

export default function DocumentReviews() {
  const [statusFilter, setStatusFilter] = useState('');
  const [runningId, setRunningId] = useState('');
  const [actionError, setActionError] = useState('');

  const filters = [];
  if (statusFilter) filters.push({ column: 'status', operator: 'eq', value: statusFilter });

  const { data, loading, error, refetch } = useSupabase('document_ai_reviews', {
    select: '*, users:user_id(name, email, phone, document)',
    filters,
    order: { column: 'created_at', ascending: false },
  });

  useRealtime('document_ai_reviews', {
    onInsert: () => refetch(),
    onUpdate: () => refetch(),
  });

  const stats = useMemo(() => ({
    total: data.length,
    pending: data.filter(row => row.status === 'pending').length,
    processing: data.filter(row => row.status === 'processing').length,
    completed: data.filter(row => row.status === 'completed').length,
  }), [data]);

  async function runReview(row) {
    setRunningId(row.id);
    setActionError('');

    const { error: invokeError } = await supabase.functions.invoke('analyze-document', {
      body: { reviewId: row.id },
    });

    if (invokeError) {
      setActionError(invokeError.message);
    }

    await refetch();
    setRunningId('');
  }

  const columns = [
    {
      key: 'status',
      label: 'Status',
      width: '145px',
      render: row => <ReviewBadge status={row.status} />,
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
      label: 'Veiculo',
      render: row => row.extracted_data?.vehicle_plate || row.extracted_data?.vehicle_model
        ? `${row.extracted_data?.vehicle_plate || ''} ${row.extracted_data?.vehicle_model || ''}`.trim()
        : '-',
      sortKey: row => row.extracted_data?.vehicle_plate || row.extracted_data?.vehicle_model,
    },
    {
      key: 'model',
      label: 'IA',
      render: row => (
        <div className="ops-date">
          <span>{row.gemini_model || 'gemini-2.5-flash-lite'}</span>
          <small>{row.gemini_key_index ? `chave ${row.gemini_key_index}` : 'aguardando'}</small>
        </div>
      ),
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
        <Button
          size="sm"
          variant={row.status === 'completed' ? 'ghost' : 'primary'}
          onClick={event => {
            event.stopPropagation();
            runReview(row);
          }}
          disabled={runningId === row.id || row.status === 'processing'}
          title="Analisar documento"
        >
          {runningId === row.id ? <RefreshCw size={14} /> : <Play size={14} />}
          {row.status === 'completed' ? 'Reanalisar' : 'Analisar'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analise de Documentos</h1>
          <p className="page-subtitle">Fila OCR com Gemini, status por documento e dados extraidos</p>
        </div>
      </div>

      <div className="stats-grid">
        <Stat label="Documentos" value={stats.total}><FileSearch size={18} /></Stat>
        <Stat label="Pendentes" value={stats.pending}><Filter size={18} /></Stat>
        <Stat label="Em analise" value={stats.processing}><RefreshCw size={18} /></Stat>
        <Stat label="Analisados" value={stats.completed}><UserCheck size={18} /></Stat>
      </div>

      <div className="filters-row">
        <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          placeholder="Todos os status"
          options={[
            { value: 'pending', label: 'Pendente' },
            { value: 'processing', label: 'Analisando' },
            { value: 'completed', label: 'Analisado' },
            { value: 'failed', label: 'Falhou' },
          ]}
          style={{ width: 190 }}
        />
        {(error || actionError) && <span className="ops-error">{error || actionError}</span>}
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKeys={['users.name', 'users.phone', 'users.email', 'subject_name', 'subject_document', 'document_type']}
        searchPlaceholder="Buscar por motorista, cliente, contato ou documento..."
        emptyMessage="Nenhum documento na fila"
      />
    </div>
  );
}
