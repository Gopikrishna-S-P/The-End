import { useState, useEffect, useCallback, useMemo, useRef, type KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { assignmentsApi } from '../api/assignmentsApi';
import { usePermissions } from '../hooks/usePermissions';
import type { AllocationResponse, AllocationStatus } from '../types';
import { AlertCircle, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import LoanDetailContent from './LoanDetailContent';
import ReassignModal from '../components/ReassignModal';
import {
  DetailSkeleton, STATUSES_REQUIRING_CONFIRM, NEXT_ACTION_FOR,
  findDueDate, computeDaysOverdue, groupDynamicData,
  type Tone, type GroupedFields,
} from './LoanDetailHelpers';
import '../styles/AppPage.css';
import './Dashboard.css';
import '../components/CaseTimeline.css';
import '../styles/LoanDetailPage.css';

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

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const onClose = useCallback(() => navigate('/app/allocations'), [navigate]);

  const { hasPermission } = usePermissions();
  const canChangeStatus = hasPermission('CASE_ASSIGN');

  const [allocation,      setAlloc]            = useState<AllocationResponse | null>(null);
  const [agentName,       setAgentName]         = useState<string | null>(null);
  const [loading,         setLoading]           = useState(true);
  const [error,           setError]             = useState<string | null>(null);
  const [notFound,        setNotFound]          = useState(false);
  const [statusDropdown,  setDrop]              = useState(false);
  const [statusUpdating,  setUpdating]          = useState(false);
  const [confirmingStatus,setConfirming]        = useState<AllocationStatus | null>(null);
  const [lastKnownLocation, setLastKnownLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [reassignOpen,    setReassignOpen]      = useState(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

  const triggerRef     = useRef<HTMLButtonElement>(null);
  const menuRef        = useRef<HTMLDivElement>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setAlloc(null); setAgentName(null); setError(null);
    setNotFound(false); setDrop(false); setConfirming(null);
  }, [id]);

  const loadAllocation = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const res = await axiosInstance.get(`/api/v1/allocations/${id}`);
      const alloc: AllocationResponse = res.data?.data ?? res.data;
      setAlloc(alloc);
      if (alloc?.assignedToUserId) {
        axiosInstance.get(`/api/v1/users/${alloc.assignedToUserId}`)
          .then(r => { const u = r.data?.data ?? r.data; if (u?.firstName) setAgentName(`${u.firstName} ${u.lastName ?? ''}`.trim()); })
          .catch(() => {});
        assignmentsApi.getByAllocationId(id!)
          .then(a => setActiveAssignmentId(a.id))
          .catch(() => {});
      }
      axiosInstance.get(`/api/v1/visit-logs/allocation/${id}/last-location`)
        .then(r => { const loc = r.data?.data ?? r.data; if (loc && typeof loc.lat === 'number') setLastKnownLocation({ lat: loc.lat, lng: loc.lng }); })
        .catch(() => {});
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e?.response?.status === 404) setNotFound(true);
      else setError(e?.response?.data?.message ?? 'Failed to load case.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadAllocation(); }, [loadAllocation]);

  const commitStatus = useCallback(async (newStatus: AllocationStatus) => {
    if (!id || !allocation) return;
    const prev = allocation.status;
    setAlloc(a => a ? { ...a, status: newStatus } : null);
    setDrop(false); setConfirming(null); setUpdating(true);
    try {
      await axiosInstance.patch(`/api/v1/allocations/${id}/status`, { status: newStatus });
    } catch (err: unknown) {
      setAlloc(a => a ? { ...a, status: prev } : null);
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Status update failed.');
    } finally { setUpdating(false); }
  }, [id, allocation]);

  const requestStatus = useCallback((newStatus: AllocationStatus) => {
    if (!allocation || newStatus === allocation.status || statusUpdating) return;
    if (STATUSES_REQUIRING_CONFIRM.has(newStatus)) { setConfirming(newStatus); setDrop(false); return; }
    commitStatus(newStatus);
  }, [allocation, statusUpdating, commitStatus]);

  useEffect(() => {
    if (!statusDropdown) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      setDrop(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [statusDropdown]);

  useEffect(() => {
    if (!statusDropdown) return;
    const raf = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[data-menu-item]:not([disabled])')?.focus());
    return () => cancelAnimationFrame(raf);
  }, [statusDropdown]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[data-menu-item]:not([disabled])') ?? []);
    if (!items.length) return;
    const idx = items.findIndex(el => el === document.activeElement);
    switch (e.key) {
      case 'Escape': e.preventDefault(); setDrop(false); triggerRef.current?.focus(); break;
      case 'ArrowDown': e.preventDefault(); items[(idx + 1 + items.length) % items.length]?.focus(); break;
      case 'ArrowUp': e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); break;
      case 'Home': e.preventDefault(); items[0]?.focus(); break;
      case 'End': e.preventDefault(); items[items.length - 1]?.focus(); break;
      case 'Tab': setDrop(false); break;
    }
  };

  useEffect(() => {
    if (!confirmingStatus) return;
    confirmCancelRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setConfirming(null); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmingStatus]);

  const dynamicData = allocation?.dynamicData;
  const dueDateIso   = useMemo(() => findDueDate(dynamicData), [dynamicData]);
  const daysOverdue  = useMemo(() => computeDaysOverdue(dueDateIso), [dueDateIso]);
  const groups: GroupedFields | null = useMemo(() => dynamicData ? groupDynamicData(dynamicData) : null, [dynamicData]);

  const outstandingTone: Tone = useMemo(() => {
    if (!allocation) return 'neutral';
    if (allocation.npaFlagged) return 'danger';
    if (daysOverdue != null && daysOverdue > 0) return 'warn';
    if (daysOverdue != null && daysOverdue <= 0) return 'success';
    return 'accent';
  }, [allocation, daysOverdue]);

  const daysOverdueTone: Tone = useMemo(() => {
    if (daysOverdue == null) return 'neutral';
    return daysOverdue > 0 ? 'warn' : daysOverdue === 0 ? 'warn' : 'info';
  }, [daysOverdue]);

  const nextAction = allocation ? NEXT_ACTION_FOR[allocation.status] : null;

  if (!id) return null;

  if (loading) return (
    <div className="db-root">
      <div className="db-content">
        <div className="db-inner"><DetailSkeleton /></div>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="db-root">
      <div className="db-content">
        <div className="db-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
            <AlertCircle size={32} className="ds-empty-icon" style={{ color: 'var(--error)' }} />
            <span className="ds-empty-title">Loan not found</span>
          </motion.div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="db-root">
      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">
          {error && (
            <div className="db-error-banner" role="alert" style={{ marginBottom: 24 }}>
              <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
              <div className="db-error-body">
                <span className="db-error-title">{error}</span>
              </div>
              <button className="db-error-retry" onClick={loadAllocation} aria-label="Retry">
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          {loading && !allocation ? <DetailSkeleton /> : allocation ? (
            <motion.div variants={fadeUp}>
              <LoanDetailContent
                allocation={allocation} agentName={agentName} lastKnownLocation={lastKnownLocation}
                canChangeStatus={canChangeStatus} groups={groups}
                outstandingTone={outstandingTone} daysOverdueTone={daysOverdueTone}
                dueDateIso={dueDateIso} daysOverdue={daysOverdue} nextAction={nextAction}
                statusUpdating={statusUpdating} statusDropdown={statusDropdown} setDrop={setDrop}
                triggerRef={triggerRef} menuRef={menuRef}
                requestStatus={requestStatus} onMenuKeyDown={onMenuKeyDown}
                onReassign={() => setReassignOpen(true)}
                onClose={onClose}
              />
            </motion.div>
          ) : null}
        </motion.div>
      </div>

      <AnimatePresence>
        {reassignOpen && (
          <ReassignModal
            assignmentId={activeAssignmentId}
            allocationId={id!}
            currentAgentName={agentName}
            onClose={() => setReassignOpen(false)}
            onSuccess={() => { setReassignOpen(false); setActiveAssignmentId(null); loadAllocation(); }}
          />
        )}

        {confirmingStatus === 'CLOSED' && (
          <motion.div className="ds-modal-overlay" role="dialog" aria-modal="true"
            aria-labelledby="alloc-confirm-title" aria-describedby="alloc-confirm-desc"
            onClick={e => { if (e.target === e.currentTarget) setConfirming(null); }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <motion.div className="ds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="ds-modal-header">
                <div>
                  <div className="ds-modal-title" id="alloc-confirm-title">Close this case?</div>
                </div>
                <button type="button" onClick={() => setConfirming(null)} className="ds-modal-close" aria-label="Cancel"><X size={16} /></button>
              </div>
              <div className="ds-modal-body" id="alloc-confirm-desc" style={{ padding: '0 24px 24px', fontSize: 13, color: 'var(--ink-secondary)' }}>
                This marks the case as resolved. You can still reopen it later from the status menu.
              </div>
              <div className="ds-modal-actions" style={{ display: 'flex', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                <button ref={confirmCancelRef} type="button" onClick={() => setConfirming(null)} className="ds-btn is-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="button" onClick={() => commitStatus('CLOSED')} disabled={statusUpdating} className="ds-btn is-primary" style={{ flex: 1, background: 'var(--success)', border: 'none', color: '#fff' }}>
                  {statusUpdating ? <RefreshCw size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <CheckCircle2 size={14} style={{ marginRight: 6 }} />}
                  Close case
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
