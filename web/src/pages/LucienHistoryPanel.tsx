import { X, Trash2 } from 'lucide-react';
import type { Session } from './LucienHelpers';

interface Props {
  sessions: Session[];
  activeSessionId: string | null;
  onClose: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

export function LucienHistoryPanel({ sessions, activeSessionId, onClose, onSelectSession, onDeleteSession }: Props) {
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
              <div
                key={s.sessionId}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 4,
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectSession(s.sessionId)}
                  style={{
                    flex: 1, minWidth: 0, textAlign: 'left', padding: '12px 8px 12px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: isActive ? 'var(--ink-solid)' : 'var(--ink-primary)' }}>
                    {new Date(s.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}
                    {!s.active && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, color: 'var(--ink-tertiary)' }}>closed</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 2 }}>
                    {s.totalMessages} messages
                  </div>
                </button>
                {onDeleteSession && (
                  <button
                    type="button"
                    onClick={() => onDeleteSession(s.sessionId)}
                    aria-label="Permanently delete conversation"
                    title="Permanently delete"
                    style={{
                      flexShrink: 0, marginRight: 8, width: 26, height: 26, padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', borderRadius: 6,
                      color: 'var(--ink-tertiary)', cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
