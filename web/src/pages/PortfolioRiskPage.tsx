import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { npaApi, type RiskReportResponse, type RiskRecordResponse } from '../api/npaApi';
import type { NpaRiskLevel } from '../types';
import {
  ShieldAlert, AlertCircle, ChevronLeft, ChevronRight, RefreshCw,
  CheckCircle2, X, Loader2, TrendingUp, Wallet, Percent, ListFilter,
} from 'lucide-react';
import './Dashboard.css';

// This screen deliberately never prints the word "NPA" anywhere in its copy —
// see web/docs/design-dna.md: "every loan is already an NPA; never surface the
// term." The wire fields underneath (npaApi.ts) keep the DTO's real names.

const PAGE_SIZE = 20;

const READER_ROLES = ['PLATFORM_ADMIN', 'ORG_ADMIN', 'MANAGER', 'TL'];
const ADMIN_ROLES = ['PLATFORM_ADMIN', 'ORG_ADMIN'];

const RISK_LEVELS: NpaRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const RISK_PILL: Record<NpaRiskLevel, string> = {
  LOW: 'is-neutral', MEDIUM: 'is-warn', HIGH: 'is-danger', CRITICAL: 'is-danger',
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } };
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } } };

const fmtINR = (v?: number | null) => `₹${(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNum = (v?: number | null) => (v ?? 0).toLocaleString('en-IN');
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function PortfolioRiskPage() {
  const { user } = useAuth();
  const { hasAnyRole } = usePermissions();
  const orgId = user?.organizationId ?? '';
  const canView = hasAnyRole(...READER_ROLES);
  const canFlag = hasAnyRole(...ADMIN_ROLES);

  const [date, setDate] = useState(todayStr());
  const [report, setReport] = useState<RiskReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const [riskFilter, setRiskFilter] = useState<NpaRiskLevel | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [records, setRecords] = useState<RiskRecordResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const [showSweep, setShowSweep] = useState(false);
  const [thresholdDays, setThresholdDays] = useState(90);
  const [sweeping, setSweeping] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!orgId || !canView) { setReportLoading(false); return; }
    setReportLoading(true); setReportError(null);
    try {
      const data = await npaApi.getReport(orgId, date);
      setReport(data);
    } catch {
      setReportError('Could not load the risk summary for this date.');
    } finally { setReportLoading(false); }
  }, [orgId, date, canView]);

  const loadRecords = useCallback(async () => {
    if (!orgId || !canView) { setRecordsLoading(false); return; }
    setRecordsLoading(true);
    try {
      const resp = await npaApi.getRecords(orgId, riskFilter === 'ALL' ? undefined : riskFilter, page, PAGE_SIZE);
      setRecords(resp.content ?? []);
      setTotalPages(resp.totalPages ?? 0);
      setTotalElements(resp.totalElements ?? 0);
    } catch { /* keep prior page rendered, page-level list is non-critical */ }
    finally { setRecordsLoading(false); }
  }, [orgId, riskFilter, page, canView]);

  useEffect(() => { loadReport(); }, [loadReport]);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleResolve = async (id: string) => {
    setResolvingId(id); setActionError(null);
    try {
      await npaApi.resolve(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      setTotalElements(n => Math.max(0, n - 1));
    } catch {
      setActionError('Failed to resolve this record.');
    } finally { setResolvingId(null); }
  };

  const handleSweep = async () => {
    if (!orgId) return;
    setSweeping(true); setActionError(null);
    try {
      const data = await npaApi.flag({ organizationId: orgId, overdueThresholdDays: thresholdDays });
      setReport(data);
      setShowSweep(false);
      setPage(0);
      loadRecords();
    } catch {
      setActionError('Failed to re-run the risk sweep.');
    } finally { setSweeping(false); }
  };

  if (!canView) {
    return (
      <div className="db-root">
        <div className="db-content">
          <div className="ds-empty" style={{ padding: '80px 0' }}>
            <ShieldAlert size={32} className="ds-empty-icon" />
            <span className="ds-empty-title">Restricted to team leads and above</span>
            <span className="ds-empty-sub">Portfolio risk is visible to Team Leads, Managers, and Org Admins.</span>
          </div>
        </div>
      </div>
    );
  }

  const counts = report?.countByRiskLevel ?? {};
  const amounts = report?.amountByRiskLevel ?? {};

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence>
        {actionError && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body"><span className="db-error-title">{actionError}</span></div>
            <button className="db-error-retry" onClick={() => setActionError(null)} aria-label="Dismiss"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

          <div className="db-kpi-header">
            <h2 className="db-kpi-title">Portfolio Risk</h2>
            <div className="db-kpi-toggle" style={{ border: 'none', background: 'transparent', padding: 0, gap: 12 }}>
              <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)}
                className="ds-input" style={{ height: 32, fontSize: 13, width: 148 }} />
              <button type="button" onClick={loadReport} disabled={reportLoading} className="ds-btn is-secondary" style={{ height: 32 }} title="Refresh">
                <RefreshCw size={13} className={reportLoading ? 'ds-spin' : ''} />
              </button>
              {canFlag && (
                <button type="button" onClick={() => setShowSweep(v => !v)} className="ds-btn is-primary" style={{ height: 32 }}>
                  <ShieldAlert size={13} /> Re-run sweep
                </button>
              )}
            </div>
          </div>

          {showSweep && canFlag && (
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="ds-card db-card"
              style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <div className="ds-field">
                <label className="ds-label" style={{ marginBottom: 6, display: 'block' }}>Overdue threshold (days)</label>
                <input type="number" min={1} value={thresholdDays} onChange={e => setThresholdDays(Number(e.target.value) || 0)}
                  className="ds-input" style={{ width: 140 }} />
              </div>
              <span className="db-kpi2-foot-meta" style={{ maxWidth: 360 }}>
                Re-flags every case overdue past this many days as of today, across the whole organization.
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowSweep(false)} className="ds-btn is-secondary" style={{ height: 34 }}>Cancel</button>
                <button type="button" onClick={handleSweep} disabled={sweeping || thresholdDays <= 0} className="ds-btn is-primary" style={{ height: 34 }}>
                  {sweeping ? <Loader2 size={14} className="ds-spin" /> : <ShieldAlert size={14} />}
                  {sweeping ? 'Running…' : 'Run sweep'}
                </button>
              </div>
            </motion.div>
          )}

          {reportError && (
            <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'var(--danger-subtle)', borderRadius: 6, marginBottom: 16 }}>
              {reportError}
            </div>
          )}

          {/* ── KPI Band ── */}
          <motion.div variants={fadeUp} className="db-kpi-band">
            <div className="db-kpi2-card">
              <div className="db-kpi2-top"><span className="db-kpi2-label">Flagged cases</span><span className="db-kpi2-icon"><ShieldAlert size={14} /></span></div>
              <span className="db-kpi2-value">{reportLoading ? '—' : fmtNum(report?.totalNpaCount)}</span>
              <div className="db-kpi2-sub"><span className="db-kpi2-sub-meta">As of {fmtDate(report?.reportDate ?? date)}</span></div>
            </div>
            <div className="db-kpi2-card is-accent">
              <div className="db-kpi2-top"><span className="db-kpi2-label">Amount at risk</span><span className="db-kpi2-icon"><Wallet size={14} /></span></div>
              <span className="db-kpi2-value">{reportLoading ? '—' : fmtINR(report?.totalNpaAmount)}</span>
              <div className="db-kpi2-sub"><span className="db-kpi2-sub-meta">Outstanding on flagged cases</span></div>
            </div>
            <div className="db-kpi2-card">
              <div className="db-kpi2-top"><span className="db-kpi2-label">Risk ratio</span><span className="db-kpi2-icon"><Percent size={14} /></span></div>
              <span className="db-kpi2-value">{reportLoading ? '—' : `${Number(report?.npaRatioPct ?? 0).toFixed(1)}%`}</span>
              <div className="db-kpi2-sub"><span className="db-kpi2-sub-meta">Of the active book</span></div>
            </div>
            <div className="db-kpi2-card">
              <div className="db-kpi2-top"><span className="db-kpi2-label">Critical</span><span className="db-kpi2-icon"><TrendingUp size={14} /></span></div>
              <span className="db-kpi2-value">{reportLoading ? '—' : fmtNum(counts.CRITICAL ?? 0)}</span>
              <div className="db-kpi2-sub"><span className="db-kpi2-sub-meta">{fmtINR(amounts.CRITICAL ?? 0)} outstanding</span></div>
            </div>
          </motion.div>

          {/* ── Records table ── */}
          <div className="db-grid" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="db-span-12" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <motion.section variants={fadeUp} className="ds-card is-overflow-hidden db-card" style={{ display: 'flex', flexDirection: 'column', ...(records.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
                <header className="db-card-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <ListFilter size={13} style={{ color: 'var(--ink-tertiary)' }} />
                    <button type="button" onClick={() => { setRiskFilter('ALL'); setPage(0); }}
                      className={`ds-btn is-sm ${riskFilter === 'ALL' ? 'is-primary' : 'is-secondary'}`}>
                      All
                    </button>
                    {RISK_LEVELS.map(lvl => (
                      <button key={lvl} type="button" onClick={() => { setRiskFilter(lvl); setPage(0); }}
                        className={`ds-btn is-sm ${riskFilter === lvl ? 'is-primary' : 'is-secondary'}`}>
                        {lvl}<span className={`ds-pill ${RISK_PILL[lvl]}`} style={{ marginLeft: 6 }}>{fmtNum(counts[lvl] ?? 0)}</span>
                      </button>
                    ))}
                  </div>
                  {totalPages > 1 && !recordsLoading && (
                    <div className="up-pagination" style={{ margin: 0 }}>
                      <button type="button" className="up-page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                        <ChevronLeft size={14} />
                      </button>
                      <span className="up-page-meta">Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong></span>
                      <button type="button" className="up-page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </header>

                <div className="ds-table-wrap" style={{ border: 'none', borderRadius: 0, flex: 1, overflow: 'auto' }}>
                  <table className="ds-table">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Loan / Borrower</th>
                        <th style={{ padding: '12px 16px' }}>Risk</th>
                        <th className="is-right" style={{ padding: '12px 16px' }}>Overdue days</th>
                        <th className="is-right" style={{ padding: '12px 16px' }}>Outstanding</th>
                        <th style={{ padding: '12px 16px' }}>Last payment</th>
                        <th style={{ padding: '12px 16px', paddingRight: 24 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {recordsLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} style={{ opacity: 1 - i * 0.12, borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: '60%' }} /></td>
                            <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 60 }} /></td>
                            <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 40, marginLeft: 'auto' }} /></td>
                            <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 70, marginLeft: 'auto' }} /></td>
                            <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: 70 }} /></td>
                            <td style={{ padding: '12px 16px', paddingRight: 24 }} />
                          </tr>
                        ))
                      ) : records.length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                              <ShieldAlert size={32} className="ds-empty-icon" />
                              <span className="ds-empty-title">No flagged cases</span>
                              <span className="ds-empty-sub">Nothing overdue past the risk threshold right now.</span>
                            </motion.div>
                          </td>
                        </tr>
                      ) : (
                        records.map((r, i) => (
                          <motion.tr key={r.allocationId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.24, delay: i * 0.02 }} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', paddingLeft: 24 }}>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>{r.loanNumber ?? '—'}</div>
                              <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{r.borrowerName ?? '—'}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}><span className={`ds-pill ${RISK_PILL[r.riskLevel]}`}>{r.riskLevel}</span></td>
                            <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink-primary)' }}>{r.overdueDays}d</td>
                            <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>{fmtINR(r.outstandingAmount)}</td>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ink-secondary)' }}>{fmtDate(r.lastPaymentDate)}</td>
                            <td style={{ padding: '12px 16px', paddingRight: 24, textAlign: 'right' }}>
                              <button type="button" onClick={() => handleResolve(r.id)} disabled={resolvingId === r.id}
                                className="ds-btn is-secondary is-sm">
                                {resolvingId === r.id ? <Loader2 size={12} className="ds-spin" /> : <CheckCircle2 size={12} />}
                                Resolve
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
