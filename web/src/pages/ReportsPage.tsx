import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { apiClient, unwrapApiResponse } from '../client';
import { useAuth } from '../AuthContext';
import type { ReportJobResponse, PagedResponse } from '../types';
import type { MisEodReportResponse, MisEodCaseRow } from '../api/reportsApi';
import { reportsApi } from '../api/reportsApi';
import {
  FileText, Download, Loader2, ChevronLeft, ChevronRight,
  Plus, FileSpreadsheet, File as FileIcon, X, AlertCircle, RefreshCw,
  BarChart2, Users, CheckCircle2, Banknote, Clock, MapPin,
  ChevronDown, ChevronUp, Timer, Footprints, LogIn,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StatusPill, fmtDate, fmtFileSize, TERMINAL_STATUSES, REPORT_LABELS } from './ReportsHelpers';
import { ReportGenerateModal } from './ReportGenerateModal';
import '../styles/AppPage.css';
import './Dashboard.css';
import '../styles/UploadsPage.css';

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

function fmtINR(v: number) {
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(1)}k`;
  return `₹${v.toFixed(0)}`;
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtMins(mins: number | null | undefined) {
  if (mins == null) return '—';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function outcomeColor(outcome: string | null) {
  if (!outcome) return 'var(--ink-tertiary)';
  if (outcome === 'COLLECTED' || outcome === 'PAID') return 'var(--success)';
  if (outcome === 'ABANDONED') return 'var(--danger)';
  if (outcome.includes('PTP')) return 'var(--warning)';
  return 'var(--ink-secondary)';
}

function fmtXlsTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtXlsDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function toN(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ── Human-readable labels for raw backend enums (no "garbage" codes in cells) ──
const STATUS_LABELS: Record<string, string> = {
  STARTED: 'En route', REACHED: 'Reached', WAITING: 'Waiting',
  CLOSED: 'Completed', ABANDONED: 'Abandoned', DISPATCHED: 'Dispatched (no visit)',
};
const OUTCOME_LABELS: Record<string, string> = {
  PAID: 'Paid', COLLECTED: 'Paid', PTP: 'Promise to pay', RTP: 'Refused to pay',
  NC_SKIP: 'Non-contactable', FOLLOW_UP: 'Follow-up', DISPUTE: 'Dispute',
  ABANDONED: 'Abandoned', DISPATCHED: 'Dispatched (no visit)',
};
const FLAG_LABELS: Record<string, string> = {
  OK: 'OK', MOCK_GPS: '⚠ Mock GPS', INSTANT: '⚠ Instant', NO_MOVEMENT: '⚠ No movement',
};
function labelOf(map: Record<string, string>, raw: string | null | undefined): string {
  if (!raw) return '—';
  return map[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function exportMisToExcel(data: MisEodReportResponse) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Summary
  const summary = [
    ['MIS Daily Report', data.organizationName ?? '', data.date ?? ''],
    ['Generated At', fmtXlsDateTime(data.generatedAt)],
    [],
    ['Metric', 'Value'],
    ['Total Dispatched',     toN(data.totalDispatched)],
    ['Active Agents',        toN(data.activeAgents)],
    ['Visits Completed',     toN(data.visitsCompleted)],
    ['Visits In Progress',   toN(data.visitsInProgress)],
    ['Visits Abandoned',     toN(data.visitsAbandoned)],
    ['Completion Rate (%)',  toN(data.completionRate)],
    ['Collections Count',   toN(data.collectionsCount)],
    ['Total Collected (Rs)', toN(data.totalCollected)],
    ['PTP Count',           toN(data.ptpCount)],
    ['Total Promised (Rs)', toN(data.totalPromised)],
    ['Non-Contactable',     toN(data.nonContactableCount)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  // Sheet 2 — FO Attendance
  const foHeader = [
    'Field Officer', 'Login Time', 'Logout Time',
    'Dispatched', 'Visited', 'Completion (%)',
    'Collections', 'Amount Collected (Rs)',
    'PTPs Made', 'Non-Contactable', 'Distance (km)',
  ];
  const foRows = (data.foBreakdown ?? []).map(fo => {
    const dispatched = toN(fo.dispatched);
    const visited    = toN(fo.visited);
    return [
      fo.agentName || '—',
      fmtXlsTime(fo.loginTime)  || '—',
      fmtXlsTime(fo.logoutTime) || '—',
      dispatched,
      visited,
      dispatched > 0 ? Math.round(visited * 100 / dispatched) : 0,
      toN(fo.collected),
      toN(fo.amountCollected),
      toN(fo.ptpMade),
      toN(fo.nonContactable),
      toN(fo.distanceKm),
    ];
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([foHeader, ...foRows]), 'FO Attendance');

  // Sheet 3 — Case Detail (all agents flat)
  const caseHeader = [
    'Field Officer', 'Loan Number', 'Borrower Name', 'Status',
    'Started At', 'Reached At', 'Waiting Since', 'Closed At',
    'Transit (mins)', 'Waiting (mins)', 'Total Time (mins)', 'Distance (km)',
    'Outcome', 'Amount Collected (Rs)', 'Payment Mode', 'Flag',
  ];
  const caseRows: (string | number)[][] = [];
  (data.foBreakdown ?? []).forEach(fo => {
    (fo.cases ?? []).forEach(c => {
      const startedAt   = c.startedAt   ? new Date(c.startedAt).getTime()   : null;
      const reachedAt   = c.reachedAt   ? new Date(c.reachedAt).getTime()   : null;
      const waitingSince = c.waitingSince ? new Date(c.waitingSince).getTime() : null;
      const closedAt    = c.closedAt    ? new Date(c.closedAt).getTime()    : null;

      const transitMins = (startedAt != null && reachedAt != null)
        ? Math.round((reachedAt - startedAt) / 60000) : toN(c.transitMins);
      const waitingMins = (waitingSince != null && closedAt != null)
        ? Math.round((closedAt - waitingSince) / 60000) : toN(c.waitingMins);
      const totalMins   = (startedAt != null && closedAt != null)
        ? Math.round((closedAt - startedAt) / 60000) : toN(c.totalMins);

      caseRows.push([
        fo.agentName        || '—',
        c.loanNumber        || '—',
        c.borrowerName      || '—',
        labelOf(STATUS_LABELS, c.status),
        fmtXlsDateTime(c.startedAt)    || '—',
        fmtXlsDateTime(c.reachedAt)    || '—',
        fmtXlsDateTime(c.waitingSince) || '—',
        fmtXlsDateTime(c.closedAt)     || '—',
        transitMins,
        waitingMins,
        totalMins,
        toN(c.distanceKm),
        labelOf(OUTCOME_LABELS, c.outcome ?? c.status),
        toN(c.amountCollected),
        c.paymentMode ? labelOf({}, c.paymentMode) : '—',
        labelOf(FLAG_LABELS, c.flag),
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([caseHeader, ...caseRows]), 'Case Detail');

  XLSX.writeFile(wb, `MIS_${data.organizationName}_${data.date}.xlsx`);
}


export default function ReportsPage() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const [jobs,               setJobs]               = useState<ReportJobResponse[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [page,               setPage]               = useState(0);
  const [totalPages,         setTotalPages]         = useState(0);
  const [totalElements,      setTotalElements]      = useState(0);
  const [showGenerateModal,  setShowGenerateModal]  = useState(false);
  const [downloadingId,      setDownloadingId]      = useState<string | null>(null);
  const [cancellingId,       setCancellingId]       = useState<string | null>(null);
  const [actionError,        setActionError]        = useState<string | null>(null);

  const [misDate,   setMisDate]   = useState(todayStr());
  const [misData,   setMisData]   = useState<MisEodReportResponse | null>(null);
  const [misLoading, setMisLoading] = useState(false);
  const [misError,  setMisError]  = useState<string | null>(null);
  const [expandedFo, setExpandedFo] = useState<string | null>(null);

  const fetchMis = useCallback(async () => {
    if (!organizationId) return;
    setMisLoading(true); setMisError(null); setMisData(null);
    try {
      const data = await reportsApi.getMisEod(organizationId, misDate);
      setMisData(data);
    } catch {
      setMisError('Could not load MIS data');
    } finally {
      setMisLoading(false);
    }
  }, [organizationId, misDate]);

  const pollTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<number>(2000);

  const stopPolling = () => {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  };

  const fetchJobs = useCallback(async () => {
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
  }, [organizationId, page]);

  useEffect(() => {
    if (organizationId) { pollIntervalRef.current = 2000; fetchJobs(); }
    return () => stopPolling();
  }, [fetchJobs, organizationId]);

  const handleDownload = async (job: ReportJobResponse) => {
    if (downloadingId) return;
    setDownloadingId(job.id);
    try {
      const { data } = await apiClient.get(
        `/api/v1/reports/jobs/${job.id}/download`,
        { params: { orgId: organizationId }, responseType: 'blob' },
      );
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = job.fileName || `report-${job.id}.${job.exportFormat === 'PDF' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ } finally { setDownloadingId(null); }
  };

  const handleCancel = async (job: ReportJobResponse) => {
    if (cancellingId) return;
    setActionError(null); setCancellingId(job.id);
    try {
      await apiClient.delete(`/api/v1/reports/jobs/${job.id}`, { params: { orgId: organizationId } });
      fetchJobs();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to cancel report job.');
    } finally { setCancellingId(null); }
  };

  return (
    <div className="db-root">
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

      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">

          {/* ── MIS Daily Report ── */}
          <motion.div variants={fadeUp} className="ds-card db-card" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <BarChart2 size={16} style={{ color: 'var(--ink-secondary)' }} />
              <h2 className="db-card-title" style={{ fontSize: 16, margin: 0 }}>Daily MIS</h2>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="date"
                  value={misDate}
                  max={todayStr()}
                  onChange={e => { setMisDate(e.target.value); setMisData(null); }}
                  className="ds-input"
                  style={{ height: 32, fontSize: 13, width: 148 }}
                />
                <button
                  type="button"
                  onClick={fetchMis}
                  disabled={misLoading}
                  className="ds-btn is-primary"
                  style={{ height: 32 }}
                >
                  {misLoading ? <Loader2 size={13} className="ds-spin" /> : <RefreshCw size={13} />}
                  {misLoading ? 'Loading…' : 'View'}
                </button>
                {misData && (
                  <button
                    type="button"
                    onClick={() => exportMisToExcel(misData)}
                    className="ds-btn is-secondary"
                    style={{ height: 32 }}
                    title="Export to Excel"
                  >
                    <Download size={13} />
                    Export
                  </button>
                )}
              </div>
            </div>

            {misError && (
              <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'var(--danger-subtle)', borderRadius: 6 }}>
                {misError}
              </div>
            )}

            {misData && !misLoading && (
              <>
                {/* KPI strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
                  {[
                    { icon: Users,        label: 'Dispatched',    value: misData.totalDispatched,    sub: `${misData.activeAgents} agents` },
                    { icon: CheckCircle2, label: 'Completed',     value: `${misData.visitsCompleted} / ${misData.totalDispatched}`, sub: `${misData.completionRate}%` },
                    { icon: Clock,        label: 'In progress',   value: misData.visitsInProgress,   sub: `${misData.visitsAbandoned} abandoned` },
                    { icon: Banknote,     label: 'Collected',     value: fmtINR(misData.totalCollected),  sub: `${misData.collectionsCount} entries` },
                    { icon: FileText,     label: 'PTPs',          value: misData.ptpCount,           sub: fmtINR(misData.totalPromised) },
                    { icon: MapPin,       label: 'Non-contact',   value: misData.nonContactableCount, sub: `${misData.pendingApprovals} pending approvals` },
                  ].map(({ icon: Icon, label, value, sub }) => (
                    <div key={label} style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Icon size={13} style={{ color: 'var(--ink-tertiary)' }} />
                        <span style={{ fontSize: 11, color: 'var(--ink-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-secondary)', marginTop: 3 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* FO breakdown */}
                {misData.foBreakdown.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {misData.foBreakdown.map(fo => (
                      <div key={fo.agentId} style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
                        {/* FO header row */}
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-subtle)', cursor: 'pointer', flexWrap: 'wrap' }}
                          onClick={() => setExpandedFo(expandedFo === fo.agentId ? null : fo.agentId)}
                        >
                          {expandedFo === fo.agentId ? <ChevronUp size={13} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />}
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink-primary)' }}>{fo.agentName}</span>
                          {fo.loginTime && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 4 }}>
                              <LogIn size={11} /> {fmtTime(fo.loginTime)} {fo.logoutTime ? `→ ${fmtTime(fo.logoutTime)}` : '(active)'}
                            </span>
                          )}
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {[
                              { label: 'Cases', value: `${fo.visited}/${fo.dispatched}` },
                              { label: 'Collected', value: fmtINR(fo.amountCollected) },
                              { label: 'PTPs', value: fo.ptpMade },
                              { label: 'NC', value: fo.nonContactable },
                              { label: 'Km', value: `${fo.distanceKm} km` },
                            ].map(({ label, value }) => (
                              <div key={label} style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 10, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Case-level rows — always visible, collapsed by default */}
                        {expandedFo === fo.agentId && (
                          <div style={{ overflowX: 'auto' }}>
                            {fo.cases.length === 0 ? (
                              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-tertiary)' }}>No GPS-tracked sessions on this day</div>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-canvas)' }}>
                                    {['#', 'Loan / Borrower', 'Login → Start', 'Reached', 'Transit', 'Waiting', 'Total', 'Km', 'Outcome'].map(h => (
                                      <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Loan / Borrower' || h === '#' ? 'left' : 'right', fontWeight: 600, fontSize: 10.5, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {fo.cases.map((c: MisEodCaseRow, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                      <td style={{ padding: '8px 10px', color: 'var(--ink-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                                      <td style={{ padding: '8px 10px', minWidth: 160 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--ink-primary)', fontSize: 12.5 }}>{c.loanNumber ?? '—'}</div>
                                        <div style={{ color: 'var(--ink-secondary)', fontSize: 11.5 }}>{c.borrowerName ?? '—'}</div>
                                      </td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', fontSize: 12 }}>{fmtTime(c.startedAt)}</td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', fontSize: 12 }}>{fmtTime(c.reachedAt)}</td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-secondary)' }}>{fmtMins(c.transitMins)}</td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-secondary)' }}>{fmtMins(c.waitingMins)}</td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--ink-primary)' }}>{fmtMins(c.totalMins)}</td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-secondary)' }}>{c.distanceKm}</td>
                                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                        <span style={{ color: outcomeColor(c.outcome), fontWeight: 600, fontSize: 11.5 }}>
                                          {c.outcome ?? c.status}
                                        </span>
                                        {c.amountCollected != null && (
                                          <div style={{ color: 'var(--success)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{fmtINR(c.amountCollected)}</div>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {misData.foBreakdown.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-tertiary)', fontSize: 13 }}>
                    No field activity on {misDate}
                  </div>
                )}

                <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink-tertiary)', textAlign: 'right' }}>
                  Generated {new Date(misData.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </>
            )}

            {!misData && !misLoading && !misError && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-tertiary)', fontSize: 13 }}>
                Pick a date and click View to load the MIS report
              </div>
            )}
          </motion.div>

          <header className="db-card-head" style={{ marginBottom: 20, padding: 0, background: 'transparent', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 className="db-card-title" style={{ fontSize: 20 }}>Team Reports</h2>
                  {!loading && totalElements > 0 && (
                    <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                      / {totalElements.toLocaleString('en-IN')} jobs
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={() => setShowGenerateModal(true)}
                className="ds-btn is-primary"
              >
                <Plus size={14} /> Generate report
              </button>
              <button
                type="button"
                onClick={fetchJobs}
                disabled={loading}
                className="ds-btn is-secondary"
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
              </button>
            </div>
          </header>
          {/* ── Job grid ── */}
          {loading && jobs.length === 0 ? (
            <div className="db-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="db-span-3 ds-card db-card" style={{ padding: 20 }}>
                  <span className="ds-skel" style={{ width: 42, height: 42, borderRadius: 12 }} />
                  <span className="ds-skel" style={{ height: 16, width: '70%', display: 'block', marginTop: 16 }} />
                  <span className="ds-skel" style={{ height: 12, width: '50%', display: 'block', marginTop: 8 }} />
                  <span className="ds-skel" style={{ height: 24, width: 80, borderRadius: 999, display: 'block', marginTop: 16 }} />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
              <FileText size={32} className="ds-empty-icon" />
              <span className="ds-empty-title">No reports yet</span>
              <span className="ds-empty-sub">
                Generate your first report. We'll queue it and notify you when it's ready to download.
              </span>
              <button type="button" onClick={() => setShowGenerateModal(true)} className="ds-btn is-primary" style={{ marginTop: 16 }}>
                <Plus size={14} /> Generate report
              </button>
            </motion.div>
          ) : (
            <motion.div className="db-grid" variants={stagger} initial="hidden" animate="show">
              {jobs.map(job => (
                <motion.div key={job.id} variants={fadeUp} className="db-span-3 ds-card db-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                  <div className="db-att-chip" style={{ width: 42, height: 42, borderRadius: 12, marginBottom: 16, background: job.exportFormat === 'PDF' ? 'var(--danger-subtle)' : 'var(--bg-subtle)', color: job.exportFormat === 'PDF' ? 'var(--danger)' : 'var(--ink-solid)' }}>
                    {job.exportFormat === 'PDF' ? <FileIcon size={20} /> : <FileSpreadsheet size={20} />}
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)', letterSpacing: '-0.01em', textTransform: 'capitalize', lineHeight: 1.3, margin: '0 0 4px 0' }}>
                    {REPORT_LABELS[job.reportType] ?? job.reportType.replace(/_/g, ' ').toLowerCase()}
                  </h3>
                  <p className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', margin: '0 0 16px 0' }}>
                    {fmtDate(job.createdAt)}{job.fileSizeBytes ? ` · ${fmtFileSize(job.fileSizeBytes)}` : ''}
                  </p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                    <StatusPill status={job.status} />
                    {job.status === 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => handleDownload(job)}
                        disabled={downloadingId === job.id}
                        className="ds-btn is-primary"
                        style={{ height: 24, padding: '0 10px', fontSize: 11 }}
                      >
                        {downloadingId === job.id ? <Loader2 size={12} className="ds-spin" style={{ marginRight: 4 }} /> : <Download size={12} style={{ marginRight: 4 }} />}
                        {downloadingId === job.id ? 'Downloading…' : 'Download'}
                      </button>
                    )}
                    {(job.status === 'QUEUED' || job.status === 'GENERATING') && (
                      <button
                        type="button"
                        onClick={() => handleCancel(job)}
                        disabled={cancellingId === job.id}
                        className="ds-btn is-secondary"
                        style={{ height: 24, padding: '0 10px', fontSize: 11 }}
                      >
                        {cancellingId === job.id ? <Loader2 size={12} className="ds-spin" style={{ marginRight: 4 }} /> : <X size={12} style={{ marginRight: 4 }} />}
                        {cancellingId === job.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                  {job.status === 'FAILED' && job.errorMessage && (
                    <div style={{ padding: '8px 10px', background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)', borderRadius: 6, color: 'var(--danger)', fontSize: 11.5, marginTop: 12 }}>
                      {job.errorMessage}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && !loading && (
            <div className="up-pagination" style={{ borderTop: 'none', background: 'transparent', marginTop: 16 }}>
              <span className="up-page-meta">
                Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
              </span>
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="up-page-btn" aria-label="Previous page">
                  <ChevronLeft size={14} />
                </button>
                <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="up-page-btn" aria-label="Next page">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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
