import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { apiClient, unwrapApiResponse } from '../client';
import { usePermissions } from '../hooks/usePermissions';
import { platformApi } from '../api/platformApi';
import type { OrganizationSummary } from '../api/platformApi';
import type { FileUploadResponse, PagedResponse } from '../types';
import {
  File as FileIcon, AlertCircle, Trash2, Upload,
  ChevronLeft, ChevronRight, ChevronDown, CloudUpload,
  TableProperties, ListChecks, Building2, LayoutGrid,
  CheckCircle2, Clock, RefreshCw
} from 'lucide-react';
import { UploadsModal, UploadStatusBadge } from './UploadsModal';
import '../styles/AppPage.css';
import '../styles/UploadsPage.css';
import './Dashboard.css';

const PAGE_SIZE = 20;

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

// ── Count-up animation ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
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

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function fmtRelative(s?: string | null): string {
  if (!s) return '—';
  const diff = Date.now() - new Date(s).getTime();
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return fmtDate(s);
}

const fmtAbsolute = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const fmtNum = (n?: number | null) => (n ?? 0).toLocaleString('en-IN');

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent, onClick }: {
  label: string; value: string;
  sub?: React.ReactNode;
  icon?: React.ElementType; accent?: boolean;
  onClick?: () => void;
}) {
  const { ref, fire } = useRipple<HTMLButtonElement>();
  return (
    <motion.button ref={ref} type="button" variants={fadeUp}
      className={`db-kpi2-card${accent ? ' is-accent' : ''}${onClick ? ' is-hoverable' : ''}`}
      onClick={e => { fire(e); onClick?.(); }} disabled={!onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <div className="db-kpi2-top">
        <span className="db-kpi2-label">{label}</span>
        {Icon && <span className="db-kpi2-icon"><Icon size={14} aria-hidden="true" /></span>}
      </div>
      <span className="db-kpi2-value">{value}</span>
      {sub && <div className="db-kpi2-sub">{sub}</div>}
    </motion.button>
  );
}

// Mirrors FileUploadController.READERS exactly — PLATFORM_ADMIN, ORG_ADMIN, MANAGER, TL.
// The /app/uploads route itself is gated more loosely (ANY_ORG_ROLE, incl. FO/CALLER/TRACER),
// so this page must self-gate to avoid a screen full of silently-failed 403s.
const UPLOAD_READER_ROLES = ['PLATFORM_ADMIN', 'ORG_ADMIN', 'MANAGER', 'TL'];

export default function UploadsPage() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { hasRole, hasPermission, hasAnyRole } = usePermissions();
  const isPlatformAdmin = hasRole('PLATFORM_ADMIN');
  const canDelete = hasPermission('FILE_DELETE');
  const canUpload = hasPermission('FILE_UPLOAD');
  const canView = hasAnyRole(...UPLOAD_READER_ROLES);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const basePath = location.pathname.startsWith('/bank') ? '/bank'
    : location.pathname.startsWith('/admin') ? '/admin' : '/app';

  const [uploads,       setUploads]       = useState<FileUploadResponse[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [orgs,          setOrgs]          = useState<OrganizationSummary[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [orgsLoading,   setOrgsLoading]   = useState(false);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    setOrgsLoading(true);
    platformApi.listOrganizations()
      .then(list => { setOrgs(list); if (list.length > 0) setSelectedOrgId(list[0].id); })
      .catch(() => {})
      .finally(() => setOrgsLoading(false));
  }, [isPlatformAdmin]);

  const fetchUploads = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    if (isPlatformAdmin && (orgsLoading || !selectedOrgId)) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: PAGE_SIZE };
      if (isPlatformAdmin && selectedOrgId) params.organizationId = selectedOrgId;
      const { data } = await apiClient.get('/api/v1/file-uploads', { params });
      const response = unwrapApiResponse<PagedResponse<FileUploadResponse>>(data);
      setUploads(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page, isPlatformAdmin, selectedOrgId, orgsLoading, canView]);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const pollIntervalRef = useRef(3_000);
  const pollTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const inFlight = uploads.some(u => u.status === 'PENDING' || u.status === 'PROCESSING');
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
    if (!inFlight) { pollIntervalRef.current = 3_000; return; }
    const next = Math.min(pollIntervalRef.current * 2, 30_000);
    pollIntervalRef.current = next;
    pollTimerRef.current = setTimeout(fetchUploads, next);
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [uploads, fetchUploads]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this upload and all its allocation rows?')) return;
    try { await apiClient.delete(`/api/v1/file-uploads/${id}`); fetchUploads(); }
    catch { /* silent */ }
  };

  const totalRowsCount = useMemo(() => uploads.reduce((s, u) => s + (u.totalRows ?? 0), 0), [uploads]);
  const failedRowsCount = useMemo(() => uploads.reduce((s, u) => s + (u.failedRows ?? 0), 0), [uploads]);
  const inFlightCount = useMemo(() => uploads.filter(u => u.status === 'PENDING' || u.status === 'PROCESSING').length, [uploads]);

  const rowsAnim = useCountUp(totalRowsCount);
  const failedAnim = useCountUp(failedRowsCount);
  const filesAnim = useCountUp(totalElements);

  if (!canView) {
    return (
      <div className="db-root">
        <div className="db-content">
          <div className="ds-empty" style={{ padding: '80px 0' }}>
            <FileIcon size={32} className="ds-empty-icon" />
            <span className="ds-empty-title">Restricted to team leads and above</span>
            <span className="ds-empty-sub">File uploads are visible to Team Leads, Managers, and Org Admins.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-root">
      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">

          <div className="db-kpi-header">
            <h2 className="db-kpi-title">File Uploads</h2>
            <div className="db-kpi-toggle" style={{ border: 'none', background: 'transparent', padding: 0, gap: 12 }}>
              {isPlatformAdmin && (
                <div className="up-org-picker" style={{ margin: 0, height: 32 }}>
                  <Building2 size={13} className="up-org-icon" />
                  <select
                    value={selectedOrgId}
                    onChange={e => setSelectedOrgId(e.target.value)}
                    disabled={orgsLoading}
                    className="up-org-select"
                    style={{ height: '100%' }}
                  >
                    {orgsLoading && <option value="">Loading…</option>}
                    {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                  <ChevronDown size={13} className="up-org-caret" />
                </div>
              )}
              {canUpload && (
                <button type="button" className="ds-btn is-primary" style={{ height: 32 }}
                  onClick={() => setShowUploadModal(true)}>
                  <Upload size={14} /> Upload File
                </button>
              )}
            </div>
          </div>
          
          {/* ── KPI Band ── */}
          <motion.div variants={fadeUp} className="db-kpi-band">
            <KpiCard label="Total Files" value={fmtNum(filesAnim)} icon={FileIcon} accent
              sub={<span className="db-kpi2-sub-meta">All-time uploads</span>} />
            <KpiCard label="Total Rows" value={fmtNum(rowsAnim)} icon={ListChecks}
              sub={<span className="db-kpi2-sub-meta">Processed system-wide</span>} />
            <KpiCard label="Failed Rows" value={fmtNum(failedAnim)} icon={AlertCircle} accent={failedAnim > 0}
              sub={<span className="db-kpi2-sub-meta">Requires attention</span>} />
            <KpiCard label="Processing" value={fmtNum(inFlightCount)} icon={RefreshCw} accent={inFlightCount > 0}
              sub={<span className="db-kpi2-sub-meta">In progress right now</span>} />
          </motion.div>

          {/* ── Uploads List ── */}
          <div className="db-grid">
            <div className="db-span-12">
              <motion.section variants={fadeUp} className="ds-card is-overflow-hidden db-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <header className="db-card-head">
                  <h2 className="db-card-title">Recent Uploads</h2>
                  {totalPages > 1 && !loading && (
                    <div className="up-pagination" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
                      <button type="button" className="up-page-btn" style={{ height: 28 }}
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0} aria-label="Previous page">
                        <ChevronLeft size={14} />
                      </button>
                      <span className="up-page-meta">
                        Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
                      </span>
                      <button type="button" className="up-page-btn" style={{ height: 28 }}
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1} aria-label="Next page">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </header>

                <div className="db-card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: 0 }}>
                  {loading ? (
                    <div style={{ padding: '8px' }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="dd-case-skel" style={{ opacity: 1 - i * 0.09, padding: '16px 12px', display: 'flex', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="ds-skel" style={{ height: 16, width: '40%' }} />
                        <span className="ds-skel" style={{ height: 12, width: '25%' }} />
                      </div>
                      <span className="ds-skel" style={{ height: 18, width: 80 }} />
                    </div>
                  ))}
                </div>
              ) : uploads.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <CloudUpload size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No uploads yet</span>
                  <span className="ds-empty-sub">Upload your first allocation file to start importing rows.</span>
                </motion.div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 8px' }}>
                  <motion.div variants={stagger} initial="hidden" animate="show">
                    {uploads.map((u, idx) => {
                      const isFailed = u.status === 'FAILED' || (u.failedRows ?? 0) > 0;
                      return (
                        <motion.button key={u.id} variants={fadeUp}
                          className="db-att-row"
                          style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 0, width: '100%', textAlign: 'left', background: 'transparent' }}
                          onClick={() => navigate(`${basePath}/uploads/${u.id}/data`)}
                          whileHover={{ background: 'var(--bg-subtle)' }}>

                          <div style={{ flex: 1, marginLeft: 0 }}>
                            <span className="db-att-label" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FileIcon size={13} style={{ color: 'var(--ink-tertiary)' }} />
                              {u.originalFilename}
                            </span>
                            <div className="db-ml-tooltip-row" style={{ gap: 16, padding: 0, marginTop: 10 }}>
                              <UploadStatusBadge status={u.status} />
                              <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }} title={fmtAbsolute(u.createdAt)}>
                                {fmtRelative(u.createdAt)}
                              </span>
                              <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                                / {fmtNum(u.totalRows)} rows
                              </span>
                              {(u.failedRows ?? 0) > 0 && (
                                <span className="db-kpi2-foot-meta" style={{ fontSize: 11, color: 'var(--error)' }}>
                                  / {fmtNum(u.failedRows)} failed
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                              {isFailed && (
                                <button type="button" className="db-error-retry"
                                  style={{ background: 'var(--bg-subtle)' }}
                                  onClick={() => navigate(`${basePath}/uploads/${u.id}/errors`)}
                                  title="View Errors">
                                  <AlertCircle size={14} />
                                </button>
                              )}
                              {canDelete && (
                                <button type="button" className="db-error-retry"
                                  style={{ background: 'var(--bg-subtle)', color: 'var(--error)' }}
                                  onClick={() => handleDelete(u.id)}
                                  title="Delete Upload">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <ChevronRight size={16} style={{ color: 'var(--ink-tertiary)' }} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>
              )}
                </div>
              </motion.section>
            </div>
          </div>
        </motion.div>
      </div>

      {showUploadModal && (
        <UploadsModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => { fetchUploads(); setShowUploadModal(false); }}
          targetOrgId={isPlatformAdmin ? selectedOrgId : undefined}
        />
      )}
    </div>
  );
}

