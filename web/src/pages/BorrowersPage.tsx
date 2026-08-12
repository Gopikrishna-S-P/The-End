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
import '../styles/PlatformSetupPage.css';
import './Dashboard.css';

const PAGE_SIZE = 25;

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } } };
const fadeUp: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } } };
const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } } };

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
          <div className="db-page-header-left">
            {!loading && (
              <p className="dd-page-context">
                You have <strong>{totalElements.toLocaleString('en-IN')} borrower profiles</strong> registered on file.
              </p>
            )}
          </div>
          <div className="db-list-page-actions">
            <div className="db-list-btn-group">
              <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary">
                <Plus size={14} /> New borrower
              </button>
              <button type="button" onClick={fetchBorrowers} disabled={loading} className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                <RefreshCw size={14} className={loading ? 'ds-spin' : ''} /> Refresh
              </button>
            </div>
          </div>
        </div>

        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <motion.div variants={fadeUp} className="ds-table-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="ds-table-wrap" style={{ flex: 1, overflow: 'auto' }}>
              <table className="ds-table is-no-row-hover ps-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Borrower</th>
                    <th style={{ width: '15%' }}>CKYC ID</th>
                    <th style={{ width: '20%' }}>Email</th>
                    <th style={{ width: '15%' }}>Phone</th>
                    <th style={{ width: '15%' }}>Registered</th>
                    <th className="is-right" style={{ width: '10%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadError ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="ds-empty" style={{ padding: '60px 0' }}>
                          <span className="ds-empty-title">Borrowers could not be loaded.</span>
                          <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                            <button type="button" onClick={fetchBorrowers} className="ds-btn is-secondary">Retry</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.08 }}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j}><div className="ds-skel" style={{ height: 14, width: j === 0 ? '75%' : '60%' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : borrowers.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '60px 0' }}>
                          <Users size={32} className="ds-empty-icon" />
                          <span className="ds-empty-title">No borrowers on file</span>
                          <span className="ds-empty-sub">Borrower profiles capture DPDP consent, nominee and risk data separately from loan records. Register the first one to get started.</span>
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    borrowers.map((b) => (
                      <tr key={b.id} style={{ background: selected?.id === b.id ? 'var(--bg-active)' : undefined }}>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--ink-primary)' }}>
                            <Users size={14} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
                            {borrowerFullName(b)}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            {b.erasurePending
                              ? <span className="ds-pill is-warn"><FileWarning size={11} /> Erasure pending</span>
                              : <span className="ds-pill is-accent">Active</span>}
                          </div>
                        </td>
                        <td className="is-mono is-muted">{b.ckycId || '—'}</td>
                        <td className="is-muted">{b.email || '—'}</td>
                        <td className="is-mono is-muted">{b.phone || '—'}</td>
                        <td className="is-mono is-muted">{fmtDate(b.createdAt)}</td>
                        <td className="is-right">
                          <button type="button" onClick={() => setSelected(b)} className="ds-btn is-secondary is-sm">
                            View profile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && !loading && (
              <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-subtle)' }}>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalElements={totalElements} itemLabel="borrowers" />
              </div>
            )}
          </motion.div>
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
