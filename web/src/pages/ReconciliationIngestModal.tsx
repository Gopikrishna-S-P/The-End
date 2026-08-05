import { useMemo, useState } from 'react';
import { reconciliationApi } from '../api/reconciliationApi';
import { useAuth } from '../AuthContext';
import type { BankStatementRowRequest } from '../types';
import { X, Loader2, AlertCircle, UploadCloud } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow extends BankStatementRowRequest {
  lineNo: number;
}

const PLACEHOLDER =
  `utr,txnRef,amount,valueDate,narration,sourceRowId
UTR2024071800123,TXN-9981,15000,2026-07-15,NEFT collection - loan 88213,row-1
,TXN-9982,7500.50,2026-07-16,UPI collection,row-2`;

/** Simple CSV split — handles unquoted commas only, sufficient for bank-statement pastes. */
function parseCsv(raw: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: [] };

  let dataLines = lines;
  const firstCols = lines[0].split(',').map(c => c.trim().toLowerCase());
  if (firstCols.includes('amount') && firstCols.includes('valuedate')) {
    dataLines = lines.slice(1); // header row present, skip it
  }

  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  dataLines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const cols = line.split(',').map(c => c.trim());
    const [utr, txnRef, amountStr, valueDate, narration, sourceRowId] = cols;
    const amount = Number(amountStr);
    if (!amountStr || Number.isNaN(amount) || amount <= 0) {
      errors.push(`Line ${lineNo}: amount "${amountStr || ''}" is missing or not a positive number.`);
      return;
    }
    if (!valueDate || !/^\d{4}-\d{2}-\d{2}$/.test(valueDate)) {
      errors.push(`Line ${lineNo}: valueDate "${valueDate || ''}" must be YYYY-MM-DD.`);
      return;
    }
    rows.push({
      lineNo,
      utr: utr || undefined,
      txnRef: txnRef || undefined,
      amount,
      valueDate,
      narration: narration || undefined,
      sourceRowId: sourceRowId || undefined,
    });
  });
  return { rows, errors };
}

async function sha256Hex(text: string): Promise<string | undefined> {
  try {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined; // non-HTTPS / unsupported context — statementHash is optional, ingest still works
  }
}

export function ReconciliationIngestModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const [source, setSource]     = useState('');
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [csvText, setCsvText]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const { rows, errors } = useMemo(() => parseCsv(csvText), [csvText]);

  const canSubmit = source.trim().length > 0 && asOfDate && rows.length > 0 && organizationId;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError(null);
    try {
      const statementHash = await sha256Hex(csvText.trim());
      await reconciliationApi.ingest({
        organizationId,
        source: source.trim(),
        asOfDate,
        rows: rows.map(({ lineNo, ...r }) => r),
        statementHash,
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to ingest statement.');
      setLoading(false);
    }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: 640, maxWidth: '92vw' }}>
        <div className="ds-modal-header">
          <span className="ds-modal-title">Ingest bank statement</span>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-field">
              <span className="ds-label is-required">Source</span>
              <input type="text" value={source} onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. HDFC-CURRENT-4021" className="ds-input" autoFocus />
            </div>
            <div className="ds-field">
              <span className="ds-label is-required">As-of date</span>
              <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="ds-input" />
            </div>
          </div>

          <div className="ds-field">
            <span className="ds-label is-required">Statement rows (CSV)</span>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={7}
              placeholder={PLACEHOLDER}
              className="ds-textarea"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}
              spellCheck={false}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 4, display: 'block' }}>
              Columns: utr, txnRef, amount, valueDate (YYYY-MM-DD), narration, sourceRowId. UTR or txnRef must be present for a row to match; amount and valueDate are required. A header row is optional and auto-detected.
            </span>
          </div>

          {csvText.trim() && (
            <div style={{ display: 'flex', gap: 12, fontSize: 12, marginTop: 4 }}>
              <span style={{ color: 'var(--success)' }}>{rows.length} valid row{rows.length === 1 ? '' : 's'}</span>
              {errors.length > 0 && <span style={{ color: 'var(--danger)' }}>{errors.length} invalid line{errors.length === 1 ? '' : 's'}</span>}
            </div>
          )}

          {errors.length > 0 && (
            <div className="ds-card" style={{ padding: 10, marginTop: 8, maxHeight: 100, overflowY: 'auto', background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)' }}>
              {errors.map((e, i) => <p key={i} style={{ fontSize: 11.5, color: 'var(--danger)', margin: '2px 0' }}>{e}</p>)}
            </div>
          )}

          {error && (
            <div className="ptp-modal-error" role="alert">
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}
        </div>

        <div className="ds-modal-actions">
          <button type="button" onClick={onClose} className="ds-btn is-secondary">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit || loading} className="ds-btn is-primary">
            {loading ? <Loader2 size={14} className="ds-spin" /> : <UploadCloud size={14} />}
            {loading ? 'Ingesting…' : `Ingest ${rows.length || ''} row${rows.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
