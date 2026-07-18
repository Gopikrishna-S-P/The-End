import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Activity, AlertCircle, X, RefreshCw, Loader2, Lock, Building2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { kpiApi, KPI_METRICS } from '../api/kpiApi';
import { platformApi, type OrganizationSummary } from '../api/platformApi';
import type { KpiRow } from '../types';
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

// ── Formatting helpers ───────────────────────────────────────────────────────

function formatColumnLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/;

function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (typeof v === 'string') {
    if (ISO_DATE_RE.test(v)) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return v.length <= 10
          ? d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
          : d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    }
    return v;
  }
  return JSON.stringify(v);
}

export default function KpiPage() {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((r) => r.name === 'ROLE_PLATFORM_ADMIN' || r.name === 'PLATFORM_ADMIN') ?? false;

  const visibleMetrics = useMemo(
    () => KPI_METRICS.filter((m) => !m.platformOnly || isPlatformAdmin),
    [isPlatformAdmin],
  );

  const [activeKey, setActiveKey] = useState(visibleMetrics[0]?.key ?? '');
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState<string>(user?.organizationId ?? '');
  const [rows, setRows] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Platform admins have no home org — let them pick from the org list.
  useEffect(() => {
    if (!isPlatformAdmin) return;
    platformApi.listOrganizations()
      .then((list) => {
        setOrgs(list);
        setOrganizationId((prev) => prev || list[0]?.id || '');
      })
      .catch(() => setOrgs([]));
  }, [isPlatformAdmin]);

  const activeMetric = visibleMetrics.find((m) => m.key === activeKey) ?? visibleMetrics[0];

  const load = useCallback(async () => {
    if (!activeMetric || !organizationId) return;
    setLoading(true); setError(null);
    try {
      const data = await kpiApi.fetch(activeMetric.key, organizationId);
      setRows(data || []);
      setLoadedOnce(true);
    } catch (e: any) {
      setRows([]);
      const status = e?.response?.status;
      if (status === 403) setError('You do not have permission to view this metric.');
      else setError(e?.response?.data?.message || 'Failed to load KPI data.');
    } finally { setLoading(false); }
  }, [activeMetric, organizationId]);

  useEffect(() => { load(); }, [load]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="db-root">
      <AnimatePresence>
        {error && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
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

      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">

          {/* Metric tabs */}
          <motion.div variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {visibleMetrics.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setActiveKey(m.key)}
                className="ds-pill is-neutral"
                title={m.description}
                style={{
                  border: '1px solid var(--border)', cursor: 'pointer',
                  background: m.key === activeKey ? 'var(--ink-solid)' : 'var(--bg-surface)',
                  color: m.key === activeKey ? 'var(--text-on-solid)' : 'var(--ink-secondary)',
                  fontWeight: 600,
                }}
              >
                {m.platformOnly && <Lock size={10} style={{ marginRight: 5, verticalAlign: -1 }} />}
                {m.label}
              </button>
            ))}
          </motion.div>

          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="db-att-chip" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-solid)' }}>
                  <Activity size={16} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 className="db-card-title">{activeMetric?.label ?? 'KPI'}</h2>
                  <span className="db-kpi2-foot-meta">{activeMetric?.description}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                {isPlatformAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={13} style={{ color: 'var(--ink-tertiary)' }} />
                    <select
                      value={organizationId}
                      onChange={(e) => setOrganizationId(e.target.value)}
                      className="ds-select"
                      style={{ height: 32, fontSize: 12.5 }}
                      aria-label="Organization"
                    >
                      {orgs.length === 0 && <option value="">No organizations</option>}
                      {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                )}
                <button type="button" className="ds-btn is-secondary" onClick={load} disabled={loading || !organizationId} style={{ height: 32, width: 32, padding: 0 }} aria-label="Refresh" title="Refresh">
                  {loading ? <Loader2 size={14} className="ds-spin" /> : <RefreshCw size={14} />}
                </button>
              </div>
            </header>

            <div className="ds-table-wrap" style={{ border: 'none', overflowX: 'auto' }}>
              {!organizationId ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <Building2 size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No organization selected</span>
                  <span className="ds-empty-sub">Pick an organization above to load this metric.</span>
                </motion.div>
              ) : loading && !loadedOnce ? (
                <table className="ds-table">
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.1, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: '80%', display: 'block' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : rows.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <Activity size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No data for this metric yet</span>
                  <span className="ds-empty-sub">Nothing has been recorded for this organization in {activeMetric?.label}.</span>
                </motion.div>
              ) : (
                <table className="ds-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {columns.map((col, i) => (
                        <th key={col} className={typeof rows[0][col] === 'number' ? 'is-right' : undefined} style={{ padding: '12px 16px', paddingLeft: i === 0 ? 24 : undefined }}>
                          {formatColumnLabel(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {rows.map((row, idx) => (
                        <motion.tr
                          key={idx}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.24, delay: Math.min(idx, 20) * 0.015 }}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          {columns.map((col, i) => (
                            <td
                              key={col}
                              className={typeof row[col] === 'number' ? 'is-right' : undefined}
                              style={{
                                padding: '12px 16px', paddingLeft: i === 0 ? 24 : undefined,
                                fontFamily: typeof row[col] === 'number' ? 'var(--font-mono)' : undefined,
                                color: i === 0 ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                                fontWeight: i === 0 ? 500 : 400,
                              }}
                            >
                              {formatCellValue(row[col])}
                            </td>
                          ))}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
