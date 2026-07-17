import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, UserCheck, Send, CheckCircle2, Undo2, Search, X, Check, ArrowUpRight, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import type { UserResponse, AllocationResponse } from '../types';
import { hashColor } from '../utils/navConfig';

interface Props {
  selectedAgent: string;
  activeTab: 'queue' | 'done';
  setActiveTab: (t: 'queue' | 'done') => void;
  undispatchedCases: AllocationResponse[];
  dispatchedCases: AllocationResponse[];
  displayedCases: AllocationResponse[];
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  cases: AllocationResponse[];
  dispatched: AllocationResponse[];
  picked: Set<string>;
  setPicked: (s: Set<string>) => void;
  toggle: (id: string) => void;
  fmtINR: (n?: number | null) => string;
  selectedTotal: number;
  undoOne: (id: string) => void;
  undoingId: string | null;
  casesLoading: boolean;
  canDispatch: boolean;
  submitting: boolean;
  doSend: () => void;
  agentObj: UserResponse | undefined;
  initials: (a: UserResponse) => string;
  dispatchDate: string;
  dispatchDayLabel: string;
  setDate: (d: string) => void;
  shiftDate: (delta: number) => void;
}

// ── Count-up animation ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 500) {
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

/** Resolve outstanding amount: top-level fields first, then dynamicData scan. */
export function resolveAmount(c: AllocationResponse): number | null {
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

function resolveProduct(c: AllocationResponse): string | null {
  const dd = c.dynamicData || {};
  const key = Object.keys(dd).find(k => {
    const kl = k.toLowerCase().replace(/[\s_-]/g, '');
    return kl === 'producttype' || kl === 'loantype' || kl === 'product'
      || kl === 'scheme' || kl === 'loancategory' || kl === 'loanproduct';
  });
  if (!key) return null;
  const val = String(dd[key]).trim();
  return val.length > 0 ? val.slice(0, 14) : null;
}

function dpdTone(dpd: number): 'neutral' | 'warn' | 'high' | 'critical' {
  if (dpd <= 30)  return 'neutral';
  if (dpd <= 90)  return 'warn';
  if (dpd <= 180) return 'high';
  return 'critical';
}

const IS_APPLE = typeof navigator !== 'undefined'
  && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const DISPATCH_HINT = IS_APPLE ? '⌘↵' : 'Ctrl↵';

export default function DispatchCasePanel(p: Props) {
  const [casePage, setCasePage] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const PAGE_SIZE = 20;
  const selectedTotalAnim = useCountUp(p.selectedTotal, 500);
  const { ref: listRef, fire: ripple } = useRipple<HTMLDivElement>();
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCasePage(0);
  }, [p.activeTab, p.globalSearch]);

  const totalCases = p.displayedCases.length;
  const totalPages = Math.ceil(totalCases / PAGE_SIZE);
  const pageCases = p.displayedCases.slice(casePage * PAGE_SIZE, (casePage + 1) * PAGE_SIZE);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && p.picked.size > 0 && p.canDispatch && !p.submitting) {
        e.preventDefault();
        p.doSend();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [p.picked.size, p.canDispatch, p.submitting, p.doSend]);

  const agentFullName = p.agentObj ? `${p.agentObj.firstName} ${p.agentObj.lastName}`.trim() : '';

  return (
    <div className="dd-cases-card ds-card is-overflow-hidden">
      {/* ── Header: tabs · search ── */}
      <div className="dd-cases-head">

        {/* Tabs */}
        <div className="dd-cp-tabs">
          <button
            type="button"
            className={`dd-cp-tab${p.activeTab === 'queue' ? ' is-active' : ''}`}
            onClick={() => p.setActiveTab('queue')}
          >
            Queue
            <span className="dd-cp-tab-count">{p.undispatchedCases.length}</span>
          </button>
          <button
            type="button"
            className={`dd-cp-tab${p.activeTab === 'done' ? ' is-active' : ''}`}
            onClick={() => p.setActiveTab('done')}
          >
            Done
            <span className="dd-cp-tab-count">{p.dispatchedCases.length}</span>
          </button>
        </div>

        {/* Search */}
        <AnimatePresence mode="popLayout">
          {!isSearchActive && !p.globalSearch ? (
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
              style={{ overflow: 'hidden' }}
            >
              <Search size={14} className="dd-agent-search-icon" style={{ flexShrink: 0, color: 'var(--ink-tertiary)', marginLeft: 4 }} />
              <input
                autoFocus
                value={p.globalSearch}
                onChange={e => p.setGlobalSearch(e.target.value)}
                placeholder="Search cases & officers…"
                style={{ width: '100%' }}
              />
              <button 
                type="button" 
                className="dd-cp-search-clear" 
                onClick={() => { setIsSearchActive(false); p.setGlobalSearch(''); }}
                aria-label="Close search"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Case list ── */}
      <div className="dd-cp-list-wrap" ref={listRef}>
        <div className="dd-cp-list">
          <AnimatePresence mode="wait">
            <motion.div
              key={p.activeTab + p.globalSearch}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {p.casesLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="dd-case-skel" style={{ opacity: 1 - i * 0.1 }}>
                    <span className="ds-skel" style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="ds-skel" style={{ height: 14, width: '45%' }} />
                      <span className="ds-skel" style={{ height: 11, width: '65%' }} />
                    </div>
                    <span className="ds-skel" style={{ height: 16, width: 70 }} />
                  </div>
                ))
              ) : !p.selectedAgent ? (
                <div className="dd-cp-empty" style={{ height: '100%' }}>
                  <div className="dd-cp-empty-icon">
                    <UserCheck size={22} />
                  </div>
                  <p className="dd-cp-empty-title">Select a field officer</p>
                  <p className="dd-cp-empty-sub">Pick an officer from the list to view their dispatch queue.</p>
                </div>
              ) : pageCases.length === 0 ? (
                <div className="dd-cp-empty">
                  <div className={`dd-cp-empty-icon${p.activeTab === 'queue' && !p.globalSearch ? ' is-clear' : ''}`}>
                    {p.activeTab === 'done'
                      ? <Send size={22} />
                      : p.globalSearch ? <Search size={22} /> : <CheckCircle2 size={22} />
                    }
                  </div>
                  <p className="dd-cp-empty-title">
                    {p.activeTab === 'done' ? 'Queue is empty'
                      : p.globalSearch ? 'No matches'
                      : 'All clear'}
                  </p>
                  <p className="dd-cp-empty-sub">
                    {p.activeTab === 'done' ? 'No cases dispatched yet for this date.'
                      : p.globalSearch ? 'Try a different search term.'
                      : 'All assigned cases have been dispatched.'}
                  </p>
                </div>
              ) : (
                <>
                  {pageCases.map((c) => {
                    const isPicked  = p.picked.has(c.id);
                    const isDone    = p.activeTab === 'done';
                    const amt       = resolveAmount(c);
                    const dpd       = resolveDPD(c);
                    const product   = resolveProduct(c);
                    const loanRef   = c.loanAccountNo || c.loanNumber || '—';
                    return (
                      <div key={c.id}
                        className={`dd-case-row${isPicked ? ' is-picked' : ''}${isDone ? ' is-done' : ''}`}
                        onClick={isDone ? undefined : (e) => { ripple(e as any); p.toggle(c.id); }}
                        style={{ boxShadow: isPicked ? 'none' : undefined }}
                      >
                        <div className={`dd-case-check${isPicked ? ' is-checked' : ''}${isDone ? ' is-done' : ''}`}>
                          {(isPicked || isDone) && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div className="dd-case-info">
                          <span className="dd-case-borrower">{c.borrowerName || '—'}</span>
                          <div className="dd-case-meta">
                            <span className="dd-case-loan">{loanRef}</span>
                            {dpd != null && (
                              <span className={`dd-case-dpd is-${dpdTone(dpd)}`}>DPD {dpd}</span>
                            )}
                            {product && (
                              <span className="dd-case-product">{product}</span>
                            )}
                          </div>
                        </div>

                        <div className="dd-case-right">
                          {amt != null && (
                            <div className="dd-case-amount-col">
                              <span className="dd-case-amount">{p.fmtINR(amt)}</span>
                              <span className="dd-case-amount-lbl">POS</span>
                            </div>
                          )}
                          {isDone && (
                            <button type="button" className="dd-undo-btn"
                              onClick={e => { e.stopPropagation(); p.undoOne(c.id); }}
                              disabled={p.undoingId === c.id}
                              aria-label="Undo dispatch">
                              {p.undoingId === c.id
                                ? <Loader2 size={13} className="ds-spin" />
                                : <Undo2 size={13} />
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {p.dispatched.length > 0 && p.activeTab === 'queue' && (
                    <Link to="/app/today" className="dd-cp-view-link">
                      View dispatched list <ArrowUpRight size={12} style={{ marginLeft: 4, display: 'inline' }} />
                    </Link>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && !p.casesLoading && (
        <div className="up-pagination" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <span className="up-page-meta">
            Page <strong>{casePage + 1}</strong> of <strong>{totalPages}</strong>
            {' · '}<strong>{totalCases.toLocaleString('en-IN')}</strong> cases
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

      {/* ── Send bar — floats in when cases are selected ── */}
      <AnimatePresence>
        {p.picked.size > 0 && p.canDispatch && (
          <motion.div
            className="dd-send-bar"
            style={{ margin: '0 12px 12px', flexShrink: 0 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {p.agentObj && (
              <div className="dd-send-bar-agent">
                <div
                  className="dd-send-bar-avatar"
                  style={{ background: hashColor(`${p.agentObj.firstName}${p.agentObj.lastName}`), color: '#fff', border: 'none' }}
                >
                  {p.initials(p.agentObj)}
                </div>
                <div className="dd-send-bar-agent-info">
                  <span className="dd-send-bar-to">To</span>
                  <span className="dd-send-bar-name">{agentFullName}</span>
                </div>
              </div>
            )}

            <div className="dd-send-bar-info">
              <span className="dd-send-bar-count">{p.picked.size} {p.picked.size === 1 ? 'case' : 'cases'}</span>
              {p.selectedTotal > 0 && (
                <span className="dd-send-bar-value">
                  {p.fmtINR(selectedTotalAnim)}
                </span>
              )}
            </div>

            <div className="dd-send-bar-actions">
              <button type="button" className="dd-bar-btn-cancel"
                onClick={() => p.setPicked(new Set())}
                disabled={p.submitting}>
                Cancel
              </button>
              <button type="button" className="dd-bar-btn-confirm"
                onClick={p.doSend}
                disabled={p.submitting}>
                {p.submitting
                  ? <Loader2 size={14} className="ds-spin" />
                  : <><Send size={13} />Dispatch<span className="dd-bar-kbd">{DISPATCH_HINT}</span></>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
