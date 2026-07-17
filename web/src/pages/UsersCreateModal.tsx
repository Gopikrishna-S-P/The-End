import { useState } from 'react';
import { usersApi, type CreateUserRequest } from '../api/usersApi';
import type { RoleResponse } from '../types';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const roleLabel = (name: string) =>
  name.replace(/^ROLE_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

interface Props {
  roles: RoleResponse[];
  onClose: () => void;
  onCreated: () => void;
}

export function UsersCreateModal({ roles, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateUserRequest>({
    email: '', firstName: '', lastName: '', roleNames: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CreateUserRequest>(k: K, v: CreateUserRequest[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const toggleRole = (rn: string) => {
    setForm(p => {
      const has = (p.roleNames ?? []).includes(rn);
      return { ...p, roleNames: has ? (p.roleNames ?? []).filter(r => r !== rn) : [...(p.roleNames ?? []), rn] };
    });
  };

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      await usersApi.createUser({ ...form, email: form.email.toLowerCase().trim() });
      onCreated();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create user');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal users-modal-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <div>
            <div className="ds-modal-title">New user</div>
            <div className="ds-modal-sub">Created in your organization.</div>
          </div>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="ds-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="ds-field">
              <label className="ds-label">First name<span style={{ color: 'var(--error)', marginLeft: 2 }}>*</span></label>
              <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className="ds-input" />
            </div>
            <div className="ds-field">
              <label className="ds-label">Last name<span style={{ color: 'var(--error)', marginLeft: 2 }}>*</span></label>
              <input value={form.lastName} onChange={e => set('lastName', e.target.value)} className="ds-input" />
            </div>
          </div>
          <div className="ds-field">
            <label className="ds-label">Email<span style={{ color: 'var(--error)', marginLeft: 2 }}>*</span></label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="ds-input" placeholder="someone@example.com" />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2, lineHeight: 1.5 }}>
            A welcome email with a one-time link will be sent. The user sets their own password.
          </p>
          <div className="ds-field">
            <label className="ds-label">Roles</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {roles.map(r => {
                const on = (form.roleNames ?? []).includes(r.name);
                return (
                  <button type="button" key={r.id} onClick={() => toggleRole(r.name)} style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                    fontFamily: 'var(--sans)', cursor: 'pointer', transition: 'all 150ms var(--ease)',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    border: on ? '1px solid var(--ink-solid)' : '1px solid var(--border)',
                    background: on ? 'var(--ink-solid)' : 'var(--bg-surface)',
                    color: on ? 'var(--text-on-solid)' : 'var(--ink-secondary)',
                  }}>
                    {roleLabel(r.name)}
                    {!r.systemRole && <span style={{ marginLeft: 2, opacity: 0.6, fontSize: 9 }}>custom</span>}
                  </button>
                );
              })}
              {roles.length === 0 && (
                <p style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>No roles available — create roles in Role Management first.</p>
              )}
            </div>
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
            {submitting ? <Loader2 size={14} className="ds-spin" /> : <CheckCircle2 size={14} />}Create
          </button>
        </div>
      </div>
    </div>
  );
}
