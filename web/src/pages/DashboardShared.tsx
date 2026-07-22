import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, ArrowUpRight, CheckCircle } from 'lucide-react';

// Shared building blocks for the org dashboard (Dashboard.tsx) and the
// platform-admin dashboard (PlatformDashboard.tsx) -- one definition each so
// the two surfaces can't silently drift apart (hover feel, bar thickness,
// donut typography, etc. all came from copy-pasted, independently-edited
// duplicates before this file existed).

// ── Motion variants ────────────────────────────────────────────────────────────

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

// ── Formatters ────────────────────────────────────────────────────────────────

export function fmtINR(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}

export function fmtNum(v?: number | null) {
  return v != null ? v.toLocaleString('en-IN') : '—';
}

// ── Ripple + count-up ──────────────────────────────────────────────────────────

export function useRipple<T extends HTMLElement>() {
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

export function useCountUp(target: number, duration = 900) {
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

// ── Sparkline ──────────────────────────────────────────────────────────────────

export function Sparkline({ data, color = 'var(--ink-solid)', height = 40 }: { data: number[]; color?: string; height?: number }) {
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

// ── KPI card ────────────────────────────────────────────────────────────────────
// `sub` renders any custom line beneath the value (the common case). `trend` is
// a convenience: when `sub` isn't given, it auto-renders the same up/down badge
// used everywhere else. `sparkline` is additive -- it renders under `sub`,
// used only by cards that have a real short history to show (e.g. MRR).

export function KpiCard({ label, value, sub, trend, trendLabel = 'vs last month', trendInline, sparkline, icon: Icon, accent, onClick }: {
  label: string; value: string;
  sub?: React.ReactNode;
  trend?: number | null;
  trendLabel?: string;
  /** Show `trend` as a compact "+N%" next to the value instead of a full sub-line below it. */
  trendInline?: boolean;
  sparkline?: number[];
  icon?: React.ElementType; accent?: boolean;
  onClick?: () => void;
}) {
  const { ref, fire } = useRipple<HTMLButtonElement>();
  const up = trend != null && trend > 0, down = trend != null && trend < 0;
  const resolvedSub = sub ?? (trend != null && !trendInline
    ? <span className={`db-kpi2-sub-meta${up ? ' is-up' : down ? ' is-down' : ''}`}>
        {up ? <ArrowUp size={10} /> : down ? <ArrowDown size={10} /> : <Minus size={10} />}
        {Math.abs(trend).toFixed(1)}% {trendLabel}
      </span>
    : undefined);
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
      {trendInline && trend != null ? (
        <div className="db-kpi2-value-line">
          <span className="db-kpi2-value">{value}</span>
          <span className={`db-kpi2-value-trend${up ? ' is-up' : down ? ' is-down' : ''}`}>
            {up ? <ArrowUp size={11} /> : down ? <ArrowDown size={11} /> : <Minus size={11} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        </div>
      ) : (
        <span className="db-kpi2-value">{value}</span>
      )}
      {resolvedSub && <div className="db-kpi2-sub">{resolvedSub}</div>}
      {sparkline && sparkline.length >= 2 && <Sparkline data={sparkline} />}
    </motion.button>
  );
}

// ── Card shell ──────────────────────────────────────────────────────────────────

export function Card({ title, action, children, className = '' }: {
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

// ── Donut ──────────────────────────────────────────────────────────────────────

export interface DonutSlice { label: string; value: number; color: string }

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function DonutChart({ slices, size = 132, thickness = 22, centerLabel = 'TOTAL' }: {
  slices: DonutSlice[]; size?: number; thickness?: number; centerLabel?: string;
}) {
  const sw = thickness; const r = (size - sw) / 2; const cx = size / 2; const cy = size / 2;
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} className="db-donut">
        <circle cx={cx} cy={cy} r={r} stroke="var(--border)" strokeWidth={sw} fill="none" />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="13">—</text>
      </svg>
    );
  }
  const visible = slices.filter(s => s.value > 0);
  const gap = visible.length > 1 ? 3 : 0; // degrees between adjacent segments
  const sweepBudget = 359.9 - gap * visible.length;
  let angle = -90;
  const arcs: { d: string; color: string }[] = [];
  for (const slice of visible) {
    const sweep = (slice.value / total) * sweepBudget;
    const end = angle + sweep;
    const s = polar(cx, cy, r, angle);
    const e = polar(cx, cy, r, end);
    const large = sweep > 180 ? 1 : 0;
    arcs.push({ d: `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`, color: slice.color });
    angle = end + gap;
  }
  return (
    <svg width={size} height={size} className="db-donut">
      <circle cx={cx} cy={cy} r={r} stroke="var(--border)" strokeWidth={sw} fill="none" />
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

export function DonutCard({ slices, centerLabel, fmt = fmtNum }: {
  slices: DonutSlice[]; centerLabel: string; fmt?: (n: number) => string;
}) {
  const has = slices.some(s => s.value > 0);
  return (
    <div className="db-donut-card">
      <DonutChart slices={slices} centerLabel={centerLabel} />
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

// ── Horizontal bars ─────────────────────────────────────────────────────────────

export function HBarList({ rows, ranked, emphasizeTop }: {
  rows: { label: string; value: number; display: string; color?: string }[];
  ranked?: boolean;
  /** Single-series ranking (no per-row category color): rank #1 gets full brand
      green and its value set inside its own bar, the rest recede -- the
      "weighted leaderboard" treatment used for ranked lists app-wide. */
  emphasizeTop?: boolean;
}) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div className="db-hbars">
      {rows.map((r, i) => {
        const pct = (r.value / max) * 100;
        const isLead = !!emphasizeTop && i === 0;
        const fill = emphasizeTop
          ? (isLead ? 'var(--ink-solid)' : 'color-mix(in srgb, var(--ink-solid) 32%, var(--bg-subtle))')
          : (r.color ?? 'var(--ink-solid)');
        const valueInline = isLead && pct > 40;
        return (
          <div key={i} className={`db-hbar-row${isLead ? ' is-lead' : ''}`}>
            {ranked && <span className="db-hbar-rank">{i + 1}</span>}
            <div className="db-hbar-main">
              {!valueInline && (
                <div className="db-hbar-head">
                  <span className="db-hbar-label">{r.label}</span>
                  <span className="db-hbar-val">{r.display}</span>
                </div>
              )}
              {valueInline && <span className="db-hbar-label">{r.label}</span>}
              <div className="db-hbar-track">
                <motion.div className="db-hbar-fill" style={{ background: fill }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                >
                  {valueInline && <span className="db-hbar-val-inline">{r.display}</span>}
                </motion.div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Vertical bar chart (monthly trend) ──────────────────────────────────────────

export interface BarChartPoint { year: number; month: number; label: string; totalAmount: number; totalCount: number }

export function BarChart({ data, height = 168, color = 'var(--ink-solid)', fmt = fmtINR, valueKey = 'totalAmount' }: {
  data: BarChartPoint[]; height?: number; color?: string; fmt?: (n: number) => string; valueKey?: 'totalAmount' | 'totalCount';
}) {
  const max = Math.max(1, ...data.map(d => d[valueKey] ?? 0));
  return (
    <div className="db-bars" style={{ height }}>
      {data.map((d, i) => {
        const v = d[valueKey] ?? 0;
        const h = Math.max(2, (v / max) * 100);
        const peak = v === max && max > 1;
        return (
          <div key={`${d.year}-${d.month}-${i}`} className="db-bar-col" title={`${d.label}: ${fmt(v)}`}>
            <span className="db-bar-cap">{fmt(v)}</span>
            <div className="db-bar-track">
              <motion.div className={`db-bar-fill${peak ? ' is-peak' : ''}`}
                style={color !== 'var(--ink-solid)' ? { background: color } : undefined}
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

// ── Attention rows ─────────────────────────────────────────────────────────────

export function AttentionRow({ icon: Icon, label, count, meta, tone, last, onClick }: {
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

export function AllClearRow() {
  return (
    <div className="db-att-row is-all-clear">
      <span className="db-att-chip is-clear"><CheckCircle size={15} aria-hidden="true" /></span>
      <span className="db-att-label">All clear — nothing needs attention</span>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

export function Skeleton({ w, h, r = 6 }: { w?: string; h: number; r?: number }) {
  return <span className="ds-skel" style={{ width: w ?? '100%', height: h, borderRadius: r }} />;
}

// ── Trend chart (stat-forward line/area) ────────────────────────────────────────
// One shared component for both dashboards: a big current-value "hero" stat
// (with trend) leads, a small secondary stat sits beside it, and the chart
// itself is a compact supporting sparkline underneath -- read the number
// first, the shape of the trend second. Single brand-green series; this app's
// color rule is one hue, no secondary hues, so there's nothing to tell apart
// by color here.

export interface TrendChartSeries {
  label: string;
  values: number[];
  color: string;
  fmt?: (n: number) => string;
  area?: boolean; // gradient fill under the line
}

export function TrendChart({ labels, primary, extra = [], heroTrend, heroTrendLabel = 'vs last month', secondaryStat, height = 100, width = 600 }: {
  labels: string[];
  primary: TrendChartSeries;
  /** Extra tooltip-only rows (not drawn as lines) — e.g. a supplementary count alongside the hero amount. */
  extra?: { label: string; values: number[]; color: string; fmt?: (n: number) => string }[];
  /** % change driving the trend badge next to the hero value. */
  heroTrend?: number | null;
  heroTrendLabel?: string;
  /** Smaller stat shown beside the hero (e.g. "Range total" / "ARR"). */
  secondaryStat?: { label: string; value: string };
  height?: number;
  width?: number;
}) {
  const padL = 8, padR = 16, padY = 10;
  const svgRef = useRef<SVGSVGElement>(null);
  const gradId = `tc-grad-${useId().replace(/:/g, '')}`;
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const n = labels.length;

  const primaryPts = useMemo((): [number, number][] => {
    const vals = primary.values;
    const max = Math.max(...vals); const min = Math.min(...vals); const range = max - min || 1;
    return vals.map((v, i) => {
      const x = padL + (n > 1 ? i / (n - 1) : 0.5) * (width - padL - padR);
      const y = padY + (1 - (v - min) / range) * (height - padY * 2);
      return [x, y] as [number, number];
    });
  }, [primary.values, n, height, width]);

  // Catmull-Rom-to-Bezier smoothing (tension 1/6) -- softens the polyline into a
  // gentle curve without overshooting past neighboring points on typical monthly data.
  const toPath = (pts: [number, number][]) => {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const primaryPath = toPath(primaryPts);
  const areaPath = primary.area && primaryPath
    ? `${primaryPath} L ${primaryPts[primaryPts.length - 1][0].toFixed(1)},${(height - padY).toFixed(1)} L ${primaryPts[0][0].toFixed(1)},${(height - padY).toFixed(1)} Z`
    : '';

  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const el = svgRef.current; if (!el || n === 0) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round(((x - padL) / (width - padL - padR)) * (n - 1));
    setHovIdx(Math.max(0, Math.min(n - 1, idx)));
  }, [n, width]);

  const up = heroTrend != null && heroTrend > 0, down = heroTrend != null && heroTrend < 0;
  const lastIdx = primaryPts.length - 1;
  const heroValAnim = useCountUp(primary.values[lastIdx] ?? 0);

  return (
    <div className="tc-hero">
      <div className="tc-hero-row">
        <div className="tc-hero-main">
          <span className="tc-hero-label">{primary.label}</span>
          <span className="tc-hero-val">{(primary.fmt ?? fmtNum)(heroValAnim)}</span>
          {heroTrend != null && (
            <span className={`tc-hero-trend${up ? ' is-up' : down ? ' is-down' : ''}`}>
              {up ? <ArrowUp size={12} /> : down ? <ArrowDown size={12} /> : <Minus size={12} />}
              {Math.abs(heroTrend).toFixed(1)}% {heroTrendLabel}
            </span>
          )}
        </div>
        {secondaryStat && (
          <div className="tc-hero-secondary">
            <span className="tc-hero-label">{secondaryStat.label}</span>
            <span className="tc-hero-secondary-val">{secondaryStat.value}</span>
          </div>
        )}
      </div>

      <div className="db-trend-chart-wrap" style={{ height }} onMouseLeave={() => setHovIdx(null)}>
        <svg ref={svgRef} className="db-trend-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" onMouseMove={onMove}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={primary.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {areaPath && (
            <motion.path d={areaPath} fill={`url(#${gradId})`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
          )}
          {primaryPath && (
            <motion.path d={primaryPath} fill="none" stroke={primary.color} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          )}
          {primaryPts[lastIdx] && hovIdx == null && (
            <circle cx={primaryPts[lastIdx][0]} cy={primaryPts[lastIdx][1]} r="4" fill={primary.color} />
          )}
          {hovIdx != null && primaryPts[hovIdx] && (
            <line x1={primaryPts[hovIdx][0]} x2={primaryPts[hovIdx][0]} y1={padY} y2={height - padY}
              stroke="var(--ink-tertiary)" strokeWidth="1" strokeDasharray="3 3" />
          )}
          {hovIdx != null && primaryPts[hovIdx] && (
            <circle cx={primaryPts[hovIdx][0]} cy={primaryPts[hovIdx][1]} r="4" fill="var(--bg-surface)" stroke={primary.color} strokeWidth="2" />
          )}
        </svg>

        <AnimatePresence>
          {hovIdx != null && primaryPts[hovIdx] && (
            <motion.div className="db-ml-tooltip"
              style={{ left: `${(primaryPts[hovIdx][0] / width) * 100}%` }}
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
            >
              <span className="db-ml-tooltip-date">{labels[hovIdx]}</span>
              <div className="db-ml-tooltip-row">
                <span className="db-ml-tooltip-dot" style={{ background: primary.color }} />
                <span className="db-ml-tooltip-key">{primary.label}</span>
                <span className="db-ml-tooltip-val">{(primary.fmt ?? fmtNum)(primary.values[hovIdx] ?? 0)}</span>
              </div>
              {extra.map((s, i) => (
                <div key={i} className="db-ml-tooltip-row">
                  <span className="db-ml-tooltip-dot" style={{ background: s.color }} />
                  <span className="db-ml-tooltip-key">{s.label}</span>
                  <span className="db-ml-tooltip-val">{(s.fmt ?? fmtNum)(s.values[hovIdx] ?? 0)}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="db-trend-x-labels">
        {labels.map((l, i) => (
          <button key={i} type="button"
            className={`db-trend-x-label${i === n - 1 ? ' is-current' : ''}${hovIdx === i ? ' is-hovered' : ''}`}
            onClick={() => setHovIdx(hovIdx === i ? null : i)}
          >{l?.slice(0, 3) ?? ''}</button>
        ))}
      </div>
    </div>
  );
}

// ── Progress ring ────────────────────────────────────────────────────────────────
// Shared by the org dashboard's PTP-fulfillment ring and the platform
// dashboard's org-activation ring -- same stroke treatment and type scale,
// sized per call site since they sit in different card layouts.

export function ProgressRing({ pct, valueLabel, subLabel, size = 116, radius = 42, strokeWidth = 16,
  color = 'var(--ink-solid)', trackColor = 'var(--brand-subtle)', valueFontSize = 16, subFontSize = 10,
}: {
  pct: number; valueLabel?: string; subLabel: string;
  size?: number; radius?: number; strokeWidth?: number;
  color?: string; trackColor?: string;
  valueFontSize?: number; subFontSize?: number;
}) {
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct || 0));
  const [valueDy, subDy] = valueFontSize > 20 ? [-4, 16] : [-3, 12];
  return (
    <svg width={size} height={size}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <motion.circle cx={cx} cy={cy} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - clamped / 100) }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        />
      </g>
      <text x={cx} y={cy + valueDy} textAnchor="middle" fill="var(--ink-primary)" fontSize={valueFontSize} fontWeight="700">
        {valueLabel ?? `${Math.round(clamped)}%`}
      </text>
      <text x={cx} y={cy + subDy} textAnchor="middle" fill="var(--ink-tertiary)" fontSize={subFontSize} style={{ fontFamily: 'var(--font-mono)' }}>
        {subLabel}
      </text>
    </svg>
  );
}
