import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  X, AlertCircle, RefreshCw, ChevronRight as ChevronRightIcon,
  SlidersHorizontal, ChevronDown, ShieldAlert, TrendingDown, Users,
  UserCheck, MapPin, Handshake, Receipt, BadgeIndianRupee, MessageSquareWarning, Search,
} from 'lucide-react';
import { allocationsApi } from '../api/allocationsApi';
import { usersApi } from '../api/usersApi';
import type { AllocationResponse, UserResponse } from '../types';
import { Modal, ModalFooter, FormSection, Input } from './PlatformSetupShared';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../AuthContext';
import { StatusPill } from './LoansHelpers';
import { PILL_VARIANT, dynField } from './LoanDetailHelpers';

import '../styles/AppPage.css';
import '../styles/PlatformSetupPage.css';
import '../styles/DailyDispatch.shell.css';
import '../styles/DailyDispatch.cases.css';
import './Dashboard.css';
import '../styles/UploadsPage.css';

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

/** Most recent visit disposition — set/updated by the FO from the allocation
 *  detail page, so it can change between renders as visits get logged. */
function resolveDisposition(c: AllocationResponse): string | undefined {
  return c.latestDisposition || dynField(c.dynamicData || {}, ['disposition', 'Disposition', 'DISPOSITION']);
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
  const [isSearchOpen,  setIsSearchOpen]  = useState(searchTerm !== '');
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
        sortBy: 'createdAt', sortDirection: 'desc'
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

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  return (
    <div className="db-root db-fill-root">
      <AnimatePresence>
        {loadError && (
          <motion.div key="toast-err" className="db-error-banner is-list-banner" role="alert"
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
          <div className="db-page-header-left is-list-header">
            {!loading && (
              <p className="dd-page-context">
                You have <strong>{totalElements.toLocaleString('en-IN')} total loans</strong> registered on file.
              </p>
            )}
          </div>

          <div className="db-list-page-actions">
            <div className="db-list-btn-group">
              <button
                type="button"
                onClick={openFilterDialog}
                className={`ds-btn is-secondary db-list-filter-btn${filterOpen || hasFilters ? ' is-active' : ''}`}
              >
                <SlidersHorizontal size={14} />
                Filter
                {hasFilters && <span className="db-list-filter-dot" />}
              </button>
            </div>
          </div>
        </div>

        <div className="db-grid" style={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
          <div className="db-span-12" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="ds-card is-overflow-hidden db-card is-list-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <header className="db-card-head db-list-head" style={{ borderBottom: 'none' }}>
              <h3 className="db-list-title">Active Loans</h3>

              <div className="db-list-head-actions">
                <AnimatePresence initial={false}>
                  {isSearchOpen ? (
                    <motion.div
                      className="db-list-search"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 220, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Search size={14} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
                      <input
                        value={searchTerm}
                        onChange={e => {
                          const val = e.target.value;
                          setUrl(p => { if (val) p.set('q', val); else p.delete('q'); p.delete('page'); });
                        }}
                        placeholder="Search borrower or ID…"
                      />
                      <button type="button" className="db-list-search-clear" onClick={() => { setUrl(p => { p.delete('q'); p.delete('page'); }); setIsSearchOpen(false); }}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      type="button"
                      className="db-list-search-trigger"
                      onClick={() => setIsSearchOpen(true)}
                      title="Search"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Search size={14} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </header>


            {/* ── Active-filter chips ── */}
            <AnimatePresence>
              {hasFilters && (
                <motion.div variants={fadeUp} className="db-list-filterbar">
                  {searchTerm && (
                    <span className="ds-pill is-accent">
                      “{searchTerm}”
                      <button type="button" className="db-list-chip-x" onClick={() => setUrl(p => { p.delete('q'); p.delete('page'); })} aria-label="Clear search filter">
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  {filterAgentId && (
                    <span className="ds-pill is-info">
                      {agents.find(a => a.id === filterAgentId) ? `${agents.find(a => a.id === filterAgentId)!.firstName} ${agents.find(a => a.id === filterAgentId)!.lastName}`.trim() : 'Agent'}
                      <button type="button" className="db-list-chip-x" onClick={() => setFilterAgentId('')} aria-label="Clear agent filter">
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  {fileUploadId && (
                    <span className="ds-pill is-info">
                      Upload-filtered
                      <button type="button" className="db-list-chip-x" onClick={() => setUrl(p => p.delete('fileUploadId'))} aria-label="Clear upload filter">
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

            {/* db-card-body — same scrollable list treatment as UploadsPage */}
            <div className="db-card-body db-list-body">
              {loading ? (
                <div className="db-list-skel-wrap">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="dd-case-skel db-list-skel" style={{ opacity: 1 - i * 0.09 }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="ds-skel" style={{ height: 16, width: '40%' }} />
                        <span className="ds-skel" style={{ height: 12, width: '25%' }} />
                      </div>
                      <span className="ds-skel" style={{ height: 18, width: 80 }} />
                    </div>
                  ))}
                </div>
              ) : allocations.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show">
                  <AlertCircle size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No loans found</span>
                  <span className="ds-empty-sub">
                    {searchTerm || fileUploadId
                      ? 'Try adjusting your search or clearing filters.'
                      : 'No loans currently match this status.'}
                  </span>
                </motion.div>
              ) : (
                <div className="db-list-scroll">
                  <motion.div variants={stagger} initial="hidden" animate="show">
                    {allocations.map((c) => {
                      const amt     = resolveAmount(c);
                      const dpd     = resolveDPD(c);
                      const disposition = resolveDisposition(c);
                      const loanRef = c.loanAccountNo || c.loanNumber || '—';
                      const tone    = dpd != null ? dpdTone(dpd) : 'neutral';

                      return (
                        <motion.button key={c.id} variants={fadeUp}
                          className="db-att-row is-list-row"
                          onClick={() => navigate(`/app/allocations/${c.id}`)}
                          whileHover={{ background: 'var(--bg-subtle)' }}>

                          <div className="db-list-row-main">
                            <span className="db-att-label">
                              <Users size={13} style={{ color: 'var(--ink-tertiary)' }} />
                              {c.borrowerName || '—'}
                            </span>
                            <div className="db-list-row-meta">
                              <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                                {loanRef}
                              </span>
                              {dpd != null && (
                                <span className={`dd-case-dpd is-${tone}`}>DPD {dpd}</span>
                              )}
                              {c.status && <StatusPill status={c.status} />}
                              {disposition && (
                                <span className={`ds-pill ${PILL_VARIANT[disposition] ?? ''}`} style={{ fontSize: 9.5, padding: '1px 5px', height: 'auto' }}>
                                  {disposition.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="db-list-row-right">
                            {amt != null && (
                              <div className="db-list-amount-col">
                                <span className="db-list-amount">
                                  {fmtINR(amt)}
                                </span>
                                <span className="db-list-amount-label">
                                  OUTSTANDING
                                </span>
                              </div>
                            )}
                            <ChevronRightIcon size={16} className="db-list-chevron" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>
              )}
            </div>

            {totalPages > 1 && !loading && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalElements={totalElements}
                itemLabel="loans"
              />
            )}

          </div>
          </div>
        </div>
      </div>

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
