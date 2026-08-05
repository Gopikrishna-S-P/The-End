import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { apiClient, unwrapApiResponse } from '../client';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { usersApi } from '../api/usersApi';
import type { ReportJobResponse, PagedResponse } from '../types';
import { reportsApi } from '../api/reportsApi';
import {
  FileText, Download, Loader2,
  Plus, X, AlertCircle,
} from 'lucide-react';
import { StatusPill, fmtFileSize, TERMINAL_STATUSES, REPORT_LABELS } from './ReportsHelpers';
import { ReportGenerateModal } from './ReportGenerateModal';
import { ReportsAnalyticsPanel } from './ReportsAnalyticsPanel';
import { Pagination } from '../components/Pagination';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE   = 20;
const POLL_MAX_MS = 30_000;

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

const fmtAbsolute = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

// Mirrors ReportingController's class-level @PreAuthorize (READERS) exactly.
// The /app/reports route itself is gated more loosely (ANY_ORG_ROLE, incl.
// FO/CALLER/TRACER), so this page must self-gate to avoid every fetch 403'ing.
const REPORT_READER_ROLES = ['PLATFORM_ADMIN', 'ORG_ADMIN', 'MANAGER', 'TL'];

export default function ReportsPage() {
  const { user } = useAuth();
  const { hasAnyRole } = usePermissions();
  const organizationId = user?.organizationId || '';
  const canView = hasAnyRole(...REPORT_READER_ROLES);

  const [jobs,               setJobs]               = useState<ReportJobResponse[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [page,               setPage]               = useState(0);
  const [totalPages,         setTotalPages]         = useState(0);
  const [totalElements,      setTotalElements]      = useState(0);
  const [showGenerateModal,  setShowGenerateModal]  = useState(false);
  const [downloadingId,      setDownloadingId]      = useState<string | null>(null);
  const [actionError,        setActionError]        = useState<string | null>(null);
  const [requesterNames,     setRequesterNames]     = useState<Record<string, string>>({});

  const pollTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<number>(2000);

  const stopPolling = () => {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  };

  const fetchJobs = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await apiClient.get('/api/v1/reports/jobs', {
        params: { orgId: organizationId, page, size: PAGE_SIZE },
      });
      const response = unwrapApiResponse<PagedResponse<ReportJobResponse>>(data);
      setJobs(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements ?? response.content.length);
      const hasActive = response.content.some(j => !TERMINAL_STATUSES.includes(j.status));
      if (hasActive) {
        const next = Math.min(pollIntervalRef.current * 2, POLL_MAX_MS);
        pollIntervalRef.current = next;
        stopPolling();
        pollTimerRef.current = setTimeout(fetchJobs, next);
      } else {
        stopPolling();
        pollIntervalRef.current = 2000;
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [organizationId, page, canView]);

  useEffect(() => {
    if (organizationId) { pollIntervalRef.current = 2000; fetchJobs(); }
    return () => stopPolling();
  }, [fetchJobs, organizationId]);

  // Resolve requestedBy (a bare user UUID on the job DTO) to a display name —
  // fetched lazily per unique id and cached, since there's no bulk "org users" list endpoint.
  useEffect(() => {
    const ids = Array.from(new Set(jobs.map(j => j.requestedBy).filter(id => id && !(id in requesterNames))));
    if (ids.length === 0) return;
    let alive = true;
    Promise.all(ids.map(id =>
      usersApi.getUserById(id)
        .then(u => [id, `${u.firstName} ${u.lastName}`.trim() || u.email] as const)
        .catch(() => [id, `${id.slice(0, 8)}…`] as const)
    )).then(pairs => { if (alive) setRequesterNames(prev => ({ ...prev, ...Object.fromEntries(pairs) })); });
    return () => { alive = false; };
  }, [jobs, requesterNames]);

  // Ground truth: ExportController is mounted at /api/v1/reports/export (nested
  // under /api/v1/reports), so the download route is .../reports/export/jobs/{id}/download.
  // ReportingController's own /jobs/{jobId} route only returns job status, not a file.
  const handleDownload = async (job: ReportJobResponse) => {
    if (downloadingId) return;
    setDownloadingId(job.id);
    try {
      const blob = await reportsApi.downloadReportJob(job.id, organizationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = job.fileName || `report-${job.id}.${job.exportFormat === 'PDF' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setActionError('Failed to download report file.');
    } finally { setDownloadingId(null); }
  };

  if (!canView) {
    return (
      <div className="db-root">
        <div className="db-content">
          <div className="ds-empty" style={{ padding: '80px 0' }}>
            <FileText size={32} className="ds-empty-icon" />
            <span className="ds-empty-title">Restricted to team leads and above</span>
            <span className="ds-empty-sub">Reports are visible to Team Leads, Managers, and Org Admins.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence>
        {actionError && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">{actionError}</span>
            </div>
            <button className="db-error-retry" onClick={() => setActionError(null)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

          <motion.div variants={fadeUp} className="db-page-header">
            <div className="db-page-header-left">
              <div className="db-page-titles">
                <h1 className="db-page-title">Reports</h1>
                {!loading && totalElements > 0 && (
                  <span className="db-page-org">{totalElements.toLocaleString('en-IN')} generated</span>
                )}
              </div>
            </div>
            <button type="button" onClick={() => setShowGenerateModal(true)} className="ds-btn is-primary">
              <Plus size={14} /> Generate report
            </button>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ReportsAnalyticsPanel organizationId={organizationId} />
          </motion.div>

            <motion.section variants={fadeUp} className="ds-table-card" style={{ display: 'flex', flexDirection: 'column', ...(jobs.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
                <div className="ds-table-wrap" style={{ flex: 1, overflow: 'auto' }}>
                  <table className="ds-table ps-table">
                    <thead>
                      <tr>
                        <th>Report</th>
                        <th>Requested by</th>
                        <th>Format</th>
                        <th>Generated</th>
                        <th>Completed</th>
                        <th>Status</th>
                        <th className="is-right">Size</th>
                        <th className="is-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && jobs.length === 0 ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} style={{ opacity: 1 - i * 0.12 }}>
                            <td><span className="ds-skel" style={{ height: 14, width: '70%', display: 'block' }} /></td>
                            <td><span className="ds-skel" style={{ height: 14, width: '60%', display: 'block' }} /></td>
                            <td><span className="ds-skel" style={{ height: 14, width: 50, display: 'block' }} /></td>
                            <td><span className="ds-skel" style={{ height: 14, width: 90, display: 'block' }} /></td>
                            <td><span className="ds-skel" style={{ height: 14, width: 90, display: 'block' }} /></td>
                            <td><span className="ds-skel" style={{ height: 22, width: 72, borderRadius: 999, display: 'block' }} /></td>
                            <td className="is-right"><span className="ds-skel" style={{ height: 14, width: 50, marginLeft: 'auto', display: 'block' }} /></td>
                            <td className="is-right"><span className="ds-skel" style={{ height: 14, width: 60, marginLeft: 'auto', display: 'block' }} /></td>
                          </tr>
                        ))
                      ) : jobs.length === 0 ? (
                        <tr>
                          <td colSpan={8}>
                            <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show">
                              <span className="ds-empty-icon"><FileText size={20} /></span>
                              <span className="ds-empty-title">No reports yet</span>
                              <span className="ds-empty-sub">
                                Generated reports will appear here once queued.
                              </span>
                            </motion.div>
                          </td>
                        </tr>
                      ) : (
                        jobs.map((job, idx) => (
                          <motion.tr key={job.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: idx * 0.03 }}>
                            <td style={{ fontWeight: 600, color: 'var(--ink-primary)', textTransform: 'capitalize' }}>
                              {REPORT_LABELS[job.reportType] ?? job.reportType.replace(/_/g, ' ').toLowerCase()}
                            </td>
                            <td>{requesterNames[job.requestedBy] ?? '…'}</td>
                            <td className="is-muted">{job.exportFormat}</td>
                            <td className="is-mono is-muted" style={{ fontSize: 12 }} title={fmtAbsolute(job.createdAt)}>
                              {fmtAbsolute(job.createdAt)}
                            </td>
                            <td className="is-mono is-muted" style={{ fontSize: 12 }}>
                              {job.completedAt ? fmtAbsolute(job.completedAt) : '—'}
                            </td>
                            <td>
                              <StatusPill status={job.status} />
                              {job.status === 'FAILED' && job.errorMessage && (
                                <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4, maxWidth: 220 }}>{job.errorMessage}</div>
                              )}
                            </td>
                            <td className="is-right is-muted" style={{ fontSize: 12 }}>
                              {job.fileSizeBytes != null ? fmtFileSize(job.fileSizeBytes) : '—'}
                            </td>
                            <td className="is-right">
                              {job.status === 'COMPLETED' && (
                                <button type="button" onClick={() => handleDownload(job)} disabled={downloadingId === job.id}
                                  className="ds-table-row-action" title="Download" aria-label="Download">
                                  {downloadingId === job.id ? <Loader2 size={14} className="ds-spin" /> : <Download size={14} />}
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && !loading && (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalElements={totalElements}
                    itemLabel="reports"
                  />
                )}
              </motion.section>
        </motion.div>
      </div>

      <ReportGenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={fetchJobs}
        organizationId={organizationId}
      />
    </div>
  );
}
