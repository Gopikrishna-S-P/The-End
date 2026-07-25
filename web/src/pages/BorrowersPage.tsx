import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { borrowersApi } from '../api/borrowersApi';
import { useAuth } from '../AuthContext';
import type { BorrowerResponse } from '../types';
import { Users, RefreshCw, ChevronLeft, ChevronRight, Plus, FileWarning } from 'lucide-react';
import BorrowerDetailDrawer from './BorrowerDetailDrawer';
import { BorrowerCreateModal } from './BorrowerCreateModal';
import { borrowerFullName } from './BorrowersHelpers';
import { fmtDate } from './LoanDetailHelpers';
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
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', ...(borrowers.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="db-card-title">Borrowers</h2>
                {!loading && totalElements > 0 && (
                  <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                    / {totalElements.toLocaleString('en-IN')} records
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary" style={{ height: 36 }}>
                  <Plus size={14} /> New borrower
                </button>
                <button type="button" onClick={fetchBorrowers} disabled={loading} className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                  <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
                </button>
              </div>
            </header>

            <div className="ds-table-wrap" style={{ border: 'none', flex: 1, overflow: 'auto' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Name</th>
                    <th style={{ padding: '12px 16px' }}>CKYC ID</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Phone</th>
                    <th style={{ padding: '12px 16px' }}>Registered</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {loadError ? (
                    <tr><td colSpan={7}>
                      <div className="ds-empty" style={{ padding: '60px 0' }}>
                        <span className="ds-empty-title">Borrowers could not be loaded.</span>
                        <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                          <button type="button" onClick={fetchBorrowers} className="ds-btn is-secondary">Retry</button>
                        </div>
                      </div>
                    </td></tr>
                  ) : loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.1, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: 120, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 80, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 140, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 90, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 80, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 22, width: 70, borderRadius: 999, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 22, width: 28, borderRadius: 6, marginLeft: 'auto', display: 'block' }} /></td>
                      </tr>
                    ))
                  ) : borrowers.length === 0 ? (
                    <tr><td colSpan={7}>
                      <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                        <Users size={32} className="ds-empty-icon" />
                        <span className="ds-empty-title">No borrowers on file</span>
                        <span className="ds-empty-sub">Borrower profiles capture DPDP consent, nominee and risk data separately from loan records. Register the first one to get started.</span>
                        <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                          <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary">New borrower</button>
                        </div>
                      </motion.div>
                    </td></tr>
                  ) : (
                    borrowers.map((b, idx) => (
                      <motion.tr
                        key={b.id}
                        variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                        initial="hidden" animate="show"
                        className={selected?.id === b.id ? 'is-selected' : ''}
                        onClick={() => setSelected(b)}
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td style={{ padding: '12px 16px', paddingLeft: 24, fontWeight: 600 }}>{borrowerFullName(b)}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{b.ckycId || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{b.email || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{b.phone || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{fmtDate(b.createdAt)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {b.erasurePending
                            ? <span className="ds-pill is-warn"><FileWarning size={11} /> Erasure pending</span>
                            : <span className="ds-pill is-accent">Active</span>}
                        </td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>
                          <button type="button" className="ds-btn is-secondary is-sm" onClick={(e) => { e.stopPropagation(); setSelected(b); }}>Open</button>
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
