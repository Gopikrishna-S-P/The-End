import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Download } from 'lucide-react';

export default function ReportGenerateModal({ reportId, onClose }: { reportId: string, onClose: () => void }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [format, setFormat] = useState('CSV');
  const [generating, setGenerating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="app-page-modal-backdrop">
      <motion.div className="app-page-modal" style={{ width: 400 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div className="app-page-modal-header">
          <h2 className="app-page-modal-title">Generate Report</h2>
          <button className="app-page-modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="app-page-modal-body" style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="app-page-field">
              <label className="app-page-field-label">From Date</label>
              <input type="date" className="app-page-search app-page-date" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)' }} required value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="app-page-field">
              <label className="app-page-field-label">To Date</label>
              <input type="date" className="app-page-search app-page-date" style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)' }} required value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="app-page-field">
            <label className="app-page-field-label">Format</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['CSV', 'XLSX'].map(f => (
                <button type="button" key={f} className={`app-page-btn ${format === f ? 'app-page-btn-primary' : 'app-page-btn-ghost'}`} style={{ height: 34, padding: '0 16px' }} onClick={() => setFormat(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </form>
        <div className="app-page-modal-footer">
          <button type="button" className="app-page-btn app-page-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="app-page-btn app-page-btn-primary" disabled={generating} onClick={handleSubmit}>
            {generating ? <><RefreshCw size={14} className="app-page-spinner-icon" /> Generating...</> : <><Download size={14} /> Download</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
