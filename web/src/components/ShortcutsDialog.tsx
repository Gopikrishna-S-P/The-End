import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, KeyRound, Trash2, Command } from 'lucide-react';
import {
  ACTIONS, keymap, formatBinding, captureBinding, useKeymapOverrides,
  type KeyBinding, type ActionDef,
} from '../utils/keymap';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './TopbarCustomizeDialog.css';
import './ShortcutsDialog.css';

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const overrides = useKeymapOverrides();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [capturingId, setCapturingId] = useState<string | null>(null);

  useFocusTrap(dialogRef, open);

  /* Esc closes — unless we're in capture mode (handled by capture logic) */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !capturingId) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, capturingId, onClose]);

  /* While capturing, intercept the next non-modifier keystroke */
  useEffect(() => {
    if (!capturingId) return;
    const onKey = (e: KeyboardEvent) => {
      /* Escape cancels capture without changing the binding */
      if (e.key === 'Escape') {
        e.preventDefault();
        setCapturingId(null);
        return;
      }
      const binding = captureBinding(e);
      if (!binding) return;
      e.preventDefault();
      e.stopPropagation();
      keymap.setBinding(capturingId, binding);
      setCapturingId(null);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [capturingId]);

  if (!open) return null;

  return createPortal(
    <div
      className="app-topbar-custom-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rp-shortcuts-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="app-topbar-custom-dialog" ref={dialogRef} tabIndex={-1}>
        <header className="app-topbar-custom-header">
          <div className="app-topbar-custom-title">
            <KeyRound size={14} aria-hidden="true" />
            <span id="rp-shortcuts-title">Keyboard shortcuts</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {Object.keys(overrides).length > 0 && (
              <button type="button" className="app-topbar-custom-reset" onClick={() => keymap.resetAll()}
                style={{ padding: '6px 10px', fontSize: '11px', height: 'auto', gap: '4px' }}
                title="Reset all to defaults">
                <RotateCcw size={12} /> <span>Reset all</span>
              </button>
            )}
            <button
              type="button"
              className="app-topbar-custom-close"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </header>

        <p className="app-topbar-custom-intro">
          Click a binding to rebind it. Press <span style={{ fontSize: '10px', fontWeight: 600, background: 'color-mix(in srgb, var(--text-primary) 5%, transparent)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', color: 'var(--ink-primary)', fontFamily: 'monospace' }}>Esc</span> mid-capture to cancel.
        </p>

        <div className="app-topbar-custom-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {ACTIONS.map(action => (
            <ShortcutRow
              key={action.id}
              action={action}
              binding={keymap.getBinding(action.id)}
              isOverridden={action.id in overrides}
              isCapturing={capturingId === action.id}
              onCapture={() => action.rebindable && setCapturingId(action.id)}
              onReset={() => keymap.setBinding(action.id, undefined)}
              onUnbind={() => keymap.setBinding(action.id, null)}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface ShortcutRowProps {
  action: ActionDef;
  binding: KeyBinding | null;
  isOverridden: boolean;
  isCapturing: boolean;
  onCapture: () => void;
  onReset: () => void;
  onUnbind: () => void;
}

function ShortcutRow({
  action, binding, isOverridden, isCapturing, onCapture, onReset, onUnbind,
}: ShortcutRowProps) {
  return (
    <div className="app-topbar-custom-row" style={{ alignItems: 'flex-start' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)', flexShrink: 0, marginRight: '4px', marginTop: '2px' }}>
        <Command size={14} aria-hidden="true" style={{ color: 'var(--ink-secondary)' }} />
      </div>
      <div className="app-topbar-custom-row-body">
        <span className="app-topbar-custom-row-label">{action.label}</span>
        <span className="app-topbar-custom-row-desc">{action.description}</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
        <button
          type="button"
          onClick={onCapture}
          disabled={!action.rebindable}
          title={action.rebindable ? 'Click to rebind' : 'Not rebindable'}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            background: isCapturing ? 'var(--ink-solid)' : 'color-mix(in srgb, var(--text-primary) 5%, transparent)',
            color: isCapturing ? 'var(--text-on-solid)' : (action.rebindable ? 'var(--ink-primary)' : 'color-mix(in srgb, var(--text-primary) 30%, transparent)'),
            padding: '4px 10px',
            borderRadius: 'var(--radius-xs)',
            border: 'none',
            fontFamily: 'monospace',
            cursor: action.rebindable ? 'pointer' : 'default',
            outline: isCapturing ? '2px solid color-mix(in srgb, var(--brand) 40%, transparent)' : 'none',
            outlineOffset: '2px',
          }}
        >
          {isCapturing
            ? <span>Press a key…</span>
            : <span>{formatBinding(binding)}</span>}
        </button>
        {action.rebindable && (
          <>
            {isOverridden && (
              <button
                type="button"
                className="app-topbar-custom-reset"
                onClick={onReset}
                title="Reset to default"
                aria-label={`Reset ${action.label} to default`}
                style={{ padding: '4px 6px', height: 'auto', borderRadius: '6px' }}
              >
                <RotateCcw size={12} aria-hidden="true" />
              </button>
            )}
            {binding && (
              <button
                type="button"
                onClick={onUnbind}
                title="Unbind (removes the shortcut entirely)"
                aria-label={`Unbind ${action.label}`}
                style={{
                  padding: '4px 6px', height: 'auto', borderRadius: 'var(--radius-xs)',
                  background: 'transparent', border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
