import { useEffect, useRef, useState } from 'react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useSessionCountdown, session } from '../utils/session';
import './SessionExpiryChip.css';

const WARNING_THRESHOLD_MS = 5 * 60_000;
const DANGER_THRESHOLD_MS  = 1 * 60_000;

interface SessionExpiryChipProps {
  /** Called when the user clicks "Sign out". */
  onLogout?: () => void;
  /** Called when the user clicks "Stay" — typically refreshes the token. */
  onExtend?: () => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'expired';
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}h ${rem}m`;
  }
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export default function SessionExpiryChip({ onLogout, onExtend }: SessionExpiryChipProps) {
  const { remainingMs } = useSessionCountdown();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    return () => document.removeEventListener('mousedown', onMouse);
  }, [open]);

  if (remainingMs === null) return null;
  if (remainingMs > WARNING_THRESHOLD_MS) return null;

  const danger = remainingMs < DANGER_THRESHOLD_MS;
  const expired = remainingMs <= 0;

  return (
    <div className="app-session-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`app-session-chip${danger ? ' is-danger' : ''}${expired ? ' is-expired' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={expired ? 'Session expired' : `Session ends in ${formatCountdown(remainingMs)}`}
      >
        <Clock size={11} aria-hidden="true" />
        <span className="app-session-label">
          {expired ? 'Session expired' : `Session: ${formatCountdown(remainingMs)}`}
        </span>
      </button>

      {open && (
        <div className="app-session-pop" role="dialog" aria-label="Session expiring">
          <div className="app-session-pop-header">
            <Clock size={13} aria-hidden="true" />
            <span>{expired ? 'Your session has expired' : 'Session is about to expire'}</span>
          </div>
          <p className="app-session-pop-text">
            {expired
              ? 'Sign in again to continue.'
              : `You'll be signed out in ${formatCountdown(remainingMs)}. Stay signed in to continue working.`}
          </p>
          <div className="app-session-pop-actions">
            {!expired && (
              <button
                type="button"
                className="app-session-pop-btn is-primary"
                onClick={() => {
                  /* No backend yet — extend by 30m as a stand-in */
                  if (onExtend) onExtend();
                  else session.extendBy(30 * 60_000);
                  setOpen(false);
                }}
              >
                <RefreshCw size={11} aria-hidden="true" /> Stay signed in
              </button>
            )}
            <button
              type="button"
              className="app-session-pop-btn"
              onClick={() => {
                setOpen(false);
                if (onLogout) onLogout();
              }}
            >
              <LogOut size={11} aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
