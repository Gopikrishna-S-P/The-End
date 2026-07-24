import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { visitsApi } from '../api/visitsApi';
import type { VisitLogResponse } from '../types';
import {
  MapPin, RefreshCw, ChevronLeft, ChevronRight,
  Search, X, ChevronUp, ChevronDown, Download, Upload, SlidersHorizontal, Activity
} from 'lucide-react';
import VisitDetailDrawer from './VisitDetailDrawer';
import VisitExportModal from '../components/VisitExportModal';
import VisitImportModal from '../components/VisitImportModal';
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
  const canImport = user?.roles?.some(r => r.name === 'ROLE_ORG_ADMIN' || r.name === 'ROLE_PLATFORM_ADMIN') ?? false;

  const [visits, setVisits]               = useState<VisitLogResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selected, setSelected]           = useState<VisitLogResponse | null>(null);
  const [search, setSearch]               = useState('');
  const [approvalFilter, setApproval]     = useState('');
  const [filterOpen, setFilterOpen]       = useState(false);
  const [isSearchOpen, setIsSearchOpen]   = useState(false);
  const [sortCol, setSortCol]             = useState<string>('');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab]         = useState<'my' | 'all'>('my');
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

  return (
    <div className="dd-page">
      <div className="dd-page-header">
        <div className="dd-page-titles">
          <h1 className="dd-page-title">Field Visits</h1>
          <span className="dd-page-context">Log of all field visits and interactions</span>
        </div>
        <div className="dd-page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="ds-btn is-secondary is-sm"
            style={{ position: 'relative' }}
            aria-label="Filter"
            title="Filter"
          >
            <SlidersHorizontal size={14} />
            {approvalFilter && <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: 'var(--bg-surface)' }} />}
          </button>
          <button type="button" onClick={() => fetchVisits()} disabled={loading}
            className="ds-btn is-secondary is-sm" aria-label="Refresh" title="Refresh">
            <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
          </button>
          {canImport && (
            <button type="button" onClick={() => setShowImportModal(true)} className="ds-btn is-secondary is-sm">
              <Upload size={14} /> Import
            </button>
          )}
          <button type="button" onClick={() => setShowExportModal(true)} className="ds-btn is-primary is-sm">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="dd-main-container">
        <div className="dd-case-panel" style={{ flex: 1 }}>
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden', padding: '12px 16px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approval</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {APPROVAL_OPTIONS.map(o => (
                      <button key={o.value} type="button"
                        onClick={() => setApproval(o.value)}
                        style={{ padding: '4px 10px', fontSize: 12, borderRadius: 999, border: '1px solid', background: approvalFilter === o.value ? 'var(--ink-primary)' : 'var(--bg-surface)', color: approvalFilter === o.value ? 'var(--bg-surface)' : 'var(--ink-secondary)', borderColor: approvalFilter === o.value ? 'var(--ink-primary)' : 'var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {hasFilters && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--success)' }} />
                    Active filters
                    <button type="button" onClick={() => setFilterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2, display: 'flex' }}>
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

          <motion.section variants={fadeUp} className="ds-card dd-cases-card is-overflow-hidden" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="dd-cases-head" style={{ padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-subtle)', padding: 4, borderRadius: 'var(--radius-md)' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('my'); setPage(0); }}
                    style={{
                      background: activeTab === 'my' ? 'var(--bg-surface)' : 'transparent',
                      color: activeTab === 'my' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      border: 'none', padding: '4px 12px', fontSize: 13, fontWeight: 500, borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: activeTab === 'my' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    My Visits
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('all'); setPage(0); }}
                    style={{
                      background: activeTab === 'all' ? 'var(--bg-surface)' : 'transparent',
                      color: activeTab === 'all' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      border: 'none', padding: '4px 12px', fontSize: 13, fontWeight: 500, borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: activeTab === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    All Visits
                  </button>
                </div>
                <AnimatePresence>
                  {!loading && totalElements > 0 && (
                    <motion.span className="ds-pill is-neutral"
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum", "zero"' }}>
                        {totalElements.toLocaleString('en-IN')}
                      </span> visits
                    </motion.span>
                  )}
                </AnimatePresence>
                <span className="ds-pill is-neutral">
                  <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum", "zero"' }}>
                    {todayCount.toLocaleString('en-IN')}
                  </span> today
                </span>
                <span className="ds-pill is-neutral">
                  <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum", "zero"' }}>
                    {monthCount.toLocaleString('en-IN')}
                  </span> this month
                </span>
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
            </div>

            <div className="dd-cp-list-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="dd-cp-list" style={{ padding: 0 }}>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="db-att-row has-border" style={{ opacity: 1 - i * 0.1, cursor: 'default' }}>
                    <span className="ds-skel" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="ds-skel" style={{ height: 14, width: '45%', borderRadius: 4 }} />
                      <span className="ds-skel" style={{ height: 11, width: '65%', borderRadius: 4 }} />
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
                <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column' }}>
                  {filtered.map((v) => (
                    <VisitRow
                      key={v.id}
                      visit={v}
                      isSelected={selected?.id === v.id}
                      onToggle={() => setSelected(p => p?.id === v.id ? null : v)}
                      variants={fadeUp}
                    />
                  ))}
                </motion.div>
              )}
              </div>
            </div>

            {/* ── Pagination ── */}
            {!loading && visits.length > 0 && (
              <div className="up-pagination" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Page <strong style={{ color: 'var(--text-primary)' }}>{page + 1}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{Math.max(1, totalPages)}</strong> · <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum", "zero"' }}>{totalElements.toLocaleString('en-IN')}</span> visits
                </span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  <button type="button" className="ds-btn is-secondary is-sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 0}>
                    <ChevronLeft size={14} />
                  </button>
                  <button type="button" className="ds-btn is-secondary is-sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page + 1 >= Math.max(1, totalPages)}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <VisitDetailDrawer
            visit={selected}
            onClose={() => setSelected(null)}
            onChanged={() => { setSelected(null); fetchVisits(); }}
          />
        )}
      </AnimatePresence>

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
