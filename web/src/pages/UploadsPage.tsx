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
  ChevronRight, ChevronDown, CloudUpload,
  TableProperties, Building2, LayoutGrid,
  CheckCircle2, Clock, ShieldAlert
} from 'lucide-react';
import { UploadsModal, UploadStatusBadge } from './UploadsModal';
import { Pagination } from '../components/Pagination';
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

  // Reading another tenant's data requires a stated justification (PlatformAdminAccessGuard);
  // the server refuses the request without one. Collected once per organization rather than
  // per request, since the list below re-fetches on paging and on a poll timer.
  //
  // Both the draft and the confirmed reason are stored against the org they belong to and read
  // back by comparison, so switching tenants retracts the justification by derivation rather
  // than by an effect that clears state in a cascading render.
  const [reasonDraft,   setReasonDraft]   = useState<{ orgId: string; text: string }>({ orgId: '', text: '' });
  const [reasonGranted, setReasonGranted] = useState<{ orgId: string; text: string }>({ orgId: '', text: '' });

  const accessReason    = reasonDraft.orgId   === selectedOrgId ? reasonDraft.text   : '';
  const confirmedReason = reasonGranted.orgId === selectedOrgId ? reasonGranted.text : '';

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
    // Without a confirmed reason the server returns 400, and the catch below is silent --
    // which would render as an empty upload list rather than as the refusal it actually is.
    if (isPlatformAdmin && selectedOrgId && !confirmedReason) { setLoading(false); return; }
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: PAGE_SIZE };
      if (isPlatformAdmin && selectedOrgId) {
        params.organizationId = selectedOrgId;
        params.reason = confirmedReason;
      }
      const { data } = await apiClient.get('/api/v1/file-uploads', { params });
      const response = unwrapApiResponse<PagedResponse<FileUploadResponse>>(data);
      setUploads(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page, isPlatformAdmin, selectedOrgId, orgsLoading, canView, confirmedReason]);


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

          <div className="db-kpi-header" style={{ gap: 24, flexWrap: 'wrap', minHeight: 48, justifyContent: 'space-between' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-tertiary)', margin: 0 }}>
              You have <strong>{fmtNum(filesAnim)} files</strong> with <strong>{fmtNum(rowsAnim)} rows</strong>, <span style={{ color: failedAnim > 0 ? 'var(--error)' : 'inherit', fontWeight: failedAnim > 0 ? 500 : 'inherit' }}>{fmtNum(failedAnim)} failed</span> and <span style={{ color: inFlightCount > 0 ? 'var(--warning)' : 'inherit', fontWeight: inFlightCount > 0 ? 500 : 'inherit' }}>{fmtNum(inFlightCount)} processing</span>.
            </p>
            <div className="db-kpi-toggle" style={{ border: 'none', background: 'transparent', padding: 0, gap: 16, alignItems: 'center' }}>
              <button type="button" className="ds-btn is-secondary" style={{ height: 32 }}
                onClick={() => navigate('/app/settings/schema')}>
                <TableProperties size={14} /> Column Schemas
              </button>
            </div>
          </div>

          {/* ── Uploads List ── */}
          <div className="db-grid">
            <div className="db-span-12">
              <motion.section variants={fadeUp} className="ds-card is-overflow-hidden db-card" style={{ display: 'flex', flexDirection: 'column' }}>
                {(isPlatformAdmin || (totalPages > 1 && !loading)) && (
                  <header className="db-card-head" style={{ alignItems: 'center', justifyContent: 'space-between', minHeight: '48px', padding: '12px 0', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: 1, display: 'flex' }}>
                      {isPlatformAdmin && (
                        <div style={{ display: 'flex', gap: 16, flex: 1, alignItems: 'flex-start' }}>
                          {!confirmedReason ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <ShieldAlert size={15} style={{ color: 'var(--warning)' }} />
                                  <strong style={{ fontSize: 14 }}>Reason required to view another organization's data</strong>
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--ink-secondary)', margin: 0 }}>
                                  All access to tenant data is recorded in the audit trail. Select an organization and reference a ticket or support case.
                                </p>
                              </div>
                              <form
                                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                                onSubmit={e => {
                                  e.preventDefault();
                                  setReasonGranted({ orgId: selectedOrgId, text: accessReason.trim() });
                                }}
                              >
                                <input
                                  className="ds-input"
                                  style={{ flex: 1, maxWidth: 500, minWidth: 280, height: 32, fontSize: 13 }}
                                  placeholder="Reason for audit log..."
                                  value={accessReason}
                                  onChange={e => setReasonDraft({ orgId: selectedOrgId, text: e.target.value })}
                                />
                                <button type="submit" className="ds-btn is-primary" style={{ height: 32, padding: '0 12px', fontSize: 13, flexShrink: 0 }} disabled={!accessReason.trim()}>
                                  Confirm
                                </button>
                              </form>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontSize: 13, fontWeight: 500, paddingRight: 4, flex: 1, height: 32 }}>
                              <ShieldAlert size={15} /> Access Confirmed
                            </div>
                          )}

                          <div className="up-org-picker" style={{ margin: 0, height: 32, flexShrink: 0 }}>
                            <Building2 size={13} className="up-org-icon" />
                            <select
                              value={selectedOrgId}
                              onChange={e => setSelectedOrgId(e.target.value)}
                              disabled={orgsLoading}
                              className="up-org-select"
                              style={{ height: '100%', minWidth: 160, fontSize: 13 }}
                            >
                              {orgsLoading && <option value="">Loading…</option>}
                              {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </select>
                            <ChevronDown size={13} className="up-org-caret" />
                          </div>
                        </div>
                      )}
                    </div>
                    {totalPages > 1 && !loading && (
                      <Pagination
                        embedded
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        totalElements={totalElements}
                        itemLabel="files"
                      />
                    )}
                  </header>
                )}

                <div className="db-card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: 0 }}>
                  {loading ? (
                    <div style={{ padding: '8px' }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="dd-case-skel" style={{ opacity: 1 - i * 0.09, padding: '16px 0', display: 'flex', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}>
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
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 0 }}>
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

      {canUpload && (
        <button type="button"
          onClick={() => setShowUploadModal(true)}
          title="Upload file"
          aria-label="Upload file"
          style={{
            position: 'fixed', bottom: 28, right: 32, zIndex: 50,
            width: 56, height: 56, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--brand)', border: 'none', color: 'var(--text-on-solid)', cursor: 'pointer',
            boxShadow: '0 8px 20px color-mix(in srgb, var(--text-primary) 22%, transparent), 0 2px 6px color-mix(in srgb, var(--text-primary) 14%, transparent)',
            transition: 'transform 120ms ease, box-shadow 120ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
          <Upload size={24} />
        </button>
      )}

      {showUploadModal && (
        <UploadsModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => { fetchUploads(); setShowUploadModal(false); }}
          targetOrgId={isPlatformAdmin ? selectedOrgId : undefined}
          accessReason={confirmedReason}
        />
      )}
    </div>
  );
}

