import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Activity, X, Trash2, MapPin, Sparkles } from 'lucide-react';
import { useActivityLog, activityLog, type ActivityEntry } from '../utils/activityLog';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './ActivityPanel.css';

interface ActivityPanelProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export default function ActivityPanel({ open, onClose, onNavigate }: ActivityPanelProps) {
  const entries = useActivityLog();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="app-activity-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Activity timeline"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="app-activity-panel" ref={dialogRef} tabIndex={-1}>
        <header className="app-activity-header">
          <div className="app-activity-title">
            <Activity size={14} aria-hidden="true" />
            <span>Activity</span>
            <span className="app-activity-count">{entries.length}</span>
          </div>
          <div className="app-activity-actions">
            {entries.length > 0 && (
              <button
                type="button"
                className="app-activity-clear"
                onClick={() => activityLog.clear()}
                title="Clear all activity"
              >
                <Trash2 size={11} aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              className="app-activity-close"
              onClick={onClose}
              aria-label="Close activity"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="app-activity-body">
          {entries.length === 0 ? (
            <div className="app-activity-empty">
              <div className="app-activity-empty-icon">
                <Sparkles size={22} aria-hidden="true" />
              </div>
              <p className="app-activity-empty-title">No activity yet</p>
              <p className="app-activity-empty-hint">
                Pages you visit and key actions you take will appear here.
              </p>
            </div>
          ) : (
            <ol className="app-activity-list">
              {entries.map((entry, idx) => (
                <ActivityRow
                  key={entry.id}
                  entry={entry}
                  isLast={idx === entries.length - 1}
                  onNavigate={onNavigate}
                  onClose={onClose}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ActivityRow({
  entry, isLast, onNavigate, onClose,
}: {
  entry: ActivityEntry;
  isLast: boolean;
  onNavigate?: (p: string) => void;
  onClose: () => void;
}) {
  const Icon = entry.kind === 'visit' ? MapPin : Sparkles;
  const clickable = entry.kind === 'visit' && !!entry.path && !!onNavigate;
  const handle = () => {
    if (!clickable || !entry.path) return;
    onNavigate(entry.path);
    onClose();
  };
  return (
    <li className={`app-activity-item${clickable ? ' is-clickable' : ''}`}>
      <span className="app-activity-rail" aria-hidden="true">
        <span className="app-activity-dot" />
        {!isLast && <span className="app-activity-line" />}
      </span>
      <button
        type="button"
        className="app-activity-row"
        onClick={handle}
        disabled={!clickable}
      >
        <span className="app-activity-row-icon">
          <Icon size={11} aria-hidden="true" />
        </span>
        <span className="app-activity-row-body">
          <span className="app-activity-row-label">{entry.label}</span>
          {entry.detail && (
            <span className="app-activity-row-detail">{entry.detail}</span>
          )}
        </span>
        <time className="app-activity-row-time" dateTime={entry.timestamp}>
          {timeAgo(entry.timestamp)}
        </time>
      </button>
    </li>
  );
}
