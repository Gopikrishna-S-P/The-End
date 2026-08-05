import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { reconciliationApi } from '../api/reconciliationApi';
import { useAuth } from '../AuthContext';
import type { ReconciliationRunResponse } from '../types';
import { Landmark, RefreshCw, UploadCloud, ChevronRight } from 'lucide-react';
import ReconciliationRunDetailDrawer from './ReconciliationRunDetailDrawer';
import { ReconciliationIngestModal } from './ReconciliationIngestModal';
import { fmtDate, fmtDT } from './LoanDetailHelpers';
import { Pagination } from '../components/Pagination';
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
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <div className="db-page-header">
          <div className="db-page-header-left">
            <div className="db-page-titles">
              <h1 className="db-page-title">Reconciliation</h1>
              {!loading && totalElements > 0 && (
                <span className="db-page-org">{totalElements.toLocaleString('en-IN')} runs</span>
              )}
            </div>
          </div>
        </div>

        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', ...(runs.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => setShowIngestModal(true)} className="ds-btn is-primary" style={{ height: 36 }}>
                  <UploadCloud size={14} /> Ingest statement
                </button>
                <button type="button" onClick={fetchRuns} disabled={loading} className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                  <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
                </button>
              </div>
            </header>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 0 }}>
              {loadError ? (
                <div className="ds-empty" style={{ padding: '60px 0' }}>
                  <span className="ds-empty-title">Reconciliation runs could not be loaded.</span>
                  <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                    <button type="button" onClick={fetchRuns} className="ds-btn is-secondary">Retry</button>
                  </div>
                </div>
              ) : loading ? (
                <div style={{ padding: '8px' }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="dd-case-skel" style={{ opacity: 1 - i * 0.09, padding: '16px 0', display: 'flex', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="ds-skel" style={{ height: 16, width: '40%' }} />
                        <span className="ds-skel" style={{ height: 12, width: '25%' }} />
                      </div>
                      <span className="ds-skel" style={{ height: 18, width: 80 }} />
                    </div>
                  ))}
                </div>
              ) : runs.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <Landmark size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No reconciliation runs yet</span>
                  <span className="ds-empty-sub">Ingest a bank statement to match it against recorded payment transactions.</span>
                  <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                    <button type="button" onClick={() => setShowIngestModal(true)} className="ds-btn is-primary">Ingest statement</button>
                  </div>
                </motion.div>
              ) : (
                <motion.div>
                  {runs.map((r, idx) => (
                    <motion.button
                      key={r.id}
                      variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                      initial="hidden" animate="show"
                      className="db-att-row"
                      style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 0, width: '100%', textAlign: 'left', background: selected?.id === r.id ? 'var(--bg-active)' : 'transparent' }}
                      onClick={() => setSelected(r)}
                      whileHover={{ background: 'var(--bg-subtle)' }}
                    >
                      <div style={{ flex: 1, marginLeft: 0, minWidth: 0 }}>
                        <span className="db-att-label" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Landmark size={13} style={{ color: 'var(--ink-tertiary)' }} />
                          {r.source}
                        </span>
                        <div className="db-ml-tooltip-row" style={{ gap: 16, padding: 0, marginTop: 10, flexWrap: 'wrap' }}>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            As of {fmtDate(r.asOfDate)}
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            / {r.rowsIngested.toLocaleString('en-IN')} rows
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            / {r.matched.toLocaleString('en-IN')} matched
                          </span>
                          {r.exceptions > 0 && (
                            <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--danger)' }}>
                              / {r.exceptions.toLocaleString('en-IN')} exceptions
                            </span>
                          )}
                          <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                            / Ingested {fmtDT(r.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
                            {matchRate(r)}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>match rate</span>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--ink-tertiary)' }} />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>

            {totalPages > 1 && !loading && (
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalElements={totalElements} itemLabel="runs" />
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
