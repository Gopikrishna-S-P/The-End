import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Building2, Users, ArrowUpRight, ArrowUp, ArrowDown, Minus,
  AlertCircle, RefreshCw, UserPlus, Clock, TrendingDown, CheckCircle,
  CreditCard, BadgePercent,
} from 'lucide-react';
import { platformApi, type PlatformStats, type PlatformAnalytics, type PlatformTrendPoint } from '../api/platformApi';
import './Dashboard.css';

// ── Motion ───────────────────────────────────────────────────────────────────
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } };
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
};
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

// ── Chart palette (categorical — charts only, not chrome) ──────────────────────
const C_ACCENT = 'var(--ink-solid)';
const C_BLUE   = 'var(--info)';
const C_AMBER  = 'var(--warning)';
const C_SLATE  = '#94A3B8';
const C_ERROR  = 'var(--error)';

const PLAN_PRICE: Record<string, number> = { STARTER: 2999, GROWTH: 7999, ENTERPRISE: 19999 };

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmtINR(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}
function fmtNum(v?: number | null) { return v != null ? v.toLocaleString('en-IN') : '—'; }

// ── Ripple + count-up ──────────────────────────────────────────────────────────
function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const fire = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
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
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start: number | null = null;
    const frame = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
}

// ── Dual sparkline (KPI) ─────────────────────────────────────────────────────
function Sparkline({ data, color = C_ACCENT, height = 40 }: { data: number[]; color?: string; height?: number }) {
  const W = 200, pad = 3;
  const eff = data.length >= 2 ? data : [0, 0];
  const max = Math.max(...eff), min = Math.min(...eff), range = max - min || 1;
  const pts = eff.map((v, i) => {
    const x = pad + (i / (eff.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="db-spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, trend, sparkline, icon: Icon, accent, onClick }: {
  label: string; value: string; trend?: number | null;
  sparkline?: number[]; icon?: React.ElementType; accent?: boolean; onClick?: () => void;
}) {
  const { ref, fire } = useRipple<HTMLButtonElement>();
  const up = trend != null && trend > 0, down = trend != null && trend < 0;
  return (
    <motion.button ref={ref} type="button" variants={fadeUp}
      className={`db-kpi2-card${accent ? ' is-accent' : ''}${onClick ? ' is-hoverable' : ''}`}
      onClick={e => { fire(e); onClick?.(); }} disabled={!onClick}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,.10)' }}
      transition={{ duration: 0.16, ease: 'easeOut' }}>
      <div className="db-kpi2-top">
        <span className="db-kpi2-label">{label}</span>
        {Icon && <span className="db-kpi2-icon"><Icon size={14} aria-hidden="true" /></span>}
      </div>
      <div className="db-kpi2-value-row">
        <span className="db-kpi2-value">{value}</span>
        {trend != null && (
          <span className={`db-kpi2-trend${up ? ' is-up' : down ? ' is-down' : ''}`}>
            {up ? <ArrowUp size={10} /> : down ? <ArrowDown size={10} /> : <Minus size={10} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      {sparkline && sparkline.length >= 2 && <Sparkline data={sparkline} color={down ? C_ERROR : C_ACCENT} />}
    </motion.button>
  );
}

// ── Card shell ────────────────────────────────────────────────────────────────
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

// ── Donut ───────────────────────────────────────────────────────────────────
interface Slice { label: string; value: number; color: string }
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function Donut({ slices, size = 132, centerLabel }: { slices: Slice[]; size?: number; centerLabel: string }) {
  const sw = 16, r = (size - sw) / 2, cx = size / 2, cy = size / 2;
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} className="db-donut">
        <circle cx={cx} cy={cy} r={r} stroke="var(--border)" strokeWidth={sw} fill="none" />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="13">—</text>
      </svg>
    );
  }
  let angle = -90;
  const arcs: { d: string; color: string }[] = [];
  for (const s of slices) {
    if (s.value <= 0) continue;
    const sweep = (s.value / total) * 359.9;
    const end = angle + sweep;
    const a = polar(cx, cy, r, angle), b = polar(cx, cy, r, end);
    arcs.push({ d: `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`, color: s.color });
    angle = end;
  }
  return (
    <svg width={size} height={size} className="db-donut">
      <circle cx={cx} cy={cy} r={r} stroke="var(--border)" strokeWidth={sw} fill="none" />
      {arcs.map((a, i) => (
        <motion.path key={i} d={a.d} stroke={a.color} strokeWidth={sw} fill="none" strokeLinecap="butt"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.65, delay: i * 0.12 + 0.15, ease: [0.22, 1, 0.36, 1] }} />
      ))}
      <text x={cx} y={cy - 3} textAnchor="middle" fill="var(--ink-primary)" fontSize="22" fontWeight="700">{total.toLocaleString('en-IN')}</text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="9" fontFamily="var(--mono)" letterSpacing="0.06em">{centerLabel}</text>
    </svg>
  );
}
function DonutCard({ slices, centerLabel, fmt = fmtNum }: { slices: Slice[]; centerLabel: string; fmt?: (n: number) => string }) {
  const has = slices.some(s => s.value > 0);
  return (
    <div className="db-donut-card">
      <Donut slices={slices} centerLabel={centerLabel} />
      <div className="db-legend">
        {slices.map(s => (
          <div key={s.label} className="db-legend-row">
            <span className="db-legend-dot" style={{ background: s.color }} />
            <span className="db-legend-label">{s.label}</span>
            <span className="db-legend-val">{fmt(s.value)}</span>
          </div>
        ))}
        {!has && <span className="db-legend-empty">No data yet</span>}
      </div>
    </div>
  );
}

// ── Horizontal bars ─────────────────────────────────────────────────────────
function HBarList({ rows, ranked }: { rows: { label: string; value: number; display: string; color?: string }[]; ranked?: boolean }) {
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
            <div className="db-hbar-track">
              <motion.div className="db-hbar-fill" style={{ background: r.color ?? C_ACCENT }}
                initial={{ width: 0 }} animate={{ width: `${(r.value / max) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Vertical bar chart (growth) ───────────────────────────────────────────────
function BarChart({ data, color = C_ACCENT, height = 168, fmt = fmtNum }: {
  data: PlatformTrendPoint[]; color?: string; height?: number; fmt?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map(d => d.totalCount));
  return (
    <div className="db-bars" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d.totalCount / max) * 100);
        const peak = d.totalCount === max && max > 1;
        return (
          <div key={`${d.year}-${d.month}-${i}`} className="db-bar-col" title={`${d.label}: ${fmt(d.totalCount)}`}>
            <span className="db-bar-cap">{fmt(d.totalCount)}</span>
            <div className="db-bar-track">
              <motion.div className={`db-bar-fill${peak ? ' is-peak' : ''}`}
                style={color !== C_ACCENT ? { background: color } : undefined}
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

// ── Area-line chart (revenue MRR) with hover ───────────────────────────────────
function RevenueLine({ data }: { data: PlatformTrendPoint[] }) {
  const W = 600, H = 200, padL = 8, padR = 16, padY = 18;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hov, setHov] = useState<number | null>(null);
  const n = data.length;
  const vals = data.map(d => d.totalAmount);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0), range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = padL + (n > 1 ? i / (n - 1) : 0.5) * (W - padL - padR);
    const y = padY + (1 - (d.totalAmount - min) / range) * (H - padY * 2);
    return [x, y] as [number, number];
  });
  const path = pts.length < 2 ? '' : pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = path && `${path} L ${pts[n-1][0].toFixed(1)},${(H-padY).toFixed(1)} L ${pts[0][0].toFixed(1)},${(H-padY).toFixed(1)} Z`;

  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const el = svgRef.current; if (!el || n === 0) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((x - padL) / (W - padL - padR)) * (n - 1));
    setHov(Math.max(0, Math.min(n - 1, idx)));
  }, [n]);

  return (
    <div className="db-trend-chart-wrap" onMouseLeave={() => setHov(null)}>
      <svg ref={svgRef} className="db-trend-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseMove={onMove}>
        <defs>
          <linearGradient id="pdGradRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ink-solid)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--ink-solid)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={padY + f * (H - padY * 2)} y2={padY + f * (H - padY * 2)}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
        ))}
        {area && <motion.path d={area} fill="url(#pdGradRev)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />}
        {path && (
          <motion.path d={path} fill="none" stroke="var(--ink-solid)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        )}
        {hov != null && pts[hov] && (
          <>
            <line x1={pts[hov][0]} x2={pts[hov][0]} y1={padY} y2={H - padY} stroke="var(--ink-tertiary)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={pts[hov][0]} cy={pts[hov][1]} r="4" fill="var(--bg-surface)" stroke="var(--ink-solid)" strokeWidth="2" />
          </>
        )}
      </svg>
      <AnimatePresence>
        {hov != null && data[hov] && pts[hov] && (
          <motion.div className="db-ml-tooltip" style={{ left: `${(pts[hov][0] / W) * 100}%` }}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            <span className="db-ml-tooltip-date">{data[hov].label}</span>
            <div className="db-ml-tooltip-row">
              <span className="db-ml-tooltip-dot" style={{ background: 'var(--ink-solid)' }} />
              <span className="db-ml-tooltip-key">MRR</span>
              <span className="db-ml-tooltip-val">{fmtINR(data[hov].totalAmount)}</span>
            </div>
            <div className="db-ml-tooltip-row">
              <span className="db-ml-tooltip-dot" style={{ background: C_SLATE }} />
              <span className="db-ml-tooltip-key">Paying orgs</span>
              <span className="db-ml-tooltip-val">{fmtNum(data[hov].totalCount)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="db-trend-x-labels">
        {data.map((p, i) => (
          <button key={i} type="button"
            className={`db-trend-x-label${i === n - 1 ? ' is-current' : ''}${hov === i ? ' is-hovered' : ''}`}
            onClick={() => setHov(hov === i ? null : i)}>{p.label?.slice(0, 3) ?? ''}</button>
        ))}
      </div>
    </div>
  );
}

// ── Org activation ring ─────────────────────────────────────────────────────
function ActivationRing({ active, total }: { active: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.round((active / total) * 100), 100) : 0;
  const SIZE = 150, R = 58, sw = 10, cx = SIZE / 2, cy = SIZE / 2, circ = 2 * Math.PI * R;
  return (
    <div className="db-ring-main">
      <svg width={SIZE} height={SIZE}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={sw} />
        {pct > 0 && (
          <motion.circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--ink-solid)" strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={circ} style={{ rotate: -90, transformOrigin: `${cx}px ${cy}px` }}
            initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} />
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--ink-primary)" fontSize="25" fontWeight="700">{pct}%</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="10" fontFamily="var(--mono)">ACTIVE</text>
      </svg>
      <div className="db-ring-stats">
        <div className="db-ring-stat"><span className="db-ring-stat-val">{fmtNum(active)}</span><span className="db-ring-stat-lbl">Active orgs</span></div>
        <div className="db-ring-divider" />
        <div className="db-ring-stat"><span className="db-ring-stat-val">{fmtNum(total)}</span><span className="db-ring-stat-lbl">Total orgs</span></div>
      </div>
    </div>
  );
}

// ── Attention rows ─────────────────────────────────────────────────────────
function AttentionRow({ icon: Icon, label, count, tone, last, onClick }: {
  icon: React.ElementType; label: string; count: number; tone: 'urgent' | 'warn'; last?: boolean; onClick: () => void;
}) {
  const active = count > 0;
  return (
    <motion.button variants={fadeUp} type="button"
      className={`db-att-row${last ? '' : ' has-border'}${active ? ` is-${tone}` : ''}`}
      onClick={onClick} whileHover={{ x: 2 }} transition={{ duration: 0.16, ease: 'easeOut' }}>
      <span className={`db-att-chip${active ? ` is-${tone}` : ''}`}><Icon size={15} aria-hidden="true" /></span>
      <span className="db-att-label">{label}</span>
      <span className="db-att-right">
        {active ? <span className={`ds-pill is-${tone === 'urgent' ? 'error' : 'warn'}`}>{count}</span> : <span className="db-att-zero">0</span>}
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

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton({ w, h, r = 6 }: { w?: string; h: number; r?: number }) {
  return <span className="ds-skel" style={{ width: w ?? '100%', height: h, borderRadius: r }} />;
}
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
      { label: 'Growth',     value: p?.growth ?? 0,     color: C_BLUE },
      { label: 'Starter',    value: p?.starter ?? 0,    color: C_AMBER },
      { label: 'Free / none',value: p?.none ?? 0,       color: C_SLATE },
    ];
  }, [an]);

  const statusRows = useMemo(() => {
    const s = an?.statusCounts;
    return [
      { label: 'Active',    value: s?.active ?? 0,    display: fmtNum(s?.active),    color: C_ACCENT },
      { label: 'Trial',     value: s?.trial ?? 0,     display: fmtNum(s?.trial),     color: C_BLUE },
      { label: 'Past due',  value: s?.pastDue ?? 0,   display: fmtNum(s?.pastDue),   color: C_AMBER },
      { label: 'Cancelled', value: s?.cancelled ?? 0, display: fmtNum(s?.cancelled), color: C_ERROR },
      { label: 'Inactive',  value: s?.inactive ?? 0,  display: fmtNum(s?.inactive),  color: C_SLATE },
    ].filter(r => r.value > 0);
  }, [an]);

  // MRR contribution by plan (count × list price) — derived, real
  const revByPlan = useMemo(() => {
    const p = an?.planCounts;
    const rows = [
      { label: 'Enterprise', value: (p?.enterprise ?? 0) * PLAN_PRICE.ENTERPRISE, color: C_ACCENT },
      { label: 'Growth',     value: (p?.growth ?? 0)     * PLAN_PRICE.GROWTH,     color: C_BLUE },
      { label: 'Starter',    value: (p?.starter ?? 0)    * PLAN_PRICE.STARTER,    color: C_AMBER },
    ];
    return rows.map(r => ({ ...r, display: fmtINR(r.value) }));
  }, [an]);

  const roleSlices: Slice[] = useMemo(() => [
    { label: 'Org admins',     value: rb?.orgAdmin ?? 0, color: C_ACCENT },
    { label: 'Managers',       value: rb?.manager ?? 0,  color: C_BLUE },
    { label: 'Team leads',     value: rb?.tl ?? 0,       color: '#8B5CF6' },
    { label: 'Field officers', value: rb?.fo ?? 0,       color: C_AMBER },
    { label: 'Callers',        value: rb?.caller ?? 0,   color: C_SLATE },
    { label: 'Tracers',        value: rb?.tracer ?? 0,   color: '#0EA5E9' },
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

              {/* ── Header ── */}
              <div className="db-page-header">
                <div className="db-page-header-left">
                  <div className="db-page-titles">
                    <h1 className="db-page-title">Platform</h1>
                    <span className="db-page-org">{fmtNum(stats.totalOrgs)} orgs</span>
                  </div>
                </div>
                <div className="db-date-range" role="tablist" aria-label="Trend range">
                  {([3, 6, 12] as const).map(r => (
                    <button key={r} type="button" role="tab" aria-selected={months === r}
                      className={`db-date-range-btn${months === r ? ' is-active' : ''}`}
                      onClick={() => setMonths(r)}>{r}M</button>
                  ))}
                </div>
              </div>

              {/* ── KPI band ── */}
              <motion.div className="db-kpi-band" variants={stagger}>
                <KpiCard label="Monthly recurring rev" value={fmtINR(mrrAnim)} accent
                  trend={an.mrrGrowthRate} sparkline={mrrSpark}
                  onClick={() => navigate('/platform/revenue-trend')} />
                <KpiCard label="Annual run rate" value={fmtINR(arr)} icon={BadgePercent} />
                <KpiCard label="Paying orgs" value={fmtNum(an.payingOrgs)} icon={CreditCard}
                  onClick={() => navigate('/platform/subscriptions')} />
                <KpiCard label="Total users" value={fmtNum(stats.totalUsers)} icon={Users}
                  onClick={() => navigate('/platform/setup')} />
                <KpiCard label="On trial" value={fmtNum(an.trialOrgs)} icon={Clock}
                  onClick={() => navigate('/platform/subscriptions')} />
              </motion.div>

              {/* ════ REVENUE ════ */}
              <p className="ds-section-label db-section-label">Subscriptions &amp; revenue</p>
              <div className="db-grid">
                <Card className="db-span-8" title="Recurring revenue"
                  action={<span className="db-card-sub">MRR · last {months} mo</span>}>
                  {revenueTrend.length < 2 ? (
                    <div className="db-trend-empty"><span className="db-trend-empty-msg">No revenue data yet</span></div>
                  ) : (<>
                    <RevenueLine data={revenueTrend} />
                    <div className="db-trend-stats-row">
                      <div className="db-trend-stat"><span className="db-trend-stat-label">MRR</span><span className="db-trend-stat-val">{fmtINR(an.mrr)}</span></div>
                      <div className="db-trend-stat-divider" />
                      <div className="db-trend-stat"><span className="db-trend-stat-label">ARR</span><span className="db-trend-stat-val">{fmtINR(arr)}</span></div>
                      <div className="db-trend-stat-divider" />
                      <div className="db-trend-stat">
                        <span className="db-trend-stat-label">vs Last month</span>
                        <span className={`db-trend-stat-val${an.mrrGrowthRate > 0 ? ' is-up' : an.mrrGrowthRate < 0 ? ' is-down' : ''}`}>
                          {an.mrrGrowthRate > 0 ? '+' : ''}{an.mrrGrowthRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </>)}
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
                  ) : <BarChart data={orgTrend} />}
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
                    <HBarList ranked rows={topOrgs.map(o => ({ label: o.name, value: o.value, display: `${fmtNum(o.value)} users` }))} />
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
                  ) : <BarChart data={userTrend} color={C_BLUE} />}
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
