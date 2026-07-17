import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSplitPane, splitPane } from '../utils/splitPane';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './SplitPaneDrawer.css';

export default function SplitPaneDrawer() {
  const state = useSplitPane();
  const drawerRef = useRef<HTMLElement>(null);
  useFocusTrap(drawerRef, state.open);

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') splitPane.close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state.open]);

  if (!state.open) return null;

  const style: React.CSSProperties = state.width ? { width: state.width } : {};

  return createPortal(
    <div
      className="app-split-pane-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={state.title ?? 'Preview'}
      onMouseDown={(e) => { if (e.target === e.currentTarget) splitPane.close(); }}
    >
      <aside className="app-split-pane" ref={drawerRef} tabIndex={-1} style={style}>
        <header className="app-split-pane-header">
          <span className="app-split-pane-title">{state.title ?? 'Preview'}</span>
          <button
            type="button"
            className="app-split-pane-close"
            onClick={() => splitPane.close()}
            aria-label="Close preview"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </header>
        <div className="app-split-pane-body">
          {state.content}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
