import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { filesApi } from '../api/filesApi';
import { usePermissions } from '../hooks/usePermissions';
import type { FileProcessingErrorResponse } from '../types';
import {
  ArrowLeft, AlertTriangle, AlertCircle, FileX,
  XOctagon
} from 'lucide-react';
import { Pagination } from '../components/Pagination';
import '../styles/AppPage.css';
import '../styles/UploadErrorsPage.css';
import './Dashboard.css';

const PAGE_SIZE = 20;

// ── Motion variants ────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

export default function UploadErrorsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasAnyRole } = usePermissions();
  // Mirrors FileUploadController.READERS exactly.
  const canView = hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN', 'MANAGER', 'TL');

  const [errors, setErrors]               = useState<FileProcessingErrorResponse[]>([]);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage]                   = useState(0);
  const [loading, setLoading]             = useState(false);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [columnFilter, setColumnFilter]   = useState<string>('ALL');

  const load = async (p: number) => {
    if (!id || !canView) { setLoading(false); return; }
    setLoading(true); setFetchError(null);
    try {
      const resp = await filesApi.getUploadErrors(id, p, PAGE_SIZE);
      setErrors(resp.content || []);
      setTotalPages(resp.totalPages ?? 0);
      setTotalElements(resp.totalElements ?? 0);
    } catch {
      setFetchError('Failed to load upload errors. Please try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [id, page, canView]);

  const allColumns = Array.from(new Set(errors.map((e) => e.columnName).filter(Boolean) as string[]));
  const filtered = columnFilter === 'ALL'
    ? errors
    : errors.filter((e) => e.columnName === columnFilter);

  if (!canView) {
    return (
      <div className="db-root">
        <div className="db-content">
          <div className="ds-empty" style={{ padding: '80px 0' }}>
            <AlertTriangle size={32} className="ds-empty-icon" />
            <span className="ds-empty-title">Restricted to team leads and above</span>
            <span className="ds-empty-sub">Row errors are visible to Team Leads, Managers, and Org Admins.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <motion.div className="db-inner" initial="hidden" animate="show" variants={stagger} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

          <div className="db-kpi-header" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" onClick={() => navigate(-1)} className="ds-btn is-secondary is-sm">
                <ArrowLeft size={16} />
              </button>
              <div className="db-att-chip is-warn" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}>
                <AlertTriangle size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 className="db-kpi-title" style={{ fontSize: 20 }}>Row Errors</h2>
                  {id && <span className="db-kpi2-foot-meta" style={{ padding: 0 }}>/ Batch {id.substring(0, 8)}…</span>}
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-tertiary)', fontWeight: 400, fontFamily: 'var(--font-sans)' }}>
                  {totalElements.toLocaleString('en-IN')} {totalElements === 1 ? 'error' : 'errors'} found
                </span>
              </div>
            </div>

            <div className="db-kpi-toggle" style={{ border: 'none', background: 'transparent', padding: 0, gap: 12 }}>
              {totalPages > 1 && !loading && (
                <Pagination
                  embedded
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalElements={totalElements}
                  itemLabel="errors"
                />
              )}
            </div>
          </div>
          
          {fetchError && (
            <motion.div variants={fadeUp} className="db-error-banner" role="alert" style={{ marginBottom: 0 }}>
              <AlertCircle size={16} className="db-error-icon" />
              <div className="db-error-body">
                <span className="db-error-title">{fetchError}</span>
              </div>
            </motion.div>
          )}

          <motion.section variants={fadeUp} className="ds-card is-overflow-hidden db-card" style={{ display: 'flex', flexDirection: 'column', ...(filtered.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
            <header className="db-card-head">
              {allColumns.length > 1 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" onClick={() => setColumnFilter('ALL')}
                    className={`ds-btn is-sm ${columnFilter === 'ALL' ? 'is-primary' : 'is-secondary'}`}
                    style={columnFilter === 'ALL' ? { background: 'var(--ink-solid)', color: 'var(--bg-surface)' } : {}}>
                    All Columns <span className="ds-pill is-neutral" style={columnFilter === 'ALL' ? { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' } : {}}>{errors.length}</span>
                  </button>
                  {allColumns.map((col) => (
                    <button key={col} type="button" onClick={() => setColumnFilter(col)}
                      className={`ds-btn is-sm ${columnFilter === col ? 'is-primary' : 'is-secondary'}`}
                      style={{ fontFamily: 'var(--font-mono)', ...(columnFilter === col ? { background: 'var(--ink-solid)', color: 'var(--bg-surface)' } : {}) }}>
                      {col}
                    </button>
                  ))}
                </div>
              ) : (
                <h2 className="db-card-title">Filter Errors</h2>
              )}
            </header>

            <div className="ds-table-wrap" style={{ border: 'none', borderRadius: 0, flex: 1, overflow: 'auto' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ width: 80, padding: '12px 16px', paddingLeft: 24 }}>Row #</th>
                    <th style={{ padding: '12px 16px' }}>Column</th>
                    <th style={{ padding: '12px 16px' }}>Message</th>
                    <th style={{ padding: '12px 16px', paddingRight: 24 }}>Raw value</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.1, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: '60%' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: '70%' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: '85%' }} /></td>
                        <td style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 14, width: '50%' }} /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                          <FileX size={32} className="ds-empty-icon" />
                          <span className="ds-empty-title">No errors on this page</span>
                          <span className="ds-empty-sub">Try changing the column filter or paging through.</span>
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((err, i) => (
                      <motion.tr key={err.id || i}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: i * 0.03 }}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}>
                          {err.rowNumber}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-tertiary)' }}>
                          {err.columnName || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <XOctagon size={13} style={{ color: 'var(--error)' }} />
                            <span style={{ fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}>{err.errorMessage}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', paddingRight: 24 }}>
                          <span className="ds-pill is-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-subtle)' }}>
                            {err.rawValue || '—'}
                          </span>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
