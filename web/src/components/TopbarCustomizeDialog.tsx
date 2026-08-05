import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, LayoutGrid } from 'lucide-react';
import { TOPBAR_BUTTONS, topbarPrefs, useTopbarPrefs } from '../utils/topbarPrefs';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './TopbarCustomizeDialog.css';

interface TopbarCustomizeDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function TopbarCustomizeDialog({ open, onClose }: TopbarCustomizeDialogProps) {
  const hidden = useTopbarPrefs();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  if (!open) return null;

  return createPortal(
    <div
      className="app-topbar-custom-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rp-topbar-custom-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="app-topbar-custom-dialog" ref={dialogRef} tabIndex={-1}>
        <header className="app-topbar-custom-header">
          <div className="app-topbar-custom-title">
            <LayoutGrid size={14} aria-hidden="true" />
            <span id="rp-topbar-custom-title">Customize topbar</span>
          </div>
          <button
            type="button"
            className="app-topbar-custom-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </header>

        <p className="app-topbar-custom-intro">
          Toggle which buttons appear in the topbar. State-driven indicators
          (offline, syncing, session expiry) always surface when they're relevant.
        </p>

        <ul className="app-topbar-custom-list">
          {TOPBAR_BUTTONS.map(b => {
            const isHidden = hidden.has(b.id);
            const protectedItem = !!b.alwaysVisible;
            return (
              <li key={b.id} className="app-topbar-custom-row">
                <div className="app-topbar-custom-row-body">
                  <span className="app-topbar-custom-row-label">
                    {b.label}
                    {protectedItem && <span className="app-topbar-custom-tag">Always on</span>}
                  </span>
                  <span className="app-topbar-custom-row-desc">{b.description}</span>
                </div>
                <label
                  className={`app-topbar-custom-toggle${!isHidden ? ' is-on' : ''}${protectedItem ? ' is-protected' : ''}`}
                  aria-label={`${b.label} visibility`}
                >
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    disabled={protectedItem}
                    onChange={(e) => topbarPrefs.setHidden(b.id, !e.target.checked)}
                  />
                  <span className="app-topbar-custom-toggle-track" aria-hidden="true">
                    <span className="app-topbar-custom-toggle-knob" />
                  </span>
                </label>
              </li>
            );
          })}
        </ul>


      </div>
    </div>,
    document.body,
  );
}
