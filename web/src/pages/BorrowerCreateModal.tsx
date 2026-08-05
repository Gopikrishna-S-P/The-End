import { useState } from 'react';
import { borrowersApi } from '../api/borrowersApi';
import { useAuth } from '../AuthContext';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function BorrowerCreateModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [ckycId, setCkycId]       = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [address, setAddress]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const canSubmit = firstName.trim().length > 0 && organizationId;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError(null);
    try {
      await borrowersApi.create({
        organizationId,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        ckycId: ckycId.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create borrower.');
      setLoading(false);
    }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <span className="ds-modal-title">New borrower</span>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-field">
              <span className="ds-label is-required">First name</span>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="Given name" className="ds-input" autoFocus />
            </div>
            <div className="ds-field">
              <span className="ds-label">Last name</span>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                placeholder="Surname" className="ds-input" />
            </div>
          </div>

          <div className="ds-field">
            <span className="ds-label">CKYC ID</span>
            <input type="text" value={ckycId} onChange={(e) => setCkycId(e.target.value)}
              placeholder="Central KYC registry ID" className="ds-input" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-field">
              <span className="ds-label">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" className="ds-input" />
            </div>
            <div className="ds-field">
              <span className="ds-label">Phone</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+91…" className="ds-input" />
            </div>
          </div>

          <div className="ds-field">
            <span className="ds-label">Address</span>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)}
              rows={2} placeholder="Registered address" className="ds-textarea" />
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
            {loading ? 'Creating…' : 'Create borrower'}
          </button>
        </div>
      </div>
    </div>
  );
}
