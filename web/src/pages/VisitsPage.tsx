import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { visitsApi } from '../api/visitsApi';
import type { VisitLogResponse } from '../types';
import {
  MapPin, RefreshCw,
  Search, X, ChevronUp, ChevronDown, Download, Upload, SlidersHorizontal, Activity
} from 'lucide-react';
import VisitExportModal from '../components/VisitExportModal';
import VisitImportModal from '../components/VisitImportModal';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../AuthContext';
import { VisitRow } from './VisitRow';
import '../styles/AppPage.css';
import './Dashboard.css';
import '../styles/ds/ds.empty.css';
import '../styles/VisitsPage.css';

const PAGE_SIZE = 20;

const todayIso     = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const monthStartIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

const APPROVAL_OPTIONS = [
  { value: '',         label: 'All' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING',  label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
];

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

export default function VisitsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canImport = user?.roles?.some(r => r.name === 'ROLE_ORG_ADMIN' || r.name === 'ROLE_PLATFORM_ADMIN') ?? false;

  const [visits, setVisits]               = useState<VisitLogResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch]               = useState('');
  const [approvalFilter, setApproval]     = useState('');
  const [filterOpen, setFilterOpen]       = useState(false);
  const [isSearchOpen, setIsSearchOpen]   = useState(false);
  const [sortCol, setSortCol]             = useState<string>('');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab]         = useState<'my' | 'all'>('all');
  const [todayCount, setTodayCount]       = useState(0);
  const [monthCount, setMonthCount]       = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault(); 
      setIsSearchOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filterOpen]);

  const fetchVisits = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      let result;
      if (activeTab === 'my' && user?.id) {
        result = await visitsApi.getVisitsByAgent(user.id, page, PAGE_SIZE);
      } else {
        result = await visitsApi.listByOrg(page, PAGE_SIZE, signal);
      }
      setVisits(result.content);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements ?? result.content.length);
    } catch (err) {
      if ((err as { name?: string })?.name === 'CanceledError') return;
      setVisits([]);
    } finally { setLoading(false); }
  }, [page, activeTab, user?.id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchVisits(controller.signal);
    return () => controller.abort();
  }, [fetchVisits]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = activeTab === 'my' && user?.id
          ? await visitsApi.getVisitsByAgent(user.id, 0, 500)
          : await visitsApi.listByOrg(0, 500);
        if (cancelled) return;
        const today = todayIso();
        const monthStart = monthStartIso();
        setTodayCount(result.content.filter(v => v.visitDate === today).length);
        setMonthCount(result.content.filter(v => v.visitDate >= monthStart).length);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [activeTab, user?.id]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sortIcon = (col: string) =>
    sortCol !== col ? null :
      (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />);

  const filtered = useMemo(() => {
    let list = visits;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.agentName?.toLowerCase().includes(q) ||
        v.loanNumber?.toLowerCase().includes(q) ||
        v.borrowerName?.toLowerCase().includes(q) ||
        v.gpsAddress?.toLowerCase().includes(q),
      );
    }
    if (approvalFilter) list = list.filter(v => v.approvalStatus === approvalFilter);
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sortCol] ?? '';
        const bv = (b as unknown as Record<string, unknown>)[sortCol] ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [visits, search, approvalFilter, sortCol, sortDir, activeTab, user?.id]);

  const hasFilters = Boolean(search || approvalFilter);
  const clearFilters = () => { setSearch(''); setApproval(''); };

  // Head counts, rendered as plain "n label | n label" text. The total is
  // omitted while loading / at zero, exactly as the old pill was, so the
  // separators are built from the list rather than hard-coded between spans.
  const countItems = [
    ...(!loading && totalElements > 0
      ? [{ key: 'total', n: totalElements, label: 'visits' }]
      : []),
    { key: 'today', n: todayCount, label: 'today' },
    { key: 'month', n: monthCount, label: 'this month' },
  ];

  return (
    <div className="db-root db-fill-root">
      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">

          <div className="db-kpi-header" style={{ gap: 24, flexWrap: 'wrap', minHeight: 48, justifyContent: 'space-between' }}>
            <p className="dd-page-context">Log of all field visits and interactions</p>
            <div className="db-list-page-actions">
              <div className="db-list-btn-group">
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className={`ds-btn is-secondary db-list-filter-btn${filterOpen || approvalFilter ? ' is-active' : ''}`}
                >
                  <SlidersHorizontal size={14} />
                  Filter
                  {approvalFilter && <span className="db-list-filter-dot" />}
                </button>
                <button type="button" onClick={() => fetchVisits()} disabled={loading}
                  className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                  <RefreshCw size={14} className={loading ? 'ds-spin' : ''} /> Refresh
                </button>
                {canImport && (
                  <button type="button" onClick={() => setShowImportModal(true)} className="ds-btn is-secondary">
                    <Upload size={14} /> Import
                  </button>
                )}
                <button type="button" onClick={() => setShowExportModal(true)} className="ds-btn is-success">
                  <Download size={14} /> Export
                </button>
              </div>
            </div>
          </div>

          {/* .db-grid is `align-items: start` and has no .db-fill-root rule, so
              the viewport-height chain dies here unless the grid and its cell
              are stretched explicitly — same wiring LoansPage uses. */}
          <div className="db-grid" style={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
            <div className="db-span-12" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <motion.section variants={fadeUp} className="ds-card is-overflow-hidden db-card is-list-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <header className="db-card-head" style={{ borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div className="vis-head-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-subtle)', padding: 4, borderRadius: 'var(--radius-sm)' }}>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('all'); setPage(0); }}
                        style={{
                          background: activeTab === 'all' ? 'var(--bg-surface)' : 'transparent',
                          color: activeTab === 'all' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          border: 'none', padding: '4px 12px', fontSize: 13, fontWeight: 500, borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: activeTab === 'all' ? 'var(--shadow-xs)' : 'none'
                        }}
                      >
                        All Visits
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('my'); setPage(0); }}
                        style={{
                          background: activeTab === 'my' ? 'var(--bg-surface)' : 'transparent',
                          color: activeTab === 'my' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          border: 'none', padding: '4px 12px', fontSize: 13, fontWeight: 500, borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: activeTab === 'my' ? 'var(--shadow-xs)' : 'none'
                        }}
                      >
                        My Visits
                      </button>
                    </div>

                    <div className="vis-counts">
                      {countItems.map((it, i) => (
                        <span key={it.key} className="vis-counts-item">
                          {i > 0 && <span className="vis-counts-sep" aria-hidden="true">|</span>}
                          <span className="vis-counts-num">{it.n.toLocaleString('en-IN')}</span> {it.label}
                        </span>
                      ))}
                    </div>
                  </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <motion.div
                  initial={false}
                  animate={{ width: isSearchOpen || search ? 220 : 32 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: isSearchOpen || search ? '1px solid var(--border)' : '1px solid transparent',
                    overflow: 'hidden',
                    height: 32
                  }}
                >
                  {!isSearchOpen && !search ? (
                    <button
                      type="button"
                      onClick={() => { setIsSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                      style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                    >
                      <Search size={14} />
                    </button>
                  ) : (
                    <>
                      <div style={{ paddingLeft: 10, display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
                        <Search size={13} />
                      </div>
                      <input
                        ref={inputRef}
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onBlur={() => { if (!search) setIsSearchOpen(false); }}
                        placeholder="Search visits…"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label="Search visits"
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: 'var(--text-primary)', flex: 1, minWidth: 0 }}
                      />
                      <AnimatePresence>
                        {search && (
                          <motion.button type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setSearch(''); inputRef.current?.focus(); }}
                            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}
                            aria-label="Clear search"
                            style={{ background: 'transparent', border: 'none', padding: '0 10px', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', height: '100%' }}>
                            <X size={12} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              </div>
                </header>

                <div className="db-card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: 0 }}>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 0 }}>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  /* Mirrors VisitRow exactly — name over loan number, then
                     disposition/verify/approval/FO/GPS — so the placeholder
                     and the real row occupy the same boxes and nothing
                     shifts when the data lands. */
                  <div key={i} className="db-att-row is-list-row vis-row" style={{ opacity: 1 - i * 0.1, cursor: 'default' }}>
                    <div className="vis-row-id">
                      <span className="ds-skel" style={{ height: 14, width: 170, borderRadius: 4 }} />
                      <span className="ds-skel" style={{ height: 11, width: 104, borderRadius: 4 }} />
                    </div>
                    <div className="vis-row-cols">
                      <span className="ds-skel" style={{ height: 20, width: 74, borderRadius: 999 }} />
                      <span className="ds-skel" style={{ height: 20, width: 64, borderRadius: 999 }} />
                      <span className="ds-skel" style={{ height: 20, width: 70, borderRadius: 999 }} />
                      <span className="ds-skel" style={{ height: 12, width: 88, borderRadius: 4 }} />
                      <span className="ds-skel" style={{ height: 28, width: 62, borderRadius: 'var(--radius-sm)' }} />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <motion.div variants={fadeIn} initial="hidden" animate="show" className="ds-empty">
                  <div className="ds-empty-icon">
                    {search ? <Search size={24} /> : <Activity size={24} />}
                  </div>
                  <div className="ds-empty-title">
                    {search ? 'No visits match your search' : 'No visits found'}
                  </div>
                  <div className="ds-empty-sub">
                    {hasFilters
                      ? 'No matches for the current filters. Clear them or try a different search.'
                      : 'No field visits have been recorded yet.'}
                  </div>
                  {hasFilters && (
                    <div style={{ marginTop: 16 }}>
                      <button type="button" onClick={clearFilters} className="ds-btn is-secondary">Clear filters</button>
                    </div>
                  )}
                </motion.div>
              ) : (
                /* No stagger/fade on the rows. fadeUp is opacity 0→1 over 0.40s
                   and the wrapper staggered it 0.05s per row, so with 20 rows
                   the list sat at graded partial opacity for ~1.4s after every
                   load — read as "faded rows". Rows now paint at full opacity. */
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filtered.map((v) => (
                    <VisitRow
                      key={v.id}
                      visit={v}
                      isSelected={false}
                      onToggle={() => navigate(`/app/visits/${v.id}`)}
                    />
                  ))}
                </div>
              )}
                  </div>
                </div>

                {/* ── Pagination ── */}
                {!loading && visits.length > 0 && (
                  <Pagination
                    currentPage={page}
                    totalPages={Math.max(1, totalPages)}
                    onPageChange={setPage}
                    totalElements={totalElements}
                    itemLabel="visits"
                  />
                )}
              </motion.section>
            </div>
          </div>
        </motion.div>
      </div>


      <AnimatePresence>
        {showExportModal && (
          <VisitExportModal onClose={() => setShowExportModal(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImportModal && (
          <VisitImportModal
            onClose={() => setShowImportModal(false)}
            onDone={() => { setShowImportModal(false); fetchVisits(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {filterOpen && (
          <motion.div className="ds-modal-overlay" onClick={() => setFilterOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <motion.div className="ds-modal" onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="ds-modal-header">
                <span className="ds-modal-title">Filter visits</span>
                <button type="button" onClick={() => setFilterOpen(false)} className="ds-modal-close" aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <span className="ds-label" style={{ display: 'block', marginBottom: 10 }}>Approval Status</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {APPROVAL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`ds-btn is-sm ${approvalFilter === opt.value ? 'is-primary' : 'is-secondary'}`}
                    onClick={() => setApproval(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="ds-modal-actions">
                <button type="button" onClick={() => { clearFilters(); setFilterOpen(false); }} className="ds-btn is-secondary">
                  Clear
                </button>
                <button type="button" onClick={() => setFilterOpen(false)} className="ds-btn is-primary">
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
