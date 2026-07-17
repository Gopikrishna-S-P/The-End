import {
  LayoutDashboard, FolderOpen, Navigation, BarChart2, CreditCard,
  Banknote, Route, Users2, HandCoins, ArrowUp, TrendingUp,
} from 'lucide-react';
import { Logo } from './Logo';
import './AppSidebar.css';
import '../pages/Dashboard.css';

// ── Static data ───────────────────────────────────────────────────────────────

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true  },
  { icon: FolderOpen,      label: 'Cases'                    },
  { icon: Navigation,      label: 'Field Ops'                },
  { icon: BarChart2,       label: 'Reports'                  },
  { icon: CreditCard,      label: 'Loans'                    },
];

const KPIS = [
  { label: 'Collected today',  value: '₹31.4L',   sub: '78.5% of ₹40L target',  up: true,  icon: Banknote  },
  { label: 'Visits completed', value: '74 / 143',  sub: '14 in progress now',    up: null,  icon: Route     },
  { label: 'FOs on field',     value: '9 / 12',    sub: '3 idle · reassign',     up: null,  icon: Users2    },
  { label: 'PTP today',        value: '₹8.2L',     sub: '+₹2.1L vs yesterday',   up: true,  icon: HandCoins },
];

const WEEK = [
  { d: 'Mon', v: 18.2 },
  { d: 'Tue', v: 24.1 },
  { d: 'Wed', v: 28.7 },
  { d: 'Thu', v: 22.4 },
  { d: 'Fri', v: 33.1 },
  { d: 'Sat', v: 31.4, today: true },
];
const WEEK_MAX = 33.1;

const TOP_AGENTS = [
  { name: 'Priya Menon',  area: 'Koramangala', amt: '₹7.8L' },
  { name: 'Ravi Kumar',   area: 'Jayanagar',   amt: '₹6.1L' },
  { name: 'Arun Sharma',  area: 'HSR Layout',  amt: '₹5.4L' },
  { name: 'Sunil Patel',  area: 'Whitefield',  amt: '₹4.9L' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AppPreviewFrame() {
  const appScope = {
    '--bg-canvas':     '#F7F8FA',
    '--bg-surface':    '#FFFFFF',
    '--bg-subtle':     '#F2F4F7',
    '--bg-hover':      '#F2F4F7',
    '--bg-active':     '#E7F4EC',
    '--border':        '#E4E7EC',
    '--border-strong': '#D0D5DD',
    '--border-subtle': '#F0F1F4',
    '--text-primary':   '#101828',
    '--text-secondary': '#475467',
    '--text-tertiary':  '#667085',
    '--ink-primary':   '#101828',
    '--ink-secondary': '#475467',
    '--ink-tertiary':  '#667085',
    '--ink-solid':     '#0AA550',
    '--brand':         '#0AA550',
    '--brand-subtle':  '#E7F4EC',
    '--success':       '#067647',
    '--warning':       '#B54708',
    '--danger':        '#B42318',
    '--asb-bg':        '#ffffff',
    '--asb-canvas':    '#F7F8FA',
    '--asb-surface':   '#F2F4F7',
    '--asb-border':    '#E4E7EC',
    '--asb-border-hi': '#D0D5DD',
    '--asb-ink':       '#101828',
    '--asb-ink-dim':   '#475467',
    '--asb-ink-faint': '#667085',
    '--rp-sb-on':      '200px',
    '--rp-sb-off':     '60px',
    '--rp-tb-h':       '44px',
    '--radius':        '8px',
    '--elevation-3':   '0 10px 15px -3px rgba(0,0,0,.05)',
    '--sans':          "'Inter', system-ui, sans-serif",
    '--mono':          "'JetBrains Mono', ui-monospace, monospace",
  } as React.CSSProperties;

  return (
    <div className="apf-outer" style={appScope} aria-hidden="true">

      {/* ── Browser chrome (light) ── */}
      <div className="apf-chrome">
        <div className="apf-chrome-dots">
          <span style={{ background: '#FF5F57' }} />
          <span style={{ background: '#FEBC2E' }} />
          <span style={{ background: '#28C840' }} />
        </div>
        <div className="apf-chrome-bar">
          <span className="apf-chrome-url">app.recoverpro.in/dashboard</span>
        </div>
      </div>

      {/* ── Scaled app shell ── */}
      <div className="apf-scaler-wrap">
        <div className="apf-scaler">

          {/* ── Sidebar ── */}
          <aside className="asb-root">
            <div className="asb-header">
              <Logo height={22} />
            </div>
            <nav className="asb-nav">
              {NAV.map(({ icon: Icon, label, active }) => (
                <div key={label} className={`asb-nav-item${active ? ' is-active' : ''}`}
                  style={{ cursor: 'default', userSelect: 'none' }}>
                  <span className="asb-nav-icon"><Icon size={15} /></span>
                  <span className="asb-nav-label">{label}</span>
                </div>
              ))}
            </nav>
          </aside>

          {/* ── Main column ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Dark topbar */}
            <div className="apf-topbar">
              <span className="apf-topbar-title">Dashboard</span>
              <div className="apf-topbar-right">
                <span className="apf-topbar-date">Mon, 22 Jun 2026</span>
                <div className="apf-topbar-avatar">SP</div>
              </div>
            </div>

            {/* Page content */}
            <div className="apf-page">

              {/* KPI grid — 4 cards */}
              <div className="db-kpi-grid apf-kpi-grid">
                {KPIS.map(({ label, value, sub, up, icon: Icon }) => (
                  <div key={label} className="apf-kpi-card">
                    <div className="apf-kpi-head">
                      <span className="apf-kpi-label">{label}</span>
                      <Icon size={13} className="apf-kpi-icon" />
                    </div>
                    <span className="apf-kpi-value">{value}</span>
                    <span className="apf-kpi-sub" style={{ color: up === true ? 'var(--success)' : 'var(--ink-tertiary)' }}>
                      {up === true && <ArrowUp size={9} />}
                      {sub}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chart + agents — fills remaining height, gets zoom-cut at frame edge */}
              <div className="apf-lower">

                {/* Bar chart */}
                <div className="apf-card apf-chart-card">
                  <div className="apf-card-head">
                    <span className="apf-card-title">Collections · This Week</span>
                    <span className="apf-trend">
                      <TrendingUp size={11} />↑ 14% vs last week
                    </span>
                  </div>
                  <div className="apf-bars">
                    {WEEK.map((b, i) => (
                      <div key={i} className="apf-bar-col">
                        {/* Day label at top — above cut line, always visible */}
                        <span className="apf-bar-day" style={{ color: b.today ? 'var(--brand)' : 'var(--ink-tertiary)', fontWeight: b.today ? 700 : 400 }}>
                          {b.d}
                        </span>
                        <div className="apf-bar-track">
                          <div className="apf-bar" style={{
                            height: `${Math.round((b.v / WEEK_MAX) * 100)}%`,
                            background: b.today ? 'var(--brand, #0AA550)' : 'var(--brand-subtle, #E7F4EC)',
                          }} />
                        </div>
                        {b.today && (
                          <span className="apf-bar-val">₹{b.v}L</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top agents */}
                <div className="apf-card apf-agents-card">
                  <span className="apf-card-title" style={{ marginBottom: 10, display: 'block' }}>Top Agents Today</span>
                  {TOP_AGENTS.map((r, i) => (
                    <div key={r.name} className="apf-agent-row" style={{ borderBottom: i < TOP_AGENTS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span className="apf-agent-rank" style={{ background: i === 0 ? 'var(--brand-subtle)' : 'var(--bg-subtle)', color: i === 0 ? 'var(--brand)' : 'var(--ink-tertiary)' }}>
                        {i + 1}
                      </span>
                      <div className="apf-agent-info">
                        <span className="apf-agent-name">{r.name}</span>
                        <span className="apf-agent-area">{r.area}</span>
                      </div>
                      <span className="apf-agent-amt">{r.amt}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
