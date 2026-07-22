import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, AlertCircle, RefreshCw, UserPlus, Clock, TrendingDown,
  CreditCard, Upload,
} from 'lucide-react';
import { platformApi, type PlatformStats, type PlatformAnalytics } from '../api/platformApi';
import {
  stagger, fadeUp, fadeIn, fmtINR, fmtNum, useCountUp,
  KpiCard, Card, DonutCard, HBarList, BarChart, AttentionRow, AllClearRow, Skeleton,
  TrendChart, ProgressRing,
  type DonutSlice as Slice,
} from './DashboardShared';
import './Dashboard.css';

// ── Chart palette — brand green for the lead category, the validated ordinal
// ramp (--db-ramp-2/3, see Dashboard.css) for the next tiers, true (non-blue)
// neutral grays to break it up further, and org's own warn/danger semantics
// for genuinely bad states. No blue/purple/cyan; not all-green either — grays
// give the eye a resting point instead of a wall of one hue.
const C_ACCENT  = 'var(--ink-solid)';    // brand green, #0AA550
const C_GREEN_2 = 'var(--db-ramp-2)';    // #077438 — ordinal step 2
const C_GREEN_3 = 'var(--db-ramp-3)';    // #054A24 — ordinal step 3
const C_GRAY    = 'var(--border-strong)'; // #D0D5DD — the app's own hairline/border gray, light
const C_GRAY_LIGHT = 'var(--border)';     // #E4E7EC — even lighter, same family
const C_WARNING = 'var(--warning)';   // org's tone="warn"
const C_DANGER  = 'var(--danger)';    // org's tone="urgent"/error

const PLAN_PRICE: Record<string, number> = { STARTER: 2999, GROWTH: 7999, ENTERPRISE: 19999 };

// ── Org activation ring — platform-only, no org equivalent ─────────────────────
function ActivationRing({ active, total }: { active: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.round((active / total) * 100), 100) : 0;
  const inactive = Math.max(0, total - active);
  return (
    <div className="db-ring-main">
      <ProgressRing pct={pct} subLabel="ACTIVE" size={150} radius={54} valueFontSize={25} />
      <div className="db-legend" style={{ width: '100%' }}>
        <div className="db-legend-row">
          <span className="db-legend-dot" style={{ background: 'var(--ink-solid)' }} />
          <span className="db-legend-label">Active orgs</span>
          <span className="db-legend-val">{fmtNum(active)}</span>
        </div>
        <div className="db-legend-row">
          <span className="db-legend-dot" style={{ background: 'var(--ink-tertiary)' }} />
          <span className="db-legend-label">Inactive orgs</span>
          <span className="db-legend-val">{fmtNum(inactive)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function DashSkeleton() {
  return (
    <motion.div className="db-skeleton" variants={stagger} initial="hidden" animate="show" role="status">
      <div className="db-kpi-band">
        {[0,1,2,3,4].map(i => (
          <motion.div key={i} variants={fadeUp} className="ds-card db-kpi2-card">
            <Skeleton w="55%" h={11} /><Skeleton w="70%" h={24} /><Skeleton w="100%" h={40} />
          </motion.div>
        ))}
      </div>
      <div className="db-grid">
        <div className="ds-card db-card db-span-8"><Skeleton h={240} /></div>
        <div className="ds-card db-card db-span-4"><Skeleton h={240} /></div>
        <div className="ds-card db-card db-span-6"><Skeleton h={180} /></div>
        <div className="ds-card db-card db-span-6"><Skeleton h={180} /></div>
      </div>
    </motion.div>
  );
}

// ── Platform dashboard ─────────────────────────────────────────────────────
export default function PlatformDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]   = useState<PlatformStats | null>(null);
  const [an, setAn]         = useState<PlatformAnalytics | null>(null);
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const [kpiView, setKpiView] = useState<'overview' | 'activity'>('overview');
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const [s, a] = await Promise.all([platformApi.getStats(), platformApi.getAnalytics(months)]);
      if (aliveRef.current) { setStats(s); setAn(a); }
    } catch {
      if (aliveRef.current) setLoadError(true);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [months]);

  useEffect(() => { aliveRef.current = true; load(); return () => { aliveRef.current = false; }; }, [load]);

  const rb = stats?.roleBreakdown;

  // ── Derived ──────────────────────────────────────────────────────────────
  const revenueTrend = an?.revenueTrend ?? [];
  const mrrSpark = revenueTrend.map(p => p.totalAmount);
  const arr = an?.arr ?? 0;
  const mrrAnim = useCountUp(an?.mrr ?? 0);

  const planSlices: Slice[] = useMemo(() => {
    const p = an?.planCounts;
    return [
      { label: 'Enterprise', value: p?.enterprise ?? 0, color: C_ACCENT },
      { label: 'Growth',     value: p?.growth ?? 0,     color: C_GREEN_2 },
      { label: 'Starter',    value: p?.starter ?? 0,    color: C_GREEN_3 },
      { label: 'Free / none',value: p?.none ?? 0,       color: C_GRAY },
    ];
  }, [an]);

  const statusRows = useMemo(() => {
    const s = an?.statusCounts;
    return [
      { label: 'Active',    value: s?.active ?? 0,    display: fmtNum(s?.active),    color: C_ACCENT },
      { label: 'Trial',     value: s?.trial ?? 0,     display: fmtNum(s?.trial),     color: C_WARNING },
      { label: 'Past due',  value: s?.pastDue ?? 0,   display: fmtNum(s?.pastDue),   color: C_DANGER },
      { label: 'Cancelled', value: s?.cancelled ?? 0, display: fmtNum(s?.cancelled), color: C_GRAY },
      { label: 'Inactive',  value: s?.inactive ?? 0,  display: fmtNum(s?.inactive),  color: C_GRAY_LIGHT },
    ].filter(r => r.value > 0);
  }, [an]);

  // MRR contribution by plan (count × list price) — derived, real
  const revByPlan = useMemo(() => {
    const p = an?.planCounts;
    const rows = [
      { label: 'Enterprise', value: (p?.enterprise ?? 0) * PLAN_PRICE.ENTERPRISE, color: C_ACCENT },
      { label: 'Growth',     value: (p?.growth ?? 0)     * PLAN_PRICE.GROWTH,     color: C_GREEN_2 },
      { label: 'Starter',    value: (p?.starter ?? 0)    * PLAN_PRICE.STARTER,    color: C_GREEN_3 },
    ];
    return rows.map(r => ({ ...r, display: fmtINR(r.value) }));
  }, [an]);

  const roleSlices: Slice[] = useMemo(() => [
    { label: 'Org admins',     value: rb?.orgAdmin ?? 0, color: C_ACCENT },
    { label: 'Managers',       value: rb?.manager ?? 0,  color: C_GREEN_2 },
    { label: 'Team leads',     value: rb?.tl ?? 0,       color: C_GRAY },
    { label: 'Field officers', value: rb?.fo ?? 0,       color: C_GREEN_3 },
    { label: 'Callers',        value: rb?.caller ?? 0,   color: C_GRAY_LIGHT },
    { label: 'Tracers',        value: rb?.tracer ?? 0,   color: C_GRAY_LIGHT },
  ], [rb]);

  const orgTrend  = an?.orgGrowthTrend ?? [];
  const userTrend = an?.userGrowthTrend ?? [];
  const topOrgs   = an?.topOrgsByUsers ?? [];

  const newOrgsRange  = orgTrend.reduce((s, p) => s + p.totalCount, 0);
  const newUsersRange = userTrend.reduce((s, p) => s + p.totalCount, 0);

  const hasAttention = stats
    ? [stats.pendingUserRequests, stats.staleOrgs, stats.inactiveOrgs, an?.trialsEndingSoon ?? 0].some(c => c > 0)
    : false;

  return (
    <div className="db-root">
      {loadError && (
        <div className="db-error-banner" role="alert">
          <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
          <div className="db-error-body">
            <span className="db-error-title">Platform analytics could not be loaded.</span>
            <span className="db-error-sub">Check your connection or try refreshing.</span>
          </div>
          <button className="db-error-retry" onClick={load} aria-label="Retry"><RefreshCw size={14} aria-hidden="true" /></button>
        </div>
      )}

      <div className="db-content">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skel" exit={{ opacity: 0 }}><DashSkeleton /></motion.div>
          ) : stats && an ? (
            <motion.div key="data" variants={stagger} initial="hidden" animate="show" className="db-inner">

              {/* ── Header (title + KPI view toggle, same row) ── */}
              <div className="db-page-header">
                <div className="db-page-header-left">
                  <div className="db-page-titles">
                    <h1 className="db-page-title">Platform</h1>
                    <span className="db-page-org">{fmtNum(stats.totalOrgs)} orgs</span>
                  </div>
                </div>
                <div className="db-kpi-toggle" role="group" aria-label="KPI view">
                  <button type="button"
                    className={`db-kpi-toggle-btn${kpiView === 'overview' ? ' is-active' : ''}`}
                    onClick={() => setKpiView('overview')}
                    aria-pressed={kpiView === 'overview'}>
                    Overview
                  </button>
                  <button type="button"
                    className={`db-kpi-toggle-btn${kpiView === 'activity' ? ' is-active' : ''}`}
                    onClick={() => setKpiView('activity')}
                    aria-pressed={kpiView === 'activity'}>
                    Activity
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {kpiView === 'overview' ? (
                  <motion.div key="overview" className="db-kpi-band"
                    variants={stagger} initial="hidden" animate="show"
                    exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    <KpiCard label="Monthly recurring rev" value={fmtINR(mrrAnim)} accent
                      trend={an.mrrGrowthRate} trendInline sparkline={mrrSpark}
                      onClick={() => navigate('/platform/revenue-trend')} />
                    <KpiCard label="Paying orgs" value={fmtNum(an.payingOrgs)} icon={CreditCard}
                      sub={<span className="db-kpi2-sub-meta">{stats.totalOrgs > 0 ? Math.round((an.payingOrgs / stats.totalOrgs) * 100) : 0}% of orgs</span>}
                      onClick={() => navigate('/platform/subscriptions')} />
                    <KpiCard label="Total users" value={fmtNum(stats.totalUsers)} icon={Users}
                      sub={<span className="db-kpi2-sub-meta">{stats.totalOrgs > 0 ? (stats.totalUsers / stats.totalOrgs).toFixed(1) : '0'} avg per org</span>}
                      onClick={() => navigate('/platform/setup')} />
                    <KpiCard label="On trial" value={fmtNum(an.trialOrgs)} icon={Clock}
                      sub={<span className="db-kpi2-sub-meta">{fmtNum(an.trialsEndingSoon)} ending soon</span>}
                      onClick={() => navigate('/platform/subscriptions')} />
                  </motion.div>
                ) : (
                  <motion.div key="activity" className="db-kpi-band"
                    variants={stagger} initial="hidden" animate="show"
                    exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    <KpiCard label="New orgs this month" value={fmtNum(stats.newOrgsThisMonth)} icon={Building2}
                      accent
                      sub={<span className="db-kpi2-sub-meta">{fmtNum(stats.totalOrgs)} total orgs</span>}
                      onClick={() => navigate('/platform/setup')} />
                    <KpiCard label="Uploads (7 days)" value={fmtNum(stats.uploadsLast7Days)} icon={Upload}
                      sub={<span className="db-kpi2-sub-meta">platform-wide</span>}
                      onClick={() => navigate('/app/uploads')} />
                    <KpiCard label="Pending user requests" value={fmtNum(stats.pendingUserRequests)} icon={UserPlus}
                      sub={<span className="db-kpi2-sub-meta">awaiting approval</span>}
                      onClick={() => navigate('/app/users/requests')} />
                    <KpiCard label="Trials ending soon" value={fmtNum(an.trialsEndingSoon)} icon={Clock}
                      sub={<span className="db-kpi2-sub-meta">{fmtNum(an.trialOrgs)} on trial total</span>}
                      onClick={() => navigate('/platform/subscriptions')} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ════ REVENUE ════ */}
              <p className="ds-section-label db-section-label">Subscriptions &amp; revenue</p>
              <div className="db-grid">
                <Card className="db-span-8" title="Recurring revenue"
                  action={<span className="db-card-sub">MRR · last {months} mo</span>}>
                  {revenueTrend.length < 2 ? (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No revenue data yet</span></div>
                  ) : (
                    <TrendChart
                      labels={revenueTrend.map(p => p.label)}
                      primary={{ label: 'MRR', values: revenueTrend.map(p => p.totalAmount), color: 'var(--ink-solid)', area: true, fmt: fmtINR }}
                      extra={[{ label: 'Paying orgs', values: revenueTrend.map(p => p.totalCount), color: C_GRAY, fmt: fmtNum }]}
                      heroTrend={an.mrrGrowthRate}
                      secondaryStat={{ label: 'ARR', value: fmtINR(arr) }}
                    />
                  )}
                </Card>

                <Card className="db-span-4" title="Plan mix">
                  <DonutCard slices={planSlices} centerLabel="ORGS" />
                </Card>

                <Card className="db-span-6" title="Subscription status">
                  {statusRows.length === 0 ? (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No subscriptions yet</span></div>
                  ) : <HBarList rows={statusRows} />}
                </Card>

                <Card className="db-span-6" title="MRR by plan"
                  action={<span className="db-card-sub">{fmtINR(an.mrr)} total</span>}>
                  {revByPlan.every(r => r.value === 0) ? (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No active plans yet</span></div>
                  ) : <HBarList rows={revByPlan} />}
                </Card>
              </div>

              {/* ════ ORGANIZATIONS ════ */}
              <p className="ds-section-label db-section-label">Organizations</p>
              <div className="db-grid">
                <Card className="db-span-8" title="Organization growth"
                  action={<span className="db-card-sub">+{fmtNum(newOrgsRange)} new · {months} mo</span>}>
                  {orgTrend.length < 1 ? (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No organizations yet</span></div>
                  ) : <BarChart data={orgTrend} valueKey="totalCount" fmt={fmtNum} color={C_GRAY} />}
                </Card>

                <div className="db-span-4 db-rail">
                  <Card title="Org activation">
                    <ActivationRing active={stats.activeOrgs} total={stats.totalOrgs} />
                  </Card>
                </div>

                <Card className="db-span-6" title="Top orgs by team size">
                  {topOrgs.length === 0 ? (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No staffed orgs yet</span></div>
                  ) : (
                    <HBarList ranked emphasizeTop rows={topOrgs.map(o => ({ label: o.name, value: o.value, display: `${fmtNum(o.value)} users` }))} />
                  )}
                </Card>

                <Card className="db-span-6" title="Needs attention">
                  {!hasAttention ? <AllClearRow /> : (
                    <motion.div variants={stagger} initial="hidden" animate="show">
                      <AttentionRow icon={UserPlus} label="Pending user requests" count={stats.pendingUserRequests} tone="urgent" onClick={() => navigate('/app/users/requests')} />
                      <AttentionRow icon={Clock} label="Trials ending soon" count={an.trialsEndingSoon} tone="warn" onClick={() => navigate('/platform/subscriptions')} />
                      <AttentionRow icon={TrendingDown} label="Inactive orgs" count={stats.inactiveOrgs} tone="warn" onClick={() => navigate('/platform/setup')} />
                      <AttentionRow icon={Building2} label="Stale orgs (no users)" count={stats.staleOrgs} tone="warn" last onClick={() => navigate('/platform/setup')} />
                    </motion.div>
                  )}
                </Card>
              </div>

              {/* ════ USERS ════ */}
              <p className="ds-section-label db-section-label">Users</p>
              <div className="db-grid">
                <Card className="db-span-8" title="User growth"
                  action={<span className="db-card-sub">+{fmtNum(newUsersRange)} new · {months} mo</span>}>
                  {userTrend.length < 1 ? (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No users yet</span></div>
                  ) : <BarChart data={userTrend} valueKey="totalCount" fmt={fmtNum} color={C_GRAY} />}
                </Card>

                <Card className="db-span-4" title="Roles">
                  <DonutCard slices={roleSlices} centerLabel="USERS" />
                </Card>
              </div>

            </motion.div>
          ) : (
            <motion.div key="empty" variants={fadeIn} initial="hidden" animate="show" className="ds-empty">
              <span className="ds-empty-title">Unable to load platform data</span>
              <div className="ds-empty-actions">
                <button type="button" className="ds-btn is-secondary" onClick={load}>Try again</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
