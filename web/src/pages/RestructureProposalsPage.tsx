import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { restructureProposalsApi } from '../api/restructureProposalsApi';
import { usePermissions } from '../hooks/usePermissions';
import type { RestructureProposalResponse, RestructureStatus } from '../types';
import { RefreshCcw, ChevronLeft, ChevronRight, Plus, FileSliders } from 'lucide-react';
import RestructureProposalDetailDrawer from './RestructureProposalDetailDrawer';
import { RestructureProposalCreateModal } from './RestructureProposalCreateModal';
import { RESTRUCTURE_PILL } from './BorrowersHelpers';
import { fmtDate } from './LoanDetailHelpers';
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
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', ...(proposals.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="db-card-title">Restructure Proposals</h2>
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

            <div className="ds-table-wrap" style={{ border: 'none', flex: 1, overflow: 'auto' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Loan ID</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>Original EMI</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>New EMI</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>New tenure</th>
                    <th style={{ padding: '12px 16px' }}>Drafted</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {loadError ? (
                    <tr><td colSpan={7}>
                      <div className="ds-empty" style={{ padding: '60px 0' }}>
                        <span className="ds-empty-title">Restructure proposals could not be loaded.</span>
                        <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                          <button type="button" onClick={fetchProposals} className="ds-btn is-secondary">Retry</button>
                        </div>
                      </div>
                    </td></tr>
                  ) : loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.1, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: 140, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 70, marginLeft: 'auto', display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 70, marginLeft: 'auto', display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 50, marginLeft: 'auto', display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 80, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 22, width: 100, borderRadius: 999, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 22, width: 28, borderRadius: 6, marginLeft: 'auto', display: 'block' }} /></td>
                      </tr>
                    ))
                  ) : proposals.length === 0 ? (
                    <tr><td colSpan={7}>
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
                    </td></tr>
                  ) : (
                    proposals.map((p, idx) => (
                      <motion.tr
                        key={p.id}
                        variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                        initial="hidden" animate="show"
                        className={selected?.id === p.id ? 'is-selected' : ''}
                        onClick={() => setSelected(p)}
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td style={{ padding: '12px 16px', paddingLeft: 24, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{p.allocationId}</td>
                        <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{fmtMoney(p.originalEmiAmount)}</td>
                        <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtMoney(p.newEmiAmount)}</td>
                        <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{p.newEmiCount}</td>
                        <td style={{ padding: '12px 16px' }}>{fmtDate(p.createdAt)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`ds-pill ${RESTRUCTURE_PILL[p.status]}`}>{p.status.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>
                          <button type="button" className="ds-btn is-secondary is-sm" onClick={(e) => { e.stopPropagation(); setSelected(p); }}>Open</button>
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
