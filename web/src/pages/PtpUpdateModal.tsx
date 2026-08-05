import { useState } from 'react';
import { apiClient } from '../client';
import type { PtpResponse, PtpStatus, UpdatePtpStatusRequest } from '../types';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { fmtINR, fmtDate } from './PtpDetailHelpers';

const ALLOWED_TRANSITIONS: PtpStatus[] = ['FULFILLED', 'PARTIALLY_FULFILLED', 'BROKEN', 'CANCELLED'];

interface Props {
  ptp: PtpResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export function PtpUpdateModal({ ptp, onClose, onSuccess }: Props) {
  const [newStatus, setNewStatus]             = useState<PtpStatus>(ptp.status);
  const [collectedAmount, setCollectedAmount] = useState('');
  const [reason, setReason]                   = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const handleSubmit = async () => {
    if ((newStatus === 'BROKEN' || newStatus === 'CANCELLED') && !reason.trim()) {
      setError('Reason is required.'); return;
    }
    setLoading(true); setError(null);
    try {
      const req: UpdatePtpStatusRequest = {
        newStatus,
        collectedAmount: collectedAmount ? parseFloat(collectedAmount) : undefined,
        reason: reason.trim() || undefined,
      };
      await apiClient.patch(`/api/v1/ptps/${ptp.id}/status`, req);
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update status.');
      setLoading(false);
    }
  };

  const reasonRequired = (newStatus === 'BROKEN' || newStatus === 'CANCELLED');
  const submitDisabled = loading || (reasonRequired && !reason.trim());

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <span className="ds-modal-title">Update PTP status</span>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          <div className="ptp-modal-summary">
            <div className="alloc-def-row">
              <span className="alloc-def-label">Borrower</span>
              <span className="alloc-def-value">{ptp.borrowerName}</span>
            </div>
            <div className="alloc-def-row">
              <span className="alloc-def-label">Promised amount</span>
              <span className="alloc-def-value ptp-mono-bold">{fmtINR(ptp.promisedAmount)}</span>
            </div>
            <div className="alloc-def-row">
              <span className="alloc-def-label">Promised date</span>
              <span className="alloc-def-value">{fmtDate(ptp.promisedDate)}</span>
            </div>
          </div>

          <div className="ds-field">
            <span className="ds-label">New status</span>
            <div className="ptp-modal-status-grid">
              {ALLOWED_TRANSITIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewStatus(s)}
                  className={`ds-btn ${newStatus === s ? 'is-primary' : 'is-secondary'}`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {(newStatus === 'FULFILLED' || newStatus === 'PARTIALLY_FULFILLED') && (
            <div className="ds-field">
              <span className="ds-label">Amount collected (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={collectedAmount}
                onChange={(e) => setCollectedAmount(e.target.value)}
                placeholder="Enter collected amount"
                className="ds-input"
              />
            </div>
          )}

          {reasonRequired && (
            <div className="ds-field">
              <span className="ds-label is-required">Reason</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why…"
                className="ds-textarea"
              />
            </div>
          )}

          {error && (
            <div className="ptp-modal-error" role="alert">
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}
        </div>

        <div className="ds-modal-actions">
          <button type="button" onClick={onClose} className="ds-btn is-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitDisabled} className="ds-btn is-primary">
            {loading ? <Loader2 size={14} className="ds-spin" /> : null}
            {loading ? 'Updating…' : 'Update status'}
          </button>
        </div>
      </div>
    </div>
  );
}
