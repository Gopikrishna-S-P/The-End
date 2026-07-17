import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle2, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import { visitsApi } from '../api/visitsApi';
import type { VisitImportResult, VisitImportRowError } from '../types';

interface Props {
  onClose: () => void;
  onDone?: () => void;
}

const TEMPLATE_HEADERS = [
  'Loan Number', 'Agent Email', 'Visit Date',
  'Disposition', 'Contactability', 'Contact Person',
  'Contact Number', 'Amount Collected', 'Visit Notes',
];

const DISP_VALUES = 'PAID | RTP | NC_SKIP | PTP | FOLLOW_UP';
const CONTACT_VALUES = 'CONTACTED_AT_RESIDENCE | CONTACTED_AT_OFFICE | CONTACTABLE_ON_PHONE_ONLY | CONTACTABLE_AT_BOTH_PLACES | NON_CONTACTABLE';

function downloadTemplate() {
  const row1 = TEMPLATE_HEADERS.join(',');
  const row2 = '2024001,agent@example.com,01/01/2024,FOLLOW_UP,CONTACTED_AT_RESIDENCE,John Kumar,9876543210,,Visited home — will call next week';
  const blob = new Blob([row1 + '\n' + row2], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'visit_import_template.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function VisitImportModal({ onClose, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<VisitImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Only .xlsx, .xls, or .csv files are accepted.');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0] ?? null);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await visitsApi.importFromExcel(file);
      setResult(res);
      if (res.failed === 0) onDone?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed. Check the file and try again.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 560,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 10 }}>
          <FileSpreadsheet size={18} style={{ color: 'var(--ink-secondary)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ font: '600 15px var(--font-sans)', color: 'var(--ink-primary)' }}>Import Historical Visits</div>
            <div style={{ font: '12px var(--font-sans)', color: 'var(--ink-tertiary)', marginTop: 2 }}>
              Upload an Excel sheet to bulk-add past visit records
            </div>
          </div>
          <button type="button" onClick={onClose} className="ds-btn is-secondary is-sm" aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Template download */}
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--ink-primary)', fontWeight: 500 }}>
                Required columns
              </div>
              <div style={{ font: '11.5px/1.5 var(--font-sans)', color: 'var(--ink-tertiary)', marginTop: 4 }}>
                <strong>Loan Number</strong>, <strong>Agent Email</strong>, <strong>Visit Date</strong> (dd/MM/yyyy)
              </div>
              <div style={{ font: '11px var(--font-mono)', color: 'var(--ink-tertiary)', marginTop: 6, lineHeight: 1.6 }}>
                Disp: {DISP_VALUES}<br />
                Contactability: {CONTACT_VALUES}
              </div>
            </div>
            <button type="button" className="ds-btn is-secondary is-sm" onClick={downloadTemplate} style={{ flexShrink: 0 }}>
              <Download size={13} style={{ marginRight: 4 }} /> Template
            </button>
          </div>

          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `1.5px dashed ${file ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '28px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'var(--success-subtle)' : 'var(--bg-subtle)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <Upload size={24} style={{ color: file ? 'var(--success)' : 'var(--ink-tertiary)', marginBottom: 8 }} />
              {file ? (
                <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--ink-primary)', fontWeight: 500 }}>
                  {file.name}
                  <div style={{ font: '12px var(--font-sans)', color: 'var(--ink-tertiary)', marginTop: 4 }}>
                    Click to change file
                  </div>
                </div>
              ) : (
                <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--ink-secondary)' }}>
                  Drag & drop your Excel file here<br />
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>or click to browse — .xlsx, .xls, .csv</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px',
                  background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)',
                  borderRadius: 8, overflow: 'hidden',
                }}
              >
                <AlertCircle size={14} style={{ color: 'var(--danger)', marginTop: 1, flexShrink: 0 }} />
                <span style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--danger)' }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Summary band */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="ds-card is-pad" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                  <div style={{ font: '700 22px var(--font-mono)', color: 'var(--ink-primary)' }}>{result.total}</div>
                  <div style={{ font: '11px var(--font-sans)', color: 'var(--ink-tertiary)', marginTop: 2 }}>Total rows</div>
                </div>
                <div className="ds-card is-pad" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                  <div style={{ font: '700 22px var(--font-mono)', color: 'var(--success)' }}>{result.imported}</div>
                  <div style={{ font: '11px var(--font-sans)', color: 'var(--ink-tertiary)', marginTop: 2 }}>Imported</div>
                </div>
                <div className="ds-card is-pad" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                  <div style={{ font: '700 22px var(--font-mono)', color: result.failed > 0 ? 'var(--danger)' : 'var(--ink-tertiary)' }}>{result.failed}</div>
                  <div style={{ font: '11px var(--font-sans)', color: 'var(--ink-tertiary)', marginTop: 2 }}>Failed</div>
                </div>
              </div>

              {result.failed === 0 ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'var(--success-subtle)', border: '1px solid var(--success-border)', borderRadius: 8 }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  <span style={{ font: '13px var(--font-sans)', color: 'var(--success)' }}>All {result.imported} visits imported successfully.</span>
                </div>
              ) : (
                <ErrorTable errors={result.errors} />
              )}

              {result.imported > 0 && result.failed > 0 && (
                <button type="button" className="ds-btn is-secondary is-sm" onClick={() => { setResult(null); setFile(null); }}>
                  Upload another file
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="ds-btn is-secondary" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            <button
              type="button"
              className="ds-btn is-primary"
              onClick={upload}
              disabled={!file || uploading}
            >
              {uploading ? 'Importing…' : 'Import Visits'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ErrorTable({ errors }: { errors: VisitImportRowError[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ font: '12px var(--font-sans)', color: 'var(--ink-secondary)', fontWeight: 500 }}>
        {errors.length} row{errors.length !== 1 ? 's' : ''} could not be imported
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', position: 'sticky', top: 0 }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-tertiary)', fontWeight: 500, borderBottom: '1px solid var(--border)', width: 48 }}>Row</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-tertiary)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>Loan No.</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-tertiary)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)' }}>{e.row}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)' }}>{e.loanNumber || '—'}</td>
                <td style={{ padding: '6px 10px', color: 'var(--danger)' }}>{e.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
