import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { visitsApi } from '../api/visitsApi';
import { collectionsApi } from '../api/collectionsApi';
import { ptpsApi } from '../api/ptpsApi';
import type { AuditLogResponse, ApiResponse, PagedResponse } from '../types';
import { RefreshCw, User, FileText, ChevronLeft, ChevronRight, AlertCircle, SlidersHorizontal, X, Calendar } from 'lucide-react';
import {
  type OrgEvent, type EventKind, type FilterKind,
  fmtDT, fmtINR, fromAudit, fromVisit, fromCollection, fromPtp,
  KIND_META, dotVariant, PAGE_SIZE, FETCH_SIZE,
} from './AuditHelpers';
import '../styles/AppPage.css';
import '../styles/AuditPage.css';
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

// Date-only strings from <input type="date"> parse as UTC midnight by spec;
// anchor them to IST midnight instead so filter boundaries and pill labels
// match the calendar day an IST user actually picked.
function istDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00+05:30`);
}

export default function AuditPage() {
  const [events,  setEvents]  = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,     setFilter]     = useState<FilterKind>('all');
  const [fromDate,   setFromDate]   = useState<string>('');
  const [toDate,     setToDate]     = useState<string>('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Temporary state for the modal
  const [tempFilter,   setTempFilter]   = useState<FilterKind>('all');
  const [tempFromDate, setTempFromDate] = useState<string>('');
  const [tempToDate,   setTempToDate]   = useState<string>('');

  const openFilterModal = () => {
    setTempFilter(filter);
    setTempFromDate(fromDate);
    setTempToDate(toDate);
    setFilterOpen(true);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [auditRes, visitsRes, colsRes, ptpsRes] = await Promise.allSettled([
        axiosInstance.get<ApiResponse<PagedResponse<AuditLogResponse>>>('/api/v1/audit-logs', { params: { page: 0, size: FETCH_SIZE } }),
        visitsApi.listByOrg(0, FETCH_SIZE),
        collectionsApi.listCollections({ page: 0, size: FETCH_SIZE }),
        ptpsApi.listPtps({ page: 0, size: FETCH_SIZE }),
      ]);
      const all: OrgEvent[] = [];
      if (auditRes.status === 'fulfilled')  (auditRes.value.data?.data?.content ?? []).forEach(l => all.push(fromAudit(l)));
      if (visitsRes.status === 'fulfilled') (visitsRes.value.content ?? []).forEach(v => all.push(fromVisit(v)));
      if (colsRes.status === 'fulfilled')   (colsRes.value.content ?? []).forEach(c => all.push(fromCollection(c)));
      if (ptpsRes.status === 'fulfilled')   (ptpsRes.value.content ?? []).forEach(p => all.push(fromPtp(p)));
      all.sort((a, b) => (b.ts ?? '').localeCompare(a.ts ?? ''));
      setEvents(all);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Failed to load activity');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = events.filter(e => {
    if (filter !== 'all' && e.kind !== filter) return false;
    if (fromDate) {
      const eDate = new Date(e.ts).getTime();
      const fDate = istDateOnly(fromDate).getTime();
      if (eDate < fDate) return false;
    }
    if (toDate) {
      const eDate = new Date(e.ts).getTime();
      const tDate = istDateOnly(toDate).getTime() + 86400000;
      if (eDate >= tDate) return false;
    }
    return true;
  });

  const setFilterAndReset = (f: FilterKind) => { 
    setFilter(f); 
    if (f === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  const kindCounts: Record<EventKind, number> = {
    assignment: events.filter(e => e.kind === 'assignment').length,
    visit:      events.filter(e => e.kind === 'visit').length,
    collection: events.filter(e => e.kind === 'collection').length,
    ptp:        events.filter(e => e.kind === 'ptp').length,
  };

  const FILTER_DEFS: { id: FilterKind; label: string }[] = [
    { id: 'all',        label: 'All' },
    { id: 'assignment', label: 'Assignments' },
    { id: 'visit',      label: 'Visits' },
    { id: 'collection', label: 'Collections' },
    { id: 'ptp',        label: 'PTPs' },
  ];

  return (
    <div className="dd-page">
      <AnimatePresence>
        {error && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">{error}</span>
            </div>
            <button className="db-error-retry" onClick={() => { setError(null); fetchAll(); }} aria-label="Retry">
              <RefreshCw size={14} aria-hidden="true" /> Retry
            </button>
            <button className="db-error-retry" onClick={() => setError(null)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dd-page-header">
        <div className="dd-page-titles">
          <h1 className="dd-page-title">Audit Log</h1>
          <span className="dd-page-context">
            {!loading && events.length > 0 
              ? `${events.length.toLocaleString('en-IN')} total events recorded` 
              : 'System activity trail'}
          </span>
        </div>
        <div className="dd-page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={openFilterModal}
            className="ds-btn is-secondary"
            style={{ position: 'relative' }}
          >
            <SlidersHorizontal size={14} style={{ marginRight: 6 }} />
            Filter
            {(filter !== 'all' || fromDate || toDate) && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />}
          </button>
          <button
            type="button" onClick={() => { fetchAll(); }} disabled={loading}
            className="ds-btn is-secondary" aria-label="Refresh" title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'ds-spin' : ''} style={{ marginRight: 6 }} /> Refresh
          </button>
        </div>
      </div>

      <div className="dd-shell" style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
        <AnimatePresence>
          {(filter !== 'all' || fromDate || toDate) && (
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {filter !== 'all' && (
                <span className="ds-pill is-accent">
                  {FILTER_DEFS.find(f => f.id === filter)?.label}
                  <button type="button" onClick={() => setFilter('all')} aria-label="Clear filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {fromDate && (
                <span className="ds-pill is-accent">
                  From: {istDateOnly(fromDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })}
                  <button type="button" onClick={() => setFromDate('')} aria-label="Clear date" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {toDate && (
                <span className="ds-pill is-accent">
                  To: {istDateOnly(toDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })}
                  <button type="button" onClick={() => setToDate('')} aria-label="Clear date" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                    <X size={11} />
                  </button>
                </span>
              )}
              <button type="button" onClick={() => setFilterAndReset('all')} className="db-customize-btn" style={{ padding: '0 8px', fontSize: 11 }}>
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={stagger} initial="hidden" animate="show" className="ds-card audit-trail-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="audit-trail-card-header">
            <span className="audit-trail-card-title">Activity stream</span>
            <span className="audit-trail-card-count">{filtered.length}</span>
          </div>
          
          <div className="audit-trail-list" style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="audit-trail-row">
                  <div className="audit-trail-rail">
                    <div className="audit-trail-dot is-skel" />
                    {i < 7 && <div className="audit-trail-line" />}
                  </div>
                  <div className="audit-trail-content" style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                    <span className="ds-skel" style={{ height: 14, width: '40%', borderRadius: 4 }} />
                    <span className="ds-skel" style={{ height: 11, width: '25%', borderRadius: 4 }} />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <motion.div variants={fadeIn} initial="hidden" animate="show" className="dd-cp-empty">
                <div className="dd-cp-empty-icon">
                  <FileText size={20} />
                </div>
                <span className="dd-cp-empty-title">No activity found</span>
                <span className="dd-cp-empty-sub">
                  {filter === 'all' ? 'Nothing has happened yet.' : 'No events match the current filter.'}
                </span>
              </motion.div>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column' }}>
                {Object.entries(
                  filtered.reduce((acc, e) => {
                    const d = new Date(e.ts);
                    const key = isNaN(d.getTime()) ? 'Unknown Date' : d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(e);
                    return acc;
                  }, {} as Record<string, OrgEvent[]>)
                ).map(([dateLabel, dayEvents], dayIdx, dayArr) => (
                  <div key={dateLabel} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-primary)', paddingBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={14} style={{ color: 'var(--ink-tertiary)' }} />
                      {dateLabel}
                    </div>
                    {dayEvents.map((e, idx) => {
                      const Icon = KIND_META[e.kind].Icon;
                      const isLastEvent = idx === dayEvents.length - 1 && dayIdx === dayArr.length - 1;
                      return (
                        <motion.div key={e.key} variants={fadeUp} className="audit-trail-row">
                          <div className="audit-trail-rail">
                            <div className={`audit-trail-dot ${dotVariant(e)}`} />
                            {!isLastEvent && <div className="audit-trail-line" />}
                          </div>
                          <div className="audit-trail-content">
                            <div className="audit-trail-row-head">
                              <div className="audit-trail-row-head-left">
                                <span className="audit-trail-event-title">{e.title}</span>
                                <span className="audit-trail-kind">
                                  <Icon size={10} style={{ marginRight: 2 }} /> {KIND_META[e.kind].label}
                                </span>
                                {e.status && (
                                  <span className={`ds-pill audit-trail-status-pill ${dotVariant(e)}`}>
                                    {e.status.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                              <span className="audit-trail-ts">
                                {new Date(e.ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="audit-trail-meta-row">
                              {e.actor && (
                                <span className="audit-trail-meta-actor">
                                  <User size={13} /> {e.actor}
                                </span>
                              )}
                              {e.subtitle && (
                                <span className="audit-trail-meta-sub">
                                  • {e.subtitle}
                                </span>
                              )}
                              {e.amount != null && e.amount > 0 && (
                                <span className="audit-trail-meta-amount">
                                  • {fmtINR(e.amount)}
                                </span>
                              )}
                            </div>
                            {e.reason && (
                              <div className="audit-trail-reason">
                                {e.reason}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {filterOpen && (
          <motion.div className="ds-modal-overlay" onClick={() => setFilterOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <motion.div className="ds-modal" onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="ds-modal-header">
                <span className="ds-modal-title">Filter events</span>
                <button type="button" onClick={() => setFilterOpen(false)} className="ds-modal-close" aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <span className="ds-label" style={{ display: 'block', marginBottom: 10 }}>Event type</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {FILTER_DEFS.map(f => {
                  const count = f.id === 'all' ? events.length : kindCounts[f.id as EventKind];
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className={`ds-btn is-sm ${tempFilter === f.id ? 'is-primary' : 'is-secondary'}`}
                      style={tempFilter === f.id ? { background: 'var(--ink-solid)', color: 'var(--bg-surface)' } : {}}
                      onClick={() => setTempFilter(f.id as FilterKind)}
                    >
                      {f.label}
                      {count > 0 && <span className="ds-pill is-neutral" style={tempFilter === f.id ? { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', marginLeft: 6 } : { marginLeft: 6 }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
              
              <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                <div style={{ flex: 1 }}>
                  <span className="ds-label" style={{ display: 'block', marginBottom: 8 }}>From Date</span>
                  <input type="date" className="ds-input" value={tempFromDate} onChange={e => setTempFromDate(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="ds-label" style={{ display: 'block', marginBottom: 8 }}>To Date</span>
                  <input type="date" className="ds-input" value={tempToDate} onChange={e => setTempToDate(e.target.value)} />
                </div>
              </div>

              <div className="ds-modal-actions">
                <button type="button" onClick={() => { setFilterAndReset('all'); setFilterOpen(false); }} className="ds-btn is-secondary">
                  Clear All
                </button>
                <button type="button" onClick={() => {
                  setFilter(tempFilter);
                  setFromDate(tempFromDate);
                  setToDate(tempToDate);
                  setFilterOpen(false);
                }} className="ds-btn is-primary">
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
