import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { callLogApi } from '../api/callLogApi';
import { usersApi } from '../api/usersApi';
import { useAuth } from '../AuthContext';
import type { CallLogResponse, CallOutcome, PagedResponse, UserResponse } from '../types';
import { Phone, SlidersHorizontal, X, ChevronDown, Loader2, Play } from 'lucide-react';
import { Modal, ModalFooter, FormSection, Input } from './PlatformSetupShared';
import { Pagination } from '../components/Pagination';
import '../styles/AppPage.css';
import '../styles/PlatformSetupPage.css';
import './Dashboard.css';

const PAGE_SIZE = 20;
const RECORDING_ROLES = ['ROLE_ORG_ADMIN', 'ROLE_MANAGER', 'ROLE_TL', 'ROLE_PLATFORM_ADMIN'];
const LEAD_ROLES = ['ROLE_TL', 'ROLE_MANAGER', 'ROLE_ORG_ADMIN', 'ROLE_PLATFORM_ADMIN'];
const SELF_SCOPED_ROLES = ['ROLE_FO', 'ROLE_CALLER'];

const OUTCOME_OPTIONS: Array<{ value: CallOutcome | ''; label: string }> = [
  { value: '',                    label: 'All' },
  { value: 'ANSWERED',            label: 'Answered' },
  { value: 'NO_ANSWER',           label: 'No answer' },
  { value: 'BUSY',                label: 'Busy' },
  { value: 'WRONG_NUMBER',        label: 'Wrong number' },
  { value: 'CALLBACK_REQUESTED',  label: 'Callback requested' },
  { value: 'REFUSED',             label: 'Refused' },
  { value: 'SWITCHED_OFF',        label: 'Switched off' },
];

const OUTCOME_VARIANT: Record<CallOutcome, string> = {
  ANSWERED: 'is-accent', NO_ANSWER: '', BUSY: '', WRONG_NUMBER: 'is-error',
  CALLBACK_REQUESTED: 'is-warn', REFUSED: 'is-error', SWITCHED_OFF: '',
};

const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDuration = (secs?: number) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function CallsPage() {
  const { user } = useAuth();
  // Mirrors CallLogController.isSelfScopedCaller exactly: FO/CALLER without a
  // lead role are pinned to their own calls server-side regardless of what
  // this page requests, so the UI should read the same way. TRACER is
  // neither self-scoped nor a recording role — org-wide view, no Play button.
  const roleNames = user?.roles.map(r => r.name) ?? [];
  const isSelfScoped = roleNames.some(r => SELF_SCOPED_ROLES.includes(r)) && !roleNames.some(r => LEAD_ROLES.includes(r));
  const canPlayRecording = roleNames.some(r => RECORDING_ROLES.includes(r));
  const organizationId = user?.organizationId || '';

  const [calls,          setCalls]          = useState<CallLogResponse[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [page,           setPage]           = useState(0);
  const [totalPages,     setTotalPages]     = useState(0);
  const [totalElements,  setTotalElements]  = useState(0);
  const [playingId,      setPlayingId]      = useState<string | null>(null);

  const [filterAgentId,  setFilterAgentId]  = useState('');
  const [filterOutcome,  setFilterOutcome]  = useState<CallOutcome | ''>('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate,   setFilterToDate]   = useState('');
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [draftAgentId,   setDraftAgentId]   = useState('');
  const [draftOutcome,   setDraftOutcome]   = useState<CallOutcome | ''>('');
  const [draftFromDate,  setDraftFromDate]  = useState('');
  const [draftToDate,    setDraftToDate]    = useState('');
  const [agents,         setAgents]         = useState<UserResponse[]>([]);

  useEffect(() => {
    if (isSelfScoped) return;
    Promise.all([usersApi.listByRole('FO'), usersApi.listByRole('CALLER')])
      .then(([fos, callers]) => setAgents([...fos, ...callers]))
      .catch(() => {});
  }, [isSelfScoped]);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof callLogApi.listCalls>[0] = {
        orgId: organizationId, page, size: PAGE_SIZE,
      };
      if (!isSelfScoped && filterAgentId) params.agentId = filterAgentId;
      if (filterOutcome)  params.outcome  = filterOutcome;
      if (filterFromDate) params.fromDate = filterFromDate;
      if (filterToDate)   params.toDate   = filterToDate;
      const response = await callLogApi.listCalls(params);
      setCalls(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch {
      // silent — empty state handles
    } finally { setLoading(false); }
  }, [organizationId, page, isSelfScoped, filterAgentId, filterOutcome, filterFromDate, filterToDate]);

  useEffect(() => { if (organizationId) fetchCalls(); }, [fetchCalls, organizationId]);

  const play = async (callLogId: string) => {
    setPlayingId(callLogId);
    try { await callLogApi.openRecording(callLogId); }
    catch { /* silent */ }
    finally { setPlayingId(null); }
  };

  const openFilterDialog = () => {
    setDraftAgentId(filterAgentId); setDraftOutcome(filterOutcome);
    setDraftFromDate(filterFromDate); setDraftToDate(filterToDate);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilterAgentId(draftAgentId); setFilterOutcome(draftOutcome);
    setFilterFromDate(draftFromDate); setFilterToDate(draftToDate);
    setPage(0); setFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterAgentId(''); setFilterOutcome(''); setFilterFromDate(''); setFilterToDate(''); setPage(0);
  };

  const hasFilters = Boolean(filterAgentId || filterOutcome || filterFromDate || filterToDate);

  return (
    <div className="db-root db-fill-root">
      <div className="db-content">
        <div className="db-inner">
          <div className="db-page-header">
            <div className="db-page-header-left">
              <div className="db-page-titles">
                <h1 className="db-page-title">{isSelfScoped ? 'My Calls' : 'Calls'}</h1>
                {!loading && totalElements > 0 && (
                  <span className="dd-page-context"><strong>{totalElements.toLocaleString('en-IN')}</strong> records</span>
                )}
              </div>
            </div>
            <button type="button" onClick={openFilterDialog}
              className={`ds-btn is-secondary db-list-filter-btn${filterOpen || hasFilters ? ' is-active' : ''}`}>
              <SlidersHorizontal size={14} /> Filter
              {hasFilters && <span className="db-list-filter-dot" />}
            </button>
          </div>

          <AnimatePresence>
            {hasFilters && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {filterAgentId && !isSelfScoped && (
                  <span className="ds-pill is-info">
                    {agents.find(a => a.id === filterAgentId) ? `${agents.find(a => a.id === filterAgentId)!.firstName} ${agents.find(a => a.id === filterAgentId)!.lastName}`.trim() : 'Agent'}
                    <button type="button" onClick={() => { setFilterAgentId(''); setPage(0); }} aria-label="Clear agent filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}><X size={11} /></button>
                  </span>
                )}
                {filterOutcome && (
                  <span className="ds-pill is-accent">
                    {OUTCOME_OPTIONS.find(o => o.value === filterOutcome)?.label}
                    <button type="button" onClick={() => { setFilterOutcome(''); setPage(0); }} aria-label="Clear outcome filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}><X size={11} /></button>
                  </span>
                )}
                {(filterFromDate || filterToDate) && (
                  <span className="ds-pill is-accent">
                    {filterFromDate || '…'} – {filterToDate || '…'}
                    <button type="button" onClick={() => { setFilterFromDate(''); setFilterToDate(''); setPage(0); }} aria-label="Clear date filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}><X size={11} /></button>
                  </span>
                )}
                <button type="button" onClick={clearFilters} className="db-customize-btn" style={{ padding: '0 8px', fontSize: 11 }}>Clear all</button>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="ds-table-card is-list-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="db-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <h3 className="db-list-title">Call log</h3>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 0 }}>
              {loading ? (
                <div style={{ padding: '8px' }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="dd-case-skel" style={{ opacity: 1 - i * 0.09, padding: '16px 0', display: 'flex', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="ds-skel" style={{ height: 16, width: '40%' }} />
                        <span className="ds-skel" style={{ height: 12, width: '25%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : calls.length === 0 ? (
                <motion.div className="ds-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} style={{ padding: '80px 0' }}>
                  <span className="ds-empty-icon"><Phone size={20} /></span>
                  <span className="ds-empty-title">No calls found</span>
                  <span className="ds-empty-sub">
                    {hasFilters ? 'No calls match the current filters. Clear them to see all records.' : 'Calls will appear here once field officers or callers log calls from the mobile app.'}
                  </span>
                  {hasFilters && (
                    <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                      <button type="button" onClick={clearFilters} className="ds-btn is-secondary">Clear filters</button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div>
                  {calls.map((c, idx) => (
                    <motion.div key={c.id} className="db-att-row is-list-row" style={{ borderRadius: 0 }}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: idx * 0.03 }}>
                      <div style={{ flex: 1, marginLeft: 0, minWidth: 0 }}>
                        <span className="db-att-label" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={13} style={{ color: 'var(--ink-tertiary)' }} />
                          {c.borrowerName ?? '—'}
                        </span>
                        <div className="db-ml-tooltip-row" style={{ gap: 16, padding: 0, marginTop: 10, flexWrap: 'wrap' }}>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{c.loanNumber ?? '—'}</span>
                          {!isSelfScoped && <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>/ {c.agentName ?? 'Unknown agent'}</span>}
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>/ {fmtDT(c.initiatedAt)}</span>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>/ {fmtDuration(c.durationSeconds)}</span>
                          {c.outcome && <span className={`ds-pill ${OUTCOME_VARIANT[c.outcome]}`}>{OUTCOME_OPTIONS.find(o => o.value === c.outcome)?.label}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        {c.recordingStatus === 'UPLOADED' && canPlayRecording ? (
                          <button type="button" onClick={() => play(c.id)} disabled={playingId === c.id}
                            className="ds-btn is-secondary is-sm">
                            {playingId === c.id ? <Loader2 size={12} className="ds-spin" /> : <Play size={12} />} Play
                          </button>
                        ) : c.recordingStatus === 'UPLOADED' ? (
                          <span className="ds-pill is-neutral" style={{ fontSize: 11 }}>Recorded</span>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {!loading && calls.length > 0 && totalPages > 1 && (
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalElements={totalElements} itemLabel="calls" />
            )}
          </section>
        </div>

        {filterOpen && (
          <Modal title="Filter calls" subtitle="Narrow down the call log" onClose={() => setFilterOpen(false)}>
            {!isSelfScoped && (
              <FormSection title="Agent">
                <div className="ds-field">
                  <label className="ds-label">Agent</label>
                  <div className="ps-select-wrap">
                    <select value={draftAgentId} onChange={e => setDraftAgentId(e.target.value)} className="ds-select"
                      style={{ width: '100%', paddingRight: 30, appearance: 'none', WebkitAppearance: 'none', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      <option value="">All agents</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-tertiary)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </FormSection>
            )}

            <FormSection title="Outcome">
              <div className="ds-field">
                <label className="ds-label">Outcome</label>
                <div className="ps-select-wrap">
                  <select value={draftOutcome} onChange={e => setDraftOutcome(e.target.value as CallOutcome | '')} className="ds-select"
                    style={{ width: '100%', paddingRight: 30, appearance: 'none', WebkitAppearance: 'none' }}>
                    {OUTCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-tertiary)', pointerEvents: 'none' }} />
                </div>
              </div>
            </FormSection>

            <FormSection title="Date range">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Input label="From" type="date" value={draftFromDate} onChange={setDraftFromDate} />
                <Input label="To" type="date" value={draftToDate} onChange={setDraftToDate} />
              </div>
            </FormSection>

            <ModalFooter onClose={() => setFilterOpen(false)} submitting={false} onSubmit={applyFilters} label="Apply filters" />
          </Modal>
        )}
      </div>
    </div>
  );
}
