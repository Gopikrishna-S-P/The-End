import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// AppPage.css -> ds/ds.css supplies the design tokens (--ink-solid, --border,
// --radius-*, --text-*) and the ds-* primitives this page renders (ds-card,
// ds-pill, ds-skel, ds-btn, ds-empty). The AppLayout chain does not define
// them, so without this the dashboard only looked right when some other lazy
// route happened to have loaded them first.
import '../styles/AppPage.css';
import './Dashboard.css';
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
import {
  stagger, fadeUp, fadeIn, fmtINR, fmtNum, useCountUp,
  KpiCard, Card, DonutChart, DonutCard, HBarList, BarChart, AttentionRow, AllClearRow, Skeleton,
  TrendChart, ProgressRing,
  type DonutSlice as ChartSlice,
} from './DashboardShared';

const FIELD_ROLES = new Set<DashboardRole>(['FO', 'CALLER']);

// ── Series helpers ──────────────────────────────────────────────────────────────

const ascByMonth = (pts: TrendPoint[]) =>
  [...pts].sort((a, b) => (a.year - b.year) || (a.month - b.month));

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
              { label: 'Active',   value: activeOrgs,   color: 'var(--ink-solid)' },
              { label: 'Inactive', value: inactiveOrgs, color: 'var(--ink-tertiary)' },
            ]} />
            <div className="db-legend">
              <div className="db-legend-row">
                <span className="db-legend-dot" style={{ background: 'var(--ink-solid)' }} />
                <span className="db-legend-label">Active</span>
                <span className="db-legend-val">{fmtNum(activeOrgs)}</span>
              </div>
              <div className="db-legend-row">
                <span className="db-legend-dot" style={{ background: 'var(--ink-tertiary)' }} />
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
            { label: 'This month', value: thisMonthVol, display: fmtINR(thisMonthVol), color: 'var(--ink-solid)' },
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
  const [kpiView, setKpiView] = useState<'today' | 'month'>('today');

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

  // ── Trend chart derived ───────────────────────────────────────────────────────
  const sortedTrend = useMemo(() => ascByMonth(trend).slice(-trendRange), [trend, trendRange]);

  const tn = sortedTrend.length;

  const colAmts = useMemo(() => sortedTrend.map(p => p.totalAmount ?? 0), [sortedTrend]);

  const ytd      = colAmts.reduce((s, v) => s + v, 0);
  const ytdAnim  = useCountUp(ytd);
  const thisMonthT = tn > 0 ? sortedTrend[tn - 1] : null;
  const lastMonthT = tn > 1 ? sortedTrend[tn - 2] : null;
  const thisAmt    = thisMonthT?.totalAmount ?? 0;
  const prevAmt    = lastMonthT?.totalAmount ?? 0;
  const momDiff    = thisAmt - prevAmt;
  const momPct     = prevAmt > 0 ? (momDiff / prevAmt) * 100 : null;

  // ── Assignment + PTP fulfillment (real) ────────────────────────────────────────
  const assignSlices: ChartSlice[] = [
    { label: 'Assigned',   value: orgOverview?.assignedAllocations ?? 0,   color: 'var(--brand)' },
    { label: 'Unassigned', value: orgOverview?.unassignedAllocations ?? 0, color: 'var(--brand-subtle)' },
  ];

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

              {/* ── Header (title + KPI view toggle, same row) ── */}
              <div className="db-page-header">
                <div className="db-page-header-left">
                  <div className="db-page-titles">
                    <h1 className="db-page-title">Overview</h1>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                      <div className="db-trend-empty"><span className="db-trend-empty-msg">No data yet for this range</span></div>
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                        <button type="button" className="db-trend-link" onClick={() => navigate('/app/collections/trend')}>
                          View collections <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <TrendChart
                      labels={sortedTrend.map(p => p.label)}
                      primary={{ label: 'Collections', values: colAmts, color: 'var(--ink-solid)', area: true, fmt: fmtINR }}
                      heroTrend={momPct}
                      secondaryStat={{ label: 'Range total', value: fmtINR(ytdAnim) }}
                    />
                  )}
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
                  <DonutCard slices={assignSlices} centerLabel="CASES" />
                </Card>

                {/* PTP fulfillment ring */}
                <Card className="db-span-4" title="PTP fulfillment">
                  <div className="db-ptp-ring-inner">
                    <ProgressRing pct={ptpRate} subLabel="RATE" color="var(--brand)" trackColor="var(--brand-subtle)" />
                    <div className="db-ptp-ring-stats">
                      <div className="db-ptp-stat"><span className="db-ptp-stat-dot" style={{ background: 'var(--brand)' }} /><span className="db-ptp-stat-label">Fulfilled</span><span className="db-ptp-stat-val">{ptpFulfilled}</span></div>
                      <div className="db-ptp-stat"><span className="db-ptp-stat-dot" style={{ background: 'var(--danger)' }} /><span className="db-ptp-stat-label">Broken</span><span className="db-ptp-stat-val">{ptpBroken}</span></div>
                      <div className="db-ptp-stat"><span className="db-ptp-stat-dot" style={{ background: 'var(--ink-tertiary)' }} /><span className="db-ptp-stat-label">Active</span><span className="db-ptp-stat-val">{ptpSummary?.activePtps ?? 0}</span></div>
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
                    <HBarList ranked emphasizeTop rows={topAgents.map(a => ({
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
