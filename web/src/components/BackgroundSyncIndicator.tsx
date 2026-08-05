import { Loader2, RefreshCcw } from 'lucide-react';
import { useBackgroundSync } from '../utils/backgroundSync';
import './BackgroundSyncIndicator.css';

export default function BackgroundSyncIndicator() {
  const entries = useBackgroundSync();

  if (entries.length === 0) return null;

  const latest = entries[entries.length - 1];
  const extra  = entries.length - 1;
  const pct    = latest.progress !== undefined
    ? Math.round(Math.max(0, Math.min(1, latest.progress)) * 100)
    : null;
  const hasProgress = pct !== null;

  return (
    <div
      className={`app-bg-sync${hasProgress ? ' has-progress' : ''}`}
      role="status"
      aria-live="polite"
      aria-valuenow={hasProgress ? pct! : undefined}
      aria-valuemin={hasProgress ? 0 : undefined}
      aria-valuemax={hasProgress ? 100 : undefined}
      title={
        entries.length === 1
          ? (hasProgress ? `${latest.label} — ${pct}%` : latest.label)
          : entries.map(e => e.label).join(', ')
      }
    >
      <span className="app-bg-sync-icon" aria-hidden="true">
        <Loader2 size={11} className="app-bg-sync-spin" />
        <RefreshCcw size={11} className="app-bg-sync-glyph" />
      </span>
      <span className="app-bg-sync-label">{latest.label}</span>
      {hasProgress && <span className="app-bg-sync-pct">{pct}%</span>}
      {extra > 0 && <span className="app-bg-sync-extra">+{extra}</span>}
      {hasProgress && (
        <span className="app-bg-sync-bar" aria-hidden="true">
          <span
            className="app-bg-sync-bar-fill"
            style={{ width: `${pct}%` }}
          />
        </span>
      )}
    </div>
  );
}
