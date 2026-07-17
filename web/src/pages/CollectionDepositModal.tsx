import { useState, useEffect } from 'react';
import { apiClient } from '../client';
import type { CollectionResponse } from '../types';
import { Banknote, Loader2, X } from 'lucide-react';
import { fmtINR } from './CollectionsHelpers';

interface Props {
  collection: CollectionResponse;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CollectionDepositModal({ collection, isOpen, onClose, onSuccess }: Props) {
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (isOpen) setNotes(''); }, [isOpen]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiClient.patch(`/api/v1/collections/${collection.id}/deposit`, { notes });
      onSuccess(); onClose();
    } catch {
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <span className="ds-modal-title">Mark as deposited</span>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="ds-modal-body">
          <p style={{ fontSize: 13.5, marginBottom: 12 }}>
            Confirm deposit of{' '}
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-primary)' }}>
              {fmtINR(collection.amount)}
            </span>
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="ds-textarea"
            placeholder="Deposit notes (optional)"
          />
        </div>
        <div className="ds-modal-actions">
          <button type="button" onClick={onClose} className="ds-btn is-secondary">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="ds-btn is-primary">
            {loading ? <Loader2 size={14} className="ds-spin" /> : <Banknote size={14} />}
            Confirm deposit
          </button>
        </div>
      </div>
    </div>
  );
}
