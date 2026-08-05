import { AlertCircle, X } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorMessage = ({ message, onDismiss }: ErrorMessageProps) => (
  <div
    role="alert"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '12px 14px',
      background: 'var(--danger-subtle)',
      border: '1px solid var(--danger-border)',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
      color: 'var(--danger)',
      lineHeight: '1.5',
    }}
  >
    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
    <span style={{ flex: 1 }}>{message}</span>
    {onDismiss && (
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: 'var(--danger)',
          cursor: 'pointer',
          borderRadius: 'var(--radius-xs)',
          opacity: 0.7,
        }}
      >
        <X size={13} />
      </button>
    )}
  </div>
);
