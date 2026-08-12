import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { allocationsApi } from '../api/allocationsApi';
import { assignmentsApi } from '../api/assignmentsApi';
import { usePermissions } from '../hooks/usePermissions';
import type { AllocationResponse, UserResponse } from '../types';
import { ArrowRightLeft, CheckCircle2, Loader2, Trash2, UserCheck, X } from 'lucide-react';
import { StatusPill, formatCurrency } from './LoansHelpers';
import { Pagination } from '../components/Pagination';
import { resolveAmount } from './DispatchCasePanel';
import { PILL_VARIANT, dynField } from './LoanDetailHelpers';
import './Dashboard.css';

/** Most recent visit disposition — set/updated by the FO from the allocation
 *  detail page, so it can change between renders as visits get logged. */
function resolveDisposition(c: AllocationResponse): string | undefined {
  return c.latestDisposition || dynField(c.dynamicData || {}, ['disposition', 'Disposition', 'DISPOSITION']);
}

const ASSIGNED_SIZE = 10;

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
            <motion.div key="reassign-list" variants={fadeIn} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
                {filtered.map(c => {
                  const amt = resolveAmount(c);
                  const disposition = resolveDisposition(c);
                  return (
                  <motion.div key={c.id} variants={fadeUp}
                    className="db-att-row dd-case-row is-list-row"
                  >
                    <div className="dd-case-info">
                      <span className="dd-case-borrower">{c.borrowerName || '—'}</span>
                      <div className="dd-case-meta">
                        <span className={`ds-pill is-${(c.status as string) === 'DONE' ? 'success' : (c.status as string) === 'IN_PROGRESS' ? 'info' : (c.status as string) === 'CANCELLED' ? 'neutral' : 'warning'}`} style={{ fontSize: 10, padding: '0 4px', height: 16 }}>
                          {c.status}
                        </span>
                        <span className="dd-case-loan">{c.loanNumber || c.loanAccountNo || '—'}</span>
                        {disposition && (
                          <span className={`ds-pill ${PILL_VARIANT[disposition] ?? ''}`} style={{ fontSize: 9.5, padding: '1px 5px', height: 'auto' }}>
                            {disposition.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {amt != null && (
                      <div className="dd-case-amount-col">
                        <span className="dd-case-amount">{formatCurrency(amt)}</span>
                        <span className="dd-case-amount-lbl">POS</span>
                      </div>
                    )}

                    <div className="dd-case-right" style={{ gap: 6 }}>
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
                  );
                })}
              </motion.div>
            )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {assignedTotalPages > 1 && !assignedLoading && (
        <Pagination
          currentPage={assignedPage}
          totalPages={assignedTotalPages}
          onPageChange={setAssignedPage}
          totalElements={assignedTotal}
          itemLabel="cases"
        />
      )}
    </>
  );
}

