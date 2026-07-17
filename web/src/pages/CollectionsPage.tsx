import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient, unwrapApiResponse } from '../client';
import { collectionsApi } from '../api/collectionsApi';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type {
  CollectionResponse, CollectionStatus, PaymentMode, ApprovalAction, PagedResponse,
} from '../types';
import {
  ChevronLeft, ChevronRight, RefreshCw, Download, CheckCircle2, XCircle,
  Banknote, Clock, FileText, X, Search, SlidersHorizontal,
} from 'lucide-react';
import CollectionDetailDrawer from './CollectionDetailDrawer';
import { CollectionApprovalModal } from './CollectionApprovalModal';
import { CollectionDepositModal } from './CollectionDepositModal';
import { StatusPill, PaymentModePill, fmtINR, fmtDate } from './CollectionsHelpers';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: CollectionStatus | ''; label: string }> = [
  { value: '',                 label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED',         label: 'Approved' },
  { value: 'REJECTED',         label: 'Rejected' },
  { value: 'DEPOSITED',        label: 'Deposited' },
];

const PAYMENT_OPTIONS: Array<{ value: PaymentMode | ''; label: string }> = [
  { value: '',       label: 'All' },
  { value: 'CASH',   label: 'Cash' },
  { value: 'UPI',    label: 'UPI' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'NEFT',   label: 'NEFT' },
  { value: 'RTGS',   label: 'RTGS' },
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
  const [filterPaymentMode,     setFilterPaymentMode]     = useState<PaymentMode | ''>('');
  const [searchInput,           setSearchInput]           = useState('');
  const [filterOpen,            setFilterOpen]            = useState(false);
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
  const inputRef      = useRef<HTMLInputElement>(null);

  const organizationId = user?.organizationId || '';

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault(); inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      if (filterPaymentMode) params.append('paymentMode', filterPaymentMode);
      if (isAgentView && user?.agentId) params.append('agentId', user.agentId);
      const endpoint = isBankView ? '/api/v1/collections/bank' : '/api/v1/collections';
      const { data } = await apiClient.get(endpoint, { params });
      const response = unwrapApiResponse<PagedResponse<CollectionResponse>>(data);
      setCollections(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch {
      // silent — empty state handles
    } finally { setLoading(false); }
  }, [organizationId, page, filterStatus, filterPaymentMode, isBankView, isAgentView, user?.agentId]);

  useEffect(() => {
    if (!canApprove || !organizationId) return;
    const params = new URLSearchParams({ orgId: organizationId, status: 'PENDING_APPROVAL', size: '1' });
    apiClient.get('/api/v1/collections', { params })
      .then(({ data }) => { const r = unwrapApiResponse<PagedResponse<CollectionResponse>>(data); setPendingCount(r.totalElements); })
      .catch(() => {});
  }, [canApprove, organizationId, collections]);

  useEffect(() => { if (organizationId) fetchCollections(); }, [fetchCollections, organizationId]);

  const visibleCollections = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(c => {
      const fields = [
        c.loanNumber, c.borrowerName, c.agentName, c.receiptNumber, c.notes,
        c.chequeNumber, c.bankName, c.upiReferenceId, c.transactionReferenceId,
        c.amount != null ? String(c.amount) : null,
        c.amount != null ? c.amount.toLocaleString('en-IN') : null,
      ];
      return fields.some(f => typeof f === 'string' && f.toLowerCase().includes(q));
    });
  }, [collections, searchInput]);

  const clearFilters = () => {
    setFilterStatus(''); setFilterPaymentMode(''); setSearchInput(''); setPage(0);
  };

  const hasFilters = Boolean(filterStatus || filterPaymentMode || searchInput);

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
                {filterPaymentMode && (
                  <span className="ds-pill is-info">
                    {PAYMENT_OPTIONS.find(o => o.value === filterPaymentMode)?.label}
                    <button type="button" onClick={() => { setFilterPaymentMode(''); setPage(0); }} aria-label="Clear payment mode filter" style={{ background: 'transparent', border: 'none', marginLeft: 4, cursor: 'pointer', display: 'flex', color: 'inherit' }}>
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

          <section className="ds-card db-card" style={{ marginTop: 0, height: 'calc(100vh - 160px)' }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 className="db-card-title" style={{ fontSize: 18, margin: 0 }}>Collection Records</h1>
                {!loading && totalElements > 0 && (
                  <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)', fontSize: 13 }}>
                    / {totalElements.toLocaleString('en-IN')} records
                  </span>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                <div ref={exportMenuRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowExportMenu(v => !v)}
                    disabled={exporting}
                    className="ds-btn is-secondary"
                    style={{ padding: '0 12px', height: 32 }}
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
                  onClick={() => setFilterOpen(true)}
                  className="ds-btn is-secondary"
                  style={{ background: filterOpen || filterStatus || filterPaymentMode ? 'var(--ink-solid)' : undefined, color: filterOpen || filterStatus || filterPaymentMode ? 'var(--bg-surface)' : undefined, position: 'relative' }}
                >
                  <SlidersHorizontal size={14} style={{ marginRight: 6 }} />
                  Filter
                  {(filterStatus || filterPaymentMode) && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />}
                </button>

                <div className="db-search" style={{ margin: 0, background: 'var(--bg-subtle)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Search size={14} style={{ color: 'var(--ink-tertiary)' }} />
                  <input
                    ref={inputRef}
                    type="search"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search receipt, borrower, loan, agent…"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Search collections on this page"
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: 260 }}
                  />
                  <AnimatePresence>
                    {searchInput && (
                      <motion.button type="button" onClick={() => setSearchInput('')}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex' }}
                        initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}>
                        <X size={12} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <button type="button" onClick={fetchCollections} disabled={loading}
                  className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                  <RefreshCw size={14} className={loading ? 'ds-spin' : ''} /> Refresh
                </button>
              </div>
            </header>

            <div className="ds-table-wrap" style={{ border: 'none' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Loan #</th>
                    <th style={{ padding: '12px 16px' }}>Borrower</th>
                    <th style={{ padding: '12px 16px' }}>Agent</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th className="is-right" style={{ padding: '12px 16px' }}>Amount</th>
                    <th style={{ padding: '12px 16px' }}>Mode</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.1, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: 80, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 110, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: '60%', display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 70, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 72, marginLeft: 'auto', display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 22, width: 56, borderRadius: 999, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 22, width: 96, borderRadius: 999, display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 14, width: 80, marginLeft: 'auto', display: 'block' }} /></td>
                      </tr>
                    ))
                  ) : visibleCollections.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <motion.div className="ds-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} style={{ padding: '80px 0' }}>
                          <Banknote size={32} className="ds-empty-icon" />
                          <span className="ds-empty-title">{searchInput ? 'No matches on this page' : 'No collections found'}</span>
                          <span className="ds-empty-sub">
                            {searchInput
                              ? 'Nothing on the current page matches your search. Clear the search, or change page / status filters.'
                              : filterStatus || filterPaymentMode
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
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td style={{ padding: '12px 16px', paddingLeft: 24, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}>
                          {c.loanNumber ?? '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-secondary)' }}>{c.borrowerName ?? '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--ink-tertiary)' }}>{c.agentName ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-tertiary)' }}>{fmtDate(c.collectionDate)}</td>
                        <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--ink-primary)' }}>{fmtINR(c.amount)}</td>
                        <td style={{ padding: '12px 16px' }}><PaymentModePill mode={c.paymentMode} /></td>
                        <td style={{ padding: '12px 16px' }}><StatusPill status={c.status} /></td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }} onClick={e => e.stopPropagation()}>
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
                              <button type="button" className="db-customize-btn" style={{ padding: '0 8px', height: 26 }} title="View documents" aria-label="View documents">
                                <FileText size={12} />
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

        {/* ── Filter modal ── */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div className="ds-modal-overlay" onClick={() => setFilterOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <motion.div className="ds-modal" onClick={e => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
                <div className="ds-modal-header">
                  <span className="ds-modal-title">Filter collections</span>
                  <button type="button" onClick={() => setFilterOpen(false)} className="ds-modal-close" aria-label="Close">
                    <X size={16} />
                  </button>
                </div>

                <span className="ds-label" style={{ display: 'block', marginBottom: 10 }}>Status</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ds-btn is-sm ${filterStatus === opt.value ? 'is-primary' : 'is-secondary'}`}
                      style={filterStatus === opt.value ? { background: 'var(--ink-solid)', color: 'var(--bg-surface)' } : {}}
                      onClick={() => { setFilterStatus(opt.value as CollectionStatus | ''); setPage(0); }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <span className="ds-label" style={{ display: 'block', marginBottom: 10, marginTop: 16 }}>Payment mode</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PAYMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ds-btn is-sm ${filterPaymentMode === opt.value ? 'is-primary' : 'is-secondary'}`}
                      style={filterPaymentMode === opt.value ? { background: 'var(--ink-solid)', color: 'var(--bg-surface)' } : {}}
                      onClick={() => { setFilterPaymentMode(opt.value as PaymentMode | ''); setPage(0); }}
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
