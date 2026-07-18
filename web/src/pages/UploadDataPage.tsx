import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { uploadDataApi, type UploadDataResponse, type UploadRowResponse } from '../api/uploadDataApi';
import { usePermissions } from '../hooks/usePermissions';
import {
  ArrowLeft, Plus, AlertCircle, RefreshCw,
  Columns3, FileText, ChevronLeft, ChevronRight,
  Database, TableProperties, Download, Check
} from 'lucide-react';
import { UploadAddColumnModal } from './UploadAddColumnModal';
import { UploadDataTable } from './UploadDataTable';
import type { EditingCell } from './UploadCell';
const PAGE_SIZE = 50;

// ── Motion variants ────────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
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

const fmtNum = (n?: number | null) => (n ?? 0).toLocaleString('en-IN');

export default function UploadDataPage() {
  const { id: uploadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/bank') ? '/bank' : '/app';
  const { hasPermission, hasAnyRole } = usePermissions();
  const canCreateRow = hasPermission('ROW_CREATE');
  const canUpdateRow = hasPermission('ROW_UPDATE');
  const canDeleteRow = hasPermission('ROW_DELETE');
  const canCreateCol = hasPermission('COLUMN_CREATE');
  const canDeleteCol = hasPermission('COLUMN_DELETE');
  // Mirrors UploadDataController's class-level @PreAuthorize exactly.
  const canView = hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN', 'MANAGER', 'TL');

  const [response,         setResponse]         = useState<UploadDataResponse | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [saveError,        setSaveError]        = useState<string | null>(null);
  const [page,             setPage]             = useState(0);
  const [editingCell,      setEditingCell]      = useState<EditingCell | null>(null);
  const [savingCell,       setSavingCell]       = useState(false);
  const [showAddRow,       setShowAddRow]       = useState(false);
  const [showAddCol,       setShowAddCol]       = useState(false);
  const [deletingRow,      setDeletingRow]      = useState<string | null>(null);
  const [deletingCol,      setDeletingCol]      = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<string | null>(null);
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<string | null>(null);

  // --- DRAFT MODE STATE ---
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, Record<string, string>>>({});
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [isSavingAll, setIsSavingAll] = useState(false);
  const hasDraftChanges = Object.keys(pendingUpdates).length > 0 || pendingDeletes.size > 0;

  const load = useCallback(async () => {
    if (!uploadId || !canView) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const data = await uploadDataApi.getRows(uploadId, page, PAGE_SIZE);
      setResponse(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load data');
    } finally { setLoading(false); }
  }, [uploadId, page, canView]);

  useEffect(() => { load(); }, [load]);

  const handleCellSave = async (row: UploadRowResponse, col: string, newVal: string) => {
    if (!uploadId) return;
    const existingRowUpdates = pendingUpdates[row.id] || { ...(row.data ?? {}) };
    const newData = { ...existingRowUpdates, [col]: newVal };
    
    setPendingUpdates(prev => ({ ...prev, [row.id]: newData }));
    setResponse(prev => prev ? {
      ...prev,
      rows: prev.rows.map(r => r.id === row.id ? { ...r, data: newData } : r)
    } : prev);
    setEditingCell(null);
  };

  const handleAddRow = async (data: Record<string, string>) => {
    if (!uploadId) return;
    const newRow = await uploadDataApi.addRow(uploadId, data);
    setResponse(prev => prev ? { ...prev, rows: [...prev.rows, newRow], totalElements: prev.totalElements + 1 } : prev);
    setShowAddRow(false);
  };

  const handleDeleteRow = async (rowId: string) => {
    setPendingDeletes(prev => {
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });
    setConfirmDeleteRow(null);
  };

  const handleSaveDrafts = async () => {
    if (!uploadId) return;
    setIsSavingAll(true); setSaveError(null);
    try {
      // Run updates
      const updatePromises = Object.entries(pendingUpdates).map(([rId, data]) => uploadDataApi.updateRow(uploadId, rId, data));
      // Run deletes
      const deletePromises = Array.from(pendingDeletes).map(rId => uploadDataApi.deleteRow(uploadId, rId));

      await Promise.all([...updatePromises, ...deletePromises]);

      setPendingUpdates({});
      setPendingDeletes(new Set());
      await load(); // refresh from server to ensure perfect sync
    } catch (err: any) {
      // Draft state is intentionally left intact on failure so the user can
      // retry without re-entering their edits — only surface what broke.
      setSaveError(err?.response?.data?.message || 'Failed to save changes. Your edits are unsaved — retry or discard.');
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleDiscardDrafts = () => {
    setPendingUpdates({});
    setPendingDeletes(new Set());
    setSaveError(null);
    load(); // revert to server state
  };

  const handleDeleteColumn = async (col: string) => {
    if (!uploadId) return;
    setDeletingCol(col);
    try { await uploadDataApi.deleteColumn(uploadId, col); await load(); }
    finally { setDeletingCol(null); setConfirmDeleteCol(null); }
  };

  const columns = response?.columns ?? [];
  // Filter out pending deleted rows visually
  const rows = (response?.rows ?? []).filter(r => !pendingDeletes.has(r.id));

  if (!canView) {
    return (
      <div className="db-root">
        <div className="db-content">
          <div className="ds-empty" style={{ padding: '80px 0' }}>
            <Database size={32} className="ds-empty-icon" />
            <span className="ds-empty-title">Restricted to team leads and above</span>
            <span className="ds-empty-sub">Upload row data is visible to Team Leads, Managers, and Org Admins.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-root">
      <div className="db-content">
        <motion.div className="db-inner" initial="hidden" animate="show">

          <div className="db-kpi-header" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

              <div className="db-att-chip" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-solid)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}>
                <Database size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 className="db-kpi-title" style={{ fontSize: 20 }}>Upload Data</h2>
                  {response && <span className="db-kpi2-foot-meta" style={{ padding: 0 }}>/ {response.filename}</span>}
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-tertiary)', fontWeight: 400, fontFamily: 'var(--font-sans)' }}>
                  {response ? `${fmtNum(response.totalElements)} rows · ${columns.length} columns` : 'Loading...'}
                </span>
              </div>
            </div>

            <div className="db-kpi-toggle" style={{ border: 'none', background: 'transparent', padding: 0, gap: 12 }}>
              {hasDraftChanges && (
                <>
                  <button type="button" onClick={handleDiscardDrafts} disabled={isSavingAll}
                    className="ds-btn is-secondary" style={{ height: 32, padding: '0 12px' }}>
                    Discard
                  </button>
                  <button type="button" onClick={handleSaveDrafts} disabled={isSavingAll}
                    className="ds-btn is-primary" style={{ height: 32, padding: '0 12px', background: 'var(--success)' }}>
                    {isSavingAll ? <RefreshCw size={14} className="ds-spin" /> : <Check size={14} />}
                    Save Changes
                  </button>
                  <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
                </>
              )}
              <button type="button" onClick={load} className="ds-btn is-secondary"
                title="Refresh" style={{ height: 32, padding: '0 8px' }} disabled={hasDraftChanges || isSavingAll}>
                <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
              </button>
              {canCreateCol && (
                <button type="button" onClick={() => { setShowAddRow(false); setShowAddCol(true); }}
                  className="ds-btn is-secondary" style={{ height: 32 }}>
                  <Columns3 size={14} /> Add Column
                </button>
              )}
              {canCreateRow && (
                <button type="button" onClick={() => setShowAddRow(r => !r)}
                  className="ds-btn is-primary" style={{ height: 32 }}>
                  <Plus size={14} /> Add Row
                </button>
              )}
            </div>
          </div>

          {saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 30%, var(--border))', color: 'var(--danger)', fontSize: 12.5, marginBottom: 12 }}>
              <AlertCircle size={14} /><span>{saveError}</span>
            </div>
          )}

          <div className="db-grid">
            <div className="db-span-12">
              <motion.section variants={fadeUp} className="ds-card is-overflow-hidden db-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, height: 'calc(100vh - 180px)' }}>
            <div className="ud-body" style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
              {loading ? (
                <div style={{ padding: '0 8px' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ width: 48, padding: 12 }} />
                        {[0,1,2,3].map(i => <th key={i} style={{ padding: 12, textAlign: 'left' }}><span className="ds-skel" style={{ height: 14, width: '60%' }} /></th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: 1 - i * 0.08 }}>
                          <td style={{ padding: 12 }}><span className="ds-skel" style={{ height: 14, width: 20, margin: '0 auto' }} /></td>
                          {[0,1,2,3].map(j => <td key={j} style={{ padding: 12 }}><span className="ds-skel" style={{ height: 14, width: `${60 + (i+j)%4 * 10}%` }} /></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : error ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ height: '100%' }}>
                  <AlertCircle size={32} className="ds-empty-icon" style={{ color: 'var(--error)' }} />
                  <span className="ds-empty-title">Data loading failed</span>
                  <span className="ds-empty-sub">{error}</span>
                  <button type="button" onClick={load} className="ds-btn is-secondary" style={{ marginTop: 12 }}>Retry</button>
                </motion.div>
              ) : columns.length === 0 && rows.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ height: '100%' }}>
                  <TableProperties size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">Empty file</span>
                  <span className="ds-empty-sub">This file contains no valid data rows yet.</span>
                  {canCreateRow && (
                    <button type="button" onClick={() => setShowAddRow(true)} className="ds-btn is-primary" style={{ marginTop: 12 }}>
                      <Plus size={14} /> Add Row
                    </button>
                  )}
                </motion.div>
              ) : (
                <UploadDataTable
                  columns={columns}
                  rows={rows}
                  editingCell={editingCell}
                  savingCell={savingCell}
                  canUpdateRow={canUpdateRow}
                  canDeleteRow={canDeleteRow}
                  canDeleteCol={canDeleteCol}
                  showAddRow={showAddRow}
                  canCreateRow={canCreateRow}
                  deletingRow={deletingRow}
                  deletingCol={deletingCol}
                  confirmDeleteRow={confirmDeleteRow}
                  confirmDeleteCol={confirmDeleteCol}
                  onStartEdit={(rowId, col) => { if (!savingCell && canUpdateRow) setEditingCell({ rowId, col }); }}
                  onCellSave={handleCellSave}
                  onCancelEdit={() => setEditingCell(null)}
                  onDeleteRow={handleDeleteRow}
                  onDeleteCol={handleDeleteColumn}
                  onSetConfirmDeleteRow={setConfirmDeleteRow}
                  onSetConfirmDeleteCol={setConfirmDeleteCol}
                  onAddRow={handleAddRow}
                  onCancelAddRow={() => setShowAddRow(false)}
                />
              )}
            </div>
            
            {(response?.totalPages ?? 0) > 1 && (
              <footer className="up-pagination" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
                <span className="up-page-meta">
                  Page <strong>{page + 1}</strong> of <strong>{response?.totalPages}</strong>
                  {' · '}<strong>{response?.totalElements?.toLocaleString('en-IN') ?? 0}</strong> rows
                </span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  <button type="button" className="up-page-btn"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}>
                    <ChevronLeft size={14} />
                  </button>
                  <button type="button" className="up-page-btn"
                    onClick={() => setPage(p => Math.min((response?.totalPages ?? 1) - 1, p + 1))}
                    disabled={page === (response?.totalPages ?? 1) - 1}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </footer>
            )}
              </motion.section>
            </div>
          </div>
        </motion.div>
      </div>

      {showAddCol && (
        <UploadAddColumnModal uploadId={uploadId!} onClose={() => setShowAddCol(false)} onAdded={load} />
      )}
    </div>
  );
}

