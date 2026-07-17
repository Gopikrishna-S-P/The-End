import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import '../styles/AppPage.css';

const PERMISSIONS = [
  { id: 'view_reports', label: 'View Reports', desc: 'Can access and download analytics' },
  { id: 'manage_team', label: 'Manage Team', desc: 'Can reassign cases and manage FO status' },
  { id: 'edit_ptp', label: 'Edit PTPs', desc: 'Can modify or cancel active PTPs' },
];

export default function UsersPermissionsModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="app-page-modal-backdrop">
      <motion.div
        className="app-page-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ width: 400 }}
      >
        <div className="app-page-modal-header">
          <h2 className="app-page-modal-title">Permissions: {user.firstName}</h2>
          <button className="app-page-modal-close" onClick={onClose} aria-label="Close modal"><X size={16} /></button>
        </div>
        <div className="app-page-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PERMISSIONS.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{p.desc}</div>
              </div>
              <label className="app-page-switch">
                <input type="checkbox" checked={!!toggles[p.id]} onChange={e => setToggles(prev => ({ ...prev, [p.id]: e.target.checked }))} />
                <span className="app-page-slider"></span>
              </label>
            </div>
          ))}
        </div>
        <div className="app-page-modal-footer">
          <button className="app-page-btn app-page-btn-ghost" onClick={onClose} type="button">Cancel</button>
          <button className="app-page-btn app-page-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
