import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';

export default function PtpCreateModal({ onClose, defaultValues }: { onClose: () => void, defaultValues?: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allocationId, setAllocationId] = useState(defaultValues?.allocationId || '');
  const [promiseDate, setPromiseDate] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      // Typeahead logic
    }
  }, [searchTerm]);

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
      <motion.div className="app-page-modal" style={{ width: 450 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div className="app-page-modal-header">
          <h2 className="app-page-modal-title">Create Promise to Pay (PTP)</h2>
          <button className="app-page-modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="app-page-modal-body" style={{ display: 'grid', gap: 16 }}>
          <div className="app-page-field">
            <label className="app-page-field-label">Borrower / Loan Account</label>
            <input className="app-page-search" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: defaultValues ? 'var(--bg-subtle)' : 'transparent' }} required 
              readOnly={!!defaultValues} 
              placeholder="Search..."
              value={defaultValues ? `${defaultValues.borrowerName} (${defaultValues.loanAccountNo})` : searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="app-page-field">
            <label className="app-page-field-label">Promise Date</label>
            <input type="date" className="app-page-search app-page-date" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)' }} required value={promiseDate} onChange={e => setPromiseDate(e.target.value)} />
          </div>
          <div className="app-page-field">
            <label className="app-page-field-label">Promised Amount (₹)</label>
            <input type="number" className="app-page-search" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)' }} required value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </form>
        <div className="app-page-modal-footer">
          <button type="button" className="app-page-btn app-page-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="app-page-btn app-page-btn-primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? <RefreshCw size={14} className="app-page-spinner-icon" /> : 'Create PTP'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
