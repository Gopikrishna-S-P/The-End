import { useState } from 'react';
import { X, Download, Loader2, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react';
import { visitsApi } from '../api/visitsApi';
import { buildExportRows, triggerCsvDownload, triggerXlsxDownload } from '../utils/visitExport';

interface Props { onClose: () => void; }

type Format = 'xlsx' | 'csv';
type Preset = 'all' | 'today' | 'month' | 'year' | 'custom';

const todayIso     = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const monthStartIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const yearStartIso  = () => `${new Date().getFullYear()}-01-01`;

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'all',    label: 'All time' },
  { key: 'today',  label: 'Today' },
  { key: 'month',  label: 'This month' },
  { key: 'year',   label: 'This year' },
  { key: 'custom', label: 'Custom' },
];

export default function VisitExportModal({ onClose }: Props) {
  const [format,     setFormat]     = useState<Format>('xlsx');
  const [preset,     setPreset]     = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [progress,   setProgress]   = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [exporting,  setExporting]  = useState(false);

  const dateRange = (): { from?: string; to?: string } => {
    switch (preset) {
      case 'today': return { from: todayIso(),      to: todayIso() };
      case 'month': return { from: monthStartIso(), to: todayIso() };
      case 'year':  return { from: yearStartIso(),  to: todayIso() };
      case 'custom': return { from: customFrom || undefined, to: customTo || undefined };
      default: return {};
    }
  };

  const doExport = async () => {
    setExporting(true); setError(null);
    try {
      setProgress('Fetching visit logs…');
      let visits = await visitsApi.listAllForExport();

      const { from, to } = dateRange();
      if (from || to) {
        visits = visits.filter(v => {
          const d = v.visitDate;
          return !(from && d < from) && !(to && d > to);
        });
      }

      if (visits.length === 0) {
        setError('No visit logs found for the selected date range.');
        return;
      }

      setProgress('Building file…');
      const rows = buildExportRows(visits);
      const ts = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      if (format === 'xlsx') triggerXlsxDownload(rows, `visit-logs-${ts}.xlsx`);
      else                   triggerCsvDownload(rows, `visit-logs-${ts}.csv`);

      onClose();
    } catch (err: unknown) {
      console.error('[VisitExport] export failed:', err);
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const networkErr = (err as { code?: string })?.code === 'ERR_NETWORK' || (err as { message?: string })?.message?.includes('Network Error');
      setError(axiosMsg ?? (networkErr ? 'Cannot reach server — make sure the backend is running.' : 'Export failed. Please try again.'));
    } finally {
      setExporting(false); setProgress(null);
    }
  };

  return (
    <div
      className="ds-modal-overlay"
      role="dialog" aria-modal="true" aria-labelledby="vex-title"
      onClick={e => { if (e.target === e.currentTarget && !exporting) onClose(); }}
    >
      <div className="app-page-modal">
        <div className="ds-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div className="ds-modal-header-icon"><Download size={16} /></div>
            <div>
              <div className="ds-modal-title" id="vex-title">Export visit logs</div>
              <div className="ds-modal-sub">Choose format and date range</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close" disabled={exporting}>
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          {error && (
            <div className="vis-banner is-error" role="alert">
              <AlertCircle size={14} />
              <span className="vis-banner-content">{error}</span>
            </div>
          )}
          {progress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-subtle)', color: 'var(--ink-solid)', fontSize: 13.5 }}>
              <Loader2 size={14} className="ds-spin" style={{ flexShrink: 0 }} />
              {progress}
            </div>
          )}

          {/* Format picker */}
          <div className="vis-export-field">
            <span className="ds-label">File format</span>
            <div style={{ display: 'flex', gap: 10 }}>
              {([
                ['xlsx', 'Excel (.xlsx)', FileSpreadsheet],
                ['csv',  'CSV (.csv)',    FileText],
              ] as const).map(([val, label, Icon]) => (
                <label key={val} style={{
                  display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '10px 14px',
                  borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${format === val ? 'var(--ink-solid)' : 'var(--border)'}`,
                  background: format === val ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                  color: format === val ? 'var(--ink-solid)' : 'var(--ink-secondary)',
                  transition: 'all 150ms var(--ease)',
                }}>
                  <input type="radio" name="vex-format" value={val} checked={format === val}
                    onChange={() => setFormat(val)} style={{ display: 'none' }} />
                  <Icon size={15} />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="vis-export-field">
            <span className="ds-label">Date range</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESETS.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setPreset(key)} style={{
                  padding: '5px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                  border: `1px solid ${preset === key ? 'var(--ink-solid)' : 'var(--border)'}`,
                  background: preset === key ? 'var(--bg-subtle)' : 'var(--bg-subtle)',
                  color: preset === key ? 'var(--ink-solid)' : 'var(--ink-secondary)',
                  transition: 'all 150ms var(--ease)',
                }}>{label}</button>
              ))}
            </div>
            {preset === 'custom' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="ds-input" style={{ flex: 1 }} />
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="ds-input" style={{ flex: 1 }} />
              </div>
            )}
          </div>
        </div>

        <div className="ds-modal-actions">
          <button type="button" onClick={onClose} className="ds-btn is-secondary" disabled={exporting}>
            Cancel
          </button>
          <button type="button" onClick={doExport} disabled={exporting} className="ds-btn is-primary">
            {exporting
              ? <><Loader2 size={14} className="ds-spin" /> {progress ?? 'Exporting…'}</>
              : <><Download size={14} /> Export as {format.toUpperCase()}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
