import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { fraudCasesApi } from '../api/fraudCasesApi';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { FraudCaseResponse, FraudCaseStatus } from '../types';
import { ShieldAlert, RefreshCw, Plus, ChevronRight } from 'lucide-react';
import FraudCaseDetailDrawer from './FraudCaseDetailDrawer';
import { FraudCaseCreateModal } from './FraudCaseCreateModal';
import { FRAUD_PILL } from './BorrowersHelpers';
import { fmtDate, fmtCurrency } from './LoanDetailHelpers';
import { Pagination } from '../components/Pagination';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE = 25;

const STATUS_OPTIONS: Array<{ value: FraudCaseStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'REPORTED', label: 'Reported' },
  { value: 'UNDER_INVESTIGATION', label: 'Under investigation' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
];

const CATEGORY_LABEL: Record<string, string> = {
  CHEATING_AND_FORGERY: 'Cheating & forgery',
  MISAPPROPRIATION: 'Misappropriation',
  FRAUDULENT_ENCASHMENT: 'Fraudulent encashment',
  UNAUTHORISED_CREDIT_FACILITIES: 'Unauthorised credit',
  DOCUMENTATION_FRAUD: 'Documentation fraud',
  CYBER_FRAUD: 'Cyber fraud',
  OTHER: 'Other',
};

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } };
const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.24, ease: 'easeOut' } } };

export default function FraudCasesPage() {
  const { user } = useAuth();
  const { hasRole } = usePermissions();
  const canTransition = hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN');
  const organizationId = user?.organizationId || '';

  const [cases, setCases]                 = useState<FraudCaseResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter]   = useState<FraudCaseStatus | ''>('');
  const [selected, setSelected]           = useState<FraudCaseResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchCases = useCallback(async () => {
    if (!organizationId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setLoadError(false);
    try {
      const data = await fraudCasesApi.list({
        orgId: organizationId,
        status: statusFilter || undefined,
        page, size: PAGE_SIZE,
      }, controller.signal);
      setCases(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [organizationId, statusFilter, page]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleChanged = (updated: FraudCaseResponse) => {
    setSelected(updated);
    setCases(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <div className="db-page-header">
          <div className="db-page-header-left">
            <div className="db-page-titles">
              <h1 className="db-page-title">Fraud Cases</h1>
              {!loading && totalElements > 0 && (
                <span className="db-page-org">{totalElements.toLocaleString('en-IN')} records</span>
              )}
            </div>
          </div>
        </div>

        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', ...(cases.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="ds-select"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as FraudCaseStatus | ''); setPage(0); }}
                  style={{ height: 36 }}
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {canTransition && (
                  <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary" style={{ height: 36 }}>
                    <Plus size={14} /> Report case
                  </button>
                )}
                <button type="button" onClick={fetchCases} disabled={loading} className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                  <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
                </button>
              </div>
            </header>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 0 }}>
              {loadError ? (
                <div className="ds-empty" style={{ padding: '60px 0' }}>
                  <span className="ds-empty-title">Fraud cases could not be loaded.</span>
                  <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                    <button type="button" onClick={fetchCases} className="ds-btn is-secondary">Retry</button>
                  </div>
                </div>
              ) : loading ? (
                <div style={{ padding: '8px' }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="dd-case-skel" style={{ opacity: 1 - i * 0.09, padding: '16px 0', display: 'flex', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="ds-skel" style={{ height: 16, width: '40%' }} />
                        <span className="ds-skel" style={{ height: 12, width: '25%' }} />
                      </div>
                      <span className="ds-skel" style={{ height: 18, width: 80 }} />
                    </div>
                  ))}
                </div>
              ) : cases.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <ShieldAlert size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No fraud cases on file</span>
                  <span className="ds-empty-sub">
                    {statusFilter ? 'No cases match this status filter.' : 'Cases reported under the RBI Master Direction on Frauds will appear here.'}
                  </span>
                  {canTransition && !statusFilter && (
                    <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                      <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary">Report case</button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div>
                  {cases.map((c, idx) => (
                    <motion.button
                      key={c.id}
                      variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                      initial="hidden" animate="show"
                      className="db-att-row"
                      style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 0, width: '100%', textAlign: 'left', background: selected?.id === c.id ? 'var(--bg-active)' : 'transparent' }}
                      onClick={() => setSelected(c)}
                      whileHover={{ background: 'var(--bg-subtle)' }}
                    >
                      <div style={{ flex: 1, marginLeft: 0, minWidth: 0 }}>
                        <span className="db-att-label" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ShieldAlert size={13} style={{ color: 'var(--ink-tertiary)' }} />
                          {CATEGORY_LABEL[c.category] || c.category}
                        </span>
                        <div className="db-ml-tooltip-row" style={{ gap: 16, padding: 0, marginTop: 10, flexWrap: 'wrap' }}>
                          <span className={`ds-pill ${FRAUD_PILL[c.status]}`}>{c.status.replace(/_/g, ' ')}</span>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            {c.caseNumber}
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                            / Reported {fmtDate(c.reportedAt)}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
                          {c.amountInvolved != null ? fmtCurrency(c.amountInvolved) : '—'}
                        </span>
                        <ChevronRight size={16} style={{ color: 'var(--ink-tertiary)' }} />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>

            {totalPages > 1 && !loading && (
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalElements={totalElements} itemLabel="records" />
            )}
          </motion.section>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && (
          <FraudCaseDetailDrawer
            fraudCase={selected}
            onClose={() => setSelected(null)}
            onChanged={handleChanged}
            canTransition={canTransition}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <FraudCaseCreateModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => { setShowCreateModal(false); fetchCases(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
