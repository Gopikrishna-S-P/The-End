import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadDataApi } from '../api/uploadDataApi';
import { Plus, Loader2, AlertCircle, X } from 'lucide-react';
import './Dashboard.css';

interface Props {
  uploadId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function UploadAddColumnModal({ uploadId, onClose, onAdded }: Props) {
  const [name,   setName]   = useState('');
  const [defVal, setDefVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const valid = /^[a-z0-9_]+$/.test(name);

  const handleAdd = async () => {
    if (!valid) return;
    setSaving(true); setError(null);
    try {
      await uploadDataApi.addColumn(uploadId, name, defVal);
      onAdded(); onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to add column');
    } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      <motion.div className="ds-modal-overlay" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
        <motion.div className="ds-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 400 }}
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
          
          <div className="ds-modal-header">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="ds-modal-title">Add column</span>
              <span className="db-kpi2-foot-meta" style={{ marginTop: 4 }}>Adds the column to every row</span>
            </div>
            <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            <div className="ds-field" style={{ marginBottom: 16 }}>
              <label className="ds-label" style={{ marginBottom: 6, display: 'block' }}>Column name (lowercase, underscores only)</label>
              <input value={name} onChange={e => setName(e.target.value.toLowerCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="e.g. outstanding_balance" className="ds-input"
                style={{ width: '100%', fontFamily: 'var(--font-mono)', borderColor: name && !valid ? 'var(--danger)' : undefined }}
              />
              {name && !valid && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>Only lowercase letters, digits, underscores</p>}
            </div>
            <div className="ds-field" style={{ marginBottom: 20 }}>
              <label className="ds-label" style={{ marginBottom: 6, display: 'block' }}>Default value (optional)</label>
              <input value={defVal} onChange={e => setDefVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="Leave blank for empty" className="ds-input"
                style={{ width: '100%' }}
              />
            </div>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)', fontSize: 12.5 }}>
                <AlertCircle size={14} /><span>{error}</span>
              </div>
            )}
          </div>

          <div className="ds-modal-actions" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={onClose} className="ds-btn is-secondary" style={{ flex: 1, height: 36 }}>Cancel</button>
            <button type="button" onClick={handleAdd} disabled={!valid || saving}
              className="ds-btn is-primary" style={{ flex: 1, height: 36 }}>
              {saving ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <Plus size={14} style={{ marginRight: 6 }} />}Add
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
