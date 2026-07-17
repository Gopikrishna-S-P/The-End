import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight, X, Settings
} from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  type PaletteItem, type CommandPaletteProps
} from './CommandPaletteHelpers';
import './TopbarCustomizeDialog.css';

export type { PaletteItem };

export default function CommandPalette({
  open, onClose, items
}: CommandPaletteProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) { const prev = returnFocusRef.current; if (prev instanceof HTMLElement) prev.focus(); return; }
    returnFocusRef.current = document.activeElement;
    setActiveIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const flat = items;

  useEffect(() => { if (activeIdx >= flat.length) setActiveIdx(Math.max(0, flat.length - 1)); }, [flat.length, activeIdx]);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx='${activeIdx}']`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const activate = useCallback((item: PaletteItem) => {
    onClose(); requestAnimationFrame(() => item.run());
  }, [onClose]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => flat.length === 0 ? 0 : (i + 1) % flat.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length); }
    else if (e.key === 'Home') { e.preventDefault(); setActiveIdx(0); }
    else if (e.key === 'End') { e.preventDefault(); setActiveIdx(Math.max(0, flat.length - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const entry = flat[activeIdx]; if (entry) activate(entry); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }, [flat, activeIdx, activate, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="app-topbar-custom-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="app-topbar-custom-dialog" onKeyDown={onKeyDown} ref={dialogRef} tabIndex={0} style={{ outline: 'none' }}>

        <div className="app-topbar-custom-header">
          <div className="app-topbar-custom-title">
            <Settings size={14} aria-hidden="true" />
            <span id="rp-topbar-custom-title">Settings</span>
          </div>
          <button type="button" className="app-topbar-custom-close" onClick={onClose} aria-label="Close">
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <p className="app-topbar-custom-intro">
          Manage your account preferences, configure billing, or update your application theme.
          Select an option below to continue.
        </p>

        <div id="rp-palette-list" className="app-topbar-custom-list" role="listbox" ref={listRef}>
          {flat.map((item, idx) => {
            const isActive = idx === activeIdx;
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" id={`rp-palette-item-${idx}`} data-idx={idx}
                className={`app-topbar-custom-row${isActive ? ' is-active' : ''}`}
                style={{ width: '100%', textAlign: 'left', border: 'none', background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent', cursor: 'pointer', alignItems: 'center' }}
                role="option" aria-selected={isActive}
                onMouseEnter={() => setActiveIdx(idx)} onClick={() => activate(item)}>
                
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                  <Icon size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                </div>
                
                <div className="app-topbar-custom-row-body">
                  <span className="app-topbar-custom-row-label">{item.label}</span>
                  <span className="app-topbar-custom-row-desc">{item.category}</span>
                </div>
                
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: isActive ? '#0AA550' : 'transparent', color: isActive ? '#fff' : 'rgba(0,0,0,0.2)', transition: 'all 0.2s', flexShrink: 0 }}>
                  <ArrowRight size={12} aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>,
    document.body,
  );
}
