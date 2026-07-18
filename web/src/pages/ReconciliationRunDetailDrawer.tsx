import { useCallback, useEffect, useState } from 'react';
import { X, Loader2, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { reconciliationApi } from '../api/reconciliationApi';
import type { ReconciliationRunResponse, ReconciliationOutcome, BankStatementRowResponse } from '../types';
import { fmtDate, fmtDT } from './LoanDetailHelpers';
import { RECON_PILL } from './BorrowersHelpers';
import '../styles/AppPage.css';
import '../styles/PtpsPage.css';

const ROW_PAGE_SIZE = 20;

const OUTCOME_OPTIONS: Array<{ value: ReconciliationOutcome | ''; label: string }> = [
  { value: '', label: 'All rows' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'AMOUNT_DIFF', label: 'Amount diff' },
  { value: 'UNMATCHED', label: 'Unmatched' },
  { value: 'DUPLICATE', label: 'Duplicate' },
  { value: 'EXCEPTION', label: 'Exception' },
];

export interface ReconciliationRunDetailDrawerProps {
  run: ReconciliationRunResponse;
  onClose: () => void;
}

export default function ReconciliationRunDetailDrawer({ run, onClose }: ReconciliationRunDetailDrawerProps) {
  const [outcome, setOutcome] = useState<ReconciliationOutcome | ''>('');
  const [rows, setRows]       = useState<BankStatementRowResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    reconciliationApi.listRows(run.id, { outcome: outcome || undefined, page, size: ROW_PAGE_SIZE })
      .then(data => {
        setRows(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [run.id, outcome, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [outcome]);

  return (
    <>
      <div className="ds-drawer-overlay" onClick={onClose} />
      <div className="ds-drawer" role="dialog" aria-modal="true" style={{ width: 620, maxWidth: '92vw' }}>
        <div className="ds-drawer-header">
          <div className="ptp-drawer-title-col">
            <div className="ptp-drawer-title">{run.source}</div>
            <div className="ptp-drawer-sub-meta">As of {fmtDate(run.asOfDate)}</div>
            <div className="ptp-drawer-sub">Ingested {fmtDT(run.createdAt)}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-drawer-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-drawer-body">
          <div className="ptp-stat-grid">
            <div className="ptp-stat is-accent">
              <div className="ptp-stat-label">Rows ingested</div>
              <div className="ptp-stat-value is-mono">{run.rowsIngested.toLocaleString('en-IN')}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Matched</div>
              <div className="ptp-stat-value is-mono">{run.matched.toLocaleString('en-IN')}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Unmatched</div>
              <div className="ptp-stat-value is-mono">{run.unmatched.toLocaleString('en-IN')}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Amount diff</div>
              <div className="ptp-stat-value is-mono">{run.amountDiff.toLocaleString('en-IN')}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Duplicates</div>
              <div className="ptp-stat-value is-mono">{run.duplicates.toLocaleString('en-IN')}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Exceptions</div>
              <div className="ptp-stat-value is-mono">{run.exceptions.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ListFilter size={13} style={{ color: 'var(--ink-tertiary)' }} />
              <span className="db-section-label" style={{ padding: 0 }}>Rows</span>
              <select className="ds-select is-sm" style={{ marginLeft: 'auto', height: 28, fontSize: 12 }}
                value={outcome} onChange={(e) => setOutcome(e.target.value as ReconciliationOutcome | '')}>
                {OUTCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {loading ? (
              <span className="ptp-loading"><Loader2 size={12} className="ds-spin" /> Loading…</span>
            ) : rows.length === 0 ? (
              <p className="ptp-no-history">No rows for this filter.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map(r => (
                  <div key={r.id} className="ds-card" style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.utr || r.txnRef || '—'}</span>
                      <span className={`ds-pill ${RECON_PILL[r.outcome]}`}>{r.outcome.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>{fmtDate(r.valueDate)}{r.narration ? ` · ${r.narration}` : ''}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(r.amount))}
                      </span>
                    </div>
                    {r.matchNotes && <p style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 4 }}>{r.matchNotes}</p>}
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && !loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>
                  Page {page + 1} of {totalPages} · {totalElements.toLocaleString('en-IN')} rows
                </span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  <button type="button" className="up-page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page">
                    <ChevronLeft size={14} />
                  </button>
                  <button type="button" className="up-page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page + 1 >= totalPages} aria-label="Next page">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
