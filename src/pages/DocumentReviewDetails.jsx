import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  FileSearch,
  FileText,
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
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../utils/formatDate';
import { validateCPF, validateCNH, validatePlate } from '../utils/validators';
import './DocumentReviews.css';
import './DocumentReviewDetails.css';

const STATUS_META = {
  pending:    { label: 'Pendente',   color: 'var(--warning)', bg: 'rgba(255,184,0,0.1)',    border: 'rgba(255,184,0,0.2)' },
  processing: { label: 'Analisando', color: 'var(--info)',    bg: 'rgba(59,158,255,0.1)',   border: 'rgba(59,158,255,0.2)' },
  completed:  { label: 'Analisado',  color: 'var(--success)', bg: 'rgba(153,235,9,0.1)',    border: 'rgba(153,235,9,0.2)' },
  failed:     { label: 'Falhou',     color: 'var(--error)',   bg: 'rgba(255,59,59,0.1)',    border: 'rgba(255,59,59,0.2)' },
};

function ReviewBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return <Badge label={meta.label} color={meta.color} bg={meta.bg} border={meta.border} />;
}

function renderFieldWarning(key, val) {
  if (!val) return null;
  
  if (key === 'document_number') {
    const clean = String(val).replace(/[^\d]/g, '');
    if (clean.length === 11 && !validateCPF(val)) {
      return (
        <span className="field-validation-error" style={{ color: 'var(--error)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 500 }}>
          <AlertCircle size={12} /> CPF matematicamente inválido
        </span>
      );
    }
  }
  
  if (key === 'cnh_number' && !validateCNH(val)) {
    return (
      <span className="field-validation-error" style={{ color: 'var(--error)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 500 }}>
        <AlertCircle size={12} /> CNH matematicamente inválida
      </span>
    );
  }
  
  if (key === 'vehicle_plate' && !validatePlate(val)) {
    return (
      <span className="field-validation-error" style={{ color: 'var(--warning)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 500 }}>
        <AlertCircle size={12} /> Placa com formato inválido
      </span>
    );
  }
  
  return null;
}

export default function DocumentReviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [files, setFiles]               = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError]     = useState('');
  const [previewData, setPreviewData]   = useState(null);
  const [lightboxData, setLightboxData] = useState(null);

  const [editMode, setEditMode]   = useState(false);
  const [editData, setEditData]   = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [runningId, setRunningId]   = useState('');

  // Fetch record
  async function fetchRecord() {
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await supabase
      .from('document_ai_reviews')
      .select('*, users:user_id(name, email, phone, document, status, is_released)')
      .eq('id', id)
      .single();
    
    if (error) {
      setErrorMsg(error.message);
    } else {
      setRow(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRecord();
  }, [id]);

  // Load bucket files — listagem recursiva que entra em subpastas
  useEffect(() => {
    if (!row) return;

    async function loadFiles() {
      setFilesLoading(true);
      setFilesError('');
      try {
        let found = [];

        // Classifica arquivo por nome e metadata
        function classify(name, metadata) {
          const mime = metadata?.mimetype || metadata?.contentType || '';
          const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name) || mime.startsWith('image/');
          const isPdf   = /\.pdf$/i.test(name) || mime === 'application/pdf';
          // sem mime conhecida → trata como imagem (selfie, vehicle-document, etc.)
          const looksLikeMedia = !isImage && !isPdf;
          return { isImage: isImage || looksLikeMedia, isPdf };
        }

        // Listagem recursiva: desce em pastas automaticamente
        async function listRecursive(bucket, prefix, depth = 0) {
          if (depth > 3) return;
          const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 50 });
          if (error || !data) return;

          const realFiles  = data.filter(f => f.name && f.id);   // id presente → arquivo
          const subFolders = data.filter(f => f.name && !f.id);  // id ausente  → pasta

          await Promise.all(realFiles.map(async f => {
            const fullPath = `${prefix}/${f.name}`;
            if (found.some(x => x.fullPath === fullPath)) return;

            const { isImage, isPdf } = classify(f.name, f.metadata);

            const { data: urlData } = await supabase.storage
              .from(bucket)
              .createSignedUrl(fullPath, 3600, { download: false });

            if (!urlData?.signedUrl) return;

            found.push({
              ...f,
              fullPath,
              bucket,
              folder: prefix.split('/').pop(), // nome da pasta pai (ex: selfie, vehicle-document)
              signedUrl: urlData.signedUrl,
              isImage,
              isPdf,
            });
          }));

          // Desce nas subpastas
          for (const folder of subFolders) {
            await listRecursive(bucket, `${prefix}/${folder.name}`, depth + 1);
          }
        }

        // 1. Se o registro tem um file_path direto, inclui ele
        if (row.storage_bucket && row.file_path) {
          const { data: urlData, error: urlError } = await supabase.storage
            .from(row.storage_bucket)
            .createSignedUrl(row.file_path, 3600, { download: false });
          if (!urlError && urlData?.signedUrl) {
            const fileName = row.file_path.split('/').pop() || 'documento';
            const { isImage, isPdf } = classify(fileName, { mimetype: row.mime_type });
            if (!found.some(x => x.fullPath === row.file_path)) {
              found.push({ name: fileName, fullPath: row.file_path, signedUrl: urlData.signedUrl, isImage, isPdf, isPrimary: true });
            }
          }
        }

        // 2. Varre driver-documents/{user_id} recursivamente
        if (row.user_id) {
          const buckets = ['driver-documents', row.storage_bucket].filter(Boolean);
          for (const bucket of [...new Set(buckets)]) {
            await listRecursive(bucket, row.user_id);
          }
        }

        setFiles(found);
        if (found.length > 0 && !previewData) {
          const first = found.find(f => f.isImage || f.isPdf);
          if (first) setPreviewData({ url: first.signedUrl, type: first.isPdf ? 'pdf' : 'image' });
        }
      } catch (err) {
        setFilesError(err.message);
      } finally {
        setFilesLoading(false);
      }
    }
    loadFiles();
  }, [row?.id, row?.user_id, row?.storage_bucket, row?.file_path]);

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Carregando documento...</div>;
  if (errorMsg) return <div className="ops-error" style={{ padding: 40 }}>Erro: {errorMsg}</div>;
  if (!row) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Documento não encontrado.</div>;

  const analysis = row.extracted_data;
  const driverName    = row.users?.name || row.subject_name || '—';
  const driverContact = row.users?.phone || row.users?.email || row.subject_document || '—';

  function startEdit() {
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
      const parsed = {};
      Object.entries(editData).forEach(([k, v]) => {
        try { parsed[k] = JSON.parse(v); } catch { parsed[k] = v; }
      });
      
      // Validações antes de salvar
      const validationAlerts = [];
      if (parsed.document_number) {
        const clean = String(parsed.document_number).replace(/[^\d]/g, '');
        if (clean.length === 11 && !validateCPF(parsed.document_number)) {
          validationAlerts.push("• O CPF inserido é matematicamente inválido.");
        }
      }
      if (parsed.cnh_number && !validateCNH(parsed.cnh_number)) {
        validationAlerts.push("• O número de CNH inserido é matematicamente inválido.");
      }
      if (parsed.vehicle_plate && !validatePlate(parsed.vehicle_plate)) {
        validationAlerts.push("• O formato da Placa inserida é inválido.");
      }
      
      if (validationAlerts.length > 0) {
        const confirmSave = window.confirm(
          `Aviso de Validação:\n\n${validationAlerts.join('\n')}\n\nDeseja salvar mesmo assim?`
        );
        if (!confirmSave) {
          setSaveLoading(false);
          return;
        }
      }

      const { error: updError } = await supabase
        .from('document_ai_reviews')
        .update({ extracted_data: parsed })
        .eq('id', row.id);
      if (updError) throw new Error(updError.message);
      
      setRow(prev => ({ ...prev, extracted_data: parsed }));
      setEditMode(false);
    } catch (err) {
      setSaveError(err.message || 'Erro ao salvar.');
    } finally {
      setSaveLoading(false);
    }
  }

  async function onReanalyze() {
    setRunningId(row.id);
    setSaveError('');
    const { error: invokeError } = await supabase.functions.invoke('analyze-document', {
      body: { reviewId: row.id },
    });
    if (invokeError) setSaveError(invokeError.message);
    await fetchRecord();
    setRunningId('');
  }

  async function onToggleRelease() {
    const newReleased = !row.users?.is_released;
    const newStatus = newReleased ? 'active' : 'inactive';
    const { error: updErr } = await supabase
      .from('users')
      .update({ is_released: newReleased, status: newStatus })
      .eq('id', row.user_id);
    if (updErr) {
      setSaveError(updErr.message);
      return;
    }
    setRow(prev => ({
      ...prev,
      users: { ...prev.users, is_released: newReleased, status: newStatus }
    }));
  }

  async function onDeleteClick() {
    if (!window.confirm("Apagar permanentemente este registro?")) return;
    const { error: delError } = await supabase.from('document_ai_reviews').delete().eq('id', row.id);
    if (delError) {
      setSaveError(delError.message);
      return;
    }
    navigate('/documents');
  }

  return (
    <div className="drd-container">
      {/* Header */}
      <div className="drd-header">
        <div className="drd-header-left">
          <button className="drd-back-btn" onClick={() => navigate('/documents')} title="Voltar">
            <ArrowLeft size={18} />
          </button>
          <div className="drd-header-info">
            <ReviewBadge status={row.status} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 className="drd-name" style={{ margin: 0 }}>{driverName}</h2>
                {row.users && (
                  <Badge
                    label={row.users?.is_released ? 'App Liberado' : 'Acesso Bloqueado'}
                    color={row.users?.is_released ? 'var(--success)' : 'var(--warning)'}
                    bg={row.users?.is_released ? 'rgba(153,235,9,0.1)' : 'rgba(255,184,0,0.1)'}
                    border={row.users?.is_released ? 'rgba(153,235,9,0.2)' : 'rgba(255,184,0,0.2)'}
                  />
                )}
              </div>
              <span className="drd-contact">{driverContact}</span>
            </div>
          </div>
        </div>
        <div className="drd-header-actions">
          {row.users && (
            <Button
              size="sm"
              variant={row.users?.is_released ? 'ghost' : 'primary'}
              onClick={onToggleRelease}
              title={row.users?.is_released ? 'Bloquear acesso' : 'Liberar acesso'}
            >
              {row.users?.is_released ? 'Bloquear App' : 'Liberar App'}
            </Button>
          )}
          <Button
            size="sm"
            variant={row.status === 'completed' ? 'ghost' : 'primary'}
            onClick={onReanalyze}
            disabled={runningId === row.id || row.status === 'processing'}
          >
            {runningId === row.id ? <RefreshCw size={14} /> : <Play size={14} />}
            {row.status === 'completed' ? 'Reanalisar' : 'Analisar'}
          </Button>
          <button className="dr-modal-action-btn delete" onClick={onDeleteClick} title="Apagar">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="drd-content">
        {/* Left Column: Image Viewer */}
        <div className="drd-left">
          <div className="drd-viewer">
            {previewData ? (
              <div className="drd-viewer-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {previewData.type === 'pdf' ? (
                  <iframe src={previewData.url} title="PDF Document" className="drd-viewer-pdf" style={{ width: '100%', flex: 1, border: 'none', minHeight: 400 }} />
                ) : (
                  <img 
                    src={previewData.url} 
                    alt="Visualização do Documento" 
                    className="drd-viewer-img" 
                    onClick={() => setLightboxData(previewData)}
                    style={{ cursor: 'zoom-in' }}
                    onError={e => {
                      // Se a imagem falhar, renderiza via iframe como PDF viewer
                      e.currentTarget.style.display = 'none';
                      const iframe = document.createElement('iframe');
                      iframe.src = previewData.url;
                      iframe.style.cssText = 'width:100%;flex:1;border:none;min-height:400px';
                      e.currentTarget.parentNode.insertBefore(iframe, e.currentTarget);
                    }}
                  />
                )}
                <div className="drd-viewer-actions" style={{ gap: '10px' }}>
                  <button className="drd-viewer-btn" onClick={() => setLightboxData(previewData)} style={{ cursor: 'pointer' }}>
                    <ExternalLink size={14} /> Ampliar Tela Cheia
                  </button>
                  <a href={previewData.url} target="_blank" rel="noreferrer" className="drd-viewer-btn">
                    <ExternalLink size={14} /> Abrir Nova Guia
                  </a>
                </div>
              </div>
            ) : (
              <div className="drd-viewer-empty">
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

        {/* Right Column: Data */}
        <div className="drd-right">
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
                {!editMode ? (
                  <button className="dr-edit-btn" onClick={startEdit} title="Editar dados">
                    <Pencil size={12} /> Editar
                  </button>
                ) : (
                  <div className="dr-edit-actions">
                    <button className="dr-edit-btn cancel" onClick={cancelEdit} disabled={saveLoading}>Cancelar</button>
                    <button className="dr-edit-btn save" onClick={handleSave} disabled={saveLoading}>
                      {saveLoading ? <RefreshCw size={12} /> : <Save size={12} />} Salvar
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
                  {Object.entries(analysis).map(([key, val]) => {
                    const isCpfInvalid = key === 'document_number' && val && String(val).replace(/[^\d]/g, '').length === 11 && !validateCPF(val);
                    const isCnhInvalid = key === 'cnh_number' && val && !validateCNH(val);
                    const isPlateInvalid = key === 'vehicle_plate' && val && !validatePlate(val);
                    const hasError = isCpfInvalid || isCnhInvalid || isPlateInvalid;
                    
                    return (
                      <div 
                        key={key} 
                        className={`dr-analysis-item${hasError ? ' dr-analysis-item--invalid' : ''}`}
                        style={hasError ? { 
                          borderLeft: `3px solid ${isPlateInvalid ? 'var(--warning)' : 'var(--error)'}`, 
                          paddingLeft: '10px',
                          background: isPlateInvalid ? 'rgba(255, 184, 0, 0.03)' : 'rgba(255, 59, 59, 0.03)'
                        } : undefined}
                      >
                        <span className="dr-analysis-label">{key.replace(/_/g, ' ')}</span>
                        <span className="dr-analysis-value" style={hasError ? { color: isPlateInvalid ? 'var(--warning)' : 'var(--error)', fontWeight: 600 } : undefined}>
                          {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                        </span>
                        {renderFieldWarning(key, val)}
                      </div>
                    );
                  })}
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
                {typeof row.ai_result === 'string' ? row.ai_result : JSON.stringify(row.ai_result, null, 2)}
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
                <div className="dr-files-spinner" /> Carregando arquivos...
              </div>
            )}
            {!filesLoading && filesError && (
              <div className="dr-error-box">
                <AlertCircle size={14} /> <span>Erro ao carregar arquivos: {filesError}</span>
              </div>
            )}
            {!filesLoading && !filesError && files.length === 0 && (
              <div className="dr-files-empty">Nenhum arquivo encontrado no bucket para este registro.</div>
            )}
            {!filesLoading && files.length > 0 && (
              <div className="dr-files-grid">
                {files.map(file => {
                  const viewType = file.isPdf ? 'pdf' : 'image';
                  const isActive = previewData?.url === file.signedUrl;
                  return (
                    <button
                      key={file.fullPath}
                      className={`drd-doc-card${isActive ? ' drd-doc-card--active' : ''}`}
                      onClick={() => setPreviewData({ url: file.signedUrl, type: viewType })}
                      title={file.name}
                    >
                      <div className="drd-doc-card-thumb">
                        {file.isImage ? (
                          <img
                            src={file.signedUrl}
                            alt={file.name}
                            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div className="drd-doc-card-icon" style={{ display: file.isImage ? 'none' : 'flex' }}>
                          <FileText size={28} />
                          <span className="drd-doc-card-tag">{file.isPdf ? 'PDF' : 'FILE'}</span>
                        </div>
                      </div>
                      <div className="drd-doc-card-label">
                        <span className="drd-doc-card-name" title={file.name}>{file.name}</span>
                        {file.metadata?.size && (
                          <span className="drd-doc-card-size">{(file.metadata.size / 1024).toFixed(1)} KB</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox for full screen preview inside page */}
      {lightboxData && (
        <div className="dr-lightbox" onClick={() => setLightboxData(null)}>
          {lightboxData.type === 'pdf' ? (
            <iframe 
              src={lightboxData.url} 
              title="PDF Preview" 
              onClick={e => e.stopPropagation()} 
              style={{ width: '85%', height: '92%', border: 'none', background: 'white', borderRadius: '8px' }} 
            />
          ) : (
            <img 
              src={lightboxData.url} 
              alt="preview" 
              onClick={e => e.stopPropagation()}
              onError={e => {
                // fallback: troca por iframe se a img falhar
                const iframe = document.createElement('iframe');
                iframe.src = lightboxData.url;
                iframe.style.cssText = 'width:85%;height:92%;border:none;background:white;border-radius:8px';
                e.currentTarget.parentNode.replaceChild(iframe, e.currentTarget);
              }}
            />
          )}
          <button className="dr-lightbox-close" onClick={() => setLightboxData(null)}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
