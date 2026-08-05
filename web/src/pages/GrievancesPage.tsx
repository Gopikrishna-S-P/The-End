import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { grievancesApi } from '../api/grievancesApi';
import { usePermissions } from '../hooks/usePermissions';
import type { GrievanceResponse, GrievanceStatus, GrievanceCategory } from '../types/grievances';
import { RefreshCcw, Plus, MessageSquareWarning, ChevronRight } from 'lucide-react';
import GrievanceDetailDrawer from './GrievanceDetailDrawer';
import { GrievanceCreateModal } from './GrievanceCreateModal';
import { fmtDate } from './LoanDetailHelpers';
import { Pagination } from '../components/Pagination';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE = 25;

/** Local pill-tone map — Grievances is not wired into BorrowersHelpers.tsx's shared maps. */
export const GRIEVANCE_PILL: Record<GrievanceStatus, string> = {
  RECEIVED: 'is-warn',
  ACKNOWLEDGED: '',
  INVESTIGATING: 'is-info',
  ESCALATED: 'is-error',
  RESOLVED: 'is-accent',
  CLOSED: 'is-neutral',
};

export const GRIEVANCE_CATEGORY_LABEL: Record<GrievanceCategory, string> = {
  HARASSMENT: 'Harassment',
  INCORRECT_INFORMATION: 'Incorrect information',
  RECOVERY_PRACTICE: 'Recovery practice',
  DATA_PRIVACY: 'Data privacy',
  PAYMENT_DISPUTE: 'Payment dispute',
  OTHER: 'Other',
};

export const GRIEVANCE_CATEGORIES: Array<{ value: GrievanceCategory; label: string }> = [
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'INCORRECT_INFORMATION', label: 'Incorrect information' },
  { value: 'RECOVERY_PRACTICE', label: 'Recovery practice' },
  { value: 'DATA_PRIVACY', label: 'Data privacy' },
  { value: 'PAYMENT_DISPUTE', label: 'Payment dispute' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS: Array<{ value: GrievanceStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const RESOLUTION_PENDING_STATUSES = new Set<GrievanceStatus>(['ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED']);

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } };
const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.24, ease: 'easeOut' } } };

export default function GrievancesPage() {
  const { hasRole } = usePermissions();
  const canRaise = hasRole('FO') || hasRole('CALLER') || hasRole('TL') || hasRole('MANAGER');

  const [grievances, setGrievances]       = useState<GrievanceResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter]   = useState<GrievanceStatus | ''>('');
  const [selected, setSelected]           = useState<GrievanceResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchGrievances = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setLoadError(false);
    try {
      const data = await grievancesApi.list({ status: statusFilter || undefined, page, size: PAGE_SIZE }, controller.signal);
      setGrievances(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchGrievances(); }, [fetchGrievances]);

  const handleChanged = (updated: GrievanceResponse) => {
    setSelected(updated);
    setGrievances(prev => prev.map(g => (g.id === updated.id ? updated : g)));
  };

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <div className="db-page-header">
          <div className="db-page-header-left">
            <div className="db-page-titles">
              <h1 className="db-page-title">Grievances</h1>
              {!loading && totalElements > 0 && (
                <span className="db-page-org">{totalElements.toLocaleString('en-IN')} records</span>
              )}
            </div>
          </div>
        </div>

        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', ...(grievances.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="ds-select"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as GrievanceStatus | ''); setPage(0); }}
                  style={{ height: 36 }}
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {canRaise && (
                  <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary" style={{ height: 36 }}>
                    <Plus size={14} /> Raise grievance
                  </button>
                )}
                <button type="button" onClick={fetchGrievances} disabled={loading} className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                  <RefreshCcw size={14} className={loading ? 'ds-spin' : ''} />
                </button>
              </div>
            </header>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 0 }}>
              {loadError ? (
                <div className="ds-empty" style={{ padding: '60px 0' }}>
                  <span className="ds-empty-title">Grievances could not be loaded.</span>
                  <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                    <button type="button" onClick={fetchGrievances} className="ds-btn is-secondary">Retry</button>
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
              ) : grievances.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <MessageSquareWarning size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No grievances on file</span>
                  <span className="ds-empty-sub">
                    {statusFilter ? 'No grievances match this status filter.' : 'Borrower complaints logged by staff will appear here.'}
                  </span>
                  {canRaise && !statusFilter && (
                    <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                      <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary">Raise grievance</button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div>
                  {grievances.map((g, idx) => {
                    const now = Date.now();
                    const ackOverdue = g.status === 'RECEIVED' && !!g.acknowledgementDueAt && new Date(g.acknowledgementDueAt).getTime() < now;
                    const resOverdue = RESOLUTION_PENDING_STATUSES.has(g.status) && !!g.resolutionDueAt && new Date(g.resolutionDueAt).getTime() < now;
                    return (
                      <motion.button
                        key={g.id}
                        variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                        initial="hidden" animate="show"
                        className="db-att-row"
                        style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 0, width: '100%', textAlign: 'left', background: selected?.id === g.id ? 'var(--bg-active)' : 'transparent' }}
                        onClick={() => setSelected(g)}
                        whileHover={{ background: 'var(--bg-subtle)' }}
                      >
                        <div style={{ flex: 1, marginLeft: 0, minWidth: 0 }}>
                          <span className="db-att-label" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MessageSquareWarning size={13} style={{ color: 'var(--ink-tertiary)' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{g.ticketNumber}</span>
                            <span className={`ds-pill ${GRIEVANCE_PILL[g.status]}`}>{g.status.replace(/_/g, ' ')}</span>
                          </span>
                          <div className="db-ml-tooltip-row" style={{ gap: 16, padding: 0, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                              {GRIEVANCE_CATEGORY_LABEL[g.category] || g.category}
                            </span>
                            <span className="db-kpi2-foot-meta" style={{ fontSize: 11, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              / {g.subject}
                            </span>
                            <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                              / Raised {fmtDate(g.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                          {(ackOverdue || resOverdue) && <span className="ds-pill is-error">Overdue</span>}
                          <ChevronRight size={16} style={{ color: 'var(--ink-tertiary)' }} />
                        </div>
                      </motion.button>
                    );
                  })}
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
          <GrievanceDetailDrawer
            grievance={selected}
            onClose={() => setSelected(null)}
            onChanged={handleChanged}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <GrievanceCreateModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => { setShowCreateModal(false); fetchGrievances(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
