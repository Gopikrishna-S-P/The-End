import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { nonContactablesApi, type NonContactableResponse } from '../api/nonContactablesApi';
import { usePermissions } from '../hooks/usePermissions';
import {
  PhoneOff, RefreshCw, ChevronLeft, ChevronRight, Search, X, Plus,
  AlertCircle, CheckCircle2, Loader2, Trash2,
} from 'lucide-react';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE = 20;

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const shortId = (id?: string | null) => (id ? `${id.slice(0, 8)}…` : '—');

// ── Create modal ─────────────────────────────────────────────────────────────

function CreateNonContactableModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [allocationId, setAllocationId] = useState('');
  const [visitId, setVisitId]           = useState('');
  const [reason, setReason]             = useState('');
  const [notes, setNotes]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const canSubmit = allocationId.trim().length > 0 && reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError(null);
    try {
      await nonContactablesApi.create({
        allocationId: allocationId.trim(),
        visitId: visitId.trim() || undefined,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to record non-contactable outcome.');
      setLoading(false);
    }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ds-modal-header">
          <span className="ds-modal-title">Record non-contactable</span>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          <div className="ds-field">
            <span className="ds-label is-required">Allocation ID</span>
            <input
              type="text"
              value={allocationId}
              onChange={(e) => setAllocationId(e.target.value)}
              placeholder="UUID — from the Allocations list"
              className="ds-input"
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
              autoFocus
            />
          </div>

          <div className="ds-field">
            <span className="ds-label">Visit ID</span>
            <input
              type="text"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              placeholder="Optional — UUID of the linked visit log"
              className="ds-input"
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
            />
          </div>

          <div className="ds-field">
            <span className="ds-label is-required">Reason</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Absent, Wrong address, Refused, Moved"
              className="ds-input"
              maxLength={50}
            />
          </div>

          <div className="ds-field">
            <span className="ds-label">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional detail from the visit…"
              className="ds-textarea"
              maxLength={2000}
            />
          </div>

          {error && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)', fontSize: 12.5 }}>
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}
        </div>

        <div className="ds-modal-actions">
          <button type="button" onClick={onClose} className="ds-btn is-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="ds-btn is-primary"
          >
            {loading ? <Loader2 size={14} className="ds-spin" /> : null}
            {loading ? 'Saving…' : 'Record outcome'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NonContactablesPage() {
  const { hasPermission, hasAnyRole } = usePermissions();
  const canCreate = hasPermission('NON_CONTACTABLE_CREATE');
  const canDelete = hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN');

  const [records, setRecords]             = useState<NonContactableResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput]     = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [toast, setToast]                 = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await nonContactablesApi.list(page, PAGE_SIZE);
      setRecords(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch {
      // silent — empty state handles
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const visibleRecords = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => {
      const fields = [r.allocationId, r.reason, r.notes, r.agentId];
      return fields.some(f => typeof f === 'string' && f.toLowerCase().includes(q));
    });
  }, [records, searchInput]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await nonContactablesApi.remove(id);
      setToast({ kind: 'ok', msg: 'Record deleted.' });
      fetchRecords();
    } catch (e: any) {
      setToast({ kind: 'err', msg: e?.response?.data?.message || 'Failed to delete record.' });
    } finally { setDeletingId(null); }
  };

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <div className="db-inner" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence>
            {toast && (
              <motion.div
                key="toast" className={`ds-toast ${toast.kind === 'ok' ? 'is-ok' : 'is-err'}`} role="status"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
                onClick={() => setToast(null)} style={{ marginBottom: 16 }}
              >
                {toast.kind === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{toast.msg}</span>
                <X size={13} className="ds-toast-x" />
              </motion.div>
            )}
          </AnimatePresence>

          <section className="ds-card db-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', ...(visibleRecords.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 className="db-card-title" style={{ fontSize: 18, margin: 0 }}>Non-Contactable Visits</h1>
                {!loading && totalElements > 0 && (
                  <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)', fontSize: 13 }}>
                    / {totalElements.toLocaleString('en-IN')} records
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                <div className="db-search" style={{ margin: 0, background: 'var(--bg-subtle)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Search size={14} style={{ color: 'var(--ink-tertiary)' }} />
                  <input
                    ref={inputRef}
                    type="search"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search allocation, reason, notes…"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Search non-contactable records on this page"
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: 240 }}
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

                {canCreate && (
                  <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary" style={{ height: 36 }}>
                    <Plus size={14} /> Record outcome
                  </button>
                )}

                <button type="button" onClick={fetchRecords} disabled={loading}
                  className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                  <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
                </button>
              </div>
            </header>

            <div className="ds-table-wrap" style={{ border: 'none', flex: 1, overflow: 'auto' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Allocation</th>
                    <th style={{ padding: '12px 16px' }}>Reason</th>
                    <th style={{ padding: '12px 16px' }}>Notes</th>
                    <th style={{ padding: '12px 16px' }}>Agent</th>
                    <th style={{ padding: '12px 16px' }}>Recorded</th>
                    {canDelete && <th className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.12, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: 80, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 100, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: '60%', display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 70, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 110, display: 'block' }} /></td>
                        {canDelete && <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 14, width: 28, marginLeft: 'auto', display: 'block' }} /></td>}
                      </tr>
                    ))
                  ) : visibleRecords.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 6 : 5}>
                        <motion.div className="ds-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} style={{ padding: '80px 0' }}>
                          <PhoneOff size={32} className="ds-empty-icon" />
                          <span className="ds-empty-title">{searchInput ? 'No matches on this page' : 'No non-contactable records'}</span>
                          <span className="ds-empty-sub">
                            {searchInput
                              ? 'Nothing on the current page matches your search. Clear the search, or change page.'
                              : 'Records will appear here once field officers log a non-contactable visit outcome.'}
                          </span>
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    visibleRecords.map((r, idx) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: idx * 0.03 }}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td style={{ padding: '12px 16px', paddingLeft: 24, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-primary)' }} title={r.allocationId}>
                          {shortId(r.allocationId)}
                        </td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-pill is-warn">{r.reason}</span></td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-secondary)', maxWidth: 320 }}>{r.notes || '—'}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-tertiary)' }} title={r.agentId}>
                          {shortId(r.agentId)}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-tertiary)' }}>{fmtDate(r.createdAt)}</td>
                        {canDelete && (
                          <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="db-error-retry"
                              style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', padding: '0 8px', height: 26, fontSize: 11, fontWeight: 600, width: 'auto', marginLeft: 'auto' }}
                              title="Delete record"
                              aria-label="Delete record"
                            >
                              {deletingId === r.id ? <Loader2 size={12} className="ds-spin" /> : <Trash2 size={12} />}
                            </button>
                          </td>
                        )}
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && records.length > 0 && totalPages > 1 && (
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
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <CreateNonContactableModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => { setShowCreateModal(false); setToast({ kind: 'ok', msg: 'Non-contactable outcome recorded.' }); fetchRecords(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
