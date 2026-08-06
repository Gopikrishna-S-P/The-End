import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

export function Modal({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode;
}) {
  return createPortal(
    <div className="ds-modal-overlay ps-modal-overlay" onClick={onClose}>
      <div className="ds-modal ps-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <div>
            <div className="ds-modal-title">{title}</div>
            {subtitle && <div className="ds-modal-sub">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="ds-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ModalFooter({ onClose, submitting, onSubmit, label }: {
  onClose: () => void; submitting: boolean; onSubmit: () => void; label: string;
}) {
  return (
    <div className="ds-modal-actions">
      <button type="button" onClick={onClose} disabled={submitting}
        className="ds-btn is-secondary" style={{ flex: 1 }}>
        Cancel
      </button>
      <button type="button" onClick={onSubmit} disabled={submitting}
        className="ds-btn is-primary" style={{ flex: 1, justifyContent: 'center' }}>
        {submitting ? <Loader2 size={14} className="ds-spin" /> : <CheckCircle2 size={14} />}
        {label}
      </button>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{
        fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-placeholder)', marginBottom: 10,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <ShieldCheck size={11} />{title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

export function Input({ label, value, onChange, type = 'text', error, hint, placeholder, required, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; error?: string; hint?: string; placeholder?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div className="ds-field">
      <label className="ds-label">
        {label}{required && <span style={{ color: 'var(--error)', marginLeft: 2 }}>*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="ds-input" disabled={disabled}
        style={error ? { borderColor: 'var(--error)' } : undefined} />
      {error && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{error}</p>}
      {!error && hint && <p style={{ color: 'var(--ink-tertiary)', fontSize: 11, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}
