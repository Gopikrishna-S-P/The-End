import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { fraudCasesApi } from '../api/fraudCasesApi';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { FraudCaseResponse, FraudCaseStatus } from '../types';
import { ShieldAlert, RefreshCw, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import FraudCaseDetailDrawer from './FraudCaseDetailDrawer';
import { FraudCaseCreateModal } from './FraudCaseCreateModal';
import { FRAUD_PILL } from './BorrowersHelpers';
import { fmtDate, fmtCurrency } from './LoanDetailHelpers';
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
    <div className="db-root">
      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="db-card-title">Fraud Cases</h2>
                {!loading && totalElements > 0 && (
                  <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                    / {totalElements.toLocaleString('en-IN')} records
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
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

            <div className="ds-table-wrap" style={{ border: 'none' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Case #</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>Amount</th>
                    <th style={{ padding: '12px 16px' }}>Reported</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {loadError ? (
                    <tr><td colSpan={6}>
                      <div className="ds-empty" style={{ padding: '60px 0' }}>
                        <span className="ds-empty-title">Fraud cases could not be loaded.</span>
                        <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                          <button type="button" onClick={fetchCases} className="ds-btn is-secondary">Retry</button>
                        </div>
                      </div>
                    </td></tr>
                  ) : loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.1, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: 120, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 140, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 80, marginLeft: 'auto', display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 80, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 22, width: 90, borderRadius: 999, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 22, width: 28, borderRadius: 6, marginLeft: 'auto', display: 'block' }} /></td>
                      </tr>
                    ))
                  ) : cases.length === 0 ? (
                    <tr><td colSpan={6}>
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
                    </td></tr>
                  ) : (
                    cases.map((c, idx) => (
                      <motion.tr
                        key={c.id}
                        variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                        initial="hidden" animate="show"
                        className={selected?.id === c.id ? 'is-selected' : ''}
                        onClick={() => setSelected(c)}
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td style={{ padding: '12px 16px', paddingLeft: 24, fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600 }}>{c.caseNumber}</td>
                        <td style={{ padding: '12px 16px' }}>{CATEGORY_LABEL[c.category] || c.category}</td>
                        <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{c.amountInvolved != null ? fmtCurrency(c.amountInvolved) : '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{fmtDate(c.reportedAt)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`ds-pill ${FRAUD_PILL[c.status]}`}>{c.status.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>
                          <button type="button" className="ds-btn is-secondary is-sm" onClick={(e) => { e.stopPropagation(); setSelected(c); }}>Open</button>
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
                  Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong> · <strong>{totalElements.toLocaleString('en-IN')}</strong> records
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
