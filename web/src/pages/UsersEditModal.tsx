import { useState } from 'react';
import { usersApi } from '../api/usersApi';
import type { UserResponse } from '../types';
import { SquarePen, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  user: UserResponse;
  onClose: () => void;
  onSaved: () => void;
}

export function UsersEditModal({ user, onClose, onSaved }: Props) {
  const [firstName,  setFirstName]  = useState(user.firstName ?? '');
  const [lastName,   setLastName]   = useState(user.lastName  ?? '');
  const [email,      setEmail]      = useState(user.email     ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const submit = async () => {
    if (!firstName.trim()) { setError('First name is required'); return; }
    if (!email.trim())     { setError('Email is required'); return; }
    setSubmitting(true); setError(null);
    try {
      await usersApi.updateUser(user.id, {
        firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(),
      });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update user');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal users-modal-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <div>
            <div className="ds-modal-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <SquarePen size={14} style={{ color: 'var(--ink-secondary)' }} />Edit user
            </div>
            <div className="ds-modal-sub">{user.email}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="ds-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="ds-field">
              <label className="ds-label">First name<span style={{ color: 'var(--error)', marginLeft: 2 }}>*</span></label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className="ds-input" placeholder="First name" />
            </div>
            <div className="ds-field">
              <label className="ds-label">Last name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className="ds-input" placeholder="Last name" />
            </div>
          </div>
          <div className="ds-field">
            <label className="ds-label">Email<span style={{ color: 'var(--error)', marginLeft: 2 }}>*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="ds-input" placeholder="someone@example.com" />
          </div>
          {error && (
            <div className="users-banner is-error" style={{ margin: 0 }}>
              <AlertCircle size={14} /><span className="users-banner-content">{error}</span>
            </div>
          )}
        </div>
        <div className="ds-modal-actions">
          <button type="button" onClick={onClose} disabled={submitting} className="ds-btn is-secondary" style={{ flex: 1 }}>Cancel</button>
          <button type="button" onClick={submit} disabled={submitting} className="ds-btn is-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {submitting ? <Loader2 size={14} className="ds-spin" /> : <CheckCircle2 size={14} />}Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
