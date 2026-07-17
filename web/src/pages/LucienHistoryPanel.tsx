import { X } from 'lucide-react';
import type { Session } from './LucienHelpers';

interface Props {
  sessions: Session[];
  activeSessionId: string | null;
  onClose: () => void;
  onSelectSession: (id: string) => void;
}

export function LucienHistoryPanel({ sessions, activeSessionId, onClose, onSelectSession }: Props) {
  return (
    <aside className="ds-card db-card" style={{
      width: '100%', height: '100%', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      <header className="db-card-head" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <h2 className="db-card-title" style={{ fontSize: 14 }}>Past sessions</h2>
        <button type="button" onClick={onClose} className="ds-icon-btn is-sm" aria-label="Close" style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <X size={14} />
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {sessions.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center', padding: '32px 0' }}>
            No past sessions
          </p>
        ) : (
          sessions.map((s) => {
            const isActive = s.sessionId === activeSessionId;
            return (
              <button
                key={s.sessionId}
                type="button"
                onClick={() => onSelectSession(s.sessionId)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 600, color: isActive ? 'var(--ink-solid)' : 'var(--ink-primary)' }}>
                  {new Date(s.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 2 }}>
                  {s.totalMessages} messages
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
