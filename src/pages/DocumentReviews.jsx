import { useEffect, useMemo, useRef, useState } from 'react';
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
  return (
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
    </div>
  );
}

function ReviewModal({ row, onClose, onReanalyze, onDelete, onSaveExtracted, onToggleRelease, runningId }) {
  const [files, setFiles]               = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError]     = useState('');
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading]         = useState(false);

  /* Edit mode for extracted_data */
  const [editMode, setEditMode]   = useState(false);
  const [editData, setEditData]   = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError]   = useState('');

  const analysis = row.extracted_data;
  const driverName    = row.users?.name || row.subject_name || '—';
  const driverContact = row.users?.phone || row.users?.email || row.subject_document || '—';

  /* Load bucket files */
  useEffect(() => {
    async function loadFiles() {
      setFilesLoading(true);
      setFilesError('');
      try {
        let found = [];

        // 1. Carrega o documento principal associado diretamente na linha
        if (row.storage_bucket && row.file_path) {
          const { data: urlData, error: urlError } = await supabase.storage
            .from(row.storage_bucket)
            .createSignedUrl(row.file_path, 3600);
          
          if (!urlError && urlData?.signedUrl) {
            const fileName = row.file_path.split('/').pop() || 'documento';
            const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName) || 
                            (row.mime_type && row.mime_type.startsWith('image/'));
            
            const fileObj = {
              name: fileName,
              fullPath: row.file_path,
              signedUrl: urlData.signedUrl,
              isImage,
              isPrimary: true
            };
            found.push(fileObj);
            
            if (isImage) {
              setPreviewUrl(urlData.signedUrl);
            }
          }
        }

        // 2. Busca outros arquivos nos caminhos padrão (fallback)
        const paths = [
          row.user_id,
          row.id,
          `documents/${row.user_id}`,
          `documents/${row.id}`,
        ].filter(Boolean);

        for (const prefix of paths) {
          const { data, error } = await supabase.storage
            .from('documents')
            .list(prefix, { limit: 10 });
          if (!error && data?.length) {
            const withUrls = await Promise.all(
              data
                .filter(f => f.name && !f.name.endsWith('/'))
                .map(async f => {
                  const fullPath = `${prefix}/${f.name}`;
                  // Evita duplicar se já foi adicionado como principal
                  if (found.some(item => item.fullPath === fullPath)) return null;

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
            found = [...found, ...withUrls.filter(Boolean)];
          }
        }
        setFiles(found);
        
        // Se não tiver imagem de preview principal, mas tiver outra na lista, define ela
        if (found.length > 0 && !previewUrl) {
          const firstImg = found.find(f => f.isImage);
          if (firstImg) {
            setPreviewUrl(firstImg.signedUrl);
          }
        }
      } catch (err) {
        setFilesError(err.message);
      } finally {
        setFilesLoading(false);
      }
    }
    loadFiles();
  }, [row.id, row.user_id, row.storage_bucket, row.file_path]);

  function startEdit() {
    // Cria cópia rasa dos dados extraídos para edição
    const copy = {};
    if (analysis) {
      Object.entries(analysis).forEach(([k, v]) => {
        copy[k] = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      });
    }
    setEditData(copy);
    setEditMode(true);
    setSaveError('');
  }

  function cancelEdit() {
    setEditMode(false);
    setEditData({});
    setSaveError('');
  }

  async function handleSave() {
    setSaveLoading(true);
    setSaveError('');
    try {
      // Reconverte campos que parecem JSON de volta para objeto
      const parsed = {};
      Object.entries(editData).forEach(([k, v]) => {
        try { parsed[k] = JSON.parse(v); } catch { parsed[k] = v; }
      });
      await onSaveExtracted(row.id, parsed);
      setEditMode(false);
    } catch (err) {
      setSaveError(err.message || 'Erro ao salvar.');
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await onDelete(row.id);
      onClose();
    } catch {
      setDeleteLoading(false);
      setShowConfirmDelete(false);
    }
  }

  return (
    <div className="dr-modal-overlay" onClick={onClose}>
      <div className="dr-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="dr-modal-header">
          <div className="dr-modal-header-info">
            <ReviewBadge status={row.status} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 className="dr-modal-name" style={{ margin: 0 }}>{driverName}</h2>
                {row.users && (
                  <Badge
                    label={row.users?.is_released ? 'App Liberado' : 'Acesso Bloqueado'}
                    color={row.users?.is_released ? 'var(--success)' : 'var(--warning)'}
                    bg={row.users?.is_released ? 'rgba(153,235,9,0.1)' : 'rgba(255,184,0,0.1)'}
                    border={row.users?.is_released ? 'rgba(153,235,9,0.2)' : 'rgba(255,184,0,0.2)'}
                  />
                )}
              </div>
              <span className="dr-modal-contact">{driverContact}</span>
            </div>
          </div>
          <div className="dr-modal-header-actions">
            {row.users && (
              <Button
                size="sm"
                variant={row.users?.is_released ? 'ghost' : 'primary'}
                onClick={async () => {
                  try {
                    await onToggleRelease(row.user_id, row.users?.is_released);
                  } catch (err) {
                    setSaveError(err.message || 'Erro ao alterar liberação.');
                  }
                }}
                title={row.users?.is_released ? 'Bloquear acesso do motorista ao aplicativo' : 'Liberar acesso do motorista ao aplicativo'}
              >
                {row.users?.is_released ? 'Bloquear App' : 'Liberar App'}
              </Button>
            )}
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
            <button
              className="dr-modal-action-btn delete"
              onClick={() => setShowConfirmDelete(true)}
              title="Apagar registro"
            >
              <Trash2 size={15} />
            </button>
            <button className="dr-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Split container for side-by-side viewing */}
        <div className="dr-modal-split">
          {/* Left Column: Premium Document Image Viewer */}
          <div className="dr-modal-left">
            <div className="dr-document-viewer">
              {previewUrl ? (
                <div className="dr-viewer-container">
                  <img src={previewUrl} alt="Visualização do Documento" className="dr-viewer-img" />
                  <div className="dr-viewer-actions">
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="dr-viewer-btn">
                      <ExternalLink size={14} /> Abrir documento original
                    </a>
                  </div>
                </div>
              ) : (
                <div className="dr-viewer-empty">
                  {filesLoading ? (
                    <>
                      <div className="dr-files-spinner" />
                      <span>Carregando visualização do documento...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={48} />
                      <span>Nenhum documento disponível para visualização rápida</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Extracted Fields & Controls */}
          <div className="dr-modal-right">
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

            {/* AI Analysis — view or edit */}
            {analysis && Object.keys(analysis).length > 0 && (
              <div className="dr-section">
                <div className="dr-section-title">
                  <UserCheck size={14} />
                  Dados Extraídos pela IA
                  {!editMode ? (
                    <button className="dr-edit-btn" onClick={startEdit} title="Editar dados">
                      <Pencil size={12} />
                      Editar
                    </button>
                  ) : (
                    <div className="dr-edit-actions">
                      <button className="dr-edit-btn cancel" onClick={cancelEdit} disabled={saveLoading}>
                        Cancelar
                      </button>
                      <button className="dr-edit-btn save" onClick={handleSave} disabled={saveLoading}>
                        {saveLoading ? <RefreshCw size={12} /> : <Save size={12} />}
                        Salvar
                      </button>
                    </div>
                  )}
                </div>

                {saveError && (
                  <div className="dr-error-box" style={{ marginBottom: 8 }}>
                    <AlertCircle size={14} />
                    <span>{saveError}</span>
                  </div>
                )}

                {editMode ? (
                  <div className="dr-edit-grid">
                    {Object.entries(editData).map(([key]) => (
                      <div key={key} className="dr-edit-field">
                        <label className="dr-edit-label">{key.replace(/_/g, ' ')}</label>
                        <input
                          className="dr-edit-input"
                          value={editData[key]}
                          onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dr-analysis-grid">
                    {Object.entries(analysis).map(([key, val]) => (
                      <div key={key} className="dr-analysis-item">
                        <span className="dr-analysis-label">{key.replace(/_/g, ' ')}</span>
                        <span className="dr-analysis-value">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Raw result */}
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
                          <div className="dr-file-icon"><FileText size={28} /></div>
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
                        <a className="dr-file-open" href={file.signedUrl} target="_blank" rel="noreferrer">
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
      </div>

      {/* Image lightbox */}
      {previewUrl && (
        <div className="dr-lightbox" onClick={e => { e.stopPropagation(); setPreviewUrl(null); }}>
          <img src={previewUrl} alt="preview" onClick={e => e.stopPropagation()} />
          <button className="dr-lightbox-close" onClick={() => setPreviewUrl(null)}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Confirm delete */}
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

/* ─── Main page ────────────────────────────────────────────── */
export default function DocumentReviews() {
  const [statusFilter, setStatusFilter] = useState('');
  const [runningId, setRunningId]       = useState('');
  const [actionError, setActionError]   = useState('');
  const [selectedRow, setSelectedRow]   = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  const filters = [];
  if (statusFilter) filters.push({ column: 'status', operator: 'eq', value: statusFilter });

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

  async function saveExtracted(id, newData) {
    const { error: updError } = await supabase
      .from('document_ai_reviews')
      .update({ extracted_data: newData })
      .eq('id', id);
    if (updError) throw new Error(updError.message);
    await refetch();
    // Atualiza a linha selecionada para refletir os novos dados
    setSelectedRow(prev => prev ? { ...prev, extracted_data: newData } : null);
  }

  async function toggleRelease(user_id, currentReleased) {
    const newReleased = !currentReleased;
    const newStatus = newReleased ? 'active' : 'inactive';
    const { error: updErr } = await supabase
      .from('users')
      .update({ is_released: newReleased, status: newStatus })
      .eq('id', user_id);
    if (updErr) throw new Error(updErr.message);
    
    await refetch();
    
    // Atualiza o estado da linha selecionada localmente
    setSelectedRow(prev => {
      if (!prev) return null;
      return {
        ...prev,
        users: {
          ...prev.users,
          is_released: newReleased,
          status: newStatus,
        }
      };
    });
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
          onDelete={deleteRow}
          onSaveExtracted={saveExtracted}
          onToggleRelease={toggleRelease}
          runningId={runningId}
        />
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
