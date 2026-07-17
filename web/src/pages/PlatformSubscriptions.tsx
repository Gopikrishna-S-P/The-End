import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Building2, CreditCard, CheckCircle, AlertCircle,
  ArrowUpRight, RefreshCw, Download, ExternalLink, X,
  Clock, TrendingDown,
} from 'lucide-react';
import { platformApi, type PlatformSubRow, type InvoiceRow } from '../api/platformApi';
import { featureFlagsApi, type FeatureFlag } from '../api/featureFlagsApi';
import './Dashboard.css';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const fire = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const span = document.createElement('span');
    span.className = 'db-ripple';
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }, []);
  return { ref, fire };
}

function fmtNum(v?: number | null) {
  return v != null ? v.toLocaleString('en-IN') : '—';
}

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmount(paise: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(paise / 100);
}

// ── KPI card ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, subtitle, icon: Icon, onClick }: {
  label: string; value: string; subtitle?: string;
  icon: React.ElementType; onClick?: () => void;
}) {
  const { ref, fire } = useRipple<HTMLButtonElement>();
  return (
    <motion.button ref={ref} type="button" variants={fadeUp}
      className={`ds-card${onClick ? ' is-hoverable' : ''} db-kpi-card`}
      onClick={e => { fire(e); onClick?.(); }} disabled={!onClick}
      whileHover={{ scale: 1.025, zIndex: 2, boxShadow: '0 4px 12px rgba(12,10,9,.10), 0 2px 4px rgba(12,10,9,.06)' }}
      whileTap={{ scale: 1.010, zIndex: 2 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <div className="db-kpi-top">
        <span className="db-kpi-label">{label}</span>
        <span className="db-kpi-icon-box" aria-hidden="true"><Icon size={14} /></span>
      </div>
      <span className="db-kpi-value">{value}</span>
      {subtitle && <div className="db-kpi-meta"><span className="db-kpi-subtitle">{subtitle}</span></div>}
    </motion.button>
  );
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  ACTIVE:    'is-success',
  TRIAL:     'is-info',
  PAST_DUE:  'is-warn',
  CANCELLED: 'is-error',
  INACTIVE:  'is-neutral',
};

const PLAN_LABEL: Record<string, string> = {
  NONE: '—', STARTER: 'Starter', GROWTH: 'Growth', ENTERPRISE: 'Enterprise',
};

// ── Subscriber attention row ───────────────────────────────────────────────────

function SubRow({ row, last, onInvoices, onOpenDrawer, onChangePlan, changingPlan }: {
  row: PlatformSubRow; last?: boolean; onInvoices: () => void;
  onOpenDrawer: (row: PlatformSubRow) => void;
  onChangePlan: (orgId: string, plan: string) => void;
  changingPlan: string | null;
}) {
  const pillCls = STATUS_PILL[row.status] ?? 'is-neutral';
  const dateLabel = row.status === 'TRIAL'
    ? (row.trialDaysLeft > 0 ? `Trial · ${row.trialDaysLeft}d left` : `Trial expired`)
    : fmt(row.currentPeriodEnd);

  return (
    <motion.div variants={fadeUp}
      className={`db-att-row${last ? '' : ' has-border'}`}
      style={{ cursor: 'default' }}
    >
      <span className="db-att-chip">
        <Building2 size={15} aria-hidden="true" />
      </span>
      <span className="db-att-label" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span
          style={{ fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline dotted' }}
          onClick={() => onOpenDrawer(row)}
        >
          {row.orgName}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ink-tertiary)', fontFamily: 'var(--mono)' }}>
          {row.orgCode} · {PLAN_LABEL[row.plan]}
        </span>
      </span>
      <span className="db-att-right" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-tertiary)', fontFamily: 'var(--mono)' }}>{dateLabel}</span>
        <span className={`ds-pill ${pillCls}`} style={{ fontSize: 10 }}>{row.status.replace('_', ' ')}</span>
        <select
          value={row.plan}
          disabled={changingPlan === row.orgId}
          onChange={e => onChangePlan(row.orgId, e.target.value)}
          style={{
            fontSize: '12px', padding: '3px 8px', borderRadius: '6px',
            background: 'var(--surface, #1a1a1a)', border: '1px solid var(--border, #2a2a2a)',
            color: 'inherit', cursor: 'pointer'
          }}
        >
          {(['NONE', 'STARTER', 'GROWTH', 'ENTERPRISE'] as const).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button
          type="button"
          className="ds-btn is-ghost"
          style={{ padding: '4px 10px', fontSize: 11, height: 'auto' }}
          onClick={onInvoices}
          disabled={!row.stripeCustomerId}
          title={row.stripeCustomerId ? 'View invoices' : 'No Stripe customer'}
        >
          Invoices
        </button>
      </span>
    </motion.div>
  );
}

// ── Invoice modal ──────────────────────────────────────────────────────────────

function InvoiceModal({ orgName, orgId, onClose }: {
  orgName: string; orgId: string; onClose: () => void;
}) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    platformApi.listInvoices(orgId)
      .then(setInvoices)
      .catch(e => setError(e?.response?.data?.message || 'Failed to load invoices'))
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <div
      style={{ position:'fixed', inset:0, background:'var(--shadow-overlay-scrim)', zIndex:1000,
               display:'flex', alignItems:'center', justifyContent:'center',
               padding:20, backdropFilter:'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="ds-card"
        style={{ width: 520, maxWidth: '100%', maxHeight: '80vh', display:'flex', flexDirection:'column', padding: 0, overflow:'hidden' }}
      >
        {/* header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                      padding:'18px 20px 14px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--ink-primary)' }}>Invoices</div>
            <div style={{ fontSize:12, color:'var(--ink-tertiary)', marginTop:2 }}>{orgName}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-btn is-ghost"
            style={{ padding:4, height:'auto', color:'var(--ink-tertiary)' }}>
            <X size={15} />
          </button>
        </div>

        {/* body */}
        <div style={{ overflowY:'auto', padding:'8px 20px 16px', flex:1 }}>
          {loading && (
            <div style={{ textAlign:'center', padding:32, fontSize:13, color:'var(--ink-tertiary)' }}>Loading…</div>
          )}
          {error && (
            <div style={{ textAlign:'center', padding:32, fontSize:13, color:'var(--error)' }}>{error}</div>
          )}
          {!loading && !error && invoices.length === 0 && (
            <div style={{ textAlign:'center', padding:32, fontSize:13, color:'var(--ink-tertiary)' }}>
              No invoices yet — org may not have a paid subscription.
            </div>
          )}
          {invoices.map((inv, i) => (
            <div key={inv.id}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                       padding:'10px 0', borderBottom: i < invoices.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--ink-primary)', fontFamily:'var(--mono)' }}>
                  {inv.number || inv.id.slice(0, 14)}
                </span>
                <span style={{ fontSize:11, color:'var(--ink-tertiary)' }}>{fmt(inv.date)}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:'var(--ink-primary)' }}>
                  {fmtAmount(inv.amountPaid, inv.currency)}
                </span>
                <span className={`ds-pill ${STATUS_PILL[inv.status?.toUpperCase()] ?? 'is-neutral'}`} style={{ fontSize:10 }}>
                  {inv.status}
                </span>
                {inv.pdfUrl && (
                  <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="ds-btn is-ghost"
                    style={{ padding:'4px 6px', height:'auto', textDecoration:'none', display:'flex' }} title="Download PDF">
                    <Download size={13} />
                  </a>
                )}
                {inv.hostedUrl && (
                  <a href={inv.hostedUrl} target="_blank" rel="noreferrer" className="ds-btn is-ghost"
                    style={{ padding:'4px 6px', height:'auto', textDecoration:'none', display:'flex' }} title="View on Stripe">
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ w, h, r = 6 }: { w?: string; h: number; r?: number }) {
  return <span className="ds-skel" style={{ width: w ?? '100%', height: h, borderRadius: r }} />;
}

function BillingSkeleton() {
  return (
    <motion.div className="db-skeleton" variants={stagger} initial="hidden" animate="show" role="status">
      <div className="db-kpi-grid">
        {[0,1,2,3].map(i => (
          <motion.div key={i} variants={fadeUp} className="ds-card db-kpi-card">
            <Skeleton w="60%" h={11} /><Skeleton w="75%" h={22} /><Skeleton w="45%" h={10} />
          </motion.div>
        ))}
      </div>
      <Skeleton w="130px" h={10} r={4} />
      <div className="ds-card db-att-card">
        {[0,1,2,3,4].map(i => (
          <motion.div key={i} variants={fadeUp} className="db-att-row has-border">
            <Skeleton w="34px" h={34} r={8} /><Skeleton w="55%" h={13} /><Skeleton w="120px" h={22} r={10} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Platform Billing page ──────────────────────────────────────────────────────

export default function PlatformSubscriptions() {
  const navigate = useNavigate();
  const [rows, setRows]           = useState<PlatformSubRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter]       = useState<string>('ALL');
  const [invoiceOrg, setInvoiceOrg] = useState<PlatformSubRow | null>(null);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [drawerOrg, setDrawerOrg] = useState<PlatformSubRow | null>(null);
  const [drawerFlags, setDrawerFlags] = useState<FeatureFlag[]>([]);
  const [drawerFlagsLoading, setDrawerFlagsLoading] = useState(false);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await platformApi.listSubscriptions();
      if (aliveRef.current) setRows(r);
    } catch {
      if (aliveRef.current) setLoadError(true);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => { aliveRef.current = false; };
  }, [load]);

  const handleChangePlan = async (orgId: string, plan: string) => {
    setChangingPlan(orgId);
    try {
      await platformApi.changePlan(orgId, plan);
      await load();
    } finally {
      setChangingPlan(null);
    }
  };

  const openDrawer = async (row: PlatformSubRow) => {
    setDrawerOrg(row);
    setDrawerFlagsLoading(true);
    try {
      const flags = await featureFlagsApi.list(row.orgId);
      setDrawerFlags(flags);
    } finally {
      setDrawerFlagsLoading(false);
    }
  };

  const handleToggleFlag = async (orgId: string, flagKey: string, enabled: boolean) => {
    await featureFlagsApi.setOverride(orgId, flagKey, enabled);
    setDrawerFlags(await featureFlagsApi.list(orgId));
  };

  const handleResetFlag = async (orgId: string, flagKey: string) => {
    await featureFlagsApi.deleteOverride(orgId, flagKey);
    setDrawerFlags(await featureFlagsApi.list(orgId));
  };

  const counts = {
    total:    rows.length,
    active:   rows.filter(r => r.status === 'ACTIVE').length,
    trial:    rows.filter(r => r.status === 'TRIAL').length,
    pastDue:  rows.filter(r => r.status === 'PAST_DUE').length,
    cancelled:rows.filter(r => r.status === 'CANCELLED').length,
  };

  const visible = filter === 'ALL' ? rows : rows.filter(r => r.status === filter);

  const hasAttention = counts.pastDue > 0 || counts.cancelled > 0;

  return (
    <div className="db-root">
      {loadError && (
        <div className="db-error-banner" role="alert">
          <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
          <div className="db-error-body">
            <span className="db-error-title">Billing data could not be loaded.</span>
            <span className="db-error-sub">Check your connection or try refreshing.</span>
          </div>
          <button className="db-error-retry" onClick={load} aria-label="Retry">
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="db-content">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skel" exit={{ opacity: 0 }}><BillingSkeleton /></motion.div>
          ) : (
            <motion.div key="data" variants={stagger} initial="hidden" animate="show" className="db-inner">

              {/* ── KPI row ── */}
              <p className="ds-section-label db-section-label">Billing overview</p>
              <motion.div className="db-kpi-grid" variants={stagger}>
                <KpiCard label="Total orgs"    value={fmtNum(counts.total)}
                  subtitle="all subscriptions" icon={Building2} />
                <KpiCard label="Active"        value={fmtNum(counts.active)}
                  subtitle="paid subscribers" icon={CheckCircle} />
                <KpiCard label="On trial"      value={fmtNum(counts.trial)}
                  subtitle="14-day trial" icon={Clock} />
                <KpiCard label="Past due"      value={fmtNum(counts.pastDue)}
                  subtitle={counts.cancelled > 0 ? `${counts.cancelled} cancelled` : undefined}
                  icon={TrendingDown} onClick={counts.pastDue > 0 ? () => setFilter('PAST_DUE') : undefined} />
              </motion.div>

              {/* ── Needs attention ── */}
              {hasAttention && (
                <>
                  <p className="ds-section-label db-section-label">Needs attention</p>
                  <div className="ds-card db-att-card">
                    <motion.div variants={stagger} initial="hidden" animate="show">
                      {counts.pastDue > 0 && (
                        <motion.button variants={fadeUp} type="button"
                          className="db-att-row has-border is-urgent"
                          onClick={() => setFilter('PAST_DUE')}
                          whileHover={{ scale: 1.025, zIndex: 2 }} whileTap={{ scale: 1.010, zIndex: 2 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                        >
                          <span className="db-att-chip is-urgent"><CreditCard size={15} /></span>
                          <span className="db-att-label">Past due payments</span>
                          <span className="db-att-right">
                            <span className="ds-pill is-error">{counts.pastDue}</span>
                          </span>
                          <ArrowUpRight size={14} className="db-att-arrow" />
                        </motion.button>
                      )}
                      {counts.cancelled > 0 && (
                        <motion.button variants={fadeUp} type="button"
                          className="db-att-row is-warn"
                          onClick={() => setFilter('CANCELLED')}
                          whileHover={{ scale: 1.025, zIndex: 2 }} whileTap={{ scale: 1.010, zIndex: 2 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                        >
                          <span className="db-att-chip is-warn"><Building2 size={15} /></span>
                          <span className="db-att-label">Cancelled subscriptions</span>
                          <span className="db-att-right">
                            <span className="ds-pill is-warn">{counts.cancelled}</span>
                          </span>
                          <ArrowUpRight size={14} className="db-att-arrow" />
                        </motion.button>
                      )}
                    </motion.div>
                  </div>
                </>
              )}

              {/* ── Subscriber list ── */}
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
                <p className="ds-section-label db-section-label">Subscribers</p>
                <div style={{ display:'flex', gap:6 }}>
                  {['ALL','ACTIVE','TRIAL','PAST_DUE','CANCELLED'].map(f => (
                    <button key={f} type="button"
                      className={`ds-btn ${filter === f ? 'is-primary' : 'is-ghost'}`}
                      style={{ padding:'3px 10px', fontSize:10, height:'auto', letterSpacing:'0.05em', textTransform:'uppercase' }}
                      onClick={() => setFilter(f)}
                    >
                      {f.replace('_',' ')}
                    </button>
                  ))}
                </div>
              </div>

              {visible.length === 0 ? (
                <motion.div variants={fadeIn} className="ds-card" style={{ padding:32, textAlign:'center' }}>
                  <span style={{ fontSize:13, color:'var(--ink-tertiary)' }}>No subscribers match this filter.</span>
                </motion.div>
              ) : (
                <div className="ds-card db-att-card">
                  <motion.div variants={stagger} initial="hidden" animate="show">
                    {visible.map((row, i) => (
                      <SubRow key={row.orgId} row={row} last={i === visible.length - 1}
                        onInvoices={() => setInvoiceOrg(row)}
                        onOpenDrawer={openDrawer}
                        onChangePlan={handleChangePlan}
                        changingPlan={changingPlan}
                      />
                    ))}
                  </motion.div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {invoiceOrg && (
          <InvoiceModal
            key={invoiceOrg.orgId}
            orgId={invoiceOrg.orgId}
            orgName={invoiceOrg.orgName}
            onClose={() => setInvoiceOrg(null)}
          />
        )}
      </AnimatePresence>

      {drawerOrg && (
        <>
          <div onClick={() => setDrawerOrg(null)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: '360px',
            background: 'var(--surface-2, #141414)', borderLeft: '1px solid var(--border, #2a2a2a)',
            padding: '24px', overflowY: 'auto', zIndex: 100,
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{drawerOrg.orgName}</h3>
              <button
                onClick={() => setDrawerOrg(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px', padding: '4px' }}
              >✕</button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Feature Flags
            </div>
            {drawerFlagsLoading ? (
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {['LUCIEN_AI', 'ADVANCED_REPORTS', 'CUSTOM_INTEGRATIONS'].map(key => {
                  const flag = drawerFlags.find(f => f.flagKey === key);
                  return (
                    <div key={key} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                      alignItems: 'center', gap: '10px',
                      padding: '10px 0', borderBottom: '1px solid var(--border, #2a2a2a)'
                    }}>
                      <span style={{ fontSize: '12px' }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{
                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                        background: flag?.source === 'MANUAL' ? 'color-mix(in srgb, var(--warning) 12%, transparent)' : 'var(--bg-hover)',
                        color: flag?.source === 'MANUAL' ? 'var(--warning)' : 'var(--ink-tertiary)',
                      }}>
                        {flag?.source ?? 'PLAN'}
                      </span>
                      <input
                        type="checkbox"
                        checked={flag?.enabled ?? false}
                        onChange={e => handleToggleFlag(drawerOrg.orgId, key, e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      {flag?.source === 'MANUAL' ? (
                        <button
                          onClick={() => handleResetFlag(drawerOrg.orgId, key)}
                          style={{ fontSize: '10px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >Reset</button>
                      ) : <span />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
