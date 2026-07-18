import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { reconciliationApi } from '../api/reconciliationApi';
import { useAuth } from '../AuthContext';
import type { ReconciliationRunResponse } from '../types';
import { Landmark, RefreshCw, ChevronLeft, ChevronRight, UploadCloud } from 'lucide-react';
import ReconciliationRunDetailDrawer from './ReconciliationRunDetailDrawer';
import { ReconciliationIngestModal } from './ReconciliationIngestModal';
import { fmtDate, fmtDT } from './LoanDetailHelpers';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE = 20;

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } };
const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.24, ease: 'easeOut' } } };

export default function ReconciliationPage() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const [runs, setRuns]                   = useState<ReconciliationRunResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selected, setSelected]           = useState<ReconciliationRunResponse | null>(null);
  const [showIngestModal, setShowIngestModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchRuns = useCallback(async () => {
    if (!organizationId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setLoadError(false);
    try {
      const data = await reconciliationApi.listRuns({ orgId: organizationId, page, size: PAGE_SIZE }, controller.signal);
      setRuns(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [organizationId, page]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const matchRate = (r: ReconciliationRunResponse) =>
    r.rowsIngested > 0 ? `${((r.matched / r.rowsIngested) * 100).toFixed(0)}%` : '—';

  return (
    <div className="db-root">
      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="db-card-title">Reconciliation</h2>
                {!loading && totalElements > 0 && (
                  <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                    / {totalElements.toLocaleString('en-IN')} runs
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <button type="button" onClick={() => setShowIngestModal(true)} className="ds-btn is-primary" style={{ height: 36 }}>
                  <UploadCloud size={14} /> Ingest statement
                </button>
                <button type="button" onClick={fetchRuns} disabled={loading} className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                  <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
                </button>
              </div>
            </header>

            <div className="ds-table-wrap" style={{ border: 'none' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Source</th>
                    <th style={{ padding: '12px 16px' }}>As of</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>Rows</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>Matched</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>Exceptions</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>Match rate</th>
                    <th style={{ padding: '12px 16px' }}>Ingested</th>
                    <th className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {loadError ? (
                    <tr><td colSpan={8}>
                      <div className="ds-empty" style={{ padding: '60px 0' }}>
                        <span className="ds-empty-title">Reconciliation runs could not be loaded.</span>
                        <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                          <button type="button" onClick={fetchRuns} className="ds-btn is-secondary">Retry</button>
                        </div>
                      </div>
                    </td></tr>
                  ) : loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.1, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: 130, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 80, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 40, marginLeft: 'auto', display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 40, marginLeft: 'auto', display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 40, marginLeft: 'auto', display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 40, marginLeft: 'auto', display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 100, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 22, width: 28, borderRadius: 6, marginLeft: 'auto', display: 'block' }} /></td>
                      </tr>
                    ))
                  ) : runs.length === 0 ? (
                    <tr><td colSpan={8}>
                      <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                        <Landmark size={32} className="ds-empty-icon" />
                        <span className="ds-empty-title">No reconciliation runs yet</span>
                        <span className="ds-empty-sub">Ingest a bank statement to match it against recorded payment transactions.</span>
                        <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                          <button type="button" onClick={() => setShowIngestModal(true)} className="ds-btn is-primary">Ingest statement</button>
                        </div>
                      </motion.div>
                    </td></tr>
                  ) : (
                    runs.map((r, idx) => (
                      <motion.tr
                        key={r.id}
                        variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                        initial="hidden" animate="show"
                        className={selected?.id === r.id ? 'is-selected' : ''}
                        onClick={() => setSelected(r)}
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td style={{ padding: '12px 16px', paddingLeft: 24, fontWeight: 600 }}>{r.source}</td>
                        <td style={{ padding: '12px 16px' }}>{fmtDate(r.asOfDate)}</td>
                        <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{r.rowsIngested.toLocaleString('en-IN')}</td>
                        <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{r.matched.toLocaleString('en-IN')}</td>
                        <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: r.exceptions > 0 ? 'var(--danger)' : undefined }}>{r.exceptions.toLocaleString('en-IN')}</td>
                        <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{matchRate(r)}</td>
                        <td style={{ padding: '12px 16px' }}>{fmtDT(r.createdAt)}</td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>
                          <button type="button" className="ds-btn is-secondary is-sm" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>Open</button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && !loading && (
              <div className="up-pagination" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                <span className="up-page-meta">
                  Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong> · <strong>{totalElements.toLocaleString('en-IN')}</strong> runs
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
          </motion.section>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && (
          <ReconciliationRunDetailDrawer run={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIngestModal && (
          <ReconciliationIngestModal
            onClose={() => setShowIngestModal(false)}
            onSuccess={() => { setShowIngestModal(false); fetchRuns(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
