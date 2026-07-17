import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';
import { useWorkspace, workspace } from '../utils/workspace';
import './WorkspaceSwitcher.css';

interface WorkspaceSwitcherProps {
  /** Fallback name when no workspace is set (e.g. before user data loads). */
  fallback?: string;
}

export default function WorkspaceSwitcher({ fallback = 'Workspace' }: WorkspaceSwitcherProps) {
  const { current, list } = useWorkspace();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const label = current?.name ?? fallback;
  const short = current?.short ?? deriveShort(label);
  const hasMultiple = list.length > 1;

  return (
    <div className="app-workspace-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`app-workspace-pill${open ? ' is-open' : ''}${hasMultiple ? '' : ' is-static'}`}
        onClick={hasMultiple ? () => setOpen(o => !o) : undefined}
        aria-haspopup={hasMultiple ? 'listbox' : undefined}
        aria-expanded={hasMultiple ? open : undefined}
        aria-label={hasMultiple ? `Workspace: ${label} — click to switch` : `Workspace: ${label}`}
        title={hasMultiple ? 'Switch workspace' : label}
      >
        <span className="app-workspace-icon" aria-hidden="true">
          {short
            ? <span className="app-workspace-short">{short}</span>
            : <Building2 size={12} />}
        </span>
        <span className="app-workspace-name">{label}</span>
        {hasMultiple && (
          <ChevronDown
            size={11}
            aria-hidden="true"
            className={`app-workspace-chev${open ? ' is-open' : ''}`}
          />
        )}
      </button>

      {open && hasMultiple && (
        <div className="app-workspace-dropdown" role="listbox" aria-label="Workspaces">
          <div className="app-workspace-dropdown-label">Switch workspace</div>
          {list.map(w => {
            const isCurrent = current?.id === w.id;
            return (
              <button
                key={w.id}
                type="button"
                role="option"
                aria-selected={isCurrent}
                className={`app-workspace-option${isCurrent ? ' is-active' : ''}`}
                onClick={() => {
                  workspace.switchTo(w.id);
                  setOpen(false);
                }}
              >
                <span className="app-workspace-option-icon">
                  {w.short ?? deriveShort(w.name)}
                </span>
                <span className="app-workspace-option-name">{w.name}</span>
                {isCurrent && (
                  <Check size={11} aria-hidden="true" className="app-workspace-option-check" />
                )}
              </button>
            );
          })}
          <button
            type="button"
            className="app-workspace-add"
            onClick={() => setOpen(false)}
          >
            <Plus size={11} aria-hidden="true" />
            <span>Add a workspace</span>
          </button>
        </div>
      )}
    </div>
  );
}

function deriveShort(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
