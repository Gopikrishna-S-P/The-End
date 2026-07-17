import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import './MfaNudge.css';

// Snooze cadence — 24h. The user can dismiss for a day, but we re-surface it
// every subsequent app session / day boundary until they actually enrol.
const SNOOZE_KEY = 'rp-mfa-nudge-snoozed-until';
const SNOOZE_WINDOW_MS = 24 * 60 * 60 * 1000;

export default function MfaNudge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!user) { setHidden(true); return; }
    if (user.mfaEnabled) { setHidden(true); return; }
    if (pathname.startsWith('/settings/mfa')) { setHidden(true); return; }

    const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (snoozedUntil && snoozedUntil > Date.now()) {
      setHidden(true);
      // Auto-show again when the snooze elapses, even without a reload.
      const t = window.setTimeout(() => setHidden(false), snoozedUntil - Date.now());
      return () => window.clearTimeout(t);
    }
    setHidden(false);
  }, [user, pathname]);

  if (hidden) return null;

  const onSnooze = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_WINDOW_MS)); } catch {}
    setHidden(true);
  };

  return (
    <div className="mfa-nudge" role="status" aria-live="polite">
      <div className="mfa-nudge-inner">
        <span className="mfa-nudge-icon" aria-hidden="true">
          <ShieldAlert size={18} />
        </span>
        <div className="mfa-nudge-body">
          <strong className="mfa-nudge-title">Two-factor authentication is off</strong>
          <span className="mfa-nudge-sub">
            Add a second sign-in step to protect your account from password-only attacks.
          </span>
        </div>
        <div className="mfa-nudge-actions">
          <button
            type="button"
            className="mfa-nudge-cta"
            onClick={() => navigate('/settings/mfa')}
          >
            Enable now <ArrowRight size={13} />
          </button>
          <button
            type="button"
            className="mfa-nudge-dismiss"
            onClick={onSnooze}
            aria-label="Dismiss for 24 hours"
            title="Dismiss for 24 hours"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
