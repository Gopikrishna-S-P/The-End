import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Search, X, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, ChevronRight as ChevronRightIcon,
  SlidersHorizontal
} from 'lucide-react';
import { allocationsApi } from '../api/allocationsApi';
import type { AllocationResponse } from '../types';
import LoanDetailDrawer from './LoanDetailDrawer';

import '../styles/AppPage.css';
import '../styles/DailyDispatch.shell.css';
import '../styles/DailyDispatch.cases.css';
import './Dashboard.css';

const PAGE_SIZE = 20;

// ── Formatters & Helpers ────────────────────────────────────────────────────────

function fmtINR(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}

function resolveAmount(c: AllocationResponse): number | null {
  if (typeof c.outstandingAmount === 'number') return c.outstandingAmount;
  if (typeof c.totalDue === 'number') return c.totalDue;
  const dd = c.dynamicData || {};
  const key = Object.keys(dd).find(k => {
    const kl = k.toLowerCase();
    return kl.includes('outstanding') || kl.includes('pos') || kl.includes('balance')
      || (kl.includes('total') && kl.includes('due'));
  });
  if (key != null) {
    const num = Number(String(dd[key]).replace(/[^0-9.\-]/g, ''));
    if (!Number.isNaN(num) && num !== 0) return num;
  }
  return null;
}

function resolveDPD(c: AllocationResponse): number | null {
  const dd = c.dynamicData || {};
  const key = Object.keys(dd).find(k => {
    const kl = k.toLowerCase().replace(/[\s_-]/g, '');
    return kl === 'dpd' || kl === 'dayspastdue' || kl === 'daysoverdue'
      || kl === 'overduedays' || kl === 'dpddays' || kl === 'dpdcount';
  });
  if (key != null) {
    const num = Number(String(dd[key]).replace(/[^0-9]/g, ''));
    if (!Number.isNaN(num)) return num;
  }
  return null;
}

function dpdTone(dpd: number): 'critical' | 'high' | 'warn' | 'neutral' {
  if (dpd <= 30)  return 'neutral';
  if (dpd <= 60)  return 'warn';
  if (dpd <= 90)  return 'high';
  return 'critical';
}

// ── Motion variants ────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

export default function LoansPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchTerm   = searchParams.get('q')         ?? '';
  const fileUploadId = searchParams.get('fileUploadId') ?? '';
  const page         = Number(searchParams.get('page') ?? '0');

  const basePath = location.pathname.startsWith('/bank') ? '/bank'
    : location.pathname.startsWith('/admin') ? '/admin' : '/app';

  const [allocations,   setAllocations]   = useState<AllocationResponse[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [loadError,     setLoadError]     = useState(false);
  const [totalPages,    setTotalPages]    = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  const [searchInput,   setSearchInput]   = useState(searchTerm);
  const [isSearchActive, setIsSearchActive] = useState(Boolean(searchTerm));

  const setUrl = (fn: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    fn(next);
    setSearchParams(next, { replace: true });
  };

  const setPage = (n: number) => setUrl(p => {
    if (n <= 0) p.delete('page'); else p.set('page', String(n));
  });

  // Debounce search input → URL
  useEffect(() => {
    if (searchInput === searchTerm) return;
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchInput) next.set('q', searchInput); else next.delete('q');
      next.delete('page');
      setSearchParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput, searchTerm, searchParams, setSearchParams]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setLoadError(false);
    try {
      const params: Record<string, string | number> = {
        page, size: PAGE_SIZE,
        sortBy: 'createdAt', sortDir: 'desc'
      };
      if (searchTerm)   params.searchTerm   = searchTerm;
      if (fileUploadId) params.fileUploadId = fileUploadId;

      const data = await allocationsApi.listAllocations(params as any, signal);
      setAllocations(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch (e: any) {
      if (e?.name !== 'CanceledError' && e?.name !== 'AbortError') {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, fileUploadId]);

  const [drawerCaseId, setDrawerCaseId] = useState<string | null>(null);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  return (
    <div className="db-root">
      <AnimatePresence>
        {loadError && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">Loans could not be loaded.</span>
              <span className="db-error-sub">Check your connection or try refreshing the page.</span>
            </div>
            <button className="db-error-retry" onClick={() => { const c = new AbortController(); load(c.signal); }} aria-label="Retry">
              <RefreshCw size={14} aria-hidden="true" />
            </button>
            <button className="db-error-retry" onClick={() => setLoadError(false)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content">
        <div className="dd-page-header" style={{ padding: '0 0 24px 0', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="dd-page-titles">
            <h1 className="dd-page-title">Portfolio</h1>
            <span className="dd-page-context">
              <strong>{totalElements.toLocaleString('en-IN')}</strong> total loans
            </span>
          </div>
          <div className="dd-page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="ds-btn is-secondary" aria-label="Filter" title="Filter">
              <SlidersHorizontal size={14} />
            </button>
            <button type="button" onClick={() => load()} className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
              <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="dd-shell" style={{ display: 'flex' }}>
          <div className="ds-card dd-cases-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <header className="dd-cases-head">
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Active Accounts</span>

              <AnimatePresence mode="popLayout">
                {!isSearchActive && !searchTerm ? (
                  <motion.button
                    key="search-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={() => setIsSearchActive(true)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, border: 'none', background: 'transparent', color: 'var(--ink-tertiary)', cursor: 'pointer', borderRadius: 8, marginLeft: 'auto' }}
                    aria-label="Open search"
                  >
                    <Search size={14} />
                  </motion.button>
                ) : (
                  <motion.div
                    key="search-bar"
                    initial={{ opacity: 0, width: 32 }}
                    animate={{ opacity: 1, width: 240 }}
                    exit={{ opacity: 0, width: 32 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="dd-cp-search"
                    style={{ overflow: 'hidden', marginLeft: 'auto' }}
                  >
                    <Search size={14} className="dd-agent-search-icon" style={{ flexShrink: 0, color: 'var(--ink-tertiary)', marginLeft: 4 }} />
                    <input
                      autoFocus
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="Search borrower or loan ID..."
                      style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', outline: 'none' }}
                    />
                    <button
                      type="button"
                      className="dd-cp-search-clear"
                      onClick={() => { setIsSearchActive(false); setSearchInput(''); }}
                      aria-label="Close search"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </header>
            
            {/* ── Active-filter chips (for file upload filter) ── */}
            <AnimatePresence>
              {fileUploadId && (
                <motion.div variants={fadeUp} style={{ padding: '8px 16px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="ds-pill is-info" style={{ display: 'inline-flex' }}>
                    Upload-filtered
                    <button type="button" onClick={() => setUrl(p => p.delete('fileUploadId'))} aria-label="Clear upload filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                      <X size={11} />
                    </button>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrollable list wrapper fixed to exactly 7 rows (7 * 51px) */}
            <div className="dd-cp-list-wrap" style={{ height: 357, flex: 'none', overflowY: 'auto' }}>
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
                ) : allocations.length === 0 ? (
                  <motion.div variants={fadeIn} initial="hidden" animate="show" className="dd-cp-empty">
                    <div className="dd-cp-empty-icon">
                      <AlertCircle size={20} />
                    </div>
                    <span className="dd-cp-empty-title">No loans found</span>
                    <span className="dd-cp-empty-sub">
                      {searchTerm || fileUploadId
                        ? 'Try adjusting your search or clearing filters.'
                        : 'No loans currently match this status.'}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column' }}>
                    {allocations.map((c) => {
                      const amt     = resolveAmount(c);
                      const dpd     = resolveDPD(c);
                      const loanRef = c.loanAccountNo || c.loanNumber || '—';
                      const tone    = dpd != null ? dpdTone(dpd) : 'neutral';

                      return (
                        <motion.div
                          key={c.id}
                          variants={fadeUp}
                          className={`dd-case-row${drawerCaseId === c.id ? ' is-picked' : ''}`}
                          onClick={() => setDrawerCaseId(c.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e: React.KeyboardEvent) => { if(e.key==='Enter') setDrawerCaseId(c.id); }}
                          style={{ boxShadow: drawerCaseId === c.id ? 'none' : undefined }}
                        >
                          <div className="dd-case-info">
                            <span className="dd-case-borrower">{c.borrowerName || '—'}</span>
                            <div className="dd-case-meta">
                              <span className="dd-case-loan">{loanRef}</span>
                              {dpd != null && (
                                <span className={`dd-case-dpd is-${tone}`}>DPD {dpd}</span>
                              )}
                              {c.status && (
                                <span className="dd-case-product" style={{ background: 'var(--bg-surface)' }}>{c.status}</span>
                              )}
                            </div>
                          </div>
                          <div className="dd-case-right">
                            <div className="dd-case-amount-col">
                              {amt != null ? (
                                <>
                                  <span className="dd-case-amount">{fmtINR(amt)}</span>
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
                  {' · '}<strong>{totalElements.toLocaleString('en-IN')}</strong> loans
                </span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="up-page-btn"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    className="up-page-btn"
                    onClick={() => setPage(page + 1)}
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
      
      <AnimatePresence>
        {drawerCaseId && (
          <LoanDetailDrawer id={drawerCaseId} onClose={() => setDrawerCaseId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
