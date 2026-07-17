import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../client';
import { Upload, X, Loader2, CloudUpload, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import './Dashboard.css';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  targetOrgId?: string;
}

export function UploadsModal({ onClose, onSuccess, targetOrgId }: Props) {
  const [file,      setFile]      = useState<File | null>(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) { setError('Only CSV and Excel files are accepted.'); return; }
    setError(null); setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true); setProgress(0); setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const url = targetOrgId ? `/api/v1/file-uploads?organizationId=${targetOrgId}` : '/api/v1/file-uploads';
      await apiClient.post(url, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => { if (e.total) setProgress(Math.round((e.loaded * 100) / e.total)); },
      });
      onSuccess(); onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  return (
    <AnimatePresence>
      <motion.div className="ds-modal-overlay" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
        <motion.div className="ds-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 480 }}
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
          
          <div className="ds-modal-header">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="ds-modal-title">Upload file</span>
              <span className="db-kpi2-foot-meta" style={{ marginTop: 4 }}>CSV · XLSX · XLS</span>
            </div>
            <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close" disabled={uploading}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--ink-solid)' : file ? 'var(--success)' : 'var(--border-strong)'}`,
                background: dragging ? 'var(--bg-subtle)' : file ? 'var(--success-subtle)' : 'transparent',
                borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center'
              }}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
            >
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              {file ? (
                <>
                  <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: 12 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4 }}>{file.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginBottom: 16 }}>{(file.size / 1024).toFixed(1)} KB</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} disabled={uploading}
                    className="db-error-retry" style={{ background: 'var(--bg-surface)' }}>
                    <X size={12} style={{ marginRight: 6 }} /> Remove
                  </button>
                </>
              ) : (
                <>
                  <CloudUpload size={36} style={{ color: 'var(--ink-tertiary)', marginBottom: 16 }} />
                  <span style={{ fontSize: 14, color: 'var(--ink-primary)', marginBottom: 8 }}>Drop your file here or <strong style={{ textDecoration: 'underline' }}>browse</strong></span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className="ds-pill is-neutral" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>CSV</span>
                    <span className="ds-pill is-neutral" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>XLSX</span>
                    <span className="ds-pill is-neutral" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>XLS</span>
                  </div>
                </>
              )}
            </div>

            {uploading && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 8 }}>
                  <span>Uploading…</span><span>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--ink-solid)', transition: 'width 0.2s ease-out' }} />
                </div>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)', fontSize: 12.5 }}>
                <AlertCircle size={14} /><span>{error}</span>
              </div>
            )}

            <div className="ds-modal-actions" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button type="button" onClick={onClose} disabled={uploading} className="ds-btn is-secondary" style={{ flex: 1, height: 36 }}>Cancel</button>
              <button type="button" onClick={handleSubmit} disabled={!file || uploading} className="ds-btn is-primary" style={{ flex: 1, height: 36 }}>
                {uploading ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <Upload size={14} style={{ marginRight: 6 }} />}
                {uploading ? 'Uploading…' : 'Upload file'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function UploadStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { variant: string; icon: React.ReactNode }> = {
    COMPLETED:           { variant: 'is-success', icon: <CheckCircle2 size={11} /> },
    PARTIALLY_COMPLETED: { variant: 'is-warn',    icon: <AlertCircle size={11} /> },
    FAILED:              { variant: 'is-danger',  icon: <AlertCircle size={11} /> },
    PROCESSING:          { variant: 'is-info',    icon: <Loader2 size={11} className="ds-spin" /> },
    PENDING:             { variant: 'is-neutral', icon: <Clock size={11} /> },
  };
  const { variant, icon } = cfg[status] ?? cfg.PENDING;
  return <span className={`ds-pill ${variant}`} style={{ gap: 4 }}>{icon}{status.replace('_', ' ')}</span>;
}

