import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  X, AlertCircle, RefreshCw, ChevronRight as ChevronRightIcon,
  SlidersHorizontal, ChevronDown, ShieldAlert, TrendingDown, Users,
  UserCheck, MapPin, Handshake, Receipt, BadgeIndianRupee, MessageSquareWarning,
} from 'lucide-react';
import { allocationsApi } from '../api/allocationsApi';
import { usersApi } from '../api/usersApi';
import type { AllocationResponse, UserResponse } from '../types';
import { Modal, ModalFooter, FormSection, Input } from './PlatformSetupShared';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../AuthContext';
import { StatusPill } from './LoansHelpers';

import '../styles/AppPage.css';
import '../styles/PlatformSetupPage.css';
import '../styles/DailyDispatch.shell.css';
import '../styles/DailyDispatch.cases.css';
import './Dashboard.css';
import '../styles/UploadsPage.css';
import '../styles/LoansPage.css';

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
  // Temporarily hidden from the Loans toolbar — flip to re-enable.
  const SHOW_LOANS_QUICK_LINKS = false;
  const canSeeBorrowers = SHOW_LOANS_QUICK_LINKS && (role === 'PLATFORM_ADMIN' || role === 'ORG_ADMIN');
  const canSeeFraudCases = SHOW_LOANS_QUICK_LINKS && (role === 'PLATFORM_ADMIN' || role === 'ORG_ADMIN');
  const canSeePortfolioRisk = SHOW_LOANS_QUICK_LINKS && (role === 'PLATFORM_ADMIN' || role === 'ORG_ADMIN' || role === 'MANAGER' || role === 'TL');
  // Settlement offers / grievances are new, fully built features — deliberately not gated
  // behind SHOW_LOANS_QUICK_LINKS (that flag hides an unrelated, still-being-revisited set
  // of links), so these are visible to leads as soon as they ship.
  const canSeeSettlementOffers = role === 'PLATFORM_ADMIN' || role === 'ORG_ADMIN' || role === 'MANAGER' || role === 'TL';
  const canSeeGrievances = role === 'PLATFORM_ADMIN' || role === 'ORG_ADMIN' || role === 'MANAGER' || role === 'TL';
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
    <div className="db-root alloc-root">
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
            <button type="button" onClick={() => navigate('/app/assignments')}
              className="ds-btn is-ghost">
              <UserCheck size={14} /> Assignments
            </button>
            <button type="button" onClick={() => navigate('/app/visits')}
              className="ds-btn is-ghost">
              <MapPin size={14} /> Visit logs
            </button>
            <button type="button" onClick={() => navigate('/app/ptps')}
              className="ds-btn is-ghost">
              <Handshake size={14} /> PTPs
            </button>
            <button type="button" onClick={() => navigate('/app/collections')}
              className="ds-btn is-ghost">
              <Receipt size={14} /> Collections
            </button>
            <button
              type="button"
              onClick={openFilterDialog}
              className={`ds-btn ${filterOpen || hasFilters ? 'is-primary' : 'is-secondary'}`}
              title="Filter" aria-label="Filter"
            >
              <SlidersHorizontal size={14} />
            </button>
            {canSeeSettlementOffers && (
              <button type="button" onClick={() => navigate('/app/settlement-offers')}
                className="ds-btn is-secondary" title="Settlement offers" aria-label="Settlement offers">
                <BadgeIndianRupee size={14} />
              </button>
            )}
            {canSeeGrievances && (
              <button type="button" onClick={() => navigate('/app/grievances')}
                className="ds-btn is-secondary" title="Grievances" aria-label="Grievances">
                <MessageSquareWarning size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="dd-shell" style={{ display: 'flex' }}>
          <div className="ds-card is-overflow-hidden db-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>


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

            {/* db-card-body — same scrollable list treatment as UploadsPage */}
            <div className="db-card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: 0 }}>
              {loading ? (
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
              ) : allocations.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <AlertCircle size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No loans found</span>
                  <span className="ds-empty-sub">
                    {searchTerm || fileUploadId
                      ? 'Try adjusting your search or clearing filters.'
                      : 'No loans currently match this status.'}
                  </span>
                </motion.div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 0 }}>
                  <motion.div variants={stagger} initial="hidden" animate="show">
                    {allocations.map((c) => {
                      const amt     = resolveAmount(c);
                      const dpd     = resolveDPD(c);
                      const loanRef = c.loanAccountNo || c.loanNumber || '—';
                      const tone    = dpd != null ? dpdTone(dpd) : 'neutral';

                      return (
                        <motion.button key={c.id} variants={fadeUp}
                          className="db-att-row"
                          style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 0, width: '100%', textAlign: 'left', background: 'transparent' }}
                          onClick={() => navigate(`/app/allocations/${c.id}`)}
                          whileHover={{ background: 'var(--bg-subtle)' }}>

                          <div style={{ flex: 1, marginLeft: 0 }}>
                            <span className="db-att-label" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Users size={13} style={{ color: 'var(--ink-tertiary)' }} />
                              {c.borrowerName || '—'}
                            </span>
                            <div className="db-ml-tooltip-row" style={{ gap: 16, padding: 0, marginTop: 10 }}>
                              <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                                {loanRef}
                              </span>
                              {dpd != null && (
                                <span className={`dd-case-dpd is-${tone}`}>DPD {dpd}</span>
                              )}
                              {c.status && <StatusPill status={c.status} />}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16 }}>
                            {amt != null && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
                                  {fmtINR(amt)}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }}>
                                  OUTSTANDING
                                </span>
                              </div>
                            )}
                            <ChevronRightIcon size={16} style={{ color: 'var(--ink-tertiary)' }} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>
              )}
            </div>

            {/* ── Pagination ── */}
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
