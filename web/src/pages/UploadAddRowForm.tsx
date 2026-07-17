import { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import './Dashboard.css';

interface Props {
  columns: string[];
  onAdd: (data: Record<string, string>) => Promise<void>;
  onCancel: () => void;
}

export function UploadAddRowForm({ columns, onAdd, onCancel }: Props) {
  const [draft,  setDraft]  = useState<Record<string, string>>(Object.fromEntries(columns.map(c => [c, ''])));
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const handleAdd = async () => {
    setSaving(true); setError(null);
    try { await onAdd(draft); }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to add row'); }
    finally { setSaving(false); }
  };

  return (
    <tr style={{ background: 'color-mix(in srgb, var(--success) 3%, transparent)', borderBottom: '1px solid var(--border-subtle)' }}>
      <td style={{ padding: '12px 16px', borderRight: '1px solid var(--border-subtle)', textAlign: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>NEW</span>
      </td>
      {columns.map(col => (
        <td key={col} style={{ padding: '8px 16px', borderRight: '1px solid var(--border-subtle)' }}>
          <input
            value={draft[col] ?? ''}
            onChange={e => setDraft(p => ({ ...p, [col]: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') onCancel(); }}
            placeholder={col}
            className="ds-input"
            style={{ width: '100%', height: 28, fontSize: 12, padding: '0 8px', minWidth: 80 }}
          />
        </td>
      ))}
      <td style={{ padding: '8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <button type="button" onClick={handleAdd} disabled={saving}
            className="ds-btn is-primary" style={{ height: 28, padding: '0 10px', fontSize: 11.5, background: 'var(--success)', border: 'none', color: '#fff' }}>
            {saving ? <Loader2 size={12} className="ds-spin" style={{ marginRight: 4 }} /> : <Check size={12} style={{ marginRight: 4 }} />}
            Add
          </button>
          <button type="button" onClick={onCancel} className="db-error-retry" style={{ background: 'transparent' }} aria-label="Cancel">
            <X size={14} style={{ color: 'var(--ink-tertiary)' }} />
          </button>
        </div>
        {error && <p style={{ fontSize: 10, color: 'var(--danger)', marginTop: 4, textAlign: 'center' }}>{error}</p>}
      </td>
    </tr>
  );
}
