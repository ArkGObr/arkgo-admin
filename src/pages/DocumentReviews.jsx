import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ExternalLink,
  FileSearch,
  FileText,
  Filter,
  Image,
  Play,
  RefreshCw,
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
          <span
            className="dr-select-dot"
            style={{ background: STATUS_META[value].color }}
          />
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
                {meta ? (
                  <span
                    className="dr-select-dot"
                    style={{ background: meta.color }}
                  />
                ) : (
                  <span className="dr-select-dot empty" />
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

/* ─── Document Detail Modal ────────────────────────────────── */
function ReviewModal({ row, onClose, onReanalyze, runningId }) {
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  const meta = STATUS_META[row.status] || STATUS_META.pending;
  const analysis = row.extracted_data;

  /* Busca os arquivos do bucket para este review */
  useEffect(() => {
    async function loadFiles() {
      setFilesLoading(true);
      setFilesError('');
      try {
        // Tenta buscar arquivos em pastas comuns: pelo user_id ou review id
        const paths = [
          row.user_id,
          row.id,
          `documents/${row.user_id}`,
          `documents/${row.id}`,
        ].filter(Boolean);

        let found = [];
        for (const prefix of paths) {
          const { data, error } = await supabase.storage
            .from('documents')
            .list(prefix, { limit: 50 });
          if (!error && data?.length) {
            // Gera URLs assinadas para cada arquivo
            const withUrls = await Promise.all(
              data
                .filter(f => f.name && !f.name.endsWith('/'))
                .map(async f => {
                  const fullPath = `${prefix}/${f.name}`;
                  const { data: urlData } = await supabase.storage
                    .from('documents')
                    .createSignedUrl(fullPath, 3600);
                  return {
                    ...f,
                    fullPath,
                    signedUrl: urlData?.signedUrl || null,
                    isImage: /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name),
                  };
                })
            );
            found = [...found, ...withUrls];
          }
        }
        setFiles(found);
      } catch (err) {
        setFilesError(err.message);
      } finally {
        setFilesLoading(false);
      }
    }
    loadFiles();
  }, [row.id, row.user_id]);

  const driverName = row.users?.name || row.subject_name || '—';
  const driverContact = row.users?.phone || row.users?.email || row.subject_document || '—';

  return (
    <div className="dr-modal-overlay" onClick={onClose}>
      <div className="dr-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dr-modal-header">
          <div className="dr-modal-header-info">
            <ReviewBadge status={row.status} />
            <div>
              <h2 className="dr-modal-name">{driverName}</h2>
              <span className="dr-modal-contact">{driverContact}</span>
            </div>
          </div>
          <div className="dr-modal-header-actions">
            <Button
              size="sm"
              variant={row.status === 'completed' ? 'ghost' : 'primary'}
              onClick={() => onReanalyze(row)}
              disabled={runningId === row.id || row.status === 'processing'}
              title="Analisar documento"
            >
              {runningId === row.id ? <RefreshCw size={14} /> : <Play size={14} />}
              {row.status === 'completed' ? 'Reanalisar' : 'Analisar'}
            </Button>
            <button className="dr-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="dr-modal-body">
          {/* Meta info */}
          <div className="dr-meta-grid">
            <div className="dr-meta-item">
              <span className="dr-meta-label">Tipo de documento</span>
              <span className="dr-meta-value">{row.document_type || '—'}</span>
            </div>
            <div className="dr-meta-item">
              <span className="dr-meta-label">Modelo IA</span>
              <span className="dr-meta-value">{row.gemini_model || 'gemini-2.5-flash-lite'}</span>
            </div>
            <div className="dr-meta-item">
              <span className="dr-meta-label">Chave</span>
              <span className="dr-meta-value">{row.gemini_key_index ? `chave ${row.gemini_key_index}` : '—'}</span>
            </div>
            <div className="dr-meta-item">
              <span className="dr-meta-label">Atualizado</span>
              <span className="dr-meta-value">{formatDateTime(row.updated_at || row.created_at)}</span>
            </div>
            {(analysis?.vehicle_plate || analysis?.vehicle_model) && (
              <div className="dr-meta-item">
                <span className="dr-meta-label">Veículo</span>
                <span className="dr-meta-value">
                  {[analysis.vehicle_plate, analysis.vehicle_model].filter(Boolean).join(' ')}
                </span>
              </div>
            )}
          </div>

          {/* AI Analysis */}
          {analysis && Object.keys(analysis).length > 0 && (
            <div className="dr-section">
              <div className="dr-section-title">
                <UserCheck size={14} />
                Dados Extraídos pela IA
              </div>
              <div className="dr-analysis-grid">
                {Object.entries(analysis).map(([key, val]) => (
                  <div key={key} className="dr-analysis-item">
                    <span className="dr-analysis-label">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="dr-analysis-value">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Raw result / error */}
          {row.ai_result && (
            <div className="dr-section">
              <div className="dr-section-title">
                <FileSearch size={14} />
                Resultado Completo da IA
              </div>
              <pre className="dr-raw-result">
                {typeof row.ai_result === 'string'
                  ? row.ai_result
                  : JSON.stringify(row.ai_result, null, 2)}
              </pre>
            </div>
          )}

          {row.error_message && (
            <div className="dr-error-box">
              <AlertCircle size={14} />
              <span>{row.error_message}</span>
            </div>
          )}

          {/* Bucket files */}
          <div className="dr-section">
            <div className="dr-section-title">
              <FileText size={14} />
              Documentos no Bucket
            </div>

            {filesLoading && (
              <div className="dr-files-loading">
                <div className="dr-files-spinner" />
                Carregando arquivos...
              </div>
            )}

            {!filesLoading && filesError && (
              <div className="dr-error-box">
                <AlertCircle size={14} />
                <span>Erro ao carregar arquivos: {filesError}</span>
              </div>
            )}

            {!filesLoading && !filesError && files.length === 0 && (
              <div className="dr-files-empty">
                Nenhum arquivo encontrado no bucket para este registro.
              </div>
            )}

            {!filesLoading && files.length > 0 && (
              <div className="dr-files-grid">
                {files.map(file => (
                  <div key={file.fullPath} className="dr-file-card">
                    <div
                      className="dr-file-preview"
                      onClick={() => file.isImage && setPreviewUrl(file.signedUrl)}
                      style={{ cursor: file.isImage ? 'zoom-in' : 'default' }}
                    >
                      {file.isImage ? (
                        <img src={file.signedUrl} alt={file.name} />
                      ) : (
                        <div className="dr-file-icon">
                          <FileText size={28} />
                        </div>
                      )}
                    </div>
                    <div className="dr-file-info">
                      <span className="dr-file-name" title={file.name}>{file.name}</span>
                      <span className="dr-file-size">
                        {file.metadata?.size
                          ? `${(file.metadata.size / 1024).toFixed(1)} KB`
                          : '—'}
                      </span>
                    </div>
                    {file.signedUrl && (
                      <a
                        className="dr-file-open"
                        href={file.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir arquivo"
                      >
                        <ExternalLink size={13} />
                        Abrir
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image lightbox */}
      {previewUrl && (
        <div
          className="dr-lightbox"
          onClick={e => { e.stopPropagation(); setPreviewUrl(null); }}
        >
          <img src={previewUrl} alt="preview" onClick={e => e.stopPropagation()} />
          <button className="dr-lightbox-close" onClick={() => setPreviewUrl(null)}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────── */
export default function DocumentReviews() {
  const [statusFilter, setStatusFilter] = useState('');
  const [runningId, setRunningId]       = useState('');
  const [actionError, setActionError]   = useState('');
  const [selectedRow, setSelectedRow]   = useState(null);

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
    total:      data.length,
    pending:    data.filter(r => r.status === 'pending').length,
    processing: data.filter(r => r.status === 'processing').length,
    completed:  data.filter(r => r.status === 'completed').length,
  }), [data]);

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
      label: 'Veículo',
      render: row =>
        row.extracted_data?.vehicle_plate || row.extracted_data?.vehicle_model
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
          onClick={event => { event.stopPropagation(); runReview(row); }}
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
          <h1 className="page-title">Análise de Documentos</h1>
          <p className="page-subtitle">Fila OCR com Gemini, status por documento e dados extraídos</p>
        </div>
      </div>

      <div className="stats-grid">
        <Stat label="Documentos" value={stats.total}><FileSearch size={18} /></Stat>
        <Stat label="Pendentes"  value={stats.pending}><Filter size={18} /></Stat>
        <Stat label="Em análise" value={stats.processing}><RefreshCw size={18} /></Stat>
        <Stat label="Analisados" value={stats.completed}><UserCheck size={18} /></Stat>
      </div>

      <div className="filters-row">
        <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
        <StatusSelect value={statusFilter} onChange={setStatusFilter} />
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
        onRowClick={row => setSelectedRow(row)}
        alwaysShowPagination
      />

      {selectedRow && (
        <ReviewModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onReanalyze={async row => { await runReview(row); setSelectedRow(null); }}
          runningId={runningId}
        />
      )}
    </div>
  );
}
