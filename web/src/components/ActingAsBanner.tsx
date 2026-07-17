import { useEffect, useState } from 'react';
import { Eye, LogOut, ShieldAlert } from 'lucide-react';
import { useImpersonation, impersonation } from '../utils/impersonation';
import './ActingAsBanner.css';

export default function ActingAsBanner() {
  const state = useImpersonation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [state]);

  if (!state) return null;

  const elapsed = formatElapsed(now - new Date(state.startedAt).getTime());

  return (
    <div className="app-acting-as" role="alert">
      <span className="app-acting-as-stripe" aria-hidden="true" />
      <ShieldAlert size={13} aria-hidden="true" className="app-acting-as-shield" />
      <span className="app-acting-as-text">
        <span className="app-acting-as-prefix">
          <Eye size={11} aria-hidden="true" /> Viewing as
        </span>
        <strong>{state.target.name}</strong>
        {state.target.roleLabel && (
          <span className="app-acting-as-role">{state.target.roleLabel}</span>
        )}
        <span className="app-acting-as-meta">
          · {state.target.email} · {elapsed}
        </span>
      </span>
      {state.reason && (
        <span className="app-acting-as-reason" title={state.reason}>
          “{state.reason}”
        </span>
      )}
      <button
        type="button"
        className="app-acting-as-exit"
        onClick={() => impersonation.stop()}
      >
        <LogOut size={11} aria-hidden="true" />
        <span>Exit</span>
      </button>
    </div>
  );
}

function formatElapsed(ms: number): string {
  if (ms < 60_000)   return 'just started';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60)     return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins - hrs * 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}
