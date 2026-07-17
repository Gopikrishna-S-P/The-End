import { useEffect } from 'react';
import { Check, CheckCircle2, AlertCircle } from 'lucide-react';

export const EyeOpen = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const EyeClosed = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 2l12 12M6.5 5.5A4.5 4.5 0 0114.5 8s-.7 1.7-2.7 3.3M1.5 8S4 3.5 8 3.5c.8 0 1.5.2 2.2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number',    pass: /[0-9]/.test(password) },
    { label: 'Special',   pass: /[@$!%*?&]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['var(--danger)', 'var(--warning)', '#84CC16', 'var(--success)'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const segColor = colors[score - 1] ?? 'var(--border)';

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? segColor : 'var(--border)', transition: 'background 200ms' }} />
        ))}
        <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 4, color: segColor, fontFamily: 'var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {labels[score - 1] ?? ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {checks.map(c => (
          <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: c.pass ? 'var(--success)' : 'var(--ink-tertiary)' }}>
            <Check size={11} />{c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`profile-toast ${type === 'success' ? 'is-success' : 'is-error'}`}>
      {type === 'success'
        ? <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
        : <AlertCircle  size={16} style={{ color: 'var(--error)', flexShrink: 0 }} />}
      <span>{message}</span>
    </div>
  );
}
