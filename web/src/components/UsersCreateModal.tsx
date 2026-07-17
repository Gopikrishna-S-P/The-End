import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import '../styles/AppPage.css';

export default function UsersCreateModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
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
          <h2 className="app-page-modal-title">Add User</h2>
          <button className="app-page-modal-close" onClick={onClose} aria-label="Close modal"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="app-page-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="app-page-field">
            <label>First Name</label>
            <input type="text" required placeholder="Jane" />
          </div>
          <div className="app-page-field">
            <label>Last Name</label>
            <input type="text" required placeholder="Doe" />
          </div>
          <div className="app-page-field">
            <label>Email Address</label>
            <input type="email" required placeholder="jane@example.com" />
          </div>
          <div className="app-page-field">
            <label>Role</label>
            <select className="app-page-select" required>
              <option value="">Select a role...</option>
              <option value="ROLE_FO">Field Officer</option>
              <option value="ROLE_CALLER">Caller</option>
              <option value="ROLE_TL">Team Lead</option>
              <option value="ROLE_MANAGER">Manager</option>
              <option value="ROLE_ORG_ADMIN">Org Admin</option>
            </select>
          </div>
        </form>
        <div className="app-page-modal-footer">
          <button className="app-page-btn app-page-btn-ghost" onClick={onClose} type="button">Cancel</button>
          <button className="app-page-btn app-page-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding...' : 'Add User'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
