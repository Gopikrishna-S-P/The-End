import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, ChevronRight as ChevronRightIcon,
  SlidersHorizontal, ChevronDown, FileSliders, ShieldAlert, TrendingDown, Users,
} from 'lucide-react';
import { allocationsApi } from '../api/allocationsApi';
import { usersApi } from '../api/usersApi';
import type { AllocationResponse, UserResponse } from '../types';
import LoanDetailDrawer from './LoanDetailDrawer';
import { Modal, ModalFooter, FormSection, Input } from './PlatformSetupShared';
import { useAuth } from '../AuthContext';

import '../styles/AppPage.css';
import '../styles/PlatformSetupPage.css';
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
  const { user } = useAuth();
  const role = user?.roles?.[0]?.name?.replace('ROLE_', '');
  const canSeeBorrowers = role === 'PLATFORM_ADMIN' || role === 'ORG_ADMIN';
  const canSeeFraudCases = role === 'PLATFORM_ADMIN' || role === 'ORG_ADMIN';
  const canSeePortfolioRisk = role === 'PLATFORM_ADMIN' || role === 'ORG_ADMIN' || role === 'MANAGER' || role === 'TL';
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

  const [filterAgentId, setFilterAgentId] = useState('');
  const [agents,        setAgents]        = useState<UserResponse[]>([]);
  const [filterOpen,    setFilterOpen]    = useState(false);
  // Draft copies — the filter dialog edits these; changes only take effect on "Apply".
  const [draftSearch,   setDraftSearch]   = useState(searchTerm);
  const [draftAgentId,  setDraftAgentId]  = useState('');

  const setUrl = (fn: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    fn(next);
    setSearchParams(next, { replace: true });
  };

  const setPage = (n: number) => setUrl(p => {
    if (n <= 0) p.delete('page'); else p.set('page', String(n));
  });

  useEffect(() => {
    usersApi.listByRole('FO').then(setAgents).catch(() => {});
  }, []);

  const openFilterDialog = () => {
    setDraftSearch(searchTerm); setDraftAgentId(filterAgentId);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setUrl(p => {
      if (draftSearch) p.set('q', draftSearch); else p.delete('q');
      p.delete('page');
    });
    setFilterAgentId(draftAgentId);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setUrl(p => { p.delete('q'); p.delete('page'); });
    setFilterAgentId('');
    setDraftSearch(''); setDraftAgentId('');
  };

  const hasFilters = Boolean(searchTerm || fileUploadId || filterAgentId);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setLoadError(false);
    try {
      const params: Record<string, string | number> = {
        page, size: PAGE_SIZE,
        sortBy: 'createdAt', sortDir: 'desc'
      };
      if (searchTerm)   params.searchTerm   = searchTerm;
      if (fileUploadId) params.fileUploadId = fileUploadId;
      if (filterAgentId) params.assignedToUserId = filterAgentId;

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
  }, [page, searchTerm, fileUploadId, filterAgentId]);

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
        <div className="db-page-header">
          <div className="db-page-header-left">
            <div className="db-page-titles">
              <h1 className="db-page-title">Portfolio</h1>
              {totalElements > 0 && (
                <span className="db-page-org">{totalElements.toLocaleString('en-IN')} total loans</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canSeeBorrowers && (
              <button type="button" onClick={() => navigate('/app/borrowers')}
                className="ds-btn is-secondary" title="Borrowers" aria-label="Borrowers">
                <Users size={14} />
              </button>
            )}
            <button type="button" onClick={() => navigate('/app/restructure-proposals')}
              className="ds-btn is-secondary" title="Restructure proposals" aria-label="Restructure proposals">
              <FileSliders size={14} />
            </button>
            {canSeeFraudCases && (
              <button type="button" onClick={() => navigate('/app/fraud-cases')}
                className="ds-btn is-secondary" title="Fraud cases" aria-label="Fraud cases">
                <ShieldAlert size={14} />
              </button>
            )}
            {canSeePortfolioRisk && (
              <button type="button" onClick={() => navigate('/app/portfolio-risk')}
                className="ds-btn is-secondary" title="Portfolio risk" aria-label="Portfolio risk">
                <TrendingDown size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={openFilterDialog}
              className="ds-btn is-secondary"
              style={{
                background: filterOpen || hasFilters ? 'var(--ink-solid)' : undefined,
                color: filterOpen || hasFilters ? 'var(--bg-surface)' : undefined,
              }}
            >
              <SlidersHorizontal size={14} style={{ marginRight: 6 }} />
              Filter
            </button>
          </div>
        </div>

        <div className="dd-shell" style={{ display: 'flex' }}>
          <div className="ds-card dd-cases-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            <header className="dd-cases-head">
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Active Accounts</span>
            </header>

            {/* ── Active-filter chips ── */}
            <AnimatePresence>
              {hasFilters && (
                <motion.div variants={fadeUp} style={{ padding: '8px 16px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {searchTerm && (
                    <span className="ds-pill is-accent">
                      “{searchTerm}”
                      <button type="button" onClick={() => setUrl(p => { p.delete('q'); p.delete('page'); })} aria-label="Clear search filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  {filterAgentId && (
                    <span className="ds-pill is-info">
                      {agents.find(a => a.id === filterAgentId) ? `${agents.find(a => a.id === filterAgentId)!.firstName} ${agents.find(a => a.id === filterAgentId)!.lastName}`.trim() : 'Agent'}
                      <button type="button" onClick={() => setFilterAgentId('')} aria-label="Clear agent filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  {fileUploadId && (
                    <span className="ds-pill is-info">
                      Upload-filtered
                      <button type="button" onClick={() => setUrl(p => p.delete('fileUploadId'))} aria-label="Clear upload filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  <button type="button" onClick={clearFilters} className="db-customize-btn" style={{ padding: '0 8px', fontSize: 11 }}>
                    Clear all
                  </button>
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

      {/* ── Filter dialog — same Modal/Input/FormSection system as Platform Setup's Edit Org dialog ── */}
      {filterOpen && (
        <Modal title="Filter loans" subtitle="Narrow down the portfolio list" onClose={() => setFilterOpen(false)}>
          <FormSection title="Search">
            <Input label="Borrower or loan ID" value={draftSearch} onChange={setDraftSearch}
              placeholder="e.g. LN10234 or Ramesh Kumar" />
          </FormSection>

          <FormSection title="Agent">
            <div className="ds-field">
              <label className="ds-label">Agent</label>
              <div className="ps-select-wrap">
                <select
                  value={draftAgentId}
                  onChange={e => setDraftAgentId(e.target.value)}
                  className="ds-select"
                  style={{
                    width: '100%', paddingRight: 30,
                    appearance: 'none', WebkitAppearance: 'none',
                    textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                  }}
                >
                  <option value="">All agents</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                  ))}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-tertiary)', pointerEvents: 'none' }} />
              </div>
            </div>
          </FormSection>

          <ModalFooter onClose={() => setFilterOpen(false)} submitting={false} onSubmit={applyFilters} label="Apply filters" />
        </Modal>
      )}
    </div>
  );
}
