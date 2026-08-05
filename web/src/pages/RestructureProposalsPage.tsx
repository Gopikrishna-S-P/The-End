import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { restructureProposalsApi } from '../api/restructureProposalsApi';
import { usePermissions } from '../hooks/usePermissions';
import type { RestructureProposalResponse, RestructureStatus } from '../types';
import { RefreshCcw, Plus, FileSliders, ChevronRight } from 'lucide-react';
import RestructureProposalDetailDrawer from './RestructureProposalDetailDrawer';
import { RestructureProposalCreateModal } from './RestructureProposalCreateModal';
import { RESTRUCTURE_PILL } from './BorrowersHelpers';
import { fmtDate } from './LoanDetailHelpers';
import { Pagination } from '../components/Pagination';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE = 25;

const STATUS_OPTIONS: Array<{ value: RestructureStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PROPOSED_TO_LENDER', label: 'Proposed to lender' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
];

const fmtMoney = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } };
const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.24, ease: 'easeOut' } } };

export default function RestructureProposalsPage() {
  const { hasRole } = usePermissions();
  const canDraft = hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN') || hasRole('MANAGER') || hasRole('TL');

  const [proposals, setProposals]         = useState<RestructureProposalResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter]   = useState<RestructureStatus | ''>('');
  const [selected, setSelected]           = useState<RestructureProposalResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchProposals = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setLoadError(false);
    try {
      const data = await restructureProposalsApi.list({ status: statusFilter || undefined, page, size: PAGE_SIZE }, controller.signal);
      setProposals(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  const handleChanged = (updated: RestructureProposalResponse) => {
    setSelected(updated);
    setProposals(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <div className="db-page-header">
          <div className="db-page-header-left">
            <div className="db-page-titles">
              <h1 className="db-page-title">Restructure Proposals</h1>
              {!loading && totalElements > 0 && (
                <span className="db-page-org">{totalElements.toLocaleString('en-IN')} records</span>
              )}
            </div>
          </div>
        </div>

        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', ...(proposals.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="ds-select"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as RestructureStatus | ''); setPage(0); }}
                  style={{ height: 36 }}
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {canDraft && (
                  <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary" style={{ height: 36 }}>
                    <Plus size={14} /> Draft proposal
                  </button>
                )}
                <button type="button" onClick={fetchProposals} disabled={loading} className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                  <RefreshCcw size={14} className={loading ? 'ds-spin' : ''} />
                </button>
              </div>
            </header>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 0 }}>
              {loadError ? (
                <div className="ds-empty" style={{ padding: '60px 0' }}>
                  <span className="ds-empty-title">Restructure proposals could not be loaded.</span>
                  <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                    <button type="button" onClick={fetchProposals} className="ds-btn is-secondary">Retry</button>
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
              ) : proposals.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <FileSliders size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No restructure proposals</span>
                  <span className="ds-empty-sub">
                    {statusFilter ? 'No proposals match this status filter.' : 'Draft an EMI restructure to renegotiate terms with a struggling but cooperative borrower.'}
                  </span>
                  {canDraft && !statusFilter && (
                    <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                      <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary">Draft proposal</button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div>
                  {proposals.map((p, idx) => (
                    <motion.button
                      key={p.id}
                      variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                      initial="hidden" animate="show"
                      className="db-att-row"
                      style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 0, width: '100%', textAlign: 'left', background: selected?.id === p.id ? 'var(--bg-active)' : 'transparent' }}
                      onClick={() => setSelected(p)}
                      whileHover={{ background: 'var(--bg-subtle)' }}
                    >
                      <div style={{ flex: 1, marginLeft: 0, minWidth: 0 }}>
                        <span className="db-att-label" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileSliders size={13} style={{ color: 'var(--ink-tertiary)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{p.allocationId}</span>
                          <span className={`ds-pill ${RESTRUCTURE_PILL[p.status]}`}>{p.status.replace(/_/g, ' ')}</span>
                        </span>
                        <div className="db-ml-tooltip-row" style={{ gap: 16, padding: 0, marginTop: 10, flexWrap: 'wrap' }}>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            {fmtMoney(p.originalEmiAmount)} → {fmtMoney(p.newEmiAmount)}
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            / {p.newEmiCount} EMIs
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                            / Drafted {fmtDate(p.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
                          {fmtMoney(p.newEmiAmount)}
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
          <RestructureProposalDetailDrawer
            proposal={selected}
            onClose={() => setSelected(null)}
            onChanged={handleChanged}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <RestructureProposalCreateModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => { setShowCreateModal(false); fetchProposals(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
