import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { allocationsApi } from '../api/allocationsApi';
import { assignmentsApi } from '../api/assignmentsApi';
import { usePermissions } from '../hooks/usePermissions';
import type { AllocationResponse, UserResponse } from '../types';
import { ArrowRightLeft, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Trash2, UserCheck, X } from 'lucide-react';
import { StatusPill } from './LoansHelpers';
import './Dashboard.css';

const ASSIGNED_SIZE = 15;

interface Props {
  selectedFo: string;
  selectedFoObj: UserResponse | undefined;
  onFeedback: (f: { kind: 'ok' | 'err'; msg: string }) => void;
  onOpenReassign: (assignmentId: string, allocationId: string, caseName: string | null) => void;
  externalSearch?: string;
}

// ── Motion variants ────────────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

export default function ReassignPanel({ selectedFo, selectedFoObj, onFeedback, onOpenReassign, externalSearch = '' }: Props) {
  const { hasAnyRole } = usePermissions();
  const canDelete = hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN');

  const [assignedCases,      setAssignedCases]      = useState<AllocationResponse[]>([]);
  const [assignedTotal,      setAssignedTotal]      = useState(0);
  const [assignedTotalPages, setAssignedTotalPages] = useState(0);
  const [assignedPage,       setAssignedPage]       = useState(0);
  const [assignedLoading,    setAssignedLoading]    = useState(false);
  const [fetchingFor,        setFetchingFor]        = useState<string | null>(null);
  const [confirmDeleteId,    setConfirmDeleteId]    = useState<string | null>(null);
  const [deletingId,         setDeletingId]         = useState<string | null>(null);

  const loadAssigned = useCallback(async (page = assignedPage) => {
    if (!selectedFo) {
      setAssignedCases([]); setAssignedTotal(0); setAssignedTotalPages(0);
      return;
    }
    setAssignedLoading(true);
    try {
      const data = await allocationsApi.getAllocations({
        assignedToUserId: selectedFo, page, size: ASSIGNED_SIZE,
      });
      setAssignedCases(data.content ?? []);
      setAssignedTotal(data.totalElements ?? 0);
      setAssignedTotalPages(data.totalPages ?? 0);
    } catch { setAssignedCases([]); }
    finally { setAssignedLoading(false); }
  }, [selectedFo, assignedPage]);

  useEffect(() => { setAssignedPage(0); loadAssigned(0); }, [selectedFo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (assignedPage > 0) loadAssigned(); }, [assignedPage]);  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = externalSearch.trim()
    ? assignedCases.filter(c => {
        const q = externalSearch.toLowerCase();
        return c.loanNumber?.toLowerCase().includes(q) || c.borrowerName?.toLowerCase().includes(q);
      })
    : assignedCases;

  const openReassign = async (caseId: string, caseName: string | null) => {
    setFetchingFor(caseId);
    try {
      const assignment = await assignmentsApi.getByAllocationId(caseId);
      onOpenReassign(assignment.id, caseId, caseName);
    } catch {
      onFeedback({ kind: 'err', msg: 'Could not load assignment details. Please try again.' });
    } finally { setFetchingFor(null); }
  };

  const confirmDelete = async (caseId: string) => {
    setDeletingId(caseId);
    try {
      await allocationsApi.deleteAllocation(caseId);
      onFeedback({ kind: 'ok', msg: 'Case deleted.' });
      setConfirmDeleteId(null);
      loadAssigned();
    } catch {
      onFeedback({ kind: 'err', msg: 'Could not delete this case. Please try again.' });
    } finally { setDeletingId(null); }
  };

  return (
    <>
      <div className="dd-cp-list-wrap">
        <div className="dd-cp-list">
          <AnimatePresence mode="wait">
            <motion.div key="reassign-list" variants={fadeIn} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column' }}>
            {!selectedFo ? (
              <motion.div className="ds-empty" variants={fadeUp} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                <UserCheck size={32} className="ds-empty-icon" />
                <span className="ds-empty-title">Select an officer</span>
                <span className="ds-empty-sub">Pick an officer from the left panel to view their assigned cases.</span>
              </motion.div>
            ) : assignedLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="dd-case-skel" style={{ opacity: 1 - i * 0.1 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="ds-skel" style={{ height: 14, width: '45%' }} />
                    <span className="ds-skel" style={{ height: 11, width: '65%' }} />
                  </div>
                  <span className="ds-skel" style={{ height: 16, width: 70 }} />
                  <span className="ds-skel" style={{ height: 32, width: 96, borderRadius: 8, flexShrink: 0 }} />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <motion.div className="ds-empty" variants={fadeUp} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                <CheckCircle2 size={32} className="ds-empty-icon" style={{ color: 'var(--success)' }} />
                <span className="ds-empty-title">{externalSearch ? 'No matches' : 'No active cases'}</span>
                <span className="ds-empty-sub">
                  {externalSearch
                    ? 'No cases match your search term.'
                    : `${selectedFoObj?.firstName ?? 'This agent'} has no cases currently assigned.`}
                </span>
              </motion.div>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show">
                {filtered.map(c => (
                  <motion.div key={c.id} variants={fadeUp}
                    className="db-att-row dd-case-row"
                  >
                    <div className="dd-case-info">
                      <span className="dd-case-borrower">{c.borrowerName || '—'}</span>
                      <div className="dd-case-meta">
                        <span className={`ds-pill is-${(c.status as string) === 'DONE' ? 'success' : (c.status as string) === 'IN_PROGRESS' ? 'info' : (c.status as string) === 'CANCELLED' ? 'neutral' : 'warning'}`} style={{ fontSize: 10, padding: '0 4px', height: 16 }}>
                          {c.status}
                        </span>
                        <span>{c.loanNumber || c.loanAccountNo || '—'}</span>
                      </div>
                    </div>

                    <div className="dd-case-amt" style={{ alignItems: 'flex-end', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                      {canDelete && confirmDeleteId === c.id ? (
                        <>
                          <button type="button" className="db-error-retry"
                            style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 6, padding: '4px 8px', display: 'flex', gap: 6 }}
                            disabled={deletingId === c.id}
                            onClick={() => confirmDelete(c.id)}>
                            {deletingId === c.id
                              ? <Loader2 size={13} className="ds-spin" />
                              : <Trash2 size={13} />}
                            <span style={{ fontSize: 11, fontWeight: 500 }}>Confirm delete</span>
                          </button>
                          <button type="button" className="db-error-retry"
                            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}
                            disabled={deletingId === c.id}
                            onClick={() => setConfirmDeleteId(null)}>
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          {canDelete && (
                            <button type="button" className="db-error-retry"
                              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}
                              title="Delete case"
                              onClick={() => setConfirmDeleteId(c.id)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                          <button type="button" className="db-error-retry"
                            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', display: 'flex', gap: 6 }}
                            disabled={fetchingFor === c.id}
                            onClick={() => openReassign(c.id, c.borrowerName ?? null)}>
                            {fetchingFor === c.id
                              ? <Loader2 size={13} className="ds-spin" />
                              : <ArrowRightLeft size={13} />}
                            <span style={{ fontSize: 11, fontWeight: 500 }}>Reassign</span>
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {assignedTotalPages > 1 && !assignedLoading && (
        <div className="up-pagination" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <span className="up-page-meta">
            Page <strong>{assignedPage + 1}</strong> of <strong>{assignedTotalPages}</strong> · <strong>{assignedTotal.toLocaleString('en-IN')}</strong> cases
          </span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button type="button" className="up-page-btn"
              onClick={() => setAssignedPage(p => Math.max(0, p - 1))}
              disabled={assignedPage === 0}>
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="up-page-btn"
              onClick={() => setAssignedPage(p => Math.min(assignedTotalPages - 1, p + 1))}
              disabled={assignedPage >= assignedTotalPages - 1}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

