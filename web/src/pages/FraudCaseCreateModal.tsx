import { useState } from 'react';
import { fraudCasesApi } from '../api/fraudCasesApi';
import { useAuth } from '../AuthContext';
import type { FraudCategory } from '../types';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: Array<{ value: FraudCategory; label: string }> = [
  { value: 'CHEATING_AND_FORGERY', label: 'Cheating & forgery' },
  { value: 'MISAPPROPRIATION', label: 'Misappropriation' },
  { value: 'FRAUDULENT_ENCASHMENT', label: 'Fraudulent encashment' },
  { value: 'UNAUTHORISED_CREDIT_FACILITIES', label: 'Unauthorised credit facilities' },
  { value: 'DOCUMENTATION_FRAUD', label: 'Documentation fraud' },
  { value: 'CYBER_FRAUD', label: 'Cyber fraud' },
  { value: 'OTHER', label: 'Other' },
];

export function FraudCaseCreateModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const [category, setCategory]         = useState<FraudCategory>('CHEATING_AND_FORGERY');
  const [description, setDescription]   = useState('');
  const [amountInvolved, setAmount]     = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [allocationId, setAllocationId] = useState('');
  const [borrowerId, setBorrowerId]     = useState('');
  const [evidenceUrl, setEvidenceUrl]   = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const canSubmit = description.trim().length > 0 && organizationId;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError(null);
    try {
      await fraudCasesApi.create({
        organizationId,
        category,
        description: description.trim(),
        amountInvolved: amountInvolved ? Number(amountInvolved) : undefined,
        incidentDate: incidentDate || undefined,
        allocationId: allocationId.trim() || undefined,
        borrowerId: borrowerId.trim() || undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to file fraud case.');
      setLoading(false);
    }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <span className="ds-modal-title">Report a fraud case</span>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-field">
              <span className="ds-label is-required">Category</span>
              <select className="ds-select" value={category} onChange={(e) => setCategory(e.target.value as FraudCategory)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="ds-field">
              <span className="ds-label">Incident date</span>
              <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="ds-input" />
            </div>
          </div>

          <div className="ds-field">
            <span className="ds-label is-required">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="What happened, how it was discovered, who is involved" className="ds-textarea" autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-field">
              <span className="ds-label">Amount involved</span>
              <input type="number" min="0" step="0.01" value={amountInvolved} onChange={(e) => setAmount(e.target.value)}
                placeholder="₹" className="ds-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="ds-field">
              <span className="ds-label">Evidence URL</span>
              <input type="text" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="Link to document / recording" className="ds-input" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-field">
              <span className="ds-label">Loan ID (allocation)</span>
              <input type="text" value={allocationId} onChange={(e) => setAllocationId(e.target.value)}
                placeholder="UUID, if this concerns one loan" className="ds-input" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            </div>
            <div className="ds-field">
              <span className="ds-label">Borrower ID</span>
              <input type="text" value={borrowerId} onChange={(e) => setBorrowerId(e.target.value)}
                placeholder="UUID, if known" className="ds-input" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            </div>
          </div>

          {error && (
            <div className="ptp-modal-error" role="alert">
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}
        </div>

        <div className="ds-modal-actions">
          <button type="button" onClick={onClose} className="ds-btn is-secondary">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit || loading} className="ds-btn is-primary">
            {loading ? <Loader2 size={14} className="ds-spin" /> : null}
            {loading ? 'Filing…' : 'File case'}
          </button>
        </div>
      </div>
    </div>
  );
}
