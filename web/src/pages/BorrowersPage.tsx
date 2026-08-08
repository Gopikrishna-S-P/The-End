import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { borrowersApi } from '../api/borrowersApi';
import { useAuth } from '../AuthContext';
import type { BorrowerResponse } from '../types';
import { Users, RefreshCw, Plus, FileWarning, ChevronRight } from 'lucide-react';
import BorrowerDetailDrawer from './BorrowerDetailDrawer';
import { BorrowerCreateModal } from './BorrowerCreateModal';
import { borrowerFullName } from './BorrowersHelpers';
import { fmtDate } from './LoanDetailHelpers';
import { Pagination } from '../components/Pagination';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE = 25;

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } } };
const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.24, ease: 'easeOut' } } };

export default function BorrowersPage() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';
  const [searchParams, setSearchParams] = useSearchParams();

  const [borrowers, setBorrowers]         = useState<BorrowerResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selected, setSelected]           = useState<BorrowerResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchBorrowers = useCallback(async () => {
    if (!organizationId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setLoadError(false);
    try {
      const data = await borrowersApi.list({ orgId: organizationId, page, size: PAGE_SIZE });
      setBorrowers(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [organizationId, page]);

  useEffect(() => { fetchBorrowers(); }, [fetchBorrowers]);

  // Deep-link support: /app/borrowers?id=<uuid> opens a borrower directly (e.g. from a loan's
  // linked-borrower card) even if that borrower isn't on the currently loaded page.
  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    borrowersApi.getById(id).then(setSelected).catch(() => {});
  }, [searchParams]);

  const closeDrawer = () => {
    setSelected(null);
    if (searchParams.get('id')) {
      const next = new URLSearchParams(searchParams);
      next.delete('id');
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <div className="db-page-header">
          <div className="db-page-header-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            {!loading && (
              <p style={{ fontSize: 13, color: 'var(--ink-tertiary)', fontWeight: 400, fontFamily: 'var(--font-sans)', margin: 0 }}>
                You have <strong>{totalElements.toLocaleString('en-IN')} borrower profiles</strong> registered on file.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary" style={{ height: 36 }}>
              <Plus size={14} /> New borrower
            </button>
            <button type="button" onClick={fetchBorrowers} disabled={loading} className="ds-btn is-secondary" style={{ height: 36 }} aria-label="Refresh" title="Refresh">
              <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
            </button>
          </div>
        </div>

        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', ...(borrowers.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 0 }}>
              {loadError ? (
                <div className="ds-empty" style={{ padding: '60px 0' }}>
                  <span className="ds-empty-title">Borrowers could not be loaded.</span>
                  <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                    <button type="button" onClick={fetchBorrowers} className="ds-btn is-secondary">Retry</button>
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
              ) : borrowers.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <Users size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No borrowers on file</span>
                  <span className="ds-empty-sub">Borrower profiles capture DPDP consent, nominee and risk data separately from loan records. Register the first one to get started.</span>
                </motion.div>
              ) : (
                <motion.div>
                  {borrowers.map((b, idx) => (
                    <motion.button
                      key={b.id}
                      variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                      initial="hidden" animate="show"
                      className="db-att-row"
                      style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 0, width: '100%', textAlign: 'left', background: selected?.id === b.id ? 'var(--bg-active)' : 'transparent' }}
                      onClick={() => setSelected(b)}
                      whileHover={{ background: 'var(--bg-subtle)' }}
                    >
                      <div style={{ flex: 1, marginLeft: 0, minWidth: 0 }}>
                        <span className="db-att-label" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={13} style={{ color: 'var(--ink-tertiary)' }} />
                          {borrowerFullName(b)}
                          {b.erasurePending
                            ? <span className="ds-pill is-warn"><FileWarning size={11} /> Erasure pending</span>
                            : <span className="ds-pill is-accent">Active</span>}
                        </span>
                        <div className="db-ml-tooltip-row" style={{ gap: 16, padding: 0, marginTop: 10, flexWrap: 'wrap' }}>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            {b.ckycId || '—'}
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                            / {b.email || '—'}
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                            / {b.phone || '—'}
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                            / Registered {fmtDate(b.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
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
          <BorrowerDetailDrawer
            borrower={selected}
            onClose={closeDrawer}
            onChanged={fetchBorrowers}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <BorrowerCreateModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => { setShowCreateModal(false); fetchBorrowers(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
