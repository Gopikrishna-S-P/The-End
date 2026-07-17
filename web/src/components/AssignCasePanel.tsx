import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function AssignCasePanel({ allocationIds, onClose }: { allocationIds: string[], onClose: () => void }) {
  const [agentId, setAgentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <>
      <div className="app-page-drawer-overlay" onClick={onClose} />
      <motion.div className="app-page-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} role="dialog" aria-modal="true" aria-label="Assign Panel">
        <div className="app-page-drawer-header">
          <div>
            <div className="app-page-drawer-title">Assign Cases</div>
            <div className="app-page-drawer-sub">Assigning {allocationIds.length} cases to an agent</div>
          </div>
          <div className="app-page-drawer-actions">
            <button className="app-page-icon-btn" onClick={onClose} aria-label="Close drawer"><X size={15} /></button>
          </div>
        </div>
        <div className="app-page-drawer-body">
          <div className="app-page-field" style={{ padding: 20 }}>
            <label className="app-page-field-label">Select Agent</label>
            <select className="app-page-search" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)' }} value={agentId} onChange={e => setAgentId(e.target.value)}>
              <option value="">Select an agent...</option>
              <option value="AGENT-1">Agent 1</option>
              <option value="AGENT-2">Agent 2</option>
            </select>
          </div>
        </div>
        <div className="app-page-drawer-footer">
          <button className="app-page-btn app-page-btn-primary" style={{ width: '100%' }} onClick={handleSubmit} disabled={submitting || !agentId}>
            {submitting ? 'Assigning...' : 'Assign Cases'}
          </button>
        </div>
      </motion.div>
    </>
  );
}
