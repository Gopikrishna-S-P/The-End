import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../client';
import { documentsApi } from '../api/documentsApi';
import type { CollectionResponse, ApprovalAction, CollectionDocumentResponse } from '../types';
import {
  CheckCircle2, XCircle, Loader2, AlertCircle, FileText, X,
} from 'lucide-react';
import { fmtINR, fmtDate, PaymentModePill } from './CollectionsHelpers';
import './Dashboard.css';

interface Props {
  collection: CollectionResponse;
  isOpen: boolean;
  initialAction?: ApprovalAction | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CollectionApprovalModal({ collection, isOpen, initialAction, onClose, onSuccess }: Props) {
  const [action,      setAction]      = useState<ApprovalAction | null>(initialAction ?? null);
  const [remarks,     setRemarks]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [docs,        setDocs]        = useState<CollectionDocumentResponse[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setAction(initialAction ?? null);
    setRemarks(''); setError(null); setDocs([]); setDocsLoading(true);
    documentsApi.getDocuments(collection.id)
      .then(r => setDocs(Array.isArray(r) ? r : []))
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false));
  }, [isOpen, collection.id, initialAction]);

  const canSubmit = action !== null && !(action === 'REJECT' && !remarks.trim());

  const openDoc = async (docId: string) => {
    setOpeningDocId(docId); setError(null);
    try {
      await documentsApi.openDocument(collection.id, docId);
    } catch {
      setError('Failed to open document.');
    } finally { setOpeningDocId(null); }
  };

  const handleSubmit = async () => {
    if (!action) { setError('Please select Approve or Reject.'); return; }
    if (action === 'REJECT' && !remarks.trim()) { setError('Rejection reason is required.'); return; }
    setLoading(true); setError(null);
    try {
      await apiClient.patch(`/api/v1/collections/${collection.id}/approval`, { action, remarks: remarks || undefined });
      onSuccess(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process approval');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div className="ds-modal-overlay" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
        <motion.div className="ds-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 480 }}
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
          
          <div className="ds-modal-header">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="ds-modal-title">Review collection</span>
              <span className="db-kpi2-foot-meta" style={{ marginTop: 4 }}>Approve or reject this submission</span>
            </div>
            <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close"><X size={16} /></button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span className="db-kpi2-foot-meta" style={{ display: 'block', marginBottom: 4 }}>Amount</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-primary)' }}>{fmtINR(collection.amount)}</span>
                </div>
                <div>
                  <span className="db-kpi2-foot-meta" style={{ display: 'block', marginBottom: 4 }}>Payment mode</span>
                  <span style={{ display: 'block' }}><PaymentModePill mode={collection.paymentMode} /></span>
                </div>
                <div>
                  <span className="db-kpi2-foot-meta" style={{ display: 'block', marginBottom: 4 }}>Collection date</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{fmtDate(collection.collectionDate)}</span>
                </div>
                {collection.notes && (
                  <div>
                    <span className="db-kpi2-foot-meta" style={{ display: 'block', marginBottom: 4 }}>Notes</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{collection.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {action !== 'REJECT' && (
              <div style={{ marginBottom: 20 }}>
                <span className="ds-label" style={{ display: 'block', marginBottom: 8 }}>Payment proof</span>
                {docsLoading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-tertiary)' }}>
                    <Loader2 size={12} className="ds-spin" /> Loading…
                  </span>
                ) : docs.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', fontStyle: 'italic', margin: 0 }}>No proof attached</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {docs.map((doc) => (
                      <button key={doc.id} type="button" onClick={() => openDoc(doc.id)} disabled={openingDocId === doc.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-solid)', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: 'fit-content' }}>
                        {openingDocId === doc.id ? <Loader2 size={13} className="ds-spin" /> : <FileText size={13} />}
                        {doc.fileName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)', fontSize: 12.5 }}>
                <AlertCircle size={14} /><span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <span className="ds-label" style={{ display: 'block', marginBottom: 8 }}>Decision</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setAction('APPROVE')}
                  className={`ds-btn ${action === 'APPROVE' ? 'is-primary' : 'is-secondary'}`}
                  style={{ flex: 1, height: 36 }}>
                  <CheckCircle2 size={14} style={{ marginRight: 6 }} /> Approve
                </button>
                <button type="button" onClick={() => setAction('REJECT')}
                  className={`ds-btn ${action === 'REJECT' ? 'is-primary' : 'is-secondary'}`}
                  style={action === 'REJECT' ? { flex: 1, height: 36, background: 'var(--danger)', border: 'none', color: '#fff' } : { flex: 1, height: 36 }}>
                  <XCircle size={14} style={{ marginRight: 6 }} /> Reject
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 0 }}>
              <span className="ds-label" style={{ display: 'block', marginBottom: 6 }}>
                Remarks {action === 'REJECT' && <span style={{ color: 'var(--danger)' }}> *</span>}
              </span>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
                className="ds-input" style={{ width: '100%', minHeight: 80, padding: '8px 12px', resize: 'vertical' }}
                placeholder={action === 'REJECT' ? 'Required — explain the reason for rejection' : 'Optional notes'} />
            </div>

            <div className="ds-modal-actions" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button type="button" onClick={onClose} className="ds-btn is-secondary" style={{ flex: 1, height: 36 }}>Cancel</button>
              <button type="button" onClick={handleSubmit} disabled={loading || !canSubmit}
                className={`ds-btn is-primary`} style={action === 'REJECT' ? { flex: 1, height: 36, background: 'var(--danger)', border: 'none', color: '#fff' } : { flex: 1, height: 36, background: 'var(--success)', border: 'none', color: '#fff' }}>
                {loading && <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} />}
                {!loading && action === 'APPROVE' && <CheckCircle2 size={14} style={{ marginRight: 6 }} />}
                {!loading && action === 'REJECT' && <XCircle size={14} style={{ marginRight: 6 }} />}
                {loading ? 'Processing…' : action === 'APPROVE' ? 'Approve collection' : action === 'REJECT' ? 'Reject collection' : 'Select an action'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
