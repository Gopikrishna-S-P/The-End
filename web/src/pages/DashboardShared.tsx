import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, ArrowUpRight, CheckCircle } from 'lucide-react';

// Shared building blocks for the org dashboard (Dashboard.tsx) and the
// platform-admin dashboard (PlatformDashboard.tsx) -- one definition each so
// the two surfaces can't silently drift apart (hover feel, bar thickness,
// donut typography, etc. all came from copy-pasted, independently-edited
// duplicates before this file existed).
//
// ── Chart conventions enforced here ─────────────────────────────────────────
// Colour comes from the validated token families in Dashboard.css (--dbc-*
// identity, --dbq-* magnitude, --dbn-* "none", status tokens for state). No
// component invents a colour; callers pass a token. See the block comment at
// the top of Dashboard.css before changing any of them.
//
// Every chart follows the same rules, which is what makes them read as one
// system rather than six separate widgets:
//   · marks are thin, with a 4px rounded data-end and a square baseline
//   · gridlines/axes are hairline, SOLID, one step off the surface
//   · values are direct-labelled SELECTIVELY (peak, current, leader) — never
//     one number per point — and the axis + tooltip carry the rest
//   · every plotted value is reachable on hover AND on keyboard focus, so a
//     tooltip enhances rather than gates
//   · text wears text tokens; identity comes from the coloured mark beside it

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

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

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

export function fmtPct(part: number, total: number) {
  if (!(total > 0)) return '0%';
  const p = (part / total) * 100;
  return `${p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1)}%`;
}

// ── Axis helpers ───────────────────────────────────────────────────────────────
// Ticks land on clean numbers (0 / 500 / 1,000 …) and the chart scales to the
// TOP TICK rather than to the raw max -- so a bar's height can be read off the
// gridlines instead of only against its neighbours.

export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0) || !Number.isFinite(max)) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 1e-6; v += step) out.push(Number(v.toFixed(10)));
  if (out[out.length - 1] < max) out.push(Number((out[out.length - 1] + step).toFixed(10)));
  return out;
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

/** Live pixel width of an element -- used to decide whether a direct label
    actually FITS inside its bar before rendering it there (a clipped label is
    worse than no label, so this is measured, never guessed). */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Rough advance width of the 10px mono figures used for in-bar values.
    Deliberately generous -- over-estimating pushes a borderline label outside
    the bar, which is the safe failure. */
const inBarLabelWidth = (text: string) => text.length * 6.4 + 20;

// ── Chart tooltip ──────────────────────────────────────────────────────────────
// One tooltip for every chart form. Positioned by its anchor's percentage
// across the plot, and flipped at the edges so it never leaves the card.

export interface TipRow { label: string; value: string; color?: string }

export function ChartTip({ x, title, rows, align = 'center' }: {
  x: number; title?: string; rows: TipRow[]; align?: 'center' | 'left' | 'right';
}) {
  return (
    <motion.div
      className={`db-chart-tip is-${align}`}
      style={{ left: `${x}%` }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.13, ease: 'easeOut' }}
      role="tooltip"
    >
      {title && <span className="db-chart-tip-title">{title}</span>}
      {rows.map((r, i) => (
        <div key={i} className="db-chart-tip-row">
          {r.color && <span className="db-chart-tip-dot" style={{ background: r.color }} />}
          <span className="db-chart-tip-key">{r.label}</span>
          <span className="db-chart-tip-val">{r.value}</span>
        </div>
      ))}
    </motion.div>
  );
}

/** Edge-aware alignment for a tooltip anchored at `pct` across the plot. */
const tipAlign = (pct: number): 'center' | 'left' | 'right' =>
  pct < 18 ? 'left' : pct > 82 ? 'right' : 'center';

// ── Sparkline ──────────────────────────────────────────────────────────────────
// Supporting mark inside a KPI tile: a 2px line over a ~12% wash of its own
// hue, with the current value pinned by an end dot that carries a surface ring
// so it stays legible where it meets the card edge.

export function Sparkline({ data, color = 'var(--dbc-1)', height = 40 }: { data: number[]; color?: string; height?: number }) {
  const gid = `sp-${useId().replace(/:/g, '')}`;
  const W = 200, pad = 4;
  const eff = data.length >= 2 ? data : [0, 0];
  const max = Math.max(...eff), min = Math.min(...eff), range = max - min || 1;
  const pts = eff.map((v, i) => {
    const x = pad + (i / (eff.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as [number, number];
  });
  const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const end = pts[pts.length - 1];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="db-spark" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={end[0]} cy={end[1]} r="2.8" fill={color} stroke="var(--db-surface)" strokeWidth="1.5" />
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
      {sparkline && sparkline.length >= 2 && (
        <Sparkline data={sparkline} color={accent ? 'var(--dbc-1)' : 'var(--dbn-2)'} />
      )}
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
// Part-to-whole at a glance. Segments are separated by a real 2px gap in the
// surface colour (converted from px to degrees at this radius) rather than by a
// stroke -- a stroke would add ink that isn't data. Hovering a segment or its
// legend row swaps the centre readout to that slice; nothing is hover-gated,
// since the legend already lists every label and value.

export interface DonutSlice { label: string; value: number; color: string }

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function DonutChart({ slices, size = 132, thickness = 20, centerLabel = 'TOTAL',
  activeIndex = null, onActiveChange, fmt = fmtNum,
}: {
  slices: DonutSlice[]; size?: number; thickness?: number; centerLabel?: string;
  activeIndex?: number | null;
  onActiveChange?: (i: number | null) => void;
  fmt?: (n: number) => string;
}) {
  const sw = thickness;
  const r = (size - sw - 6) / 2;   // 3px breathing room so the hover ring can grow
  const cx = size / 2, cy = size / 2;
  const total = slices.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <svg width={size} height={size} className="db-donut" role="img" aria-label="No data">
        <circle cx={cx} cy={cy} r={r} stroke="var(--db-track)" strokeWidth={sw} fill="none" />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="13">—</text>
      </svg>
    );
  }

  // Visible slices keep their ORIGINAL index so colour follows the entity: a
  // zero-value category dropping out must never repaint the survivors.
  const visible = slices.map((s, i) => ({ ...s, i })).filter(s => s.value > 0);
  const gapDeg = visible.length > 1 ? Math.min(6, (2 / (2 * Math.PI * r)) * 360 + 1.6) : 0;
  const sweepBudget = 359.9 - gapDeg * visible.length;

  let angle = -90;
  const arcs: { d: string; color: string; i: number; label: string; value: number }[] = [];
  for (const slice of visible) {
    const sweep = (slice.value / total) * sweepBudget;
    const end = angle + sweep;
    const s = polar(cx, cy, r, angle);
    const e = polar(cx, cy, r, end);
    const large = sweep > 180 ? 1 : 0;
    arcs.push({
      d: `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`,
      color: slice.color, i: slice.i, label: slice.label, value: slice.value,
    });
    angle = end + gapDeg;
  }

  const active = activeIndex != null ? arcs.find(a => a.i === activeIndex) ?? null : null;
  const centreTop = active ? fmt(active.value) : total.toLocaleString('en-IN');
  const centreSub = active ? fmtPct(active.value, total) : centerLabel;

  return (
    <svg width={size} height={size} className="db-donut" role="img"
      aria-label={`${centerLabel.toLowerCase()}: ${slices.map(s => `${s.label} ${s.value}`).join(', ')}`}>
      <circle cx={cx} cy={cy} r={r} stroke="var(--db-track)" strokeWidth={sw} fill="none" />

      {arcs.map(a => {
        const isActive = active?.i === a.i;
        const dim = active != null && !isActive;
        return (
          <motion.path key={a.i} d={a.d} stroke={a.color} fill="none" strokeLinecap="butt"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: dim ? 0.34 : 1,
              strokeWidth: isActive ? sw + 6 : sw,
            }}
            transition={{
              pathLength: { duration: 0.65, delay: a.i * 0.1 + 0.12, ease: EASE_OUT },
              opacity: { duration: 0.18 },
              strokeWidth: { duration: 0.18, ease: 'easeOut' },
            }}
          />
        );
      })}

      {/* Invisible fat strokes carry the pointer/keyboard target so a thin ring
          still meets a comfortable hit size. */}
      {onActiveChange && arcs.map(a => (
        <path key={`hit-${a.i}`} d={a.d} stroke="transparent" strokeWidth={Math.max(sw + 16, 26)}
          fill="none" style={{ cursor: 'pointer' }}
          onMouseEnter={() => onActiveChange(a.i)}
          onMouseLeave={() => onActiveChange(null)}
        />
      ))}

      <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--ink-primary)"
        fontSize={active ? 19 : 22} fontWeight="700" className="db-donut-centre-val">
        {centreTop}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="10"
        style={{ fontFamily: 'var(--font-mono)' }} letterSpacing="0.06em">
        {centreSub}
      </text>
    </svg>
  );
}

export function DonutCard({ slices, centerLabel, fmt = fmtNum }: {
  slices: DonutSlice[]; centerLabel: string; fmt?: (n: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((s, d) => s + d.value, 0);
  const has = total > 0;
  return (
    <div className="db-donut-card">
      <DonutChart slices={slices} centerLabel={centerLabel} fmt={fmt}
        activeIndex={active} onActiveChange={setActive} />
      <div className="db-legend">
        {slices.map((s, i) => (
          <button key={s.label} type="button"
            className={`db-legend-row${active === i ? ' is-active' : ''}${active != null && active !== i ? ' is-dim' : ''}`}
            onMouseEnter={() => has && setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => has && setActive(i)}
            onBlur={() => setActive(null)}
          >
            <span className="db-legend-dot" style={{ background: s.color }} />
            <span className="db-legend-label">{s.label}</span>
            <span className="db-legend-val">{fmt(s.value)}</span>
            <span className="db-legend-pct">{fmtPct(s.value, total)}</span>
          </button>
        ))}
        {!has && <span className="db-legend-empty">No data yet</span>}
      </div>
    </div>
  );
}

// ── Horizontal bars ─────────────────────────────────────────────────────────────
// Thick bars (20px) with a 4px rounded data-end and a SQUARE baseline, so every
// bar visibly starts from the same zero. Quarter gridlines sit inside the track
// and a single scale caption names what full width means, so length can be read
// as a value instead of only relative to the longest bar.

export function HBarList({ rows, ranked, emphasizeTop, scaleCaption }: {
  rows: { label: string; value: number; display: string; color?: string }[];
  ranked?: boolean;
  /** Single-series ranking (no per-row category color): rank #1 gets full brand
      green and its value set inside its own bar, the rest recede -- the
      "weighted leaderboard" treatment used for ranked lists app-wide. */
  emphasizeTop?: boolean;
  /** Overrides the auto caption naming what a full-width bar represents. */
  scaleCaption?: string;
}) {
  const max = Math.max(1, ...rows.map(r => r.value));
  const [trackRef, trackW] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const topDisplay = rows.length ? rows.reduce((a, b) => (b.value > a.value ? b : a)).display : '';

  return (
    <div className="db-hbars">
      {rows.map((r, i) => {
        const pct = (r.value / max) * 100;
        const isLead = !!emphasizeTop && i === 0;
        const fill = emphasizeTop
          ? (isLead ? 'var(--dbc-1)' : 'color-mix(in srgb, var(--dbc-1) 34%, var(--db-track))')
          : (r.color ?? 'var(--dbc-1)');
        // Measured, not guessed: only set the value inside the fill when the
        // rendered text genuinely fits with padding on both sides.
        const fillPx = (pct / 100) * trackW;
        const valueInline = isLead && trackW > 0 && fillPx >= inBarLabelWidth(r.display);
        return (
          <div key={i}
            className={`db-hbar-row${isLead ? ' is-lead' : ''}${hover === i ? ' is-hover' : ''}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {ranked && <span className="db-hbar-rank">{i + 1}</span>}
            <div className="db-hbar-main">
              {!valueInline && (
                <div className="db-hbar-head">
                  <span className="db-hbar-label">{r.label}</span>
                  <span className="db-hbar-val">{r.display}</span>
                </div>
              )}
              {valueInline && <span className="db-hbar-label">{r.label}</span>}
              <div className="db-hbar-track" ref={i === 0 ? trackRef : undefined}>
                <motion.div className="db-hbar-fill" style={{ background: fill }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.07, ease: EASE_OUT }}
                >
                  {valueInline && <span className="db-hbar-val-inline">{r.display}</span>}
                </motion.div>
              </div>
            </div>
          </div>
        );
      })}
      {rows.length > 1 && (
        <div className="db-hbar-scale">
          <span className="db-hbar-scale-zero">0</span>
          <span className="db-hbar-scale-max">{scaleCaption ?? topDisplay}</span>
        </div>
      )}
    </div>
  );
}

// ── Vertical bar chart (monthly trend) ──────────────────────────────────────────
// Columns are capped at 22px and scale to the TOP GRIDLINE, not to the raw max,
// so a value can be read off the axis. Only the peak and the current period get
// a direct label; a solid hairline marks the range average, and hover/focus
// exposes every other value.

export interface BarChartPoint { year: number; month: number; label: string; totalAmount: number; totalCount: number }

export function BarChart({ data, height = 190, color = 'var(--dbc-1)', fmt = fmtINR, valueKey = 'totalAmount', showAverage = true }: {
  data: BarChartPoint[]; height?: number; color?: string; fmt?: (n: number) => string;
  valueKey?: 'totalAmount' | 'totalCount';
  showAverage?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const values = data.map(d => d[valueKey] ?? 0);
  const rawMax = Math.max(...values, 0);
  const ticks = useMemo(() => niceTicks(rawMax), [rawMax]);
  const axisMax = ticks[ticks.length - 1] || 1;
  const peakIdx = values.indexOf(Math.max(...values));
  const lastIdx = values.length - 1;
  const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  const showAvg = showAverage && data.length >= 3 && avg > 0;

  return (
    <div className="db-chart" style={{ height }} onMouseLeave={() => setHover(null)}>
      <div className="db-chart-plot">
        {ticks.map((t, i) => (
          <div key={i} className="db-chart-gridline" style={{ bottom: `${(t / axisMax) * 100}%` }}>
            <span className="db-chart-ytick">{t === 0 ? '0' : fmt(t)}</span>
          </div>
        ))}

        {showAvg && (
          <div className="db-chart-avg" style={{ bottom: `${(avg / axisMax) * 100}%` }}>
            <span className="db-chart-avg-tag">avg {fmt(avg)}</span>
          </div>
        )}

        <div className="db-bars">
          {data.map((d, i) => {
            const v = d[valueKey] ?? 0;
            const h = Math.max(1.5, (v / axisMax) * 100);
            const isPeak = i === peakIdx && rawMax > 0;
            const isCurrent = i === lastIdx;
            const labelled = isPeak || isCurrent;   // selective, never one per bar
            const isHover = hover === i;
            return (
              <button key={`${d.year}-${d.month}-${i}`} type="button"
                className={`db-bar-col${isHover ? ' is-hover' : ''}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${d.label}: ${fmt(v)}`}
              >
                {labelled && (
                  <span className={`db-bar-cap${isPeak ? ' is-peak' : ''}`} style={{ bottom: `calc(${h}% + 6px)` }}>
                    {fmt(v)}
                  </span>
                )}
                <motion.span className={`db-bar-fill${isPeak ? ' is-peak' : ''}`}
                  style={{ backgroundImage: `linear-gradient(180deg, ${color} 0%, color-mix(in srgb, ${color} 68%, transparent) 100%)` }}
                  initial={{ height: 0 }} animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: i * 0.045, ease: EASE_OUT }}
                />
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {hover != null && data[hover] && (
            <ChartTip
              x={((hover + 0.5) / data.length) * 100}
              align={tipAlign(((hover + 0.5) / data.length) * 100)}
              title={data[hover].label}
              rows={[{ label: 'Value', value: fmt(data[hover][valueKey] ?? 0), color }]}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="db-chart-xaxis">
        {data.map((d, i) => (
          <span key={i} className={`db-bar-label${hover === i ? ' is-hover' : ''}${i === lastIdx ? ' is-current' : ''}`}>
            {d.label?.slice(0, 3) ?? ''}
          </span>
        ))}
      </div>
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
// first, the shape of the trend second. Single brand-green series; with one
// series there is no legend box (the hero label names it), and the peak is the
// only point direct-labelled, because a number on every point goes unread.

export interface TrendChartSeries {
  label: string;
  values: number[];
  color: string;
  fmt?: (n: number) => string;
  area?: boolean; // gradient fill under the line
}

export function TrendChart({ labels, primary, extra = [], heroTrend, heroTrendLabel = 'vs last month', secondaryStat, height = 150, width = 600 }: {
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
  const padL = 8, padR = 16, padY = 12;
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, '');
  const gradId = `tc-grad-${uid}`;
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const n = labels.length;
  const fmtV = primary.fmt ?? fmtNum;

  // Scale to a clean top tick so the gridlines carry real values.
  const { ticks, axisMax, axisMin } = useMemo(() => {
    const vals = primary.values;
    const max = Math.max(...vals, 0);
    const t = niceTicks(max, 3);
    return { ticks: t, axisMax: t[t.length - 1] || 1, axisMin: 0 };
  }, [primary.values]);

  const yOf = useCallback((v: number) =>
    padY + (1 - (v - axisMin) / (axisMax - axisMin || 1)) * (height - padY * 2),
  [axisMax, axisMin, height]);

  const primaryPts = useMemo((): [number, number][] =>
    primary.values.map((v, i) => [
      padL + (n > 1 ? i / (n - 1) : 0.5) * (width - padL - padR),
      yOf(v),
    ] as [number, number]),
  [primary.values, n, width, yOf]);

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

  // Keyboard parity with hover: a tooltip must never be the only way to a value.
  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (n === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setHovIdx(prev => {
        const base = prev ?? n - 1;
        return Math.max(0, Math.min(n - 1, base + (e.key === 'ArrowRight' ? 1 : -1)));
      });
    } else if (e.key === 'Escape') setHovIdx(null);
  }, [n]);

  const up = heroTrend != null && heroTrend > 0, down = heroTrend != null && heroTrend < 0;
  const lastIdx = primaryPts.length - 1;
  const peakIdx = primary.values.indexOf(Math.max(...primary.values));
  const heroValAnim = useCountUp(primary.values[lastIdx] ?? 0);

  return (
    <div className="tc-hero">
      <div className="tc-hero-row">
        <div className="tc-hero-main">
          <span className="tc-hero-label">{primary.label}</span>
          <span className="tc-hero-val">{fmtV(heroValAnim)}</span>
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
        {/* Y gridlines + ticks live in HTML so they inherit the same hairline
            token every other chart uses. Positioned in PIXELS off the same padY
            the line itself is plotted with -- a percentage of the wrapper would
            ignore that padding and sit ~12px off at both ends. */}
        {ticks.map((t, i) => (
          <div key={i} className="db-chart-gridline is-inset"
            style={{ bottom: `${padY + (t / axisMax) * (height - padY * 2)}px` }}>
            <span className="db-chart-ytick">{t === 0 ? '0' : fmtV(t)}</span>
          </div>
        ))}

        {/* Inner plot carries the y-tick gutter, so the tooltip's and peak
            tag's percentage offsets are measured against exactly the box the
            SVG draws into. */}
        <div className="db-trend-plot">
        <svg ref={svgRef} className="db-trend-svg" viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none" onMouseMove={onMove} onKeyDown={onKey}
          tabIndex={0} role="img"
          aria-label={`${primary.label} over ${n} periods, latest ${fmtV(primary.values[lastIdx] ?? 0)}`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary.color} stopOpacity="0.26" />
              <stop offset="100%" stopColor={primary.color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {areaPath && (
            <motion.path d={areaPath} fill={`url(#${gradId})`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
          )}
          {primaryPath && (
            <motion.path d={primaryPath} fill="none" stroke={primary.color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: EASE_OUT }} />
          )}

          {/* Resting state pins the current point; the surface ring keeps it
              legible where it sits on the line. */}
          {primaryPts[lastIdx] && hovIdx == null && (
            <circle cx={primaryPts[lastIdx][0]} cy={primaryPts[lastIdx][1]} r="4"
              fill={primary.color} stroke="var(--db-surface)" strokeWidth="2" />
          )}
          {hovIdx != null && primaryPts[hovIdx] && (
            <>
              <line x1={primaryPts[hovIdx][0]} x2={primaryPts[hovIdx][0]} y1={padY} y2={height - padY}
                stroke="var(--db-axis)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <circle cx={primaryPts[hovIdx][0]} cy={primaryPts[hovIdx][1]} r="4.5"
                fill={primary.color} stroke="var(--db-surface)" strokeWidth="2" />
            </>
          )}
        </svg>

        {/* The peak is the one point worth a standing label. */}
        {peakIdx >= 0 && peakIdx !== lastIdx && primaryPts[peakIdx] && hovIdx == null && (
          <span className="db-trend-peak-tag"
            style={{
              left: `${(primaryPts[peakIdx][0] / width) * 100}%`,
              bottom: `${(1 - primaryPts[peakIdx][1] / height) * 100}%`,
            }}>
            {fmtV(primary.values[peakIdx])}
          </span>
        )}

        <AnimatePresence>
          {hovIdx != null && primaryPts[hovIdx] && (
            <ChartTip
              x={(primaryPts[hovIdx][0] / width) * 100}
              align={tipAlign((primaryPts[hovIdx][0] / width) * 100)}
              title={labels[hovIdx]}
              rows={[
                { label: primary.label, value: fmtV(primary.values[hovIdx] ?? 0), color: primary.color },
                ...extra.map(s => ({
                  label: s.label,
                  value: (s.fmt ?? fmtNum)(s.values[hovIdx] ?? 0),
                  color: s.color,
                })),
              ]}
            />
          )}
        </AnimatePresence>
        </div>
      </div>

      <div className="db-trend-x-labels">
        {labels.map((l, i) => (
          <button key={i} type="button"
            className={`db-trend-x-label${i === n - 1 ? ' is-current' : ''}${hovIdx === i ? ' is-hovered' : ''}`}
            onClick={() => setHovIdx(hovIdx === i ? null : i)}
            onMouseEnter={() => setHovIdx(i)}
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
//
// The unfilled track is a LIGHTER STEP OF THE SAME RAMP rather than a neutral
// gray, so the ring reads as one meter across its whole circumference; the fill
// runs a subtle two-step gradient of that ramp so the arc has direction.

export function ProgressRing({ pct, valueLabel, subLabel, size = 116, radius = 42, strokeWidth = 16,
  color = 'var(--dbc-1)', trackColor, valueFontSize = 16, subFontSize = 10,
  gradientTo = 'var(--dbq-2)',
}: {
  pct: number; valueLabel?: string; subLabel: string;
  size?: number; radius?: number; strokeWidth?: number;
  color?: string; trackColor?: string;
  valueFontSize?: number; subFontSize?: number;
  /** Far end of the fill gradient — a second step of the fill's own ramp. */
  gradientTo?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const gid = `pr-${uid}`;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct || 0));
  const [valueDy, subDy] = valueFontSize > 20 ? [-4, 16] : [-3, 12];
  const track = trackColor ?? `color-mix(in srgb, ${color} 16%, var(--db-track))`;
  return (
    <svg width={size} height={size} role="img" aria-label={`${valueLabel ?? `${Math.round(clamped)}%`} ${subLabel}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={gradientTo} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={radius} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <motion.circle cx={cx} cy={cy} r={radius} stroke={`url(#${gid})`} strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - clamped / 100) }}
          transition={{ duration: 1.0, ease: EASE_OUT }}
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
