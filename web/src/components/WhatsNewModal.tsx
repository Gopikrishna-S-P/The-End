import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Sparkles, Palette, Rocket, ShieldCheck, Zap,
  Eye, Bell, Compass, Workflow,
} from 'lucide-react';
import {
  useWhatsNew, markVersionSeen, APP_VERSION,
  type ChangelogEntry, type ChangelogHighlight,
} from '../utils/changelog';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './WhatsNewModal.css';

const ICON_BY_HINT: Record<NonNullable<ChangelogHighlight['iconHint']>, React.ElementType> = {
  sparkles: Sparkles,
  palette:  Palette,
  rocket:   Rocket,
  shield:   ShieldCheck,
  zap:      Zap,
  eye:      Eye,
  bell:     Bell,
  compass:  Compass,
  workflow: Workflow,
};

export default function WhatsNewModal() {
  const entries = useWhatsNew();
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const trapActive = !!entries && entries.length > 0 && !dismissed;
  useFocusTrap(dialogRef, trapActive);

  useEffect(() => {
    if (!entries || dismissed) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNow(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, dismissed]);

  const closeNow = () => {
    markVersionSeen(APP_VERSION);
    setDismissed(true);
  };

  if (!entries || entries.length === 0 || dismissed) return null;

  return createPortal(
    <div
      className="app-whatsnew-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rp-whatsnew-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeNow(); }}
    >
      <div className="app-whatsnew-modal" ref={dialogRef} tabIndex={-1}>
        <header className="app-whatsnew-header">
          <div className="app-whatsnew-eyebrow">
            <Sparkles size={11} aria-hidden="true" />
            <span>What's new</span>
            <span className="app-whatsnew-version">v{APP_VERSION}</span>
          </div>
          <button
            type="button"
            className="app-whatsnew-close"
            onClick={closeNow}
            aria-label="Close"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </header>

        <h2 id="rp-whatsnew-title" className="app-whatsnew-title">
          {entries[0].headline ?? 'Fresh updates have landed'}
        </h2>

        <div className="app-whatsnew-body">
          {entries.map((entry) => (
            <EntryBlock key={entry.version} entry={entry} primary={entry === entries[0]} />
          ))}
        </div>

        <footer className="app-whatsnew-footer">
          <span className="app-whatsnew-footer-meta">
            You'll see this once per release.
          </span>
          <button
            type="button"
            className="app-whatsnew-done"
            onClick={closeNow}
            autoFocus
          >
            Got it
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function EntryBlock({ entry, primary }: { entry: ChangelogEntry; primary: boolean }) {
  return (
    <section className={`app-whatsnew-entry${primary ? ' is-primary' : ''}`}>
      {!primary && (
        <div className="app-whatsnew-entry-head">
          <span className="app-whatsnew-version">v{entry.version}</span>
          {entry.headline && <span className="app-whatsnew-entry-headline">— {entry.headline}</span>}
        </div>
      )}
      <ul className="app-whatsnew-list">
        {entry.highlights.map((h, i) => {
          const Icon = h.iconHint ? ICON_BY_HINT[h.iconHint] : Sparkles;
          return (
            <li key={`${entry.version}-${i}`} className="app-whatsnew-item">
              <span className="app-whatsnew-item-icon">
                <Icon size={14} aria-hidden="true" />
              </span>
              <div className="app-whatsnew-item-body">
                <span className="app-whatsnew-item-title">{h.title}</span>
                <span className="app-whatsnew-item-desc">{h.description}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
