import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { FileText, Plus, Trash2, Loader2, AlertCircle, X, Upload } from 'lucide-react';
import { ragApi } from '../api/ragApi';
import type { RagDocumentResponse, RagSourceType, RagStatus } from '../api/ragApi';
import '../styles/AppPage.css';
import './Dashboard.css';

const SOURCE_TYPES: RagSourceType[] = ['POLICY', 'SCRIPT', 'FAQ', 'PROCEDURE', 'OTHER'];

const STATUS_VARIANT: Record<RagStatus, string> = {
  PENDING:    'is-neutral',
  PROCESSING: 'is-warn',
  ACTIVE:     'is-success',
  FAILED:     'is-danger',
};

// ── Motion variants ────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

// ── Ripple hook ────────────────────────────────────────────────────────────────

function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const fire = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const span = document.createElement('span');
    span.className = 'db-ripple';
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }, []);
  return { ref, fire };
}

export default function RagDocumentsPage() {
  const [docs, setDocs]             = useState<RagDocumentResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle]           = useState('');
  const [sourceType, setSourceType] = useState<RagSourceType>('POLICY');
  const [content, setContent]       = useState('');
  const [uploading, setUploading]   = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const page = await ragApi.list(0, 100);
      setDocs(page.content || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load documents.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setUploading(true); setError(null);
    try {
      await ragApi.upload({ title: title.trim(), sourceType, content });
      setTitle(''); setContent(''); setSourceType('POLICY'); setShowUpload(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to upload document.');
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This removes it from Lucien's retrieval corpus.`)) return;
    setDeletingId(id);
    try {
      await ragApi.delete(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete document.');
    } finally { setDeletingId(null); }
  };

  return (
    <div className="db-root">
      <AnimatePresence>
        {error && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">{error}</span>
            </div>
            <button className="db-error-retry" onClick={() => setError(null)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">
          <AnimatePresence>
            {showUpload && (
              <motion.form variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="ds-card db-card" onSubmit={handleUpload} style={{ marginBottom: 24, padding: '24px 32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div className="ds-field" style={{ flex: 2, minWidth: 280, marginBottom: 0 }}>
                      <label className="ds-label is-required" htmlFor="rag-title" style={{ marginBottom: 6, display: 'block' }}>Title</label>
                      <input id="rag-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. RBI Fair Practices Code §3.2" className="ds-input" maxLength={500} required
                        style={{ width: '100%', height: 36, fontSize: 13 }} />
                    </div>
                    <div className="ds-field" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
                      <label className="ds-label is-required" htmlFor="rag-source" style={{ marginBottom: 6, display: 'block' }}>Source type</label>
                      <select id="rag-source" value={sourceType}
                        onChange={(e) => setSourceType(e.target.value as RagSourceType)}
                        className="ds-select" style={{ width: '100%', height: 36, fontSize: 13 }}>
                        {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="ds-field" style={{ marginBottom: 0 }}>
                    <label className="ds-label is-required" htmlFor="rag-content" style={{ marginBottom: 6, display: 'block' }}>Content</label>
                    <textarea id="rag-content" value={content} onChange={(e) => setContent(e.target.value)}
                      placeholder="Paste or type the document body. Up to ~500,000 characters."
                      rows={12} className="ds-textarea" required
                      style={{ width: '100%', resize: 'vertical', padding: '12px 16px', fontSize: 13, lineHeight: 1.5 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                    <button type="submit" className="ds-btn is-primary"
                      disabled={uploading || !title.trim() || !content.trim()} style={{ height: 36 }}>
                      {uploading ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <Upload size={14} style={{ marginRight: 6 }} />}
                      Queue for ingestion
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="db-att-chip" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-solid)' }}>
                  <FileText size={16} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 className="db-card-title">RAG Corpus</h2>
                    {!loading && docs.length > 0 && (
                      <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                        / {docs.length} documents indexed
                      </span>
                    )}
                  </div>
                  <span className="db-kpi2-foot-meta">Policies, scripts and FAQs that Lucien retrieves from</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => { setShowUpload(!showUpload); setError(null); }}
                  className={`ds-btn ${showUpload ? 'is-secondary' : 'is-primary'}`}
                >
                  {showUpload ? <X size={14} /> : <Plus size={14} />}
                  {showUpload ? 'Cancel' : 'New document'}
                </button>
              </div>
            </header>

            <div className="ds-table-wrap" style={{ border: 'none' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Title</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>Chunks</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>Added</th>
                    <th className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.08, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: '70%', display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 22, width: 64, borderRadius: 999, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 22, width: 64, borderRadius: 999, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 24, marginLeft: 'auto', display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 64, marginLeft: 'auto', display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 24, width: 24, borderRadius: 6, marginLeft: 'auto', display: 'block' }} /></td>
                      </tr>
                    ))
                  ) : docs.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                          <FileText size={32} className="ds-empty-icon" />
                          <span className="ds-empty-title">No documents yet</span>
                          <span className="ds-empty-sub">Upload one to start building Lucien's corpus.</span>
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {docs.map((d, idx) => (
                        <motion.tr
                          key={d.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.28, delay: idx * 0.02 }}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          <td style={{ padding: '12px 16px', paddingLeft: 24, fontWeight: 500, color: 'var(--ink-primary)' }}>
                            {d.title}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className={`ds-pill ${STATUS_VARIANT[d.status]}`}>
                              {d.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className="ds-pill is-info">{d.sourceType}</span>
                          </td>
                          <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)' }}>
                            {d.chunkCount.toLocaleString()}
                          </td>
                          <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)' }}>
                            {new Date(d.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>
                            <button
                              type="button"
                              className="ds-btn is-secondary"
                              style={{ color: 'var(--danger)', width: 32, height: 32, padding: 0 }}
                              onClick={() => handleDelete(d.id, d.title)}
                              disabled={deletingId === d.id}
                              aria-label="Delete document"
                              title="Delete"
                            >
                              {deletingId === d.id ? <Loader2 size={14} className="ds-spin" /> : <Trash2 size={14} />}
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}

