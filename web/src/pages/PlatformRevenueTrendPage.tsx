import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, RefreshCw } from 'lucide-react';
import { platformApi, type RevenueTrendPoint } from '../api/platformApi';
import './Dashboard.css';

type Granularity = 'daily' | 'monthly' | 'yearly';

const RANGE_OPTS: Record<Granularity, number[]> = {
  daily:   [7, 30],
  monthly: [3, 6],
  yearly:  [],
};
const DEFAULT_RANGE: Record<Granularity, number> = {
  daily:   30,
  monthly: 6,
  yearly:  0,
};
const RANGE_LABEL: Record<Granularity, string> = {
  daily:   'D',
  monthly: 'M',
  yearly:  '',
};

function fmtINR(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(2)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
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

function smoothBezier(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx.toFixed(1)},${y0.toFixed(1)} ${cpx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

function Skeleton({ w = '100%', h }: { w?: string; h: number }) {
  return <span className="ds-skel" style={{ width: w, height: h, borderRadius: 6, display: 'block' }} />;
}

function ChartSkeleton() {
  return (
    <div className="ds-card db-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton w="60px" h={10} /><Skeleton w="80px" h={26} /><Skeleton w="50px" h={10} />
        </div>
        <Skeleton w="56px" h={56} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <Skeleton w="60px" h={10} /><Skeleton w="80px" h={26} /><Skeleton w="50px" h={10} />
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 24 }} />
      <Skeleton h={240} />
    </div>
  );
}

export default function PlatformRevenueTrendPage() {
  const [raw,         setRaw]         = useState<RevenueTrendPoint[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [range,       setRange]       = useState(6);
  const [hovIdx,      setHovIdx]      = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const load = useCallback(() => {
    setLoading(true); setError(false);
    platformApi.getRevenueTrend(granularity, range)
      .then(d => setRaw(d ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [granularity, range]);

  useEffect(() => { load(); }, [load]);

  const switchGranularity = (g: Granularity) => {
    setGranularity(g);
    setRange(DEFAULT_RANGE[g]);
  };

  const n = raw.length;

  const allZero = useMemo(() => n > 0 && raw.every(p => p.revenue === 0), [raw, n]);

  const thisMonth = raw[n - 1];
  const lastMonth = raw[n - 2];
  const thisAmt   = thisMonth?.revenue ?? 0;
  const prevAmt   = lastMonth?.revenue ?? 0;
  const diff      = thisAmt - prevAmt;
  const pctChange = prevAmt > 0 ? (diff / prevAmt) * 100 : null;
  const isUp      = diff > 0;
  const isFlat    = diff === 0;

  const periodTotal = useMemo(() => raw.reduce((s, p) => s + p.revenue, 0), [raw]);

  const peakIdx = useMemo(() =>
    raw.length ? raw.reduce((bi, p, i) => p.revenue > raw[bi].revenue ? i : bi, 0) : 0,
    [raw]
  );

  const avgGrowth = useMemo(() => {
    const diffs = raw.slice(1).map((p, i) => {
      const prev = raw[i].revenue;
      return prev > 0 ? ((p.revenue - prev) / prev) * 100 : 0;
    });
    return diffs.length ? diffs.reduce((s, d) => s + d, 0) / diffs.length : 0;
  }, [raw]);

  const thisAnimated = useCountUp(thisAmt);
  const prevAnimated = useCountUp(prevAmt);

  // ── Chart geometry ──────────────────────────────────────────────────────────
  const W = 600; const H = 240; const padL = 8; const padR = 16; const padY = 18;

  const maxV   = allZero ? 1 : Math.max(...raw.map(p => p.revenue), 1);
  const minV   = allZero ? 0 : Math.min(...raw.map(p => p.revenue));
  const range2 = maxV - minV || 1;

  // When all zero, draw a visible flat line at 60% down
  const cy = useCallback((v: number) => {
    if (allZero) return padY + (H - padY * 2) * 0.6;
    return padY + (1 - (v - minV) / range2) * (H - padY * 2);
  }, [allZero, minV, range2]);

  const cx = useCallback((i: number) =>
    padL + (n > 1 ? (i / (n - 1)) : 0.5) * (W - padL - padR),
    [n]
  );

  const coords: [number, number][] = raw.map((p, i) => [cx(i), cy(p.revenue)]);
  const linePath = smoothBezier(coords);
  const areaPath = n > 0
    ? `M ${cx(0).toFixed(1)},${H} ` +
      raw.map((p, i) => `L ${cx(i).toFixed(1)},${cy(p.revenue).toFixed(1)}`).join(' ') +
      ` L ${cx(n - 1).toFixed(1)},${H} Z`
    : '';

  const [ax, ay] = coords[n - 1] ?? [0, 0];

  const zeroY    = cy(0);
  const showZero = !allZero && minV > 0 && zeroY < H && zeroY > padY;

  const maxCnt  = Math.max(...raw.map(p => p.count), 1);
  const cyCnt   = (v: number) => padY + (1 - v / maxCnt) * (H - padY * 2);
  const cntPath = smoothBezier(raw.map((p, i) => [cx(i), cyCnt(p.count)]));

  const lineColor      = isUp || isFlat ? 'var(--success)' : 'var(--danger)';
  const lineColorDark  = isUp || isFlat ? 'rgba(10,165,80,.15)' : 'rgba(239,68,68,.15)';
  const lineColorDark2 = isUp || isFlat ? 'rgba(10,165,80,.04)' : 'rgba(239,68,68,.04)';

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || n < 2) return;
    const rect = svg.getBoundingClientRect();
    const px   = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0; let minDx = Infinity;
    for (let i = 0; i < n; i++) {
      const dx = Math.abs(cx(i) - px);
      if (dx < minDx) { minDx = dx; nearest = i; }
    }
    setHovIdx(nearest);
  }, [n, cx]);

  return (
    <div className="db-root">
      <div className="db-content">
        <div className="db-inner">
          {/* Error state */}
          {error && (
            <div className="db-error-banner" role="alert" style={{ marginBottom: 24 }}>
              <div className="db-error-body">
                <span className="db-error-title">Failed to load data.</span>
              </div>
              <button className="db-error-retry" onClick={load} aria-label="Retry">
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && <ChartSkeleton />}

          {/* Single data point */}
          {!loading && !error && n <= 1 && (
            <div className="ds-card db-card" style={{ padding: 24 }}>
              <span className="db-kpi2-foot-meta">{raw?.[0]?.month ?? 'Current Period'}</span>
              <span style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)', display: 'block', marginTop: 8 }}>
                {fmtINR(raw?.[0]?.revenue ?? 0)}
              </span>
              <span className="db-kpi2-foot-meta" style={{ marginTop: 8, display: 'block' }}>Insufficient data — trend visualization requires at least two periods.</span>
            </div>
          )}

          {!loading && !error && n >= 2 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

              <div className="ds-card db-card" style={{ padding: 24 }}>
                <header className="db-card-head" style={{ paddingBottom: 24, marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 className="db-card-title">Revenue Trend</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="db-trend-range-toggle" style={{ margin: 0 }}>
                      {(['daily', 'monthly', 'yearly'] as const).map(g => (
                        <button key={g} type="button"
                          className={`db-trend-range-btn${granularity === g ? ' is-active' : ''}`}
                          onClick={() => switchGranularity(g)}
                        >
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </button>
                      ))}
                    </div>
                    {RANGE_OPTS[granularity].length > 0 && (
                      <div className="db-trend-range-toggle" style={{ margin: 0 }}>
                        {RANGE_OPTS[granularity].map(r => (
                          <button key={r} type="button"
                            className={`db-trend-range-btn${range === r ? ' is-active' : ''}`}
                            onClick={() => setRange(r)}
                          >
                            {r}{RANGE_LABEL[granularity]}
                          </button>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={load} disabled={loading}
                      className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                      <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
                    </button>
                  </div>
                </header>

                {/* MOM comparison row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  {/* This month (current — left) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="db-kpi2-foot-meta" style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>{thisMonth?.month ?? '—'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: isUp || isFlat ? 'var(--success)' : 'var(--danger)' }}>
                      {fmtINR(thisAnimated)}
                    </span>
                    <span className="db-kpi2-foot-meta">{thisMonth?.count ?? 0} orgs</span>
                  </div>

                  {/* Compact change badge */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.3 }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      width: 56, height: 56, borderRadius: '50%',
                      background: isUp ? 'var(--success-subtle)' : isFlat ? 'var(--bg-subtle)' : 'var(--danger-subtle)',
                      color: isUp ? 'var(--success)' : isFlat ? 'var(--ink-secondary)' : 'var(--danger)',
                    }}
                  >
                    <span>
                      {isFlat ? <Minus size={14} /> : isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {pctChange !== null ? `${Math.abs(pctChange).toFixed(0)}%` : '—'}
                    </span>
                  </motion.div>

                  {/* Last month (right) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', textAlign: 'right' }}>
                    <span className="db-kpi2-foot-meta" style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>{lastMonth?.month ?? '—'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--ink-secondary)' }}>
                      {fmtINR(prevAnimated)}
                    </span>
                    <span className="db-kpi2-foot-meta">{lastMonth?.count ?? 0} orgs</span>
                  </div>
                </div>

                {/* Divider with label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-tertiary)', letterSpacing: '0.04em' }}>TREND</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                </div>

                {/* Chart section */}
                <div style={{ position: 'relative', width: '100%', height: 280, display: 'flex', flexDirection: 'column' }}>
                  {/* SVG */}
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="none"
                    style={{ width: '100%', flex: 1, overflow: 'visible', zIndex: 1, cursor: 'crosshair' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHovIdx(null)}
                    aria-label="Revenue trend chart"
                    role="img"
                  >
                    <defs>
                      <linearGradient id="prt-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor={lineColorDark} />
                        <stop offset="60%" stopColor={lineColorDark2} />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0, 0.5, 1].map((t, i) => {
                      const gy = padY + t * (H - padY * 2);
                      return (
                        <line key={i} x1={padL} y1={gy} x2={W - padR} y2={gy}
                          stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.6" />
                      );
                    })}

                    {/* Zero baseline */}
                    {showZero && (
                      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY}
                        stroke="var(--ink-tertiary)" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.5" />
                    )}

                    {/* Zero-state label */}
                    {allZero && (
                      <text x={W / 2} y={cy(0) - 12}
                        textAnchor="middle" fill="var(--ink-tertiary)"
                        fontSize="11" fontFamily="var(--font-mono)" opacity="0.7">
                        No revenue yet
                      </text>
                    )}

                    {/* Area fill */}
                    <path d={areaPath} fill="url(#prt-fill)" />

                    {/* Org count secondary dashed line */}
                    {!allZero && (
                      <motion.path
                        d={cntPath} fill="none"
                        stroke="var(--ink-tertiary)" strokeWidth="1" strokeDasharray="3 3"
                        opacity="0.4"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                      />
                    )}

                    {/* Main line */}
                    {n >= 2 && (
                      <motion.path
                        d={linePath} fill="none"
                        stroke={lineColor} strokeWidth="2.5"
                        strokeLinejoin="round" strokeLinecap="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                    )}

                    {/* Peak marker */}
                    {!allZero && n >= 1 && (
                      <g>
                        <circle cx={cx(peakIdx)} cy={cy(raw[peakIdx].revenue)} r="4" fill={lineColor} opacity="0.9" />
                        <rect x={cx(peakIdx) - 14} y={cy(raw[peakIdx].revenue) - 26} width="28" height="18" rx="4" fill={lineColor} opacity="0.9" />
                        <text x={cx(peakIdx)} y={cy(raw[peakIdx].revenue) - 17} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="var(--font-sans)">PEAK</text>
                      </g>
                    )}

                    {/* Last point dot */}
                    {n >= 1 && (
                      <motion.circle
                        cx={ax} cy={ay} r="4"
                        fill="var(--bg-surface)" stroke={lineColor} strokeWidth="2.5"
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ delay: 1.3, type: 'spring', stiffness: 400, damping: 18 }}
                      />
                    )}

                    {/* Hover vertical line + dot */}
                    {hovIdx !== null && (
                      <g>
                        <line x1={cx(hovIdx)} y1={padY} x2={cx(hovIdx)} y2={H - padY} stroke="var(--ink-tertiary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                        <circle cx={cx(hovIdx)} cy={cy(raw[hovIdx].revenue)} r="5" fill={lineColor} opacity="0.9" />
                      </g>
                    )}
                  </svg>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {hovIdx !== null && raw[hovIdx] && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        style={{
                          position: 'absolute', top: 0, left: `${(cx(hovIdx) / W) * 100}%`,
                          transform: `translate(-50%, -100%)`, zIndex: 10,
                          background: 'var(--ink-solid)', color: 'var(--bg-surface)',
                          padding: '6px 10px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', pointerEvents: 'none', boxShadow: 'var(--shadow-md)'
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, textTransform: 'uppercase' }}>{raw[hovIdx].month}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmtINR(raw[hovIdx].revenue)}</span>
                        <span style={{ fontSize: 10, opacity: 0.8, fontFamily: 'var(--font-mono)' }}>{raw[hovIdx].count} orgs</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* X labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px 0 8px', marginTop: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
                    {raw.map((p, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: i === n - 1 || hovIdx === i ? 700 : 500,
                          color: i === n - 1 ? 'var(--ink-primary)' : hovIdx === i ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
                          background: i === n - 1 ? 'var(--bg-subtle)' : 'transparent',
                          padding: '2px 6px', borderRadius: 4, cursor: 'default', transition: 'all 0.2s ease', textTransform: 'uppercase'
                        }}
                      >
                        {granularity === 'daily' ? p.month : p.month?.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="db-kpi2-foot-meta">Period Total</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)' }}>{fmtINR(periodTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                    <span className="db-kpi2-foot-meta">Avg Growth</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: avgGrowth >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {avgGrowth >= 0 ? '+' : ''}{avgGrowth.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span className="db-kpi2-foot-meta">Peak Period</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)', textTransform: 'uppercase' }}>
                      {n > 0 ? (granularity === 'daily' ? raw[peakIdx]?.month : raw[peakIdx]?.month?.slice(0, 3)) : '—'}
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
