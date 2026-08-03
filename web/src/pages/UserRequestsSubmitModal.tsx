import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userRequestsApi, type RequestedRole } from '../api/userRequestsApi';
import { submitSchema, STAFF_ROLE_OPTIONS, type SubmitForm } from './UserRequestsHelpers';
import { X, AlertCircle, UserPlus, Loader2 } from 'lucide-react';

interface Props {
  role: RequestedRole;
  onClose: () => void;
  onDone: () => void;
}

export function UserRequestsSubmitModal({ role, onClose, onDone }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<SubmitForm>({ resolver: zodResolver(submitSchema) });

  const onSubmit = async (form: SubmitForm) => {
    setLoading(true); setSubmitError(null);
    try {
      await userRequestsApi.submit({
        email: form.email, firstName: form.firstName, lastName: form.lastName,
        role, staffRole: role === 'ORG_USER' ? form.staffRole : undefined,
        notes: form.notes || undefined,
      });
      onDone();
    }
    catch (e: any) { setSubmitError(e?.response?.data?.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  const roleLabel = role === 'ORG_ADMIN' ? 'Org Admin' : 'Org User';

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <div>
            <div className="ds-modal-title">Request new {roleLabel}</div>
            <div className="ds-modal-sub">This request will be sent for approval before the account is created.</div>
          </div>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="ds-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="ds-field">
                <label className="ds-label">First name</label>
                <input {...register('firstName')} className="ds-input" />
                {errors.firstName && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{errors.firstName.message}</p>}
              </div>
              <div className="ds-field">
                <label className="ds-label">Last name</label>
                <input {...register('lastName')} className="ds-input" />
                {errors.lastName && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="ds-field">
              <label className="ds-label">Email</label>
              <input {...register('email')} type="email" className="ds-input" />
              {errors.email && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{errors.email.message}</p>}
            </div>
            {role === 'ORG_USER' && (
              <div className="ds-field">
                <label className="ds-label">Role</label>
                <select {...register('staffRole')} className="ds-input" defaultValue="">
                  <option value="" disabled>Select a role…</option>
                  {STAFF_ROLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {errors.staffRole && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{errors.staffRole.message}</p>}
              </div>
            )}
            <div className="ds-field">
              <label className="ds-label">Notes <span style={{ color: 'var(--ink-tertiary)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <textarea {...register('notes')} rows={2} className="ds-textarea" />
            </div>
            {submitError && <div className="ur-banner is-error" style={{ margin: 0 }}><AlertCircle size={14} /><span className="ur-banner-content">{submitError}</span></div>}
          </div>
          <div className="ds-modal-actions">
            <button type="button" onClick={onClose} className="ds-btn is-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="ds-btn is-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? <Loader2 size={14} className="ds-spin" /> : <UserPlus size={14} />}Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
