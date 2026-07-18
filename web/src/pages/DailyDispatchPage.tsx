import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { usersApi } from '../api/usersApi';
import { dailyDispatchApi } from '../api/dailyDispatchApi';
import { allocationsApi } from '../api/allocationsApi';
import type { UserResponse, AllocationResponse } from '../types';
import {
  CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight,
  RefreshCw, CalendarDays, Send
} from 'lucide-react';
import DispatchAgentPanel from './DispatchAgentPanel';
import DispatchCasePanel, { resolveAmount } from './DispatchCasePanel';
import '../styles/AppPage.css';
import '../styles/DailyDispatchPage.css';
import './Dashboard.css';

// ── Motion variants ────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};



const _d = new Date();
const todayIso = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;

const fmtINR = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';

const fmtNum = (v?: number | null) => v != null ? v.toLocaleString('en-IN') : '—';


const initials = (a: UserResponse) =>
  `${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`.toUpperCase() || '?';

export default function DailyDispatchPage() {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const canDispatch = hasPermission('DAILY_DISPATCH_CREATE');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedAgent = searchParams.get('agent') ?? '';
  const dispatchDate  = searchParams.get('date')  ?? todayIso;

  const setAgent = (id: string) => {
    const p = new URLSearchParams(searchParams);
    id ? p.set('agent', id) : p.delete('agent');
    setSearchParams(p, { replace: true });
  };
  const setDate = (d: string) => {
    const p = new URLSearchParams(searchParams);
    d && d !== todayIso ? p.set('date', d) : p.delete('date');
    setSearchParams(p, { replace: true });
  };
  const shiftDate = (delta: number) => {
    const d = new Date(dispatchDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  };

  const dateInputRef = useRef<HTMLInputElement>(null);

  const [agents,        setAgents]        = useState<UserResponse[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [cases,         setCases]         = useState<AllocationResponse[]>([]);
  const [dispatched,    setDispatched]    = useState<AllocationResponse[]>([]);
  const [casesLoading,  setCasesLoading]  = useState(false);
  const [picked,        setPicked]        = useState<Set<string>>(new Set());
  const [globalSearch,  setGlobalSearch]  = useState('');
  const [activeTab,     setActiveTab]     = useState<'queue' | 'done'>('queue');
  const [submitting,    setSubmitting]    = useState(false);
  const [undoingId,     setUndoingId]     = useState<string | null>(null);
  const [feedback,      setFeedback]      = useState<{ kind: 'ok' | 'err'; msg: string; sub?: string; onRetry?: () => void } | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [orgDispatched, setOrgDispatched] = useState<number | null>(null);

  const agentObj      = useMemo(() => agents.find(a => a.id === selectedAgent), [agents, selectedAgent]);
  const agentFullName = agentObj ? `${agentObj.firstName} ${agentObj.lastName}`.trim() : '';

  const filteredAgents = useMemo(() => {
    if (!globalSearch.trim()) return agents;
    const q = globalSearch.toLowerCase();
    return agents.filter(a =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
    );
  }, [agents, globalSearch]);

  const dispatchDayLabel = useMemo(() =>
    new Date(dispatchDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
    [dispatchDate]);

  useEffect(() => {
    setAgentsLoading(true);
    usersApi.listByRole('FO').then(data => {
      setAgents(data);
      if (!selectedAgent && data.length > 0) setAgent(data[0].id);
    }).catch(() => {}).finally(() => setAgentsLoading(false));
  }, []);

  const loadCases = useCallback(async () => {
    if (!selectedAgent) { setCases([]); setDispatched([]); setPicked(new Set()); return; }
    setCasesLoading(true); setFeedback(null);
    try {
      const [casesData, dispatchData] = await Promise.allSettled([
        allocationsApi.getAllocations({ status: 'ASSIGNED', assignedToUserId: selectedAgent, page: 0, size: 200 }),
        dailyDispatchApi.agentList(selectedAgent, dispatchDate),
      ]);
      setCases(casesData.status === 'fulfilled' ? (casesData.value.content ?? []) : []);
      if (casesData.status === 'rejected') setFeedback({ kind: 'err', msg: 'Cases could not be loaded.', sub: 'Check your connection or try selecting the officer again.', onRetry: loadCases });
      setDispatched(dispatchData.status === 'fulfilled' ? dispatchData.value : []);
    } finally { setCasesLoading(false); setPicked(new Set()); }
  }, [selectedAgent, dispatchDate]);

  useEffect(() => { loadCases(); }, [loadCases]);

  // Org-wide dispatched count for the selected date (LEADS-only endpoint — same
  // role gate as create/undo, so reuse canDispatch rather than a second permission check).
  useEffect(() => {
    if (!canDispatch) { setOrgDispatched(null); return; }
    let cancelled = false;
    dailyDispatchApi.orgSummary(dispatchDate)
      .then(count => { if (!cancelled) setOrgDispatched(count); })
      .catch(() => { if (!cancelled) setOrgDispatched(null); });
    return () => { cancelled = true; };
  }, [canDispatch, dispatchDate, dispatched.length]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(globalSearch), 150);
    return () => clearTimeout(t);
  }, [globalSearch]);

  const filteredCases     = useMemo(() => {
    if (!debouncedSearch.trim()) return cases;
    const q = debouncedSearch.toLowerCase();
    return cases.filter(c => c.loanNumber?.toLowerCase().includes(q) || c.borrowerName?.toLowerCase().includes(q));
  }, [cases, debouncedSearch]);

  const dispatchedIds     = useMemo(() => new Set(dispatched.map(d => d.id)), [dispatched]);
  const undispatchedCases = useMemo(() => filteredCases.filter(c => !dispatchedIds.has(c.id)), [filteredCases, dispatchedIds]);
  const dispatchedCases   = useMemo(() => filteredCases.filter(c =>  dispatchedIds.has(c.id)), [filteredCases, dispatchedIds]);
  const displayedCases    = activeTab === 'queue' ? undispatchedCases : dispatchedCases;
  const casesById         = useMemo(() => new Map(cases.map(c => [c.id, c])), [cases]);
  const selectedTotal     = useMemo(() => Array.from(picked).reduce((s, id) => {
    const c = casesById.get(id);
    return s + (c ? (resolveAmount(c) ?? 0) : 0);
  }, 0), [picked, casesById]);
  const dispatchPct       = cases.length > 0 ? Math.round((dispatched.length / cases.length) * 100) : 0;
  const allChecked        = useMemo(() => undispatchedCases.length > 0 && undispatchedCases.every(c => picked.has(c.id)), [undispatchedCases, picked]);
  const toggleAll         = () => setPicked(allChecked ? new Set() : new Set(undispatchedCases.map(c => c.id)));
  const toggle            = (id: string) => setPicked(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const undoOne = async (caseId: string) => {
    if (!selectedAgent) return;
    setUndoingId(caseId); setFeedback(null);
    try {
      await dailyDispatchApi.removeCase(selectedAgent, dispatchDate, caseId);
      setDispatched(prev => prev.filter(d => d.id !== caseId));
    } catch (e: any) {
      setFeedback({ kind: 'err', msg: 'Could not undo dispatch.', sub: e?.response?.data?.message || 'The change was not saved. Please try again.' });
    } finally { setUndoingId(null); }
  };

  const doSend = async () => {
    if (!selectedAgent || picked.size === 0) return;
    setSubmitting(true); setFeedback(null);
    try {
      const mergedIds = [...dispatched.map(d => d.id), ...Array.from(picked)];
      const result = await dailyDispatchApi.create({ agentId: selectedAgent, date: dispatchDate, caseIds: mergedIds });
      const newCount = result.length - dispatched.length;
      setFeedback({ kind: 'ok', msg: `Dispatched ${newCount > 0 ? newCount : picked.size} case(s) to ${agentFullName}.` });
      setDispatched(result); setPicked(new Set()); setActiveTab('done');
    } catch (e: any) {
      setFeedback({ kind: 'err', msg: 'Dispatch could not be sent.', sub: e?.response?.data?.message || 'No cases were assigned. Please try again.' });
    } finally { setSubmitting(false); }
  };

  const totalAssignedAmt = useMemo(() => cases.reduce((s, c) => s + (resolveAmount(c) ?? 0), 0), [cases]);
  const totalDispatchedAmt = useMemo(() => dispatched.reduce((s, c) => s + (resolveAmount(c) ?? 0), 0), [dispatched]);

  return (
    <div className="dd-page">
      {/* ── Page Header ── */}
      <div className="dd-page-header">
        <div className="dd-page-titles">
          <h1 className="dd-page-title">Daily Dispatch</h1>
          <span className="dd-page-context">
            {agentFullName ? (
              <>Field Officer: <strong>{agentFullName}</strong></>
            ) : (
              'Select a Field Officer'
            )}
            {canDispatch && orgDispatched != null && (
              <span className="dd-cp-tab-count" style={{ marginLeft: 10 }} title="Cases dispatched org-wide on this date">
                {orgDispatched} dispatched org-wide
              </span>
            )}
          </span>
        </div>

        <div className="dd-page-actions">
          <div className="dd-date-nav">
            <div className="dd-date-display" onClick={() => dateInputRef.current?.showPicker?.()}>
              <button type="button" className="dd-date-arrow" onClick={(e) => { e.stopPropagation(); shiftDate(-1); }} aria-label="Previous day">
                <ChevronLeft size={15} />
              </button>
              <CalendarDays size={13} className="dd-date-icon" />
              <span className="dd-date-label">{dispatchDayLabel}</span>
              <button type="button" className="dd-date-arrow" onClick={(e) => { e.stopPropagation(); shiftDate(1); }} aria-label="Next day">
                <ChevronRight size={15} />
              </button>
            </div>
            <input ref={dateInputRef} type="date" value={dispatchDate}
              onChange={e => setDate(e.target.value)} className="dd-date-input-hidden" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {feedback?.kind === 'ok' && (
          <motion.div key="toast-ok" className="ds-toast is-ok" role="status"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
            onClick={() => setFeedback(null)}>
            <CheckCircle2 size={14} />
            <span>{feedback.msg}</span>
            <X size={13} className="ds-toast-x" />
          </motion.div>
        )}
        {feedback?.kind === 'err' && (
          <motion.div key="toast-err" className="dd-error-banner" role="alert"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="dd-error-icon" />
            <div className="dd-error-body">
              <span className="dd-error-title">{feedback.msg}</span>
              {feedback.sub && <span className="dd-error-sub">{feedback.sub}</span>}
            </div>
            {feedback.onRetry && (
              <button className="dd-error-retry" onClick={() => { setFeedback(null); feedback.onRetry?.(); }} aria-label="Retry">
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            )}
            <button className="dd-error-retry" onClick={() => setFeedback(null)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>



      <div className="dd-main-container">
        <div className="dd-grid">
          <div className="dd-agent-panel">
            <DispatchAgentPanel
              agents={agents} agentsLoading={agentsLoading} selectedAgent={selectedAgent}
              agentObj={agentObj} agentFullName={agentFullName} filteredAgents={filteredAgents}
              setAgent={setAgent}
              cases={cases} dispatched={dispatched} undispatchedCases={undispatchedCases}
              casesLoading={casesLoading} dispatchPct={dispatchPct} dispatchDayLabel={dispatchDayLabel}
              initials={initials}
              globalSearch={globalSearch} setGlobalSearch={setGlobalSearch}
            />
          </div>
          <div className="dd-case-panel">
            <DispatchCasePanel
              selectedAgent={selectedAgent} activeTab={activeTab} setActiveTab={setActiveTab}
              undispatchedCases={undispatchedCases} dispatchedCases={dispatchedCases} displayedCases={displayedCases}
              cases={cases} dispatched={dispatched}
              picked={picked} setPicked={setPicked} toggle={toggle} fmtINR={fmtINR} selectedTotal={selectedTotal}
              undoOne={undoOne} undoingId={undoingId} casesLoading={casesLoading}
              initials={initials} canDispatch={canDispatch} submitting={submitting} doSend={doSend} agentObj={agentObj}
              globalSearch={globalSearch} setGlobalSearch={setGlobalSearch}
              dispatchDate={dispatchDate} dispatchDayLabel={dispatchDayLabel} setDate={setDate} shiftDate={shiftDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

