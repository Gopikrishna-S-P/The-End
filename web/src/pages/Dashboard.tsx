import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  CheckCircle, ArrowUpRight, ArrowUp, ArrowDown, Minus,
  ClipboardCheck, Handshake, UserPlus, Route, Navigation,
  AlertCircle, RefreshCw, Banknote, Users2, Briefcase, Activity,
  Building2, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { dashboardApi } from '../api/dashboardApi';
import type {
  OrgOverviewSection, OrgTodaySection, PlatformAdminSection,
  CollectionsSection, AllocationsSection, TeamSection,
  PtpSummarySection, CallerSection, UnifiedDashboardData,
  TrendPoint, DashboardRole,
} from '../api/dashboardApi';
import type { FieldAgentSection } from '../types';
import axiosInstance from '../api/axiosInstance';

const FIELD_ROLES = new Set<DashboardRole>(['FO', 'CALLER']);

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
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target) return;
    let start: number | null = null;
    const frame = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + eased * (target - from)));
      if (p < 1) requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtINR(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}

function fmtNum(v?: number | null) {
  return v != null ? v.toLocaleString('en-IN') : '—';
}

// ── Series helpers ──────────────────────────────────────────────────────────────

const ascByMonth = (pts: TrendPoint[]) =>
  [...pts].sort((a, b) => (a.year - b.year) || (a.month - b.month));



// ── Donut chart ───────────────────────────────────────────────────────────────

interface ChartSlice { label: string; value: number; color: string }

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function DonutChart({ slices, size = 132, thickness = 18, centerLabel = 'TOTAL' }: {
  slices: ChartSlice[]; size?: number; thickness?: number; centerLabel?: string;
}) {
  const sw = thickness; const r = (size - sw) / 2; const cx = size / 2; const cy = size / 2;
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} className="db-donut">
        <circle cx={cx} cy={cy} r={r} stroke="#D0D5DD" strokeWidth={sw} fill="none" />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="13">—</text>
      </svg>
    );
  }
  let angle = -90;
  const arcs: { d: string; color: string }[] = [];
  for (const slice of slices) {
    if (slice.value <= 0) continue;
    const sweep = (slice.value / total) * 359.9;
    const end = angle + sweep;
    const s = polar(cx, cy, r, angle);
    const e = polar(cx, cy, r, end);
    const large = sweep > 180 ? 1 : 0;
    arcs.push({ d: `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`, color: slice.color });
    angle = end;
  }
  return (
    <svg width={size} height={size} className="db-donut">
      <circle cx={cx} cy={cy} r={r} stroke="#D0D5DD" strokeWidth={sw} fill="none" />
      {arcs.map((a, i) => (
        <motion.path key={i} d={a.d} stroke={a.color} strokeWidth={sw} fill="none" strokeLinecap="butt"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.65, delay: i * 0.12 + 0.15, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
      <text x={cx} y={cy - 3} textAnchor="middle" fill="var(--ink-primary)" fontSize="22" fontWeight="700">{total.toLocaleString('en-IN')}</text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="10" style={{ fontFamily: 'var(--font-mono)' }} letterSpacing="0.06em">{centerLabel}</text>
    </svg>
  );
}

// ── Vertical bar chart (real monthly collections) ──────────────────────────────

function BarChart({ data, height = 168 }: { data: TrendPoint[]; height?: number }) {
  const max = Math.max(1, ...data.map(d => d.totalAmount ?? 0));
  return (
    <div className="db-bars" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(2, ((d.totalAmount ?? 0) / max) * 100);
        const isPeak = (d.totalAmount ?? 0) === max && max > 1;
        return (
          <div key={`${d.year}-${d.month}-${i}`} className="db-bar-col" title={`${d.label}: ${fmtINR(d.totalAmount ?? 0)}`}>
            <span className="db-bar-cap">{fmtINR(d.totalAmount ?? 0)}</span>
            <div className="db-bar-track">
              <motion.div className={`db-bar-fill${isPeak ? ' is-peak' : ''}`}
                initial={{ height: 0 }} animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: i * 0.045, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <span className="db-bar-label">{d.label?.slice(0, 3) ?? ''}</span>
          </div>
        );
      })}
    </div>
  );
}

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

// ── Horizontal bars (top agents / case age) ─────────────────────────────────────

function HBarList({ rows, ranked, thickness = 12 }: {
  rows: { label: string; value: number; display: string; color?: string }[];
  ranked?: boolean;
  thickness?: number;
}) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div className="db-hbars">
      {rows.map((r, i) => (
        <div key={i} className="db-hbar-row">
          {ranked && <span className="db-hbar-rank">{i + 1}</span>}
          <div className="db-hbar-main">
            <div className="db-hbar-head">
              <span className="db-hbar-label">{r.label}</span>
              <span className="db-hbar-val">{r.display}</span>
            </div>
            <div className="db-hbar-track" style={{ height: thickness, borderRadius: 999 }}>
              <motion.div className="db-hbar-fill" style={{ background: r.color ?? 'var(--ink-solid)', borderRadius: 999 }}
                initial={{ width: 0 }}
                animate={{ width: `${(r.value / max) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Attention row ─────────────────────────────────────────────────────────────

function AttentionRow({ icon: Icon, label, count, meta, tone, last, onClick }: {
  icon: React.ElementType; label: string; count: number; meta?: string;
  tone: 'urgent' | 'warn'; last?: boolean; onClick: () => void;
}) {
  const active = count > 0;
  return (
    <motion.button variants={fadeUp} type="button"
      className={`db-att-row${last ? '' : ' has-border'}${active ? ` is-${tone}` : ''}`}
      onClick={onClick}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <span className={`db-att-chip${active ? ` is-${tone}` : ''}`}>
        <Icon size={15} aria-hidden="true" />
      </span>
      <span className="db-att-label">{label}</span>
      <span className="db-att-right">
        {active
          ? <span className={`ds-pill is-${tone === 'urgent' ? 'error' : 'warn'}`}>{count}</span>
          : <span className="db-att-zero">0</span>
        }
        {meta && <span className="db-att-meta">{meta}</span>}
      </span>
      <ArrowUpRight size={14} className="db-att-arrow" aria-hidden="true" />
    </motion.button>
  );
}

function AllClearRow() {
  return (
    <div className="db-att-row is-all-clear">
      <span className="db-att-chip is-clear"><CheckCircle size={15} aria-hidden="true" /></span>
      <span className="db-att-label">All clear — nothing needs attention</span>
    </div>
  );
}

// ── Card shell ──────────────────────────────────────────────────────────────────

function Card({ title, action, children, className = '' }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.section variants={fadeUp} className={`ds-card db-card ${className}`}>
      <header className="db-card-head">
        <h2 className="db-card-title">{title}</h2>
        {action}
      </header>
      {children}
    </motion.section>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ w, h, r = 6 }: { w?: string; h: number; r?: number }) {
  return <span className="ds-skel" style={{ width: w ?? '100%', height: h, borderRadius: r }} />;
}

function DashboardSkeleton({ role }: { role: string }) {
  const isOrg = ['ORG_ADMIN', 'MANAGER', 'TL', ''].includes(role);
  return (
    <motion.div className="db-skeleton" variants={stagger} initial="hidden" animate="show"
      aria-label="Loading dashboard" role="status"
    >
      {isOrg ? (
        <>
          <div className="db-kpi-band">
            {[0,1,2,3].map(i => (
              <motion.div key={i} variants={fadeUp} className="ds-card db-kpi2-card">
                <Skeleton w="55%" h={11} /><Skeleton w="70%" h={24} /><Skeleton w="100%" h={40} />
              </motion.div>
            ))}
          </div>
          <div className="db-kpi-band" style={{ marginTop: 12 }}>
            {[0,1,2,3,4].map(i => (
              <motion.div key={i} variants={fadeUp} className="ds-card db-kpi2-card">
                <Skeleton w="55%" h={11} /><Skeleton w="70%" h={24} /><Skeleton w="100%" h={20} />
              </motion.div>
            ))}
          </div>
          <div className="db-grid">
            <div className="ds-card db-card db-span-8"><Skeleton h={240} /></div>
            <div className="ds-card db-card db-span-4"><Skeleton h={240} /></div>
            <div className="ds-card db-card db-span-6"><Skeleton h={180} /></div>
            <div className="ds-card db-card db-span-6"><Skeleton h={180} /></div>
          </div>
        </>
      ) : (
        <>
          <div className="db-kpi-band">
            {[0,1,2,3].map(i => (
              <motion.div key={i} variants={fadeUp} className="ds-card db-kpi2-card">
                <Skeleton w="55%" h={11} /><Skeleton w="70%" h={24} /><Skeleton w="100%" h={20} />
              </motion.div>
            ))}
          </div>
          <div className="db-grid">
            <div className="ds-card db-card db-span-4"><Skeleton h={200} /></div>
            <div className="ds-card db-card db-span-8"><Skeleton h={200} /></div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── Platform admin view ───────────────────────────────────────────────────────

function PlatformAdminView({ platform, navigate }: {
  platform?: PlatformAdminSection;
  navigate: (to: string) => void;
}) {
  const growth = platform?.collectionGrowthRate ?? null;
  const gDir = growth == null ? 'flat' : growth > 0 ? 'up' : 'down';
  const trendData = [...(platform?.monthlyCollectionTrend ?? [])].sort((a, b) => (a.year - b.year) || (a.month - b.month));
  const TW = 600; const TH = 200; const tPadL = 8; const tPadR = 16; const tPadY = 18;

  const totalOrgs  = platform?.totalOrganizations ?? 0;
  const activeOrgs = platform?.activeOrganizations ?? 0;
  const inactiveOrgs = Math.max(0, totalOrgs - activeOrgs);

  const lastMonthVol = platform?.collectionVolumeLastMonth ?? 0;
  const thisMonthVol = platform?.collectionVolumeThisMonth ?? 0;

  return (
    <motion.div key="platform" variants={stagger} initial="hidden" animate="show" className="db-inner">
      <motion.div className="db-kpi-band" variants={stagger}>
        <KpiCard label="Organizations" value={fmtNum(platform?.totalOrganizations)}
          icon={Building2} accent
          sub={<span className="db-kpi2-sub-meta">{fmtNum(platform?.activeOrganizations)} active</span>} />
        <KpiCard label="Collected this month" value={fmtINR(platform?.collectionVolumeThisMonth ?? 0)}
          icon={TrendingUp}
          sub={growth != null
            ? <span className={`db-kpi2-sub-meta${gDir === 'up' ? ' is-up' : gDir === 'down' ? ' is-down' : ''}`}>
                {gDir === 'up' ? <ArrowUp size={10} /> : gDir === 'down' ? <ArrowDown size={10} /> : <Minus size={10} />}
                {Math.abs(growth).toFixed(1)}% vs last month
              </span>
            : undefined} />
        <KpiCard label="Total users" value={fmtNum(platform?.totalUsers)}
          icon={Users2}
          sub={<span className="db-kpi2-sub-meta">across all orgs</span>} />
        <KpiCard label="Total cases" value={fmtNum(platform?.totalAllocations)}
          icon={Briefcase}
          sub={<span className="db-kpi2-sub-meta">system-wide</span>} />
      </motion.div>

      <div className="db-grid">
        {/* System trend */}
        <Card className="db-span-8" title="System-wide collection trend">
          {trendData.length < 1 ? (
            <svg className="db-trend-svg" viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="none">
              {[0.25, 0.5, 0.75].map((f, i) => (
                <line key={i} x1={tPadL} x2={TW - tPadR}
                  y1={tPadY + f * (TH - tPadY * 2)} y2={tPadY + f * (TH - tPadY * 2)}
                  stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              ))}
              <text x={TW / 2} y={TH / 2} textAnchor="middle"
                fill="var(--ink-tertiary)" fontSize="13" style={{ fontFamily: 'var(--font-mono)' }}>No data yet</text>
            </svg>
          ) : (
            <BarChart data={trendData} />
          )}
        </Card>

        {/* Org status donut */}
        <Card className="db-span-4" title="Org status">
          <div className="db-donut-card">
            <DonutChart centerLabel="ORGS" slices={[
              { label: 'Active',   value: activeOrgs,   color: '#1D7A3E' },
              { label: 'Inactive', value: inactiveOrgs, color: '#3B5268' },
            ]} />
            <div className="db-legend">
              <div className="db-legend-row">
                <span className="db-legend-dot" style={{ background: '#1D7A3E' }} />
                <span className="db-legend-label">Active</span>
                <span className="db-legend-val">{fmtNum(activeOrgs)}</span>
              </div>
              <div className="db-legend-row">
                <span className="db-legend-dot" style={{ background: '#3B5268' }} />
                <span className="db-legend-label">Inactive</span>
                <span className="db-legend-val">{fmtNum(inactiveOrgs)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Top organizations */}
        <Card className="db-span-6" title="Top organizations">
          {(platform?.topOrgsByCollection ?? []).length === 0 ? (
            <div className="db-trend-empty"><span className="db-trend-empty-msg">No org data</span></div>
          ) : (
            <HBarList ranked rows={(platform?.topOrgsByCollection ?? []).map(o => ({
              label: o.name,
              value: o.userCount,
              display: `${o.userCount} users`,
            }))} />
          )}
        </Card>

        {/* Month vs last month */}
        <Card className="db-span-6" title="Month vs last month">
          <HBarList rows={[
            { label: 'Last month', value: lastMonthVol, display: fmtINR(lastMonthVol), color: 'var(--border-strong)' },
            { label: 'This month', value: thisMonthVol, display: fmtINR(thisMonthVol), color: '#1D7A3E' },
          ]} />
          {growth != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11.5, fontWeight: 600,
              color: gDir === 'up' ? 'var(--success, #1D7A3E)' : gDir === 'down' ? 'var(--danger, #B42318)' : 'var(--ink-tertiary)' }}>
              {gDir === 'up' ? <ArrowUp size={12} /> : gDir === 'down' ? <ArrowDown size={12} /> : <Minus size={12} />}
              {Math.abs(growth).toFixed(1)}% {gDir === 'up' ? 'growth' : gDir === 'down' ? 'decline' : 'flat'}
              <span style={{ color: 'var(--ink-tertiary)', fontWeight: 400, marginLeft: 4 }}>platform-wide</span>
            </div>
          )}
          {growth == null && (
            <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', marginTop: 10, display: 'block' }}>First month of data</span>
          )}
        </Card>
      </div>
    </motion.div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const authRole = ((user?.roles?.[0]?.name ?? '').replace(/^ROLE_/, '')) as DashboardRole | '';
  const looksLikeOrgView = !FIELD_ROLES.has(authRole as DashboardRole) && authRole !== '';

  const agentId = user?.agentId ?? user?.id ?? '';
  const orgId = user?.organizationId ?? '';

  const [unified,           setUnified]           = useState<UnifiedDashboardData | null>(null);
  const [agentStats,        setAgentStats]         = useState<FieldAgentSection | null>(null);
  const [approvalsCount,    setApprovalsCount]    = useState(0);
  const [approvalsAmount,   setApprovalsAmount]   = useState(0);
  const [ptpsTodayCount,    setPtpsTodayCount]    = useState(0);
  const [ptpsAmount,        setPtpsAmount]        = useState(0);
  const [visitsDoneToday,   setVisitsDoneToday]   = useState(0);
  const [dispatchDoneCount, setDispatchDoneCount] = useState(0);
  const [loading,           setLoading]            = useState(true);
  const [loadError,         setLoadError]          = useState(false);
  const aliveRef = useRef(true);
  const [trendRange, setTrendRange] = useState<3 | 6 | 12>(6);
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const [kpiView, setKpiView] = useState<'today' | 'month'>('today');
  const svgRef = useRef<SVGSVGElement>(null);

  const dashRole: DashboardRole = unified?.role ?? (authRole || 'ORG_ADMIN');
  const isPlatformAdmin  = dashRole === 'PLATFORM_ADMIN';
  const isOrgManagerView = ['ORG_ADMIN', 'MANAGER', 'TL'].includes(dashRole);
  const isOrgAdmin       = dashRole === 'ORG_ADMIN';
  const isTl             = dashRole === 'TL';
  const isFoView         = dashRole === 'FO';
  const isCallerView     = dashRole === 'CALLER';

  const platform:    PlatformAdminSection | undefined = unified?.platform;
  const orgOverview: OrgOverviewSection | undefined   = unified?.orgOverview;
  const orgToday:    OrgTodaySection | undefined      = unified?.orgToday;
  const callerToday: CallerSection | undefined        = unified?.callerToday;
  const teamSection: TeamSection | undefined          = unified?.team;
  const collectionsSection: CollectionsSection | undefined = unified?.collections;
  const allocSection: AllocationsSection | undefined = unified?.allocations;
  const ptpSummary: PtpSummarySection | undefined = unified?.ptpSummary;
  const orgName = orgOverview?.organizationName ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const isOrgView = !FIELD_ROLES.has(authRole as DashboardRole) && authRole !== '';

      const [unifiedResult, agentResult, appR, ptpR, visR, dispR] = await Promise.all([
        dashboardApi.unified(12),
        authRole === 'FO' && agentId ? dashboardApi.fieldAgent(agentId).catch(() => null) : Promise.resolve(null),
        isOrgView && orgId && authRole === 'ORG_ADMIN'
          ? axiosInstance.get('/api/v1/collections', { params: { orgId, status: 'PENDING_APPROVAL', size: 100 } }).catch(() => null)
          : Promise.resolve(null),
        isOrgView && orgId
          ? axiosInstance.get('/api/v1/ptps', { params: { orgId, status: 'PENDING', promisedDateFrom: today, promisedDateTo: today, size: 100 } }).catch(() => null)
          : Promise.resolve(null),
        isOrgView && orgId
          ? axiosInstance.get('/api/v1/reports/visit-completion/daily', { params: { orgId } }).catch(() => null)
          : Promise.resolve(null),
        isOrgView && orgId
          ? axiosInstance.get('/api/v1/daily-dispatch/org/summary').catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!aliveRef.current) return;

      setUnified(unifiedResult);
      if (agentResult) setAgentStats(agentResult);

      if (isOrgView && orgId) {
        const appPage    = appR?.data?.data ?? appR?.data ?? {};
        const appContent = Array.isArray(appPage.content) ? appPage.content : [];
        const ptpPage    = ptpR?.data?.data ?? ptpR?.data ?? {};
        const ptpContent = Array.isArray(ptpPage.content) ? ptpPage.content : [];
        const visData    = visR?.data?.data ?? visR?.data ?? {};
        const dispData   = dispR?.data?.data ?? dispR?.data ?? {};
        setApprovalsCount(typeof appPage.totalElements === 'number' ? appPage.totalElements : appContent.length);
        setApprovalsAmount(appContent.reduce((s: number, c: any) => s + (Number(c?.amount) || 0), 0));
        setPtpsTodayCount(typeof ptpPage.totalElements === 'number' ? ptpPage.totalElements : ptpContent.length);
        setPtpsAmount(ptpContent.reduce((s: number, p: any) => s + (Number(p?.promisedAmount) || 0), 0));
        setVisitsDoneToday(visData.totalVisited ?? 0);
        setDispatchDoneCount(dispData.dispatched ?? 0);
      }
    } catch {
      if (aliveRef.current) setLoadError(true);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [orgId, agentId, authRole]);

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => { aliveRef.current = false; };
  }, [load]);

  // ── Real trend series (server-provided) ───────────────────────────────────────
  const trend      = collectionsSection?.monthlyTrend ?? [];
  const ptpTrend   = collectionsSection?.ptpMonthlyTrend ?? [];
  const visitTrend = collectionsSection?.visitMonthlyTrend ?? [];
  const topAgents  = collectionsSection?.topAgents ?? [];
  const caseAge    = allocSection?.caseAgeBuckets ?? [];

  const growthRate: number | null = (() => {
    if (collectionsSection?.growthRate != null) return collectionsSection.growthRate;
    if (!collectionsSection) return null;
    const thisM = collectionsSection.collectionVolumeThisMonth ?? 0;
    const lastM = collectionsSection.collectionVolumeLastMonth ?? 0;
    if (lastM > 0) return ((thisM - lastM) / lastM) * 100;
    return thisM > 0 ? 100 : null;
  })();

  // ── Multi-line trend chart derived ───────────────────────────────────────────
  const TW = 600; const TH = 200; const tPadL = 8; const tPadR = 16; const tPadY = 18;

  const sortedTrend = useMemo(() => ascByMonth(trend).slice(-trendRange), [trend, trendRange]);

  const alignSeries = useCallback((src: TrendPoint[], labels: string[]) => {
    const map = new Map(src.map(p => [p.label, p]));
    return labels.map(l => map.get(l) ?? { year: 0, month: 0, label: l, totalAmount: 0, totalCount: 0 });
  }, []);

  const sortedPtp   = useMemo(() => alignSeries(ptpTrend,   sortedTrend.map(p => p.label)), [ptpTrend,   sortedTrend, alignSeries]);
  const sortedVisit = useMemo(() => alignSeries(visitTrend, sortedTrend.map(p => p.label)), [visitTrend, sortedTrend, alignSeries]);

  const tn = sortedTrend.length;

  const normPts = useCallback((vals: number[], yTop: number, yBot: number): [number, number][] => {
    const max = Math.max(...vals); const min = Math.min(...vals);
    const range = max - min || 1;
    return vals.map((v, i) => {
      const x = tPadL + (tn > 1 ? (i / (tn - 1)) : 0.5) * (TW - tPadL - tPadR);
      const y = yTop + (1 - (v - min) / range) * (yBot - yTop);
      return [x, y];
    });
  }, [tn]);

  const colAmts   = useMemo(() => sortedTrend.map(p => p.totalAmount ?? 0), [sortedTrend]);
  const ptpCounts = useMemo(() => sortedPtp.map(p => p.totalCount ?? 0),    [sortedPtp]);
  const visCount  = useMemo(() => sortedVisit.map(p => p.totalCount ?? 0),  [sortedVisit]);

  const colPts  = useMemo(() => normPts(colAmts,   tPadY,        TH - tPadY),   [normPts, colAmts]);
  const ptpPts  = useMemo(() => normPts(ptpCounts,  tPadY,        TH * 0.52),    [normPts, ptpCounts]);
  const visPts  = useMemo(() => normPts(visCount,   TH * 0.48,    TH - tPadY),   [normPts, visCount]);

  const toPolyPath = (pts: [number,number][]) => pts.length < 2 ? '' : pts.map((p,i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const colPath = toPolyPath(colPts);
  const ptpPath = toPolyPath(ptpPts);
  const visPath = toPolyPath(visPts);

  const ytd      = colAmts.reduce((s, v) => s + v, 0);
  const ytdAnim  = useCountUp(ytd);
  const thisMonthT = tn > 0 ? sortedTrend[tn - 1] : null;
  const lastMonthT = tn > 1 ? sortedTrend[tn - 2] : null;
  const thisAmt    = thisMonthT?.totalAmount ?? 0;
  const prevAmt    = lastMonthT?.totalAmount ?? 0;
  const momDiff    = thisAmt - prevAmt;
  const momPct     = prevAmt > 0 ? (momDiff / prevAmt) * 100 : null;
  const dir: 'up' | 'down' | 'flat' = momPct == null ? 'flat' : momPct > 0 ? 'up' : momPct < 0 ? 'down' : 'flat';
  const thisAmtAnim = useCountUp(thisAmt);

  const handleTrendMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el || tn === 0) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * TW;
    const idx = Math.round(((x - tPadL) / (TW - tPadL - tPadR)) * (tn - 1));
    setHovIdx(Math.max(0, Math.min(tn - 1, idx)));
  }, [tn]);

  // ── Assignment + PTP fulfillment (real) ────────────────────────────────────────
  const assignSlices: ChartSlice[] = [
    { label: 'Assigned',   value: orgOverview?.assignedAllocations ?? 0,   color: 'var(--brand)' },
    { label: 'Unassigned', value: orgOverview?.unassignedAllocations ?? 0, color: 'var(--brand-subtle)' },
  ];
  const hasAssign = assignSlices.some(s => s.value > 0);

  const ptpFulfilled = ptpSummary?.fulfilledPtpsThisMonth ?? 0;
  const ptpBroken    = ptpSummary?.brokenPtpsThisMonth ?? 0;
  const ptpResolved  = ptpFulfilled + ptpBroken;
  const ptpRate      = ptpSummary?.fulfillmentRatePct != null
    ? Math.round(ptpSummary.fulfillmentRatePct)
    : (ptpResolved > 0 ? Math.round((ptpFulfilled / ptpResolved) * 100) : 0);

  // ── Field-agent donut ──────────────────────────────────────────────────────────
  const slices: ChartSlice[] = isFoView && agentStats ? [
    { label: 'Completed',   value: agentStats.todayCompletedCases,   color: 'var(--brand)' },
    { label: 'Pending',     value: agentStats.todayPendingCases,     color: 'var(--brand-subtle)' },
    { label: 'Rescheduled', value: agentStats.todayRescheduledCases, color: 'var(--success-border)' },
  ] : [];
  const hasChart = slices.some(s => s.value > 0);

  const attentionItems = [
    ...(isOrgAdmin ? [approvalsCount] : []),
    ptpsTodayCount,
    orgOverview?.unassignedAllocations ?? 0,
  ];
  const attentionClear = attentionItems.every(c => c === 0);

  return (
    <div className="db-root">
      {loadError && (
        <div className="db-error-banner" role="alert">
          <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
          <div className="db-error-body">
            <span className="db-error-title">Dashboard data could not be loaded.</span>
            <span className="db-error-sub">Check your connection or contact support if the issue persists.</span>
          </div>
          <button className="db-error-retry" onClick={load} aria-label="Retry">
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="db-content">

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }}>
              <DashboardSkeleton role={authRole} />
            </motion.div>
          ) : isPlatformAdmin ? (
            <PlatformAdminView platform={platform} navigate={navigate} />
          ) : isOrgManagerView ? (
            <motion.div key="org" variants={stagger} initial="hidden" animate="show" className="db-inner">

              {/* ── KPI band with view toggle ── */}
              <div className="db-kpi-header">
                <h2 className="db-kpi-title">Overview</h2>
                <div className="db-kpi-toggle" role="group" aria-label="KPI view">
                  <button type="button"
                    className={`db-kpi-toggle-btn${kpiView === 'today' ? ' is-active' : ''}`}
                    onClick={() => setKpiView('today')}
                    aria-pressed={kpiView === 'today'}>
                    Today
                  </button>
                  <button type="button"
                    className={`db-kpi-toggle-btn${kpiView === 'month' ? ' is-active' : ''}`}
                    onClick={() => setKpiView('month')}
                    aria-pressed={kpiView === 'month'}>
                    This month
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {kpiView === 'today' && orgToday ? (() => {
                  const todayVsYest = orgToday.collectedYesterday > 0
                    ? ((orgToday.collectedToday - orgToday.collectedYesterday) / orgToday.collectedYesterday) * 100
                    : null;
                  const dir = todayVsYest == null ? 'flat' : todayVsYest > 0 ? 'up' : 'down';
                  return (
                    <motion.div key="today" className="db-kpi-band"
                      variants={stagger} initial="hidden" animate="show"
                      exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                      <KpiCard label="Collected today" value={fmtINR(orgToday.collectedToday)}
                        icon={Banknote} accent
                        sub={todayVsYest != null
                          ? <span className={`db-kpi2-sub-meta${dir === 'up' ? ' is-up' : dir === 'down' ? ' is-down' : ''}`}>
                              {dir === 'up' ? <ArrowUp size={10} /> : dir === 'down' ? <ArrowDown size={10} /> : <Minus size={10} />}
                              {Math.abs(todayVsYest).toFixed(1)}% vs yesterday
                            </span>
                          : undefined} />
                      <KpiCard label="Visits today"
                        value={`${orgToday.visitsCompletedToday} / ${orgToday.visitsTotalToday}`}
                        icon={Route} onClick={() => navigate('/app/visits')}
                        sub={<span className="db-kpi2-sub-meta">{orgToday.visitsInProgressToday} in progress · {orgToday.visitsPendingToday} pending</span>} />
                      <KpiCard label="FOs on field" value={String(orgToday.fosActiveToday)}
                        icon={Navigation}
                        sub={
                          <span className="db-kpi2-sub-meta">
                            {orgToday.fosIdleToday} idle
                            <span className="db-kpi2-sub-vdiv" />
                            {orgToday.fosTotalCount} total
                          </span>
                        } />
                      <KpiCard label="PTPs due today" value={fmtNum(orgToday.ptpsDueToday)}
                        icon={Handshake} onClick={() => navigate('/app/ptps')}
                        sub={<span className="db-kpi2-sub-meta">{fmtINR(orgToday.ptpAmountDueToday)} at risk</span>} />
                    </motion.div>
                  );
                })() : (
                  <motion.div key="month" className="db-kpi-band"
                    variants={stagger} initial="hidden" animate="show"
                    exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    <KpiCard label="Outstanding" value={fmtINR(orgOverview?.outstandingTotal ?? 0)}
                      icon={Banknote} accent onClick={() => navigate('/app/allocations')}
                      sub={
                        <span className="db-kpi2-sub-meta">
                          <AlertCircle size={11} aria-hidden="true" />
                          {fmtNum(orgOverview?.unassignedAllocations)} unassigned
                        </span>
                      } />
                    <KpiCard label="Collected this month" value={fmtINR(orgOverview?.collectionVolumeThisMonth ?? 0)}
                      onClick={() => navigate('/app/collections/trend')}
                      sub={growthRate != null
                        ? <span className={`db-kpi2-sub-meta${growthRate > 0 ? ' is-up' : growthRate < 0 ? ' is-down' : ''}`}>
                            {growthRate > 0 ? <ArrowUp size={10} aria-hidden="true" /> : growthRate < 0 ? <ArrowDown size={10} aria-hidden="true" /> : <Minus size={10} aria-hidden="true" />}
                            {Math.abs(growthRate).toFixed(1)}% vs last month
                          </span>
                        : undefined
                      } />
                    <KpiCard label="Active PTPs" value={fmtNum(ptpSummary?.activePtps)}
                      icon={Handshake} onClick={() => navigate('/app/ptps')}
                      sub={
                        <span className="db-kpi2-sub-meta">
                          {ptpFulfilled} fulfilled
                          <span className="db-kpi2-sub-vdiv" />
                          {ptpBroken} broken
                        </span>
                      } />
                    <KpiCard label="Total cases" value={fmtNum(orgOverview?.totalAllocations)}
                      icon={Briefcase} onClick={() => navigate('/app/allocations')}
                      sub={<span className="db-kpi2-sub-meta">
                        {fmtNum(orgOverview?.assignedAllocations)} assigned · {fmtNum(orgOverview?.unassignedAllocations)} open
                      </span>} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Main analytics grid ── */}
              <div className="db-grid">

                {/* Trend line chart */}
                <Card className="db-span-8" title="Performance trend">
                  {sortedTrend.length < 2 ? (
                    <>
                      <div className="db-trend-chart-wrap">
                        <svg className="db-trend-svg" viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="none">
                          {[0.25, 0.5, 0.75].map((f, i) => (
                            <line key={i} x1={tPadL} x2={TW - tPadR}
                              y1={tPadY + f * (TH - tPadY * 2)} y2={tPadY + f * (TH - tPadY * 2)}
                              stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                          ))}
                          <text x={TW / 2} y={TH / 2} textAnchor="middle"
                            fill="var(--ink-tertiary)" fontSize="13" style={{ fontFamily: 'var(--font-mono)' }}>
                            No data yet for this range
                          </text>
                        </svg>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                        <button type="button" className="db-trend-link" onClick={() => navigate('/app/collections/trend')}>
                          View collections <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </>
                  ) : (<>
                    <div className="db-trend-chart-wrap" onMouseLeave={() => setHovIdx(null)}>
                      <svg ref={svgRef} className="db-trend-svg"
                        viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="none"
                        onMouseMove={handleTrendMouseMove} onMouseLeave={() => setHovIdx(null)}
                      >
                        <defs>
                          <linearGradient id="dbGradCol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1D7A3E" stopOpacity="0.10" />
                            <stop offset="100%" stopColor="#1D7A3E" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0.25, 0.5, 0.75].map((f, i) => (
                          <line key={i} x1={tPadL} x2={TW - tPadR}
                            y1={tPadY + f * (TH - tPadY * 2)} y2={tPadY + f * (TH - tPadY * 2)}
                            stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                        ))}
                        {colPts.length >= 2 && (
                          <motion.path
                            d={colPath + ` L ${colPts[colPts.length-1][0].toFixed(1)},${(TH-tPadY).toFixed(1)} L ${colPts[0][0].toFixed(1)},${(TH-tPadY).toFixed(1)} Z`}
                            fill="url(#dbGradCol)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
                        )}
                        {visPath && (
                          <motion.path d={visPath} fill="none" stroke="#165C2E" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.9, delay: 0.2, ease: [0.22,1,0.36,1] as [number,number,number,number] }} />
                        )}
                        {ptpPath && (
                          <motion.path d={ptpPath} fill="none" stroke="#344054" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.9, delay: 0.1, ease: [0.22,1,0.36,1] as [number,number,number,number] }} />
                        )}
                        {colPath && (
                          <motion.path d={colPath} fill="none" stroke="#1D7A3E" strokeWidth="2.4"
                            strokeLinecap="round" strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.9, ease: [0.22,1,0.36,1] as [number,number,number,number] }} />
                        )}
                        {hovIdx != null && colPts[hovIdx] && (
                          <line x1={colPts[hovIdx][0]} x2={colPts[hovIdx][0]}
                            y1={tPadY} y2={TH - tPadY}
                            stroke="var(--ink-tertiary)" strokeWidth="1" strokeDasharray="3 3" />
                        )}
                        {hovIdx != null && (<>
                          {colPts[hovIdx] && <circle cx={colPts[hovIdx][0]} cy={colPts[hovIdx][1]} r="4" fill="var(--bg-surface)" stroke="#1D7A3E" strokeWidth="2" />}
                          {ptpPts[hovIdx] && <circle cx={ptpPts[hovIdx][0]} cy={ptpPts[hovIdx][1]} r="4" fill="var(--bg-surface)" stroke="#344054" strokeWidth="2" />}
                          {visPts[hovIdx] && <circle cx={visPts[hovIdx][0]} cy={visPts[hovIdx][1]} r="4" fill="var(--bg-surface)" stroke="#165C2E" strokeWidth="2" />}
                        </>)}
                      </svg>

                      <AnimatePresence>
                        {hovIdx != null && sortedTrend[hovIdx] && colPts[hovIdx] && (
                          <motion.div className="db-ml-tooltip"
                            style={{ left: `${(colPts[hovIdx][0] / TW) * 100}%` }}
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                          >
                            <span className="db-ml-tooltip-date">{sortedTrend[hovIdx].label}</span>
                            <div className="db-ml-tooltip-row">
                              <span className="db-ml-tooltip-dot" style={{ background: '#1D7A3E' }} />
                              <span className="db-ml-tooltip-key">Collections</span>
                              <span className="db-ml-tooltip-val">{fmtINR(sortedTrend[hovIdx].totalAmount ?? 0)}</span>
                            </div>
                            <div className="db-ml-tooltip-row">
                              <span className="db-ml-tooltip-dot" style={{ background: '#165C2E' }} />
                              <span className="db-ml-tooltip-key">PTPs</span>
                              <span className="db-ml-tooltip-val">{fmtNum(sortedPtp[hovIdx]?.totalCount)}</span>
                            </div>
                            <div className="db-ml-tooltip-row">
                              <span className="db-ml-tooltip-dot" style={{ background: '#101828' }} />
                              <span className="db-ml-tooltip-key">Visits</span>
                              <span className="db-ml-tooltip-val">{fmtNum(sortedVisit[hovIdx]?.totalCount)}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="db-trend-x-labels">
                      {sortedTrend.map((p, i) => (
                        <button key={i} type="button"
                          className={`db-trend-x-label${i === tn-1 ? ' is-current' : ''}${hovIdx === i ? ' is-hovered' : ''}`}
                          onClick={() => setHovIdx(hovIdx === i ? null : i)}
                        >{p.label?.slice(0, 3) ?? ''}</button>
                      ))}
                    </div>
                    <div className="db-ml-legend" style={{ justifyContent: 'center', marginTop: '12px', marginBottom: '20px' }}>
                      <span className="db-ml-legend-item"><span className="db-ml-dot" style={{ background: '#1D7A3E' }} />Collections</span>
                      <span className="db-ml-legend-item"><span className="db-ml-dot" style={{ background: '#344054' }} />PTPs</span>
                      <span className="db-ml-legend-item"><span className="db-ml-dot" style={{ background: '#165C2E' }} />Visits</span>
                    </div>

                    <div className="db-trend-stats-row">
                      <div className="db-trend-stat">
                        <span className="db-trend-stat-label">Range total</span>
                        <span className="db-trend-stat-val">{fmtINR(ytdAnim)}</span>
                      </div>
                      <div className="db-trend-stat-divider" />
                      <div className="db-trend-stat">
                        <span className="db-trend-stat-label">This month</span>
                        <span className={`db-trend-stat-val${dir === 'up' ? ' is-up' : dir === 'down' ? ' is-down' : ''}`}>{fmtINR(thisAmtAnim)}</span>
                      </div>
                      <div className="db-trend-stat-divider" />
                      <div className="db-trend-stat">
                        <span className="db-trend-stat-label">vs Last month</span>
                        <span className={`db-trend-stat-val${dir === 'up' ? ' is-up' : dir === 'down' ? ' is-down' : ''}`}>
                          {momPct != null ? `${dir === 'up' ? '+' : ''}${momPct.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </>)}
                </Card>

                {/* Needs attention */}
                <Card className="db-span-4" title="Needs attention">
                  {attentionClear ? (
                    <AllClearRow />
                  ) : (
                    <motion.div variants={stagger} initial="hidden" animate="show">
                      {isOrgAdmin && (
                        <AttentionRow icon={ClipboardCheck} label="Pending approvals" count={approvalsCount}
                          meta={approvalsAmount > 0 ? fmtINR(approvalsAmount) : undefined}
                          tone="warn" onClick={() => navigate('/app/collections')} />
                      )}
                      <AttentionRow icon={Handshake} label="PTPs due today" count={ptpsTodayCount}
                        meta={ptpsAmount > 0 ? fmtINR(ptpsAmount) : undefined}
                        tone="warn" onClick={() => navigate('/app/ptps')} />
                      <AttentionRow icon={UserPlus} label="Unassigned cases"
                        count={orgOverview?.unassignedAllocations ?? 0}
                        tone="urgent" onClick={() => navigate('/app/assignments')} />
                      <AttentionRow icon={Route} label="Visits done today"
                        count={visitsDoneToday} tone="warn" onClick={() => navigate('/app/visits')} />
                      <AttentionRow icon={Navigation} label="Cases dispatched today"
                        count={dispatchDoneCount} tone="warn" last onClick={() => navigate('/app/dispatch')} />
                    </motion.div>
                  )}
                </Card>

                {/* Case assignment donut */}
                <Card className="db-span-4" title="Case assignment">
                  <div className="db-donut-card">
                    <DonutChart slices={assignSlices} centerLabel="CASES" />
                    <div className="db-legend">
                      {assignSlices.map(s => (
                        <div key={s.label} className="db-legend-row">
                          <span className="db-legend-dot" style={{ background: s.color }} />
                          <span className="db-legend-label">{s.label}</span>
                          <span className="db-legend-val">{fmtNum(s.value)}</span>
                        </div>
                      ))}
                      {!hasAssign && <span className="db-legend-empty">No cases yet</span>}
                    </div>
                  </div>
                </Card>

                {/* PTP fulfillment ring */}
                <Card className="db-span-4" title="PTP fulfillment">
                  <div className="db-ptp-ring-inner">
                    {(() => {
                      const R = 42; const sw = 16; const SIZE = (R + sw) * 2;
                      const circ = 2 * Math.PI * R;
                      return (
                        <svg width={SIZE} height={SIZE}>
                          <g transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}>
                            <circle cx={SIZE/2} cy={SIZE/2} r={R} stroke="var(--brand-subtle)" strokeWidth={sw} fill="none" />
                            <motion.circle cx={SIZE/2} cy={SIZE/2} r={R}
                              stroke="var(--brand)" strokeWidth={sw} fill="none" strokeLinecap="round"
                              strokeDasharray={`${circ} ${circ}`}
                              initial={{ strokeDashoffset: circ }}
                              animate={{ strokeDashoffset: circ * (1 - Math.max(0, ptpRate || 0) / 100) }}
                              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </g>
                          <text x={SIZE/2} y={SIZE/2 - 3} textAnchor="middle" fill="var(--ink-primary)" fontSize="16" fontWeight="700">{ptpRate}%</text>
                          <text x={SIZE/2} y={SIZE/2 + 12} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="10" style={{ fontFamily: 'var(--font-mono)' }}>RATE</text>
                        </svg>
                      );
                    })()}
                    <div className="db-ptp-ring-stats">
                      <div className="db-ptp-stat"><span className="db-ptp-stat-dot" style={{ background: 'var(--brand)' }} /><span className="db-ptp-stat-label">Fulfilled</span><span className="db-ptp-stat-val">{ptpFulfilled}</span></div>
                      <div className="db-ptp-stat"><span className="db-ptp-stat-dot" style={{ background: 'var(--brand-subtle)' }} /><span className="db-ptp-stat-label">Broken</span><span className="db-ptp-stat-val">{ptpBroken}</span></div>
                      <div className="db-ptp-stat"><span className="db-ptp-stat-dot" style={{ background: 'var(--success-border)' }} /><span className="db-ptp-stat-label">Active</span><span className="db-ptp-stat-val">{ptpSummary?.activePtps ?? 0}</span></div>
                    </div>
                  </div>
                </Card>

                {/* Month vs last month — comparison chart */}
                <Card className="db-span-4" title="Month vs last month">
                  <BarChart data={[
                    { year: 0, month: 0, label: 'Last', totalAmount: collectionsSection?.collectionVolumeLastMonth ?? 0, totalCount: 0 },
                    { year: 0, month: 1, label: 'This', totalAmount: collectionsSection?.collectionVolumeThisMonth ?? orgOverview?.collectionVolumeThisMonth ?? 0, totalCount: 0 }
                  ]} height={120} />
                  {growthRate != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11.5, fontWeight: 600,
                      color: growthRate > 0 ? 'var(--success, #1D7A3E)' : growthRate < 0 ? 'var(--danger, #B42318)' : 'var(--ink-tertiary)' }}>
                      {growthRate > 0 ? <ArrowUp size={12} /> : growthRate < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                      {Math.abs(growthRate).toFixed(1)}% {growthRate > 0 ? 'growth' : growthRate < 0 ? 'decline' : 'flat'}
                    </div>
                  )}
                </Card>

                {/* Top collectors — all org roles */}
                <Card className="db-span-6" title="Top collectors"
                  action={<span className="db-card-sub">this month</span>}>
                  {topAgents.length === 0 ? (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No collections recorded this month</span></div>
                  ) : (
                    <HBarList ranked rows={topAgents.map(a => ({
                      label: a.name || 'Unknown', value: a.amount, display: fmtINR(a.amount),
                    }))} />
                  )}
                </Card>

                {/* Team overview */}
                <Card className="db-span-6"
                  title={isOrgAdmin ? 'Team overview' : 'Team composition'}
                  action={isOrgAdmin ? (
                    <button type="button" className="db-trend-link"
                      onClick={() => navigate('/app/agents')} style={{ fontSize: 12 }}>
                      Manage <ArrowUpRight size={11} />
                    </button>
                  ) : undefined}>
                  {teamSection ? (
                    <>
                      <div className="db-team-list">
                        {teamSection.usersByRole
                          .filter(r => r.roleName !== 'ROLE_PLATFORM_ADMIN')
                          .sort((a, b) => b.count - a.count)
                          .map(r => (
                            <div key={r.roleName} className="db-team-row">
                              <span className="db-team-role">{r.roleName.replace(/^ROLE_/, '')}</span>
                              <span className="db-team-count">{r.count}</span>
                            </div>
                          ))}
                      </div>
                      <div className="db-team-footer">
                        <span>{teamSection.activeUsers} active</span>
                        <span className="db-kpi2-sub-vdiv" />
                        <span>{teamSection.totalUsers} total</span>
                      </div>
                    </>
                  ) : (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">Team data unavailable</span></div>
                  )}
                </Card>


              </div>{/* end db-grid */}
            </motion.div>
          ) : isCallerView ? (
            <motion.div key="caller" variants={stagger} initial="hidden" animate="show" className="db-inner">
              <div className="db-kpi-header">
                <h2 className="db-kpi-title">Today's Work</h2>
              </div>
              <motion.div className="db-kpi-band" variants={stagger}>
                <KpiCard label="Cases assigned today" value={fmtNum(callerToday?.casesAssignedToday)}
                  icon={Briefcase} onClick={() => navigate('/app/my-cases')} />
                <KpiCard label="Calls completed" value={fmtNum(callerToday?.callsCompletedToday)}
                  icon={Activity} accent
                  sub={callerToday
                    ? <span className="db-kpi2-sub-meta">{fmtNum(callerToday.callsPendingToday)} pending</span>
                    : undefined} />
                <KpiCard label="PTPs made today" value={fmtNum(callerToday?.ptpsMadeToday)}
                  icon={Handshake} onClick={() => navigate('/app/ptps')} />
                <KpiCard label="Amount committed" value={fmtINR(callerToday?.amountCommittedToday ?? 0)}
                  icon={Banknote}
                  sub={<span className="db-kpi2-sub-meta">Today's PTP total</span>} />
              </motion.div>

              <div className="db-grid">
                <Card className="db-span-4" title="Call progress">
                  {callerToday && callerToday.casesAssignedToday > 0 ? (
                    <div className="db-donut-card">
                      <DonutChart size={132} centerLabel="CALLS" slices={[
                        { label: 'Completed', value: callerToday.callsCompletedToday, color: 'var(--brand)' },
                        { label: 'Pending',   value: callerToday.callsPendingToday,   color: 'var(--danger)' },
                      ]} />
                      <div className="db-legend">
                        {[
                          { label: 'Completed', color: 'var(--brand)',  v: callerToday.callsCompletedToday },
                          { label: 'Pending',   color: 'var(--danger)', v: callerToday.callsPendingToday },
                        ].map(s => (
                          <div key={s.label} className="db-legend-row">
                            <span className="db-legend-dot" style={{ background: s.color }} />
                            <span className="db-legend-label">{s.label}</span>
                            <span className="db-legend-val">{s.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No cases assigned yet today</span></div>
                  )}
                </Card>

                <Card className="db-span-8" title="Needs attention">
                  {callerToday && (callerToday.callsPendingToday > 0 || callerToday.ptpsMadeToday > 0) ? (
                    <motion.div variants={stagger} initial="hidden" animate="show">
                      <AttentionRow icon={Activity} label="Pending calls"
                        count={callerToday.callsPendingToday} tone="warn"
                        onClick={() => navigate('/app/my-cases')} />
                      <AttentionRow icon={Handshake} label="PTPs made today"
                        count={callerToday.ptpsMadeToday} tone="warn" last
                        onClick={() => navigate('/app/ptps')} />
                    </motion.div>
                  ) : <AllClearRow />}
                </Card>
              </div>
            </motion.div>

          ) : isFoView && agentStats ? (
            <motion.div key="agent" variants={stagger} initial="hidden" animate="show" className="db-inner">
              <div className="db-kpi-header">
                <h2 className="db-kpi-title">Today's Work</h2>
              </div>
              <motion.div className="db-kpi-band" variants={stagger}>
                <KpiCard label="Today's cases" value={String(agentStats.todayTotalCases)}
                  icon={ClipboardCheck}
                  sub={<span className="db-kpi2-sub-meta">
                    {agentStats.todayPendingCases > 0 ? `${agentStats.todayPendingCases} still pending` : 'All done for today'}
                  </span>}
                  onClick={() => navigate('/app/my-cases')} />
                <KpiCard label="Completed" value={String(agentStats.todayCompletedCases)}
                  icon={CheckCircle} accent
                  sub={<span className="db-kpi2-sub-meta">{Math.round(agentStats.todayCompletionRate)}% completion rate</span>} />
                <KpiCard label="Collected today" value={fmtINR(agentStats.collectedAmountToday)}
                  icon={Banknote} onClick={() => navigate('/app/collections')} />
                <KpiCard label="Pending PTPs" value={String(agentStats.pendingPtps)}
                  icon={Handshake}
                  sub={<span className="db-kpi2-sub-meta">Due for follow-up</span>}
                  onClick={() => navigate('/app/ptps')} />
              </motion.div>

              <div className="db-grid">
                <Card className="db-span-4" title="Today's progress">
                  {hasChart ? (
                    <div className="db-donut-card">
                      <DonutChart slices={slices} size={132} centerLabel="VISITS" />
                      <div className="db-legend">
                        {slices.map(s => (
                          <div key={s.label} className="db-legend-row">
                            <span className="db-legend-dot" style={{ background: s.color }} />
                            <span className="db-legend-label">{s.label}</span>
                            <span className="db-legend-val">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No visits dispatched yet today</span></div>
                  )}
                </Card>

                <Card className="db-span-8" title="Needs attention">
                  {agentStats.todayPendingCases === 0 && agentStats.pendingPtps === 0 ? (
                    <AllClearRow />
                  ) : (
                    <motion.div variants={stagger} initial="hidden" animate="show">
                      <AttentionRow icon={Route} label="Pending visits today"
                        count={agentStats.todayPendingCases} tone="warn" onClick={() => navigate('/app/today')} />
                      <AttentionRow icon={Handshake} label="Pending PTPs"
                        count={agentStats.pendingPtps} tone="warn" last onClick={() => navigate('/app/ptps')} />
                    </motion.div>
                  )}
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" variants={fadeIn} initial="hidden" animate="show" className="ds-empty">
              <span className="ds-empty-title">Unable to load your dashboard</span>
              <div className="ds-empty-actions">
                <button type="button" className="ds-btn is-secondary" onClick={() => load()}>Try again</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
