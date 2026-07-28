import { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

export interface EditingCell { rowId: string; col: string; }

interface Props {
  value: string;
  editing: boolean;
  onStartEdit: () => void;
  onSave: (val: string) => void;
  onCancel: () => void;
}

export function UploadCell({ value, editing, onStartEdit, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) { setDraft(value); setTimeout(() => inputRef.current?.select(), 0); }
  }, [editing, value]);

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 120 }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(draft); if (e.key === 'Escape') onCancel(); }}
          style={{
            flex: 1, padding: '3px 8px', fontSize: 13, borderRadius: 6,
            border: '1px solid var(--border-strong)',
            outline: '2px solid var(--focus-ring)',
            outlineOffset: '1px',
            background: 'var(--bg-surface)',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-primary)',
          }}
          autoFocus
          aria-label="Edit cell value"
        />
        <button type="button" onClick={() => onSave(draft)}
          style={{ background: 'none', border: 'none', padding: 3, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Save" aria-label="Save">
          <Check size={13} />
        </button>
        <button type="button" onClick={onCancel}
          style={{ background: 'none', border: 'none', padding: 3, color: 'var(--text-tertiary)', cursor: 'pointer' }}
          title="Cancel" aria-label="Cancel">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div onClick={onStartEdit} title={value || '—'}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartEdit(); } }}
      className="ud-cell-editable"
      style={{
        minHeight: 24, minWidth: 60, padding: '3px 4px', borderRadius: 4,
        cursor: 'text', fontSize: 13, color: 'var(--text-primary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: 220, transition: 'background var(--dur-instant)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.outline = '1px solid var(--border-strong)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.outline = 'none'; }}>
      {value || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
    </div>
  );
}
