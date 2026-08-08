import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { allocationsApi } from '../api/allocationsApi';
import type { AllocationResponse, UserResponse } from '../types';
import { UserCheck, ChevronLeft, ChevronRight, Loader2, CheckCircle2, Check, UserPlus, Send } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { formatCurrency, StatusPill } from './LoansHelpers';
import './Dashboard.css';

const PAGE_SIZE = 5;

const initials = (f: UserResponse) =>
  `${f.firstName?.[0] ?? ''}${f.lastName?.[0] ?? ''}`.toUpperCase() || '?';

interface Props {
  orgId: string;
  selectedFo: string;
  selectedFoObj: UserResponse | undefined;
  submitting: boolean;
  canAssignBase: boolean;
  onAssign: (pickedIds: string[]) => void;
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

// ── Ripple hook ────────────────────────────────────────────────────────────────

function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const fire = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const span = document.createElement('span');
    span.className = 'db-ripple';
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }, []);
  return { ref, fire };
}

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start: number | null = null;
    const frame = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
}

export default function AssignCasePanel({
  orgId, selectedFo, selectedFoObj, submitting, canAssignBase, onAssign, externalSearch = '',
}: Props) {
  const { hasPermission } = usePermissions();

  const [cases,        setCases]        = useState<AllocationResponse[]>([]);
  const [totalCases,   setTotalCases]   = useState(0);
  const [totalPages,   setTotalPages]   = useState(0);
  const [casePage,     setCasePage]     = useState(0);
  const [casesLoading, setCasesLoading] = useState(false);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [picked,       setPicked]       = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { ref: containerRef, fire: ripple } = useRipple<HTMLDivElement>();

  const loadCases = useCallback(async (page = casePage) => {
    if (!orgId) return;
    setCasesLoading(true);
    const effectiveSearch = externalSearch.trim() || searchTerm;
    try {
      const data = await allocationsApi.listAllocations({
        organizationId: orgId, status: 'UNASSIGNED',
        searchTerm: effectiveSearch || undefined,
        page, size: PAGE_SIZE, sortBy: 'createdAt', sortDirection: 'desc',
      });
      setCases(data.content ?? []);
      const total = data.totalElements ?? 0;
      setTotalCases(total);
      setTotalPages(data.totalPages ?? 0);
    } catch { setCases([]); }
    finally { setCasesLoading(false); }
  }, [orgId, casePage, searchTerm, externalSearch]);

  useEffect(() => { loadCases(); }, [loadCases]);
  useEffect(() => { if (!submitting) setPicked(new Set()); }, [submitting]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearchTerm(externalSearch.trim()); setCasePage(0); }, 350);
  }, [externalSearch]);

  const toggle    = (id: string) => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const canAssign  = canAssignBase && picked.size > 0 && !submitting;
  const canPick    = hasPermission('CASE_ASSIGN') && !!selectedFo;
  const agentFirstName = selectedFoObj?.firstName ?? '';
  
  const selectedTotalAmt = Array.from(picked).reduce((sum, id) => {
    const c = cases.find(x => x.id === id);
    return sum + (c?.outstandingAmount ?? 0);
  }, 0);
  
  const selectedTotalAnim = useCountUp(selectedTotalAmt, 500);

  return (
    <>
      <div className="dd-cp-list-wrap" ref={containerRef}>
        <div className="dd-cp-list">
          <AnimatePresence mode="wait">
          <motion.div key="assign-list" variants={fadeIn} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column' }}>
            {casesLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="dd-case-skel" style={{ opacity: 1 - i * 0.1 }}>
                  <span className="ds-skel" style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="ds-skel" style={{ height: 14, width: '45%' }} />
                    <span className="ds-skel" style={{ height: 11, width: '65%' }} />
                  </div>
                  <span className="ds-skel" style={{ height: 16, width: 70 }} />
                </div>
              ))
            ) : !selectedFo ? (
              <motion.div className="ds-empty" variants={fadeUp} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                <UserCheck size={32} className="ds-empty-icon" />
                <span className="ds-empty-title">Select an officer</span>
                <span className="ds-empty-sub">Pick a field officer from the panel on the left to begin assigning.</span>
              </motion.div>
            ) : cases.length === 0 ? (
              <motion.div className="ds-empty" variants={fadeUp} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                <CheckCircle2 size={32} className="ds-empty-icon" style={{ color: 'var(--success)' }} />
                <span className="ds-empty-title">{searchTerm || externalSearch ? 'No matches' : 'All clear'}</span>
                <span className="ds-empty-sub">{searchTerm || externalSearch ? 'Try a different search term or clear it.' : 'Every case in the pool has been assigned.'}</span>
              </motion.div>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show">
                {cases.map((c, idx) => {
                  const isPicked = picked.has(c.id);
                  return (
                    <motion.div key={c.id} variants={fadeUp}
                      className={`db-att-row dd-case-row${isPicked ? ' is-picked' : ''}`}
                      onClick={canPick ? (e) => { ripple(e as any); toggle(c.id); } : undefined}
                      style={{ cursor: canPick ? 'pointer' : 'default', opacity: canPick ? 1 : 0.6, boxShadow: isPicked ? 'none' : undefined }}
                    >
                      <div className={`dd-case-check${isPicked ? ' is-checked' : ''}`}>
                        {isPicked && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div className="dd-case-info">
                        <span className="dd-case-borrower">{c.borrowerName || '—'}</span>
                        <div className="dd-case-meta">
                          <span className={`ds-pill is-${(c.status as string) === 'DONE' ? 'success' : (c.status as string) === 'IN_PROGRESS' ? 'info' : (c.status as string) === 'CANCELLED' ? 'neutral' : 'warning'}`} style={{ fontSize: 10, padding: '0 4px', height: 16 }}>
                            {c.status}
                          </span>
                          <span>{c.loanNumber || c.loanAccountNo || '—'}</span>
                        </div>
                      </div>

                      <div className="dd-case-amt">
                        {c.outstandingAmount != null ? (
                          <>
                            <span className="dd-case-amt-val">{formatCurrency(c.outstandingAmount)}</span>
                            <span className="dd-case-amt-lbl">POS</span>
                          </>
                        ) : <span className="dd-case-amt-val">—</span>}
                      </div>
                    </motion.div>
                  );
                })}
                  <div style={{ height: 16, flexShrink: 0 }} />
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

        {totalPages > 1 && !casesLoading && (
          <div className="up-pagination" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
            <span className="up-page-meta">
              Page <strong>{casePage + 1}</strong> of <strong>{totalPages}</strong> · <strong>{totalCases.toLocaleString('en-IN')}</strong> cases
            </span>
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              <button type="button" className="up-page-btn"
                onClick={() => setCasePage(p => Math.max(0, p - 1))}
                disabled={casePage === 0}>
                <ChevronLeft size={14} />
              </button>
              <button type="button" className="up-page-btn"
                onClick={() => setCasePage(p => Math.min(totalPages - 1, p + 1))}
                disabled={casePage >= totalPages - 1}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Inline Action Row that replaces 5th row visually */}
        <AnimatePresence>
          {picked.size > 0 && canAssignBase && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 71 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', flexShrink: 0, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <button
                type="button"
                onClick={() => onAssign(Array.from(picked))}
                disabled={submitting}
                className="ds-btn is-primary"
                style={{ width: 'calc(100% - 32px)', height: 42, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {submitting ? <Loader2 size={16} className="ds-spin" /> : <Send size={16} />}
                Assign {picked.size} {picked.size === 1 ? 'case' : 'cases'} to {agentFirstName || 'User'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
    </>
  );
}