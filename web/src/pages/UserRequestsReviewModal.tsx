import { useState } from 'react';
import { userRequestsApi, type UserCreationRequest } from '../api/userRequestsApi';
import { RoleBadge } from './UserRequestsHelpers';
import { X, AlertCircle, XCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  request: UserCreationRequest;
  onClose: () => void;
  onDone: () => void;
}

export function UserRequestsReviewModal({ request, onClose, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [notes,   setNotes]   = useState('');
  const [error,   setError]   = useState<string | null>(null);

  const submit = async (approved: boolean) => {
    if (!approved && !notes.trim()) { setError('Please provide a reason for rejection.'); return; }
    setLoading(true); setError(null);
    try { await userRequestsApi.review(request.id, { approved, notes: notes.trim() || undefined }); onDone(); }
    catch (e: any) { setError(e?.response?.data?.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <div>
            <div className="ds-modal-title">Review request</div>
            <div className="ds-modal-sub">Approve or reject this account request</div>
          </div>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="ds-modal-body">
          <div className="ur-modal-section" style={{ padding: '6px 14px' }}>
            <div className="alloc-def-row">
              <span className="alloc-def-label">Name</span>
              <span className="alloc-def-value">{request.requestedFirstName} {request.requestedLastName}</span>
            </div>
            <div className="alloc-def-row">
              <span className="alloc-def-label">Email</span>
              <span className="alloc-def-value" style={{ fontFamily: 'var(--mono)' }}>{request.requestedEmail}</span>
            </div>
            <div className="alloc-def-row">
              <span className="alloc-def-label">Role</span>
              <span className="alloc-def-value"><RoleBadge role={request.requestedRole} /></span>
            </div>
            <div className="alloc-def-row">
              <span className="alloc-def-label">Requested by</span>
              <span className="alloc-def-value">{request.requestedByName}</span>
            </div>
          </div>
          <div className="ds-field">
            <label className="ds-label">Notes <span style={{ color: 'var(--ink-tertiary)', textTransform: 'none', letterSpacing: 0 }}>(required for rejection)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Optional notes…" className="ds-textarea" />
          </div>
          {error && <div className="ur-banner is-error" style={{ margin: 0 }}><AlertCircle size={14} /><span className="ur-banner-content">{error}</span></div>}
        </div>
        <div className="ds-modal-actions">
          <button type="button" onClick={() => submit(false)} disabled={loading} className="ds-btn is-danger is-sm">
            <XCircle size={14} /> Reject
          </button>
          <button type="button" onClick={() => submit(true)} disabled={loading} className="ds-btn is-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? <Loader2 size={14} className="ds-spin" /> : <CheckCircle2 size={14} />}Approve
          </button>
        </div>
      </div>
    </div>
  );
}
