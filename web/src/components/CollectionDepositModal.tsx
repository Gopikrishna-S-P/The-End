import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';

export default function CollectionDepositModal({ collection, onClose }: { collection: any, onClose: () => void }) {
  const [bankAccount, setBankAccount] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="app-page-modal-backdrop">
      <motion.div className="app-page-modal" style={{ width: 400 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div className="app-page-modal-header">
          <h2 className="app-page-modal-title">Log Deposit</h2>
          <button className="app-page-modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="app-page-modal-body" style={{ display: 'grid', gap: 16 }}>
          <div className="app-page-field">
            <label className="app-page-field-label">Amount</label>
            <input className="app-page-search" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)' }} readOnly value={collection?.amount || '₹0'} />
          </div>
          <div className="app-page-field">
            <label className="app-page-field-label">Bank Account Name</label>
            <input className="app-page-search" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)' }} required value={bankAccount} onChange={e => setBankAccount(e.target.value)} />
          </div>
          <div className="app-page-field">
            <label className="app-page-field-label">Deposit Date</label>
            <input type="date" className="app-page-search app-page-date" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)' }} required value={depositDate} onChange={e => setDepositDate(e.target.value)} />
          </div>
          <div className="app-page-field">
            <label className="app-page-field-label">Reference Number</label>
            <input className="app-page-search" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)' }} required value={reference} onChange={e => setReference(e.target.value)} />
          </div>
        </form>
        <div className="app-page-modal-footer">
          <button type="button" className="app-page-btn app-page-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="app-page-btn app-page-btn-primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? <RefreshCw size={14} className="app-page-spinner-icon" /> : 'Log Deposit'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
