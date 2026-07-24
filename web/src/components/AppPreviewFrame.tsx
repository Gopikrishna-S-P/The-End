import { motion } from 'framer-motion';
import {
  BarChart2, Send, Layers, LineChart, Upload, Settings2,
  Banknote, Route, Navigation, Handshake, ClipboardCheck, UserPlus,
  ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight,
  PanelLeft, Search, Bell, HelpCircle, Settings, LogOut,
} from 'lucide-react';
import { Logo } from './Logo';
import lucienLogo from '../assets/images/lucien-logo.png';
import {
  stagger, fmtINR, fmtNum,
  KpiCard, Card, DonutCard, HBarList, BarChart, AttentionRow, TrendChart, ProgressRing,
  type DonutSlice,
} from '../pages/DashboardShared';
import './AppSidebar.css';
import '../styles/ds/ds.card.css';
import '../styles/ds/ds.pill.css';
import '../pages/Dashboard.css';

// ── Static demo data ──────────────────────────────────────────────────────────
// This frame renders the real org dashboard (Dashboard.tsx, ORG_ADMIN branch)
// off the same shared components, so the landing page can't drift from the
// product. Everything below stands in for the API payload — hardcoded, and
// internally consistent (today's PTPs match the attention row, the trend's
// last month matches the month-vs-month bars, etc.).

const USER = {
  name: 'Sam',
  init: 'SA',
  role: 'Org Admin',
};

const NAV = [
  { icon: BarChart2, label: 'Dashboard', active: true },
  { icon: Send,      label: 'Daily Dispatch' },
  { icon: Layers,    label: 'Loans'          },
  { icon: LineChart, label: 'Reports'        },
  { icon: Upload,    label: 'File Uploads'   },
  { icon: Settings2, label: 'User Setup'     },
];

const TODAY = {
  collectedToday:        3_140_000,
  collectedYesterday:    2_760_000,
  visitsCompletedToday:  74,
  visitsTotalToday:      143,
  visitsInProgressToday: 14,
  visitsPendingToday:    55,
  fosActiveToday:        9,
  fosIdleToday:          3,
  fosTotalCount:         12,
  ptpsDueToday:          26,
  ptpAmountDueToday:     820_000,
};
const TODAY_VS_YEST =
  ((TODAY.collectedToday - TODAY.collectedYesterday) / TODAY.collectedYesterday) * 100;

const TREND_LABELS = ['February', 'March', 'April', 'May', 'June', 'July'];
const TREND_VALUES = [41_200_000, 38_900_000, 47_600_000, 44_300_000, 52_800_000, 61_400_000];
const RANGE_TOTAL  = TREND_VALUES.reduce((s, v) => s + v, 0);
const LAST_MONTH   = TREND_VALUES[TREND_VALUES.length - 2];
const THIS_MONTH   = TREND_VALUES[TREND_VALUES.length - 1];
const GROWTH_RATE  = ((THIS_MONTH - LAST_MONTH) / LAST_MONTH) * 100;

const ATTENTION = {
  approvalsCount:  12,
  approvalsAmount: 460_000,
  ptpsTodayCount:  26,
  ptpsAmount:      820_000,
  unassigned:      148,
  visitsDoneToday: 74,
  dispatchedToday: 143,
};

const ASSIGN_SLICES: DonutSlice[] = [
  { label: 'Assigned',   value: 1_284, color: 'var(--brand)' },
  { label: 'Unassigned', value: 148,   color: 'var(--brand-subtle)' },
];

const PTP = { fulfilled: 214, broken: 61, active: 96 };
const PTP_RATE = Math.round((PTP.fulfilled / (PTP.fulfilled + PTP.broken)) * 100);

const TOP_AGENTS = [
  { name: 'Priya Menon', amount: 1_840_000 },
  { name: 'Ravi Kumar',  amount: 1_520_000 },
  { name: 'Arun Sharma', amount: 1_290_000 },
  { name: 'Sunil Patel', amount: 1_160_000 },
  { name: 'Neha Iyer',   amount:   980_000 },
];

const TEAM = {
  usersByRole: [
    { roleName: 'FO',      count: 38 },
    { roleName: 'CALLER',  count: 14 },
    { roleName: 'TL',      count: 9  },
    { roleName: 'TRACER',  count: 6  },
    { roleName: 'MANAGER', count: 4  },
  ],
  activeUsers: 63,
  totalUsers:  71,
};

const noop = () => {};

// ── Component ─────────────────────────────────────────────────────────────────

export function AppPreviewFrame() {
  // The landing page runs on its own token set (LandingPage.css `.landing`) and
  // never loads the app's :root tokens, so the app's palette/scale is pinned
  // here for this subtree only — same values as styles/ds/ds.tokens.css.
  const appScope = {
    '--bg-canvas':     '#F6F7F9',
    '--bg-surface':    '#FFFFFF',
    '--bg-subtle':     '#F2F4F7',
    '--bg-hover':      '#E8EBF0',
    '--bg-active':     '#E7F4EC',
    '--border':        '#E4E7EC',
    '--border-strong': '#D0D5DD',
    '--border-subtle': '#F0F1F4',
    '--text-primary':   '#101828',
    '--text-secondary': '#475467',
    '--text-tertiary':  '#667085',
    '--text-on-solid':  '#FFFFFF',
    '--ink-primary':   '#101828',
    '--ink-secondary': '#475467',
    '--ink-tertiary':  '#667085',
    '--ink-solid':     '#0AA550',
    '--brand':         '#0AA550',
    '--brand-subtle':  '#E7F4EC',
    '--focus-ring':    '#2563EB',
    '--success':        '#067647',
    '--success-subtle': '#ECFDF3',
    '--success-border': '#ABEFC6',
    '--warning':        '#B54708',
    '--warning-subtle': '#FFFAEB',
    '--warning-border': '#FEDF89',
    '--danger':         '#B42318',
    '--danger-subtle':  '#FEF3F2',
    '--danger-border':  '#FECDCA',
    '--danger-solid':   '#D92D20',
    '--font-sans': "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    '--font-mono': "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
    '--sans':      "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    '--mono':      "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
    '--text-2xs': '10px',
    '--text-xs':  '11px',
    '--radius-xs':   '4px',
    '--radius-sm':   '6px',
    '--radius-md':   '8px',
    '--radius-lg':   '12px',
    '--radius-full': '999px',
    '--shadow-sm': '0 1px 3px rgba(16,24,40,0.10), 0 1px 2px rgba(16,24,40,0.06)',
    '--shadow-md': '0 4px 8px -2px rgba(16,24,40,0.10), 0 2px 4px -2px rgba(16,24,40,0.06)',
    '--dur-fast': '140ms',
    '--dur-base': '200ms',
    '--dur-slow': '280ms',
    '--ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
    '--ease-out':      'cubic-bezier(0.16, 1, 0.3, 1)',
    '--asb-bg':        '#ffffff',
    '--asb-canvas':    '#F6F7F9',
    '--asb-surface':   '#F2F4F7',
    '--asb-border':    '#E4E7EC',
    '--asb-border-hi': '#D0D5DD',
    '--asb-ink':       '#101828',
    '--asb-ink-dim':   '#475467',
    '--asb-ink-faint': '#667085',
    '--rp-sb-on':  '244px',
    '--rp-sb-off': '64px',
  } as React.CSSProperties;

  return (
    <div className="apf-outer" style={appScope} aria-hidden="true" inert>

      {/* ── Browser chrome ── */}
      <div className="apf-chrome">
        <div className="apf-chrome-dots">
          <span style={{ background: '#FF5F57' }} />
          <span style={{ background: '#FEBC2E' }} />
          <span style={{ background: '#28C840' }} />
        </div>
        <div className="apf-chrome-bar">
          <span className="apf-chrome-url">app.recoverpro.in/app/dashboard</span>
        </div>
      </div>

      {/* ── Scaled app shell ── */}
      <div className="apf-scaler-wrap">
        <div className="apf-scaler">

          {/* ── Sidebar ── */}
          <aside className="asb-root">
            <div className="asb-header">
              <span className="asb-header-logo--btn"><Logo height={34} /></span>
              <span className="asb-collapse-toggle"><PanelLeft size={16} /></span>
            </div>

            <nav className="asb-nav">
              <div className="asb-section">
                <div className="asb-section-wrap">
                  <ul role="list">
                    {NAV.map(({ icon: Icon, label, active }) => (
                      <li key={label}>
                        <div className={`asb-nav-item${active ? ' is-active' : ''}`}>
                          <span className="asb-nav-icon"><Icon size={14} /></span>
                          <span className="asb-nav-label">{label}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </nav>

            <div className="asb-footer">
              <div className="asb-footer-pill">
                <span className="asb-avatar-wrap">
                  <span className="asb-avatar" style={{ background: '#0AA550' }}>{USER.init}</span>
                </span>
                <div className="asb-footer-identity">
                  <span className="asb-footer-name">{USER.name}</span>
                  <div className="asb-footer-meta-row">
                    <span className="asb-footer-role">{USER.role}</span>
                  </div>
                </div>
                <span className="asb-footer-logout-icon"><LogOut size={14} /></span>
              </div>
            </div>
          </aside>

          {/* ── Main column ── */}
          <div className="apf-main">

            <div className="apf-topbar">
              <div className="apf-topbar-left">
                <div className="apf-history-nav">
                  <span className="apf-history-btn is-disabled"><ChevronLeft size={18} /></span>
                  <span className="apf-history-btn is-disabled"><ChevronRight size={18} /></span>
                </div>
                <span className="apf-topbar-title">Dashboard</span>
              </div>

              <div className="apf-topbar-right">
                <span className="apf-topbar-search">
                  <Search size={16} className="apf-topbar-search-icon" />
                  <span className="apf-topbar-search-text">Search</span>
                </span>
                <span className="apf-topbar-icon apf-topbar-icon--sep"><HelpCircle size={18} /></span>
                <span className="apf-topbar-icon">
                  <Bell size={18} />
                  <span className="apf-notif-badge">3</span>
                </span>
                <span className="apf-topbar-icon"><Settings size={18} /></span>
                <span className="apf-topbar-icon">
                  <img src={lucienLogo} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                </span>
              </div>
            </div>

            {/* ── Dashboard — same markup + components as the org view ── */}
            <div className="apf-viewport">
              <div className="db-root">
                <div className="db-content">
                  <motion.div variants={stagger} initial="hidden" animate="show" className="db-inner">

                    <div className="db-page-header">
                      <div className="db-page-header-left">
                        <div className="db-page-titles">
                          <h1 className="db-page-title">Overview</h1>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="db-kpi-toggle">
                          <span className="db-kpi-toggle-btn is-active">Today</span>
                          <span className="db-kpi-toggle-btn">This month</span>
                        </div>
                      </div>
                    </div>

                    <motion.div className="db-kpi-band" variants={stagger}>
                      <KpiCard label="Collected today" value={fmtINR(TODAY.collectedToday)}
                        icon={Banknote} accent
                        sub={
                          <span className="db-kpi2-sub-meta is-up">
                            <ArrowUp size={10} />
                            {Math.abs(TODAY_VS_YEST).toFixed(1)}% vs yesterday
                          </span>
                        } />
                      <KpiCard label="Visits today"
                        value={`${TODAY.visitsCompletedToday} / ${TODAY.visitsTotalToday}`}
                        icon={Route}
                        sub={<span className="db-kpi2-sub-meta">{TODAY.visitsInProgressToday} in progress · {TODAY.visitsPendingToday} pending</span>} />
                      <KpiCard label="FOs on field" value={String(TODAY.fosActiveToday)}
                        icon={Navigation}
                        sub={
                          <span className="db-kpi2-sub-meta">
                            {TODAY.fosIdleToday} idle
                            <span className="db-kpi2-sub-vdiv" />
                            {TODAY.fosTotalCount} total
                          </span>
                        } />
                      <KpiCard label="PTPs due today" value={fmtNum(TODAY.ptpsDueToday)}
                        icon={Handshake}
                        sub={<span className="db-kpi2-sub-meta">{fmtINR(TODAY.ptpAmountDueToday)} at risk</span>} />
                    </motion.div>

                    <div className="db-grid">

                      <Card className="db-span-8" title="Performance trend">
                        <TrendChart
                          labels={TREND_LABELS}
                          primary={{ label: 'Collections', values: TREND_VALUES, color: 'var(--ink-solid)', area: true, fmt: fmtINR }}
                          heroTrend={GROWTH_RATE}
                          secondaryStat={{ label: 'Range total', value: fmtINR(RANGE_TOTAL) }}
                        />
                      </Card>

                      <Card className="db-span-4" title="Needs attention">
                        <motion.div variants={stagger} initial="hidden" animate="show">
                          <AttentionRow icon={ClipboardCheck} label="Pending approvals"
                            count={ATTENTION.approvalsCount} meta={fmtINR(ATTENTION.approvalsAmount)}
                            tone="warn" onClick={noop} />
                          <AttentionRow icon={Handshake} label="PTPs due today"
                            count={ATTENTION.ptpsTodayCount} meta={fmtINR(ATTENTION.ptpsAmount)}
                            tone="warn" onClick={noop} />
                          <AttentionRow icon={UserPlus} label="Unassigned cases"
                            count={ATTENTION.unassigned} tone="urgent" onClick={noop} />
                          <AttentionRow icon={Route} label="Visits done today"
                            count={ATTENTION.visitsDoneToday} tone="warn" onClick={noop} />
                          <AttentionRow icon={Navigation} label="Cases dispatched today"
                            count={ATTENTION.dispatchedToday} tone="warn" last onClick={noop} />
                        </motion.div>
                      </Card>

                      <Card className="db-span-4" title="Case assignment">
                        <DonutCard slices={ASSIGN_SLICES} centerLabel="CASES" />
                      </Card>

                      <Card className="db-span-4" title="PTP fulfillment">
                        <div className="db-ptp-ring-inner">
                          <ProgressRing pct={PTP_RATE} subLabel="RATE" color="var(--brand)" trackColor="var(--brand-subtle)" />
                          <div className="db-ptp-ring-stats">
                            <div className="db-ptp-stat"><span className="db-ptp-stat-dot" style={{ background: 'var(--brand)' }} /><span className="db-ptp-stat-label">Fulfilled</span><span className="db-ptp-stat-val">{PTP.fulfilled}</span></div>
                            <div className="db-ptp-stat"><span className="db-ptp-stat-dot" style={{ background: 'var(--danger)' }} /><span className="db-ptp-stat-label">Broken</span><span className="db-ptp-stat-val">{PTP.broken}</span></div>
                            <div className="db-ptp-stat"><span className="db-ptp-stat-dot" style={{ background: 'var(--ink-tertiary)' }} /><span className="db-ptp-stat-label">Active</span><span className="db-ptp-stat-val">{PTP.active}</span></div>
                          </div>
                        </div>
                      </Card>

                      <Card className="db-span-4" title="Month vs last month">
                        <BarChart data={[
                          { year: 0, month: 0, label: 'Last', totalAmount: LAST_MONTH, totalCount: 0 },
                          { year: 0, month: 1, label: 'This', totalAmount: THIS_MONTH, totalCount: 0 },
                        ]} height={120} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11.5, fontWeight: 600, color: 'var(--success, #1D7A3E)' }}>
                          <ArrowUp size={12} />
                          {Math.abs(GROWTH_RATE).toFixed(1)}% growth
                        </div>
                      </Card>

                      <Card className="db-span-6" title="Top collectors"
                        action={<span className="db-card-sub">this month</span>}>
                        <HBarList ranked emphasizeTop rows={TOP_AGENTS.map(a => ({
                          label: a.name, value: a.amount, display: fmtINR(a.amount),
                        }))} />
                      </Card>

                      <Card className="db-span-6" title="Team overview"
                        action={<span className="db-trend-link" style={{ fontSize: 12 }}>Manage <ArrowUpRight size={11} /></span>}>
                        <div className="db-team-list">
                          {TEAM.usersByRole.map(r => (
                            <div key={r.roleName} className="db-team-row">
                              <span className="db-team-role">{r.roleName}</span>
                              <span className="db-team-count">{r.count}</span>
                            </div>
                          ))}
                        </div>
                        <div className="db-team-footer">
                          <span>{TEAM.activeUsers} active</span>
                          <span className="db-kpi2-sub-vdiv" />
                          <span>{TEAM.totalUsers} total</span>
                        </div>
                      </Card>

                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
