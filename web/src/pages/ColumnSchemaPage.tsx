import { useState, useEffect, useCallback, Fragment } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { columnSchemasApi, type ColumnSchemaResponse } from '../api/columnSchemasApi';
import { Plus, SquarePen, X, AlertCircle, Columns, Check, Trash2, Loader2 } from 'lucide-react';
import { RowForm, type RowFormState, EMPTY_FORM, TYPE_VARIANT } from './ColumnSchemaRowForm';
import '../styles/AppPage.css';
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

export default function ColumnSchemaPage() {
  const { user } = useAuth();
  const { hasPermission, hasAnyRole } = usePermissions();
  const canCreate = hasPermission('COLUMN_CREATE');
  // Mirrors ColumnSchemaController.ADMINS exactly — every endpoint here (incl. the
  // plain GET list) is PLATFORM_ADMIN/ORG_ADMIN-only, tighter than the /app/settings/schema
  // route's ORG_LEAD_ROLES gate (which also lets MANAGER/TL in), so self-gate.
  const canView = hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN');
  const orgId = user?.organizationId ?? '';

  const [columns, setColumns]       = useState<ColumnSchemaResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [adding, setAdding]         = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !canView) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const list = await columnSchemasApi.list(orgId);
      setColumns(list.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder));
    } catch { setError('Failed to load column schemas.'); }
    finally { setLoading(false); }
  }, [orgId, canView]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (saved: ColumnSchemaResponse) => {
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved;
        return next.sort((a, b) => a.sortOrder - b.sortOrder);
      }
      return [...prev, saved].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    setAdding(false); setEditingId(null);
  };

  const handleDeactivate = async (id: string) => {
    setDeletingId(id); setError(null);
    try {
      await columnSchemasApi.delete(id);
      setColumns((prev) => prev.filter((c) => c.id !== id));
      setConfirmingId(null);
    } catch { setError('Failed to deactivate column schema.'); }
    finally { setDeletingId(null); }
  };

  const editInitial = (col: ColumnSchemaResponse): RowFormState & { id: string } => ({
    id: col.id, name: col.name, displayName: col.displayName,
    dataType: col.dataType, isRequired: col.isRequired, isSearchable: col.isSearchable,
    sortOrder: String(col.sortOrder ?? 0),
  });

  if (!canView) {
    return (
      <div className="dd-page">
        <div className="ds-empty" style={{ padding: '80px 0' }}>
          <Columns size={32} className="ds-empty-icon" />
          <span className="ds-empty-title">Admins only</span>
          <span className="ds-empty-sub">Column schema configuration is restricted to Org Admins.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dd-page">
      <AnimatePresence>
        {error && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24, flexShrink: 0 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">{error}</span>
            </div>
            <button className="db-error-retry" onClick={() => setError(null)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dd-page-header">
        <div className="dd-page-titles">
          <h1 className="dd-page-title">Column Schema</h1>
          <span className="dd-page-context">
            {!loading && columns.length > 0 ? `${columns.length} columns defined` : 'Manage data structure'}
          </span>
        </div>
        <div className="dd-page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {columns.length > 0 && (
            <span className="dd-kpi2-foot-meta" style={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{columns.filter((c) => c.isRequired).length}</strong>&nbsp;required
              &nbsp;·&nbsp;
              <strong style={{ color: 'var(--text-primary)' }}>{columns.filter((c) => c.isSearchable).length}</strong>&nbsp;searchable
            </span>
          )}
          {!adding && editingId === null && canCreate && (
            <button type="button" onClick={() => setAdding(true)} className="ds-btn is-primary" style={{ height: 32 }}>
              <Plus size={14} style={{ marginRight: 6 }} /> Add column
            </button>
          )}
        </div>
      </div>

      <div className="dd-main-container">
        <div className="dd-grid">
          <div className="dd-case-panel">
            <div className="ds-card dd-cases-card is-overflow-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="dd-cases-head">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Schema Configuration</span>
              </div>

              <div className="dd-cp-list-wrap">
                <div className="dd-cp-list">
                  {adding && (
                    <RowForm
                      initial={{ ...EMPTY_FORM, sortOrder: String(columns.length) }}
                      orgId={orgId}
                      onSaved={handleSaved}
                      onCancel={() => setAdding(false)}
                    />
                  )}
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="dd-case-skel">
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span className="ds-skel" style={{ height: 14, width: '40%', borderRadius: 4 }} />
                          <span className="ds-skel" style={{ height: 11, width: '25%', borderRadius: 4 }} />
                        </div>
                      </div>
                    ))
                  ) : columns.length === 0 && !adding ? (
                    <motion.div className="dd-cp-empty" variants={fadeIn} initial="hidden" animate="show">
                      <div className="dd-cp-empty-icon">
                        <Columns size={20} />
                      </div>
                      <span className="dd-cp-empty-title">No columns defined</span>
                      <span className="dd-cp-empty-sub">
                        Add column names that appear in your CSV/Excel uploads.
                      </span>
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {columns.map((col, idx) => (
                        <Fragment key={col.id}>
                          {editingId === col.id ? (
                            <RowForm initial={editInitial(col)} orgId={orgId} onSaved={handleSaved} onCancel={() => setEditingId(null)} />
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              transition={{ duration: 0.28, delay: idx * 0.02 }}
                              className="dd-case-row"
                            >
                              <div className="dd-case-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                      <span className="dd-case-borrower" style={{ fontSize: 13 }}>{col.displayName}</span>
                                      <span className="ds-pill" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-subtle)', padding: '2px 6px', height: 18, flexShrink: 0 }}>
                                        {col.name}
                                      </span>
                                    </div>
                                    <div className="dd-case-meta">
                                      <span className={`ds-pill ${TYPE_VARIANT[col.dataType] ?? ''}`} style={{ fontSize: 9, padding: '0 6px', height: 16, flexShrink: 0 }}>{col.dataType}</span>
                                      {col.isRequired && <span style={{ fontSize: 11, color: 'var(--success)' }}>• Required</span>}
                                      {col.isSearchable && <span style={{ fontSize: 11, color: 'var(--info)' }}>• Searchable</span>}
                                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>• Sort: {col.sortOrder}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="dd-case-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {confirmingId === col.id ? (
                                  <>
                                    <span style={{ fontSize: 11.5, color: 'var(--danger)' }}>Deactivate?</span>
                                    <button type="button" onClick={() => handleDeactivate(col.id)} disabled={deletingId === col.id}
                                      className="ds-btn is-danger is-sm" title="Confirm deactivate" aria-label="Confirm deactivate">
                                      {deletingId === col.id ? <Loader2 size={12} className="ds-spin" /> : <Check size={12} />}
                                    </button>
                                    <button type="button" onClick={() => setConfirmingId(null)} disabled={deletingId === col.id}
                                      className="ds-btn is-secondary is-sm" title="Cancel" aria-label="Cancel">
                                      <X size={12} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button type="button" onClick={() => { setEditingId(col.id); setAdding(false); }}
                                      className="ds-btn is-secondary is-sm" title="Edit" aria-label="Edit">
                                      <SquarePen size={12} />
                                    </button>
                                    <button type="button" onClick={() => setConfirmingId(col.id)}
                                      className="ds-btn is-secondary is-sm" title="Deactivate" aria-label="Deactivate">
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </Fragment>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
