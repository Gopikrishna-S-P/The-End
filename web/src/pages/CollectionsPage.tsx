import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient, unwrapApiResponse } from '../client';
import { collectionsApi } from '../api/collectionsApi';
import { usersApi } from '../api/usersApi';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type {
  CollectionResponse, CollectionStatus, ApprovalAction, PagedResponse, UserResponse,
} from '../types';
import {
  ChevronLeft, ChevronRight, Download, CheckCircle2, XCircle,
  Banknote, Clock, FileText, X, SlidersHorizontal, ChevronDown,
  UserX,
} from 'lucide-react';
import CollectionDetailDrawer from './CollectionDetailDrawer';
import { CollectionApprovalModal } from './CollectionApprovalModal';
import { CollectionDepositModal } from './CollectionDepositModal';
import { Modal, ModalFooter, FormSection, Input } from './PlatformSetupShared';
import { StatusPill, PaymentModePill, fmtINR, fmtDate } from './CollectionsHelpers';
import '../styles/AppPage.css';
import '../styles/PlatformSetupPage.css';
import './Dashboard.css';
import '../styles/CollectionsPage.css';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: CollectionStatus | ''; label: string }> = [
  { value: '',                 label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED',         label: 'Approved' },
  { value: 'REJECTED',         label: 'Rejected' },
  { value: 'DEPOSITED',        label: 'Deposited' },
];

function csvDownload(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
const todayIso      = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const monthStartIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };
const yearStartIso  = () => `${new Date().getFullYear()}-01-01`;

export default function CollectionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBankView  = location.pathname.startsWith('/bank');
  const isAgentView = location.pathname.startsWith('/agent');
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission('COLLECTION_APPROVE');

  const [collections,           setCollections]           = useState<CollectionResponse[]>([]);
  const [loading,               setLoading]               = useState(true);
  const [page,                  setPage]                  = useState(0);
  const [totalPages,            setTotalPages]            = useState(0);
  const [totalElements,         setTotalElements]         = useState(0);
  const [pendingCount,          setPendingCount]          = useState<number | null>(null);
  const [filterStatus,          setFilterStatus]          = useState<CollectionStatus | ''>('');
  const [filterAgentId,         setFilterAgentId]         = useState('');
  const [filterFromDate,        setFilterFromDate]        = useState('');
  const [filterToDate,          setFilterToDate]          = useState('');
  const [filterSearch,          setFilterSearch]          = useState('');
  const [agents,                setAgents]                = useState<UserResponse[]>([]);
  const [filterOpen,            setFilterOpen]            = useState(false);
  // Draft copies — the filter dialog edits these; changes only take effect on "Apply".
  const [draftAgentId,          setDraftAgentId]          = useState('');
  const [draftFromDate,         setDraftFromDate]         = useState('');
  const [draftToDate,           setDraftToDate]           = useState('');
  const [draftSearch,           setDraftSearch]           = useState('');
  const [selectedCollection,    setSelectedCollection]    = useState<CollectionResponse | null>(null);
  const [showApprovalModal,     setShowApprovalModal]     = useState(false);
  const [approvalInitialAction, setApprovalInitialAction] = useState<ApprovalAction | null>(null);
  const [showDepositModal,      setShowDepositModal]      = useState(false);
  const [drawerCollection,      setDrawerCollection]      = useState<CollectionResponse | null>(null);
  const [exporting,             setExporting]             = useState(false);
  const [showExportMenu,        setShowExportMenu]        = useState(false);
  const [customFrom,            setCustomFrom]            = useState('');
  const [customTo,              setCustomTo]              = useState('');

  const exportMenuRef = useRef<HTMLDivElement>(null);

  const organizationId = user?.organizationId || '';

  // Escape closes filter modal + export menu
  useEffect(() => {
    if (!filterOpen && !showExportMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setFilterOpen(false); setShowExportMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filterOpen, showExportMenu]);

  // Click-outside closes export menu
  useEffect(() => {
    if (!showExportMenu) return;
    const onDown = (e: MouseEvent) => {
      if (exportMenuRef.current?.contains(e.target as Node)) return;
      setShowExportMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showExportMenu]);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId: organizationId, page: String(page), size: String(PAGE_SIZE) });
      if (filterStatus)      params.append('status', filterStatus);
      if (filterFromDate)    params.append('fromDate', filterFromDate);
      if (filterToDate)      params.append('toDate', filterToDate);
      if (isAgentView && user?.agentId) params.append('agentId', user.agentId);
      else if (filterAgentId) params.append('agentId', filterAgentId);
      // NOTE: CollectionController has no /bank sub-route — the server derives org scope
      // from the JWT for every caller. `isBankView` is retained only to flag legacy
      // /bank/* bookmarks (see App.tsx's LegacyRedirect, which already redirects those
      // to /app/* before this component ever mounts), never to change the endpoint.
      const { data } = await apiClient.get('/api/v1/collections', { params });
      const response = unwrapApiResponse<PagedResponse<CollectionResponse>>(data);
      setCollections(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch {
      // silent — empty state handles
    } finally { setLoading(false); }
  }, [organizationId, page, filterStatus, filterFromDate, filterToDate, filterAgentId, isBankView, isAgentView, user?.agentId]);

  useEffect(() => {
    if (!canApprove || !organizationId) return;
    const params = new URLSearchParams({ orgId: organizationId, status: 'PENDING_APPROVAL', size: '1' });
    apiClient.get('/api/v1/collections', { params })
      .then(({ data }) => { const r = unwrapApiResponse<PagedResponse<CollectionResponse>>(data); setPendingCount(r.totalElements); })
      .catch(() => {});
  }, [canApprove, organizationId, collections]);

  // Agent filter dropdown — irrelevant for a field officer's own "my collections" view.
  useEffect(() => {
    if (isAgentView) return;
    usersApi.listByRole('FO').then(setAgents).catch(() => {});
  }, [isAgentView]);

  useEffect(() => { if (organizationId) fetchCollections(); }, [fetchCollections, organizationId]);

  const visibleCollections = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(c =>
      c.loanNumber?.toLowerCase().includes(q) || c.borrowerName?.toLowerCase().includes(q)
    );
  }, [collections, filterSearch]);

  const clearFilters = () => {
    setFilterStatus(''); setFilterAgentId('');
    setFilterFromDate(''); setFilterToDate(''); setFilterSearch(''); setPage(0);
    setDraftAgentId('');
    setDraftFromDate(''); setDraftToDate(''); setDraftSearch('');
  };

  const openFilterDialog = () => {
    setDraftAgentId(filterAgentId);
    setDraftFromDate(filterFromDate); setDraftToDate(filterToDate); setDraftSearch(filterSearch);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilterAgentId(draftAgentId);
    setFilterFromDate(draftFromDate); setFilterToDate(draftToDate); setFilterSearch(draftSearch);
    setPage(0);
    setFilterOpen(false);
  };

  const hasFilters = Boolean(filterStatus || filterAgentId || filterFromDate || filterToDate || filterSearch);

  const handleExport = useCallback(async (fromDate?: string, toDate?: string) => {
    setExporting(true); setShowExportMenu(false);
    try {
      const csv = await collectionsApi.exportCsv(fromDate || toDate ? { fromDate, toDate } : undefined);
      csvDownload('collections.csv', csv);
    } catch { /* silent */ } finally { setExporting(false); }
  }, []);

  const startIdx = page * PAGE_SIZE;
  const endIdx   = Math.min(startIdx + visibleCollections.length, totalElements);

  return (
    <div className="db-root">
      <div className="db-content">
        <div className="db-inner">
          <AnimatePresence>
            {hasFilters && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {filterStatus && (
                  <span className="ds-pill is-accent">
                    {STATUS_OPTIONS.find(o => o.value === filterStatus)?.label}
                    <button type="button" onClick={() => { setFilterStatus(''); setPage(0); }} aria-label="Clear status filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                      <X size={11} />
                    </button>
                  </span>
                )}
                {filterAgentId && (
                  <span className="ds-pill is-info">
                    {agents.find(a => a.id === filterAgentId) ? `${agents.find(a => a.id === filterAgentId)!.firstName} ${agents.find(a => a.id === filterAgentId)!.lastName}`.trim() : 'Agent'}
                    <button type="button" onClick={() => { setFilterAgentId(''); setPage(0); }} aria-label="Clear agent filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                      <X size={11} />
                    </button>
                  </span>
                )}
                {(filterFromDate || filterToDate) && (
                  <span className="ds-pill is-accent">
                    {filterFromDate || '…'} – {filterToDate || '…'}
                    <button type="button" onClick={() => { setFilterFromDate(''); setFilterToDate(''); setPage(0); }} aria-label="Clear date filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
                      <X size={11} />
                    </button>
                  </span>
                )}
                {filterSearch && (
                  <span className="ds-pill is-accent">
                    “{filterSearch}”
                    <button type="button" onClick={() => setFilterSearch('')} aria-label="Clear search filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
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

          <div className="db-page-header">
            <div className="db-page-header-left">
              <div className="db-page-titles">
                <h1 className="db-page-title">Collections</h1>
                {!loading && totalElements > 0 && (
                  <span className="db-page-org">{totalElements.toLocaleString('en-IN')} records</span>
                )}
              </div>
              {canApprove && pendingCount != null && pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setFilterStatus('PENDING_APPROVAL'); setPage(0); }}
                  className="ds-pill is-warn"
                  style={{ border: 'none', background: 'var(--warning-subtle)', color: 'var(--warning)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  title="Filter to pending approvals"
                >
                  <Clock size={12} />
                  <span>{pendingCount} pending</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => navigate('/app/non-contactables')}
                className="ds-btn is-secondary" title="Non-contactable borrowers" aria-label="Non-contactable borrowers">
                <UserX size={14} />
              </button>
              <div ref={exportMenuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowExportMenu(v => !v)}
                  disabled={exporting}
                  className="ds-btn is-primary"
                >
                  <Download size={14} style={{ marginRight: 6 }} />
                  {exporting ? 'Exporting…' : 'Export'}
                </button>
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
                      style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 220, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, boxShadow: 'var(--shadow-md)', zIndex: 100 }}
                    >
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '4px 8px 8px' }}>Date range</p>
                      <button type="button" onClick={() => handleExport()} style={{ width: '100%', textAlign: 'left', padding: '8px', fontSize: 13, background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer' }} className="is-hoverable">All time</button>
                      <button type="button" onClick={() => handleExport(todayIso(), todayIso())} style={{ width: '100%', textAlign: 'left', padding: '8px', fontSize: 13, background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer' }} className="is-hoverable">Today</button>
                      <button type="button" onClick={() => handleExport(monthStartIso(), todayIso())} style={{ width: '100%', textAlign: 'left', padding: '8px', fontSize: 13, background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer' }} className="is-hoverable">This month</button>
                      <button type="button" onClick={() => handleExport(yearStartIso(), todayIso())} style={{ width: '100%', textAlign: 'left', padding: '8px', fontSize: 13, background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer' }} className="is-hoverable">This year</button>
                      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '4px 8px 8px' }}>Custom range</p>
                      <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="ds-input" style={{ width: '100%', marginBottom: 4, height: 32, fontSize: 12 }} />
                      <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   className="ds-input" style={{ width: '100%', marginBottom: 8, height: 32, fontSize: 12 }} />
                      <button type="button" onClick={() => handleExport(customFrom || undefined, customTo || undefined)}
                        className="ds-btn is-primary is-sm" style={{ width: '100%' }}>
                        Export custom range
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={openFilterDialog}
                className="ds-btn is-secondary"
                style={{
                  background: filterOpen || hasFilters ? 'var(--ink-solid)' : undefined,
                  color: filterOpen || hasFilters ? 'var(--bg-surface)' : undefined,
                }}
              >
                <SlidersHorizontal size={14} style={{ marginRight: 6 }} />
                Filter
              </button>
            </div>
          </div>

          <section className="ds-table-card" style={{ marginTop: 0, height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
            <div className="ds-table-wrap" style={{ border: 'none', flex: 1, overflow: 'auto' }}>
              <table className="ds-table ps-table is-no-row-hover">
                <thead>
                  <tr>
                    <th>Loan #</th>
                    <th>Borrower</th>
                    <th>Agent</th>
                    <th>Date</th>
                    <th className="is-right">Amount</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th className="is-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.1 }}>
                        <td><span className="ds-skel" style={{ height: 14, width: 80, display: 'block' }} /></td>
                        <td><span className="ds-skel" style={{ height: 14, width: 110, display: 'block' }} /></td>
                        <td><span className="ds-skel" style={{ height: 14, width: '60%', display: 'block' }} /></td>
                        <td><span className="ds-skel" style={{ height: 14, width: 70, display: 'block' }} /></td>
                        <td className="is-right"><span className="ds-skel" style={{ height: 14, width: 72, marginLeft: 'auto', display: 'block' }} /></td>
                        <td><span className="ds-skel" style={{ height: 22, width: 56, borderRadius: 999, display: 'block' }} /></td>
                        <td><span className="ds-skel" style={{ height: 22, width: 96, borderRadius: 999, display: 'block' }} /></td>
                        <td className="is-right"><span className="ds-skel" style={{ height: 14, width: 80, marginLeft: 'auto', display: 'block' }} /></td>
                      </tr>
                    ))
                  ) : visibleCollections.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <motion.div className="ds-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                          <span className="ds-empty-icon"><Banknote size={20} /></span>
                          <span className="ds-empty-title">{filterSearch ? 'No matches on this page' : 'No collections found'}</span>
                          <span className="ds-empty-sub">
                            {filterSearch
                              ? 'Nothing on the current page matches your search. Clear it, or change the page / other filters.'
                              : hasFilters
                                ? 'No collections match the current filters. Clear them to see all records.'
                                : 'Collections will appear here once field officers submit payments from the mobile app.'}
                          </span>
                          {hasFilters && (
                            <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                              <button type="button" onClick={clearFilters} className="ds-btn is-secondary">Clear filters</button>
                            </div>
                          )}
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    visibleCollections.map((c, idx) => (
                      <motion.tr
                        key={c.id}
                        className="is-clickable"
                        tabIndex={0}
                        role="row"
                        aria-label={`Collection of ${fmtINR(c.amount)} on ${fmtDate(c.collectionDate)}`}
                        onClick={() => setDrawerCollection(c)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawerCollection(c); } }}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: idx * 0.03 }}
                      >
                        <td className="is-mono" style={{ fontWeight: 500, color: 'var(--ink-primary)' }}>
                          {c.loanNumber ?? '—'}
                        </td>
                        <td>{c.borrowerName ?? '—'}</td>
                        <td className="is-muted">{c.agentName ?? '—'}</td>
                        <td className="is-mono is-muted" style={{ fontSize: 12 }}>{fmtDate(c.collectionDate)}</td>
                        <td className="is-currency">{fmtINR(c.amount)}</td>
                        <td><PaymentModePill mode={c.paymentMode} /></td>
                        <td><StatusPill status={c.status} /></td>
                        <td className="is-right" onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            {canApprove && c.status === 'PENDING_APPROVAL' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedCollection(c); setApprovalInitialAction('APPROVE'); setShowApprovalModal(true); }}
                                  className="db-error-retry"
                                  style={{ background: 'var(--success-subtle)', color: 'var(--success)', padding: '0 8px', height: 26, fontSize: 11, fontWeight: 600, width: 'auto' }}
                                  title="Approve"
                                >
                                  <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedCollection(c); setApprovalInitialAction('REJECT'); setShowApprovalModal(true); }}
                                  className="db-error-retry"
                                  style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', padding: '0 8px', height: 26, fontSize: 11, fontWeight: 600, width: 'auto' }}
                                  title="Reject"
                                >
                                  <XCircle size={12} style={{ marginRight: 4 }} /> Reject
                                </button>
                              </>
                            )}
                            {canApprove && c.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => { setSelectedCollection(c); setShowDepositModal(true); }}
                                className="db-error-retry"
                                style={{ background: 'var(--info-subtle)', color: 'var(--info)', padding: '0 8px', height: 26, fontSize: 11, fontWeight: 600, width: 'auto' }}
                                title="Mark deposited"
                              >
                                <Banknote size={12} style={{ marginRight: 4 }} /> Deposit
                              </button>
                            )}
                            {c.documents && c.documents.length > 0 && (
                              <button type="button" className="ds-table-row-action" title="View documents" aria-label="View documents">
                                <FileText size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {!loading && collections.length > 0 && totalPages > 1 && (
              <div className="up-pagination" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                <span className="up-page-meta">
                  Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong> · <strong>{totalElements.toLocaleString('en-IN')}</strong> records
                </span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  <button type="button" className="up-page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page">
                    <ChevronLeft size={14} />
                  </button>
                  <button type="button" className="up-page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page + 1 >= totalPages} aria-label="Next page">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Filter dialog — same Modal/Input/FormSection system as Platform Setup's Edit Org dialog ── */}
        {filterOpen && (
          <Modal title="Filter collections" subtitle="Narrow down the collections list" onClose={() => setFilterOpen(false)}>
            <FormSection title="Search">
              <Input label="Loan # or borrower name" value={draftSearch} onChange={setDraftSearch}
                placeholder="e.g. LN10234 or Ramesh Kumar" />
            </FormSection>

            {!isAgentView && (
              <FormSection title="Agent">
                <div className="ds-field">
                  <label className="ds-label">Agent</label>
                  <div className="ps-select-wrap">
                    <select
                      value={draftAgentId}
                      onChange={e => setDraftAgentId(e.target.value)}
                      className="ds-select"
                      style={{
                        width: '100%', paddingRight: 30,
                        appearance: 'none', WebkitAppearance: 'none',
                        textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                      }}
                    >
                      <option value="">All agents</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-tertiary)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </FormSection>
            )}

            <FormSection title="Date range">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Input label="From" type="date" value={draftFromDate} onChange={setDraftFromDate} />
                <Input label="To" type="date" value={draftToDate} onChange={setDraftToDate} />
              </div>
            </FormSection>

            <ModalFooter onClose={() => setFilterOpen(false)} submitting={false} onSubmit={applyFilters} label="Apply filters" />
          </Modal>
        )}

        {/* ── Approval / Deposit modals ── */}
        {selectedCollection && (
          <>
            <CollectionApprovalModal
              collection={selectedCollection}
              isOpen={showApprovalModal}
              initialAction={approvalInitialAction}
              onClose={() => { setShowApprovalModal(false); setSelectedCollection(null); setApprovalInitialAction(null); }}
              onSuccess={fetchCollections}
            />
            <CollectionDepositModal
              collection={selectedCollection}
              isOpen={showDepositModal}
              onClose={() => { setShowDepositModal(false); setSelectedCollection(null); }}
              onSuccess={fetchCollections}
            />
          </>
        )}

        {/* ── Detail drawer ── */}
        <AnimatePresence>
          {drawerCollection && (
            <CollectionDetailDrawer
              collection={drawerCollection}
              onClose={() => setDrawerCollection(null)}
              onChanged={() => { setDrawerCollection(null); fetchCollections(); }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
