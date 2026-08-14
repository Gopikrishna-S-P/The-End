import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { visitsApi } from '../api/visitsApi';
import type { VisitLogResponse } from '../types';
import { ThumbsUp, ThumbsDown, Loader2, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { fmtDate } from '../pages/VisitDrawerHelpers';
import '../pages/Dashboard.css';

interface Props {
  visit: VisitLogResponse;
  action: 'APPROVE' | 'REJECT';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VisitApprovalModal({ visit, action, isOpen, onClose, onSuccess }: Props) {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  if (!isOpen) return null;

  const isApprove = action === 'APPROVE';

  const handleSubmit = async () => {
    if (!isApprove && !remarks.trim()) {
      setError('Rejection remarks are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await visitsApi.approveVisit(visit.id, { action, remarks: remarks.trim() || undefined });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${action.toLowerCase()} visit.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="ds-modal-overlay" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
        <motion.div className="ds-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 460 }}
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
          
          <div className="ds-modal-header" style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isApprove ? 'var(--accent-subtle, #e8f5e9)' : 'var(--danger-subtle, #ffebee)',
                color: isApprove ? 'var(--success, #2e7d32)' : 'var(--danger, #c62828)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {isApprove ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
              </div>
              <div>
                <h3 className="ds-modal-title" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-primary)', margin: 0 }}>
                  {isApprove ? 'Approve Visit Log' : 'Reject Visit Log'}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', margin: '2px 0 0' }}>
                  {visit.borrowerName || 'Customer'} · {fmtDate(visit.visitDate)}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="ds-modal-body" style={{ padding: '20px 24px' }}>
            {error && (
              <div className="vis-drawer-error" style={{ marginBottom: 16 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-tertiary)' }}>Field Officer:</span>
                <span style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{visit.agentName || 'Unassigned'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-tertiary)' }}>Outcome:</span>
                <span style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{visit.disp || 'N/A'}</span>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
              {isApprove ? 'Remarks (optional)' : 'Rejection Reason (required)'}
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder={isApprove ? 'Add optional approval notes...' : 'Specify why this visit is rejected...'}
              className="ds-textarea"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div className="ds-modal-actions" style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--border-subtle)', gap: 12 }}>
            <button type="button" onClick={onClose} disabled={loading} className="ds-btn is-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || (!isApprove && !remarks.trim())}
              className={`ds-btn ${isApprove ? 'is-primary' : 'is-danger'}`}
              style={{ flex: 1 }}
            >
              {loading ? (
                <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} />
              ) : isApprove ? (
                <CheckCircle2 size={14} style={{ marginRight: 6 }} />
              ) : (
                <ThumbsDown size={14} style={{ marginRight: 6 }} />
              )}
              {loading ? 'Processing...' : isApprove ? 'Confirm Approve' : 'Confirm Reject'}
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
