import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../client';
import './Dashboard.css';
import type { ReportType, ExportFormat } from '../types';
import {
  FileSpreadsheet, File as FileIcon, AlertCircle, Loader2, ChevronDown,
  Users, CalendarDays, TrendingDown, BookOpen, X
} from 'lucide-react';

const REPORT_TYPES: {
  value: ReportType;
  label: string;
  description: string;
  icon: React.ElementType;
  params: 'date_range' | 'month_year';
}[] = [
  { value: 'AGENT_PERFORMANCE',          label: 'Agent performance', description: 'Agent-wise visit rate, collection score and amounts for the period',    icon: Users,        params: 'date_range' },
  { value: 'DAILY_VISIT_COMPLETION',     label: 'Visit report',      description: 'Total visits completed per agent between the selected dates',           icon: CalendarDays, params: 'date_range' },
  { value: 'COLLECTION_EFFICIENCY',      label: 'Collection report', description: 'Collections received per agent between the selected dates',             icon: TrendingDown, params: 'date_range' },
  { value: 'MONTHLY_LOAN_BOOK_SNAPSHOT', label: 'Loan book',         description: 'Uploaded loan book snapshot for the selected month',                   icon: BookOpen,     params: 'month_year' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
}

export function ReportGenerateModal({ isOpen, onClose, onSuccess, organizationId }: Props) {
  const [selected,     setSelected]     = useState<ReportType | null>(null);
  const [dropOpen,     setDropOpen]     = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('EXCEL');
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [month,        setMonth]        = useState(new Date().getMonth() + 1);
  const [year,         setYear]         = useState(new Date().getFullYear());
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) { setSelected(null); setDropOpen(false); setError(null); }
  }, [isOpen]);

  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  if (!isOpen) return null;

  const selectedDef = REPORT_TYPES.find(t => t.value === selected) ?? null;
  const needsDateRange = selectedDef?.params === 'date_range';
  const needsMonthYear = selectedDef?.params === 'month_year';

  const handleSubmit = async () => {
    if (!selected) { setError('Select a report type.'); return; }
    setLoading(true); setError(null);
    try {
      await apiClient.post('/api/v1/reports/generate', {
        organizationId,
        reportType: selected,
        exportFormat,
        ...(needsDateRange ? { fromDate: fromDate || undefined, toDate: toDate || undefined } : {}),
        ...(needsMonthYear ? { month, year } : {}),
      });
      onSuccess(); onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate report.');
    } finally { setLoading(false); }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div className="ds-modal-overlay" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
        <motion.div className="ds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, overflow: 'visible' }}
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
          
          <div className="ds-modal-header">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="ds-modal-title">Generate report</span>
              <span className="db-kpi2-foot-meta" style={{ marginTop: 4 }}>Select a report type and we'll queue it</span>
            </div>
            <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* Report type select */}
          <div style={{ position: 'relative' }}>
            <span className="ds-label" style={{ display: 'block', marginBottom: 6 }}>Report type</span>
            <div ref={selectRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setDropOpen(o => !o)}
                style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--bg-surface)', border: `1px solid ${dropOpen ? 'var(--ink-solid)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', outline: 'none' }}
              >
                <span style={{ flex: 1, fontSize: 13, textAlign: 'left', color: selected ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}>
                  {selectedDef?.label ?? 'Select a report type…'}
                </span>
                <ChevronDown size={14} style={{ color: 'var(--ink-tertiary)', transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
              </button>

              <AnimatePresence>
                {dropOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                    style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', zIndex: 100 }}
                  >
                    {REPORT_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => { setSelected(t.value); setDropOpen(false); }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: selected === t.value ? 'var(--bg-active)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}
                          className="is-hoverable"
                        >
                          <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.params === 'date_range' ? 'var(--bg-subtle)' : 'var(--success-subtle)', color: t.params === 'date_range' ? 'var(--ink-solid)' : 'var(--success)', flexShrink: 0 }}>
                            <Icon size={14} />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>{t.label}</span>
                            <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{t.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Period params */}
          <AnimatePresence mode="wait">
            {needsDateRange && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px 14px', marginTop: 16 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-tertiary)', marginBottom: 10, display: 'block' }}>Period</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <span className="ds-label" style={{ marginBottom: 5, display: 'block' }}>From</span>
                      <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="ds-input" style={{ width: '100%', height: 32 }} />
                    </div>
                    <div>
                      <span className="ds-label" style={{ marginBottom: 5, display: 'block' }}>To</span>
                      <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="ds-input" style={{ width: '100%', height: 32 }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {needsMonthYear && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px 14px', marginTop: 16 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-tertiary)', marginBottom: 10, display: 'block' }}>Period</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <span className="ds-label" style={{ marginBottom: 5, display: 'block' }}>Month</span>
                      <select value={month} onChange={e => setMonth(Number(e.target.value))} className="ds-input" style={{ width: '100%', height: 32 }}>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="ds-label" style={{ marginBottom: 5, display: 'block' }}>Year</span>
                      <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="ds-input" style={{ width: '100%', height: 32 }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Format */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" onClick={() => setExportFormat('PDF')}
              className={`ds-btn ${exportFormat === 'PDF' ? 'is-primary' : 'is-secondary'}`} style={{ flex: 1, height: 36 }}>
              <FileIcon size={14} /> PDF
            </button>
            <button type="button" onClick={() => setExportFormat('EXCEL')}
              className={`ds-btn ${exportFormat === 'EXCEL' ? 'is-primary' : 'is-secondary'}`} style={{ flex: 1, height: 36 }}>
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 30%, var(--border))', color: 'var(--danger)', fontSize: 12.5, marginTop: 16 }}>
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}

          <div className="ds-modal-actions" style={{ marginTop: 24 }}>
            <button type="button" onClick={onClose} className="ds-btn is-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading || !selected} className="ds-btn is-primary" style={{ flex: 1 }}>
              {loading && <Loader2 size={14} className="ds-spin" />}
              {loading ? 'Queueing…' : 'Generate'}
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

