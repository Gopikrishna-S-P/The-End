import { useState } from 'react';
import { ptpsApi } from '../api/ptpsApi';
import { useAuth } from '../AuthContext';
import type { CreatePtpRequest } from '../types';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export function PtpCreateModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();

  const [allocationId,  setAllocationId]  = useState('');
  const [loanNumber,    setLoanNumber]    = useState('');
  const [borrowerName,  setBorrowerName]  = useState('');
  const [promisedAmount, setPromisedAmount] = useState('');
  const [promisedDate,  setPromisedDate]  = useState(tomorrowIso());
  const [contactNotes,  setContactNotes]  = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const agentId   = user?.agentId || user?.id || '';
  const agentName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  const canSubmit = allocationId.trim() && loanNumber.trim() && borrowerName.trim() && promisedAmount && promisedDate;

  const handleSubmit = async () => {
    const amt = Number(promisedAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Promised amount must be a positive number.'); return;
    }
    setLoading(true); setError(null);
    try {
      const req: CreatePtpRequest = {
        allocationId: allocationId.trim(),
        agentId,
        agentName,
        loanNumber: loanNumber.trim(),
        borrowerName: borrowerName.trim(),
        promisedDate,
        promisedAmount: amt,
        contactNotes: contactNotes.trim() || undefined,
      };
      await ptpsApi.createPtp(req);
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create PTP.');
      setLoading(false);
    }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <span className="ds-modal-title">New PTP</span>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          <div className="ds-field">
            <span className="ds-label is-required">Loan number</span>
            <input
              type="text"
              value={loanNumber}
              onChange={(e) => setLoanNumber(e.target.value)}
              placeholder="e.g. LN-2024-001234"
              className="ds-input"
              autoFocus
            />
          </div>

          <div className="ds-field">
            <span className="ds-label is-required">Allocation ID</span>
            <input
              type="text"
              value={allocationId}
              onChange={(e) => setAllocationId(e.target.value)}
              placeholder="UUID — from the Allocations list"
              className="ds-input"
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
            />
          </div>

          <div className="ds-field">
            <span className="ds-label is-required">Borrower name</span>
            <input
              type="text"
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              placeholder="Full name"
              className="ds-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-field">
              <span className="ds-label is-required">Promised amount (₹)</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={promisedAmount}
                onChange={(e) => setPromisedAmount(e.target.value)}
                placeholder="0"
                className="ds-input"
              />
            </div>
            <div className="ds-field">
              <span className="ds-label is-required">Promised date</span>
              <input
                type="date"
                value={promisedDate}
                onChange={(e) => setPromisedDate(e.target.value)}
                min={tomorrowIso()}
                className="ds-input"
              />
            </div>
          </div>

          <div className="ds-field">
            <span className="ds-label">Notes</span>
            <textarea
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              rows={3}
              placeholder="What did the borrower commit to?"
              className="ds-textarea"
            />
          </div>

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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="ds-btn is-primary"
          >
            {loading ? <Loader2 size={14} className="ds-spin" /> : null}
            {loading ? 'Capturing…' : 'Capture PTP'}
          </button>
        </div>
      </div>
    </div>
  );
}
