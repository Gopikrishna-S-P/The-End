import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportsApi } from '../api/reportsApi';
import { Modal, ModalFooter, FormSection, Input } from './PlatformSetupShared';
import './Dashboard.css';
import type { ReportType, ExportFormat } from '../types';
import {
  FileSpreadsheet, File as FileIcon, AlertCircle, ChevronDown,
  Users, CalendarDays, TrendingDown, BookOpen, Shuffle, Landmark
} from 'lucide-react';

// Ground truth: ReportingServiceImpl.buildReportData() only has an explicit case
// (real data, not the empty-Map fallback) for these report types — every other
// ReportType enum value (AGENCY_PERFORMANCE, NPA_IDENTIFICATION, MIS_EOD) falls
// through to a placeholder `Map.of("reportType", ...)` with no real content, so
// they are intentionally NOT offered here to avoid generating misleading exports.
// (NPA and MIS_EOD both already have dedicated live-view endpoints that don't
// need the async export-job flow at all.)
const REPORT_TYPES: {
  value: ReportType;
  label: string;
  description: string;
  icon: React.ElementType;
  params: 'date_range' | 'month_year';
}[] = [
  { value: 'AGENT_PERFORMANCE',          label: 'Agent performance',     description: 'Agent-wise visit rate, collection score and amounts for the period', icon: Users,        params: 'date_range' },
  { value: 'TEAM_PERFORMANCE',           label: 'Team performance',      description: 'Org-wide totals and per-agent breakdown for the period',            icon: Users,        params: 'date_range' },
  { value: 'DAILY_VISIT_COMPLETION',     label: 'Visit report',          description: 'Total visits completed per agent between the selected dates',       icon: CalendarDays, params: 'date_range' },
  { value: 'MONTHLY_VISIT_COMPLETION',   label: 'Monthly visit report',  description: 'Visit completion rolled up for the full period selected',           icon: CalendarDays, params: 'date_range' },
  { value: 'COLLECTION_EFFICIENCY',      label: 'Collection report',     description: 'Collections received per agent between the selected dates',         icon: TrendingDown, params: 'date_range' },
  { value: 'REASSIGNMENT_FREQUENCY',     label: 'Reassignment report',   description: 'How often cases were reassigned between agents in the period',      icon: Shuffle,      params: 'date_range' },
  { value: 'MONTHLY_LOAN_BOOK_SNAPSHOT', label: 'Loan book',             description: 'Uploaded loan book snapshot for the selected month',                 icon: BookOpen,     params: 'month_year' },
  { value: 'BANK_RECONCILIATION',        label: 'Bank reconciliation',   description: 'Deposited vs pending collections for the selected month',           icon: Landmark,     params: 'month_year' },
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
      await reportsApi.generateReport({
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

  return (
    <Modal title="Generate report" subtitle="Select a report type and we'll queue it" onClose={onClose}>
      <FormSection title="Report type">
        <div ref={selectRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setDropOpen(o => !o)}
            className="ds-select"
            style={{ width: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ flex: 1, fontSize: 13, color: selected ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
              {selectedDef?.label ?? 'Select a report type…'}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--ink-tertiary)', transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
          </button>

          <AnimatePresence>
            {dropOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', zIndex: 100, maxHeight: 280, overflowY: 'auto' }}
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
      </FormSection>

      <AnimatePresence mode="wait">
        {needsDateRange && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <FormSection title="Period">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Input label="From" type="date" value={fromDate} onChange={setFromDate} />
                <Input label="To" type="date" value={toDate} onChange={setToDate} />
              </div>
            </FormSection>
          </motion.div>
        )}

        {needsMonthYear && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <FormSection title="Period">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="ds-field">
                  <label className="ds-label">Month</label>
                  <div className="ps-select-wrap">
                    <select value={month} onChange={e => setMonth(Number(e.target.value))} className="ds-select" style={{ width: '100%' }}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-tertiary)', pointerEvents: 'none' }} />
                  </div>
                </div>
                <Input label="Year" type="number" value={String(year)} onChange={v => setYear(Number(v) || year)} />
              </div>
            </FormSection>
          </motion.div>
        )}
      </AnimatePresence>

      <FormSection title="Format">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setExportFormat('PDF')}
            className={`ds-btn ${exportFormat === 'PDF' ? 'is-primary' : 'is-secondary'}`} style={{ flex: 1 }}>
            <FileIcon size={14} /> PDF
          </button>
          <button type="button" onClick={() => setExportFormat('EXCEL')}
            className={`ds-btn ${exportFormat === 'EXCEL' ? 'is-primary' : 'is-secondary'}`} style={{ flex: 1 }}>
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </FormSection>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 30%, var(--border))', color: 'var(--danger)', fontSize: 12.5, marginBottom: 4 }}>
          <AlertCircle size={14} /><span>{error}</span>
        </div>
      )}

      <ModalFooter onClose={onClose} submitting={loading} onSubmit={handleSubmit} label="Generate" />
    </Modal>
  );
}
