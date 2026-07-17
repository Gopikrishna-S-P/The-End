import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Loader2 } from 'lucide-react';
import { changePasswordSchema, type ChangePasswordValues } from './ProfileSettingsTypes';
import { EyeOpen, EyeClosed, PasswordStrength } from './ProfileSettingsHelpers';
import './Dashboard.css';

interface Props {
  onSubmit: (data: ChangePasswordValues) => Promise<void>;
}

export function ProfileChangePasswordForm({ onSubmit }: Props) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });
  const newPassword = watch('newPassword') ?? '';

  return (
    <section aria-label="Change password" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <header className="db-card-head" style={{ padding: '16px 24px', background: 'var(--bg-base)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="db-att-chip" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-subtle)', color: 'var(--ink-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="db-card-title">Change password</h2>
            <span className="db-kpi2-foot-meta">Update your login password</span>
          </div>
        </div>
      </header>
      <div style={{ padding: '24px' }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ds-field">
            <label className="ds-label" htmlFor="ps-current" style={{ marginBottom: 6, display: 'block' }}>Current password</label>
            <div style={{ position: 'relative' }}>
              <input id="ps-current" className="ds-input" type={showCurrent ? 'text' : 'password'}
                style={{ width: '100%', paddingRight: 40, borderColor: errors.currentPassword ? 'var(--danger)' : undefined }}
                placeholder="••••••••" autoComplete="new-password"
                aria-invalid={!!errors.currentPassword} {...register('currentPassword')} />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-tertiary)' }}
                aria-label={showCurrent ? 'Hide' : 'Show'}>
                {showCurrent ? EyeClosed : EyeOpen}
              </button>
            </div>
            {errors.currentPassword && <p style={{ color: 'var(--danger)', fontSize: 12, margin: '4px 0 0 0' }} role="alert">{errors.currentPassword.message}</p>}
          </div>

          <div className="ds-field">
            <label className="ds-label" htmlFor="ps-new" style={{ marginBottom: 6, display: 'block' }}>New password</label>
            <div style={{ position: 'relative' }}>
              <input id="ps-new" className="ds-input" type={showNew ? 'text' : 'password'}
                style={{ width: '100%', paddingRight: 40, borderColor: errors.newPassword ? 'var(--danger)' : undefined }}
                placeholder="••••••••" autoComplete="new-password"
                aria-invalid={!!errors.newPassword} {...register('newPassword')} />
              <button type="button" onClick={() => setShowNew(v => !v)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-tertiary)' }}
                aria-label={showNew ? 'Hide' : 'Show'}>
                {showNew ? EyeClosed : EyeOpen}
              </button>
            </div>
            {errors.newPassword && <p style={{ color: 'var(--danger)', fontSize: 12, margin: '4px 0 0 0' }} role="alert">{errors.newPassword.message}</p>}
            <PasswordStrength password={newPassword} />
          </div>

          <div className="ds-field">
            <label className="ds-label" htmlFor="ps-confirm" style={{ marginBottom: 6, display: 'block' }}>Confirm new password</label>
            <div style={{ position: 'relative' }}>
              <input id="ps-confirm" className="ds-input" type={showConfirm ? 'text' : 'password'}
                style={{ width: '100%', paddingRight: 40, borderColor: errors.confirmPassword ? 'var(--danger)' : undefined }}
                placeholder="••••••••" autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-tertiary)' }}
                aria-label={showConfirm ? 'Hide' : 'Show'}>
                {showConfirm ? EyeClosed : EyeOpen}
              </button>
            </div>
            {errors.confirmPassword && <p style={{ color: 'var(--danger)', fontSize: 12, margin: '4px 0 0 0' }} role="alert">{errors.confirmPassword.message}</p>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>You'll be signed out after changing your password.</span>
            <button type="submit" disabled={isSubmitting} className="ds-btn is-primary" style={{ height: 36 }}>
              {isSubmitting ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <Lock size={14} style={{ marginRight: 6 }} />}
              {isSubmitting ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
