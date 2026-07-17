import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { apiClient, unwrapApiResponse } from '../client';
import { usePermissions } from '../hooks/usePermissions';
import type { AllocationResponse, PagedResponse } from '../types';
import {
  RefreshCw, Search, ChevronLeft, ChevronRight, UserPlus,
  AlertCircle, X, ChevronRight as ChevronRightIcon
} from 'lucide-react';

import '../styles/AppPage.css';
import '../styles/DailyDispatchPage.css';
import '../styles/DailyDispatch.shell.css';
import '../styles/DailyDispatch.cases.css';
import './Dashboard.css';

const PAGE_SIZE = 25;

const fmtCurrency = (v: number | null | undefined) => {
  if (v == null) return '—';
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};

// ── Motion variants ────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

export default function UnassignedCasesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canAssign = hasPermission('CASE_ASSIGN');

  const [rows, setRows]                   = useState<AllocationResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [isSearchActive, setIsSearchActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault(); 
      setIsSearchActive(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const fetchPool = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params: Record<string, string | number> = {
        status: 'UNASSIGNED', page, size: PAGE_SIZE,
      };
      if (search) params.searchTerm = search;
      const { data } = await apiClient.get('/api/v1/allocations', { params });
      const resp = unwrapApiResponse<PagedResponse<AllocationResponse>>(data);
      setRows(resp.content ?? []);
      setTotalPages(resp.totalPages ?? 0);
      setTotalElements(resp.totalElements ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load unassigned pool');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchPool(); }, [fetchPool]);
  useEffect(() => { setPage(0); }, [search]);

  return (
    <div className="db-root">
      <AnimatePresence>
        {error && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">{error}</span>
            </div>
            <button className="db-error-retry" onClick={fetchPool} aria-label="Retry">
              <RefreshCw size={14} aria-hidden="true" />
            </button>
            <button className="db-error-retry" onClick={() => setError(null)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="db-content">
        <div className="dd-page-header" style={{ padding: '0 0 24px 0', border: 'none' }}>
          <div className="dd-page-titles">
            <h1 className="dd-page-title">Unassigned Cases</h1>
            <span className="dd-page-context">
              <strong>{totalElements.toLocaleString('en-IN')}</strong> cases in pool
            </span>
          </div>
        </div>

        <div className="dd-main-container" style={{ padding: 0 }}>
          <div className="ds-card dd-cases-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            
            {/* ── Header: Title & Search ── */}
            <header className="dd-cases-head" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '44px' }}>
              <h2 className="db-card-title">Unassigned Cases Pool</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AnimatePresence mode="popLayout">
                  {!isSearchActive && !search ? (
                    <motion.button
                      key="search-btn"
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}
                      type="button" onClick={() => setIsSearchActive(true)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, border: 'none', background: 'transparent', color: 'var(--ink-tertiary)', cursor: 'pointer', borderRadius: 8 }}
                      aria-label="Open search"
                    >
                      <Search size={14} />
                    </motion.button>
                  ) : (
                    <motion.div
                      key="search-bar"
                      initial={{ opacity: 0, width: 32 }} animate={{ opacity: 1, width: 240 }} exit={{ opacity: 0, width: 32 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="dd-cp-search" style={{ overflow: 'hidden' }}
                    >
                      <Search size={14} className="dd-agent-search-icon" style={{ flexShrink: 0, color: 'var(--ink-tertiary)', marginLeft: 4 }} />
                      <input
                        ref={inputRef}
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search borrower or loan ID..."
                        style={{ width: '100%' }}
                      />
                      <button
                        type="button" className="dd-cp-search-clear"
                        onClick={() => { setIsSearchActive(false); setSearch(''); }} aria-label="Close search"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {canAssign && (
                  <button type="button" onClick={() => navigate('/app/dispatch')} className="ds-btn is-primary" style={{ height: 32, padding: '0 12px' }}>
                    <UserPlus size={14} style={{ marginRight: 6 }} /> Open dispatch
                  </button>
                )}
              </div>
            </header>

            {/* ── Case List ── */}
            <div className="dd-cp-list-wrap">
              <div className="dd-cp-list">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="dd-case-skel">
                      <span className="ds-skel" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className="ds-skel" style={{ height: '14px', width: '40%', borderRadius: '4px' }} />
                        <span className="ds-skel" style={{ height: '11px', width: '25%', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))
                ) : rows.length === 0 ? (
                  <motion.div variants={fadeIn} initial="hidden" animate="show" className="dd-cp-empty">
                    <div className="dd-cp-empty-icon">
                      <AlertCircle size={20} />
                    </div>
                    <span className="dd-cp-empty-title">No unassigned cases</span>
                    <span className="dd-cp-empty-sub">
                      {search
                        ? 'Try adjusting your search query.'
                        : 'Upload a file or wait for new allocations to come in.'}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column' }}>
                    {rows.map((r) => {
                      const loanRef = r.loanAccountNo || r.loanNumber || '—';

                      return (
                        <motion.div
                          key={r.id}
                          variants={fadeUp}
                          className="dd-case-row"
                          onClick={() => navigate(`/app/cases/${r.id}`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e: React.KeyboardEvent) => { if(e.key==='Enter') navigate(`/app/cases/${r.id}`); }}
                        >
                          <div className="dd-case-info">
                            <span className="dd-case-borrower">{r.borrowerName || '—'}</span>
                            <div className="dd-case-meta">
                              <span className="dd-case-loan">{loanRef}</span>
                              {r.status && (
                                <span className="dd-case-product" style={{ background: 'var(--bg-surface)' }}>{r.status}</span>
                              )}
                            </div>
                          </div>
                          <div className="dd-case-right">
                            <div className="dd-case-amount-col">
                              {r.outstandingAmount != null ? (
                                <>
                                  <span className="dd-case-amount">{fmtCurrency(r.outstandingAmount)}</span>
                                  <span className="dd-case-amount-lbl">POS</span>
                                </>
                              ) : (
                                <span style={{ fontSize: '12.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>—</span>
                              )}
                            </div>
                            <ChevronRightIcon size={14} aria-hidden="true" style={{ color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.6 }} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && !loading && (
              <footer className="up-pagination" style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', flexShrink: 0 }}>
                <span className="up-page-meta">
                  Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
                  {' · '}<strong>{totalElements.toLocaleString('en-IN')}</strong> cases
                </span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="up-page-btn"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    className="up-page-btn"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </footer>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
