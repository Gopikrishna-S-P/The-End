import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, RefreshCw } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtINR(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(2)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}

// ── Count-up hook ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start: number | null = null;
    const frame = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
}

// ── Bezier smooth path ────────────────────────────────────────────────────

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

// ── Skeleton ────────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrendPoint { year: number; month: number; label: string; totalAmount: number; totalCount: number }

// ── Main component ────────────────────────────────────────────────────────────

export default function CollectionMomPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const orgId     = user?.organizationId ?? '';

  const [trend,   setTrend]   = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [range,   setRange]   = useState<3 | 6 | 12>(12);
  const [hovIdx,  setHovIdx]  = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetch = useCallback(() => {
    if (!orgId) return;
    setLoading(true); setError(false);
    axiosInstance.get('/api/v1/analytics/dashboard')
      .then(r => setTrend(r.data?.data?.collections?.monthlyTrend ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Sort chronologically (oldest → newest), then take the most recent `range` months.
  // The API returns months newest-first (ORDER BY month DESC), so we must sort by
  // year/month ascending — otherwise "this month" / "last month" come out reversed.
  const sorted = useMemo(() =>
    [...trend]
      .sort((a, b) => (a.year - b.year) || (a.month - b.month))
      .slice(-range),
    [trend, range]
  );

  const n         = sorted.length;
  const thisMonth = sorted[n - 1];
  const lastMonth = sorted[n - 2];
  const thisAmt   = thisMonth?.totalAmount ?? 0;
  const prevAmt   = lastMonth?.totalAmount ?? 0;
  const diff      = thisAmt - prevAmt;
  const pctChange = prevAmt > 0 ? (diff / prevAmt) * 100 : null;
  const isUp      = diff > 0;
  const isFlat    = diff === 0;

  // YTD
  const ytd = useMemo(() => sorted.reduce((s, p) => s + p.totalAmount, 0), [sorted]);

  // Best month
  const peakIdx = useMemo(() =>
    sorted.reduce((bi, p, i) => p.totalAmount > sorted[bi].totalAmount ? i : bi, 0),
    [sorted]
  );

  // Average MOM growth rate
  const avgGrowth = useMemo(() => {
    const diffs = sorted.slice(1).map((p, i) => {
      const prev = sorted[i].totalAmount;
      return prev > 0 ? ((p.totalAmount - prev) / prev) * 100 : 0;
    });
    return diffs.length ? diffs.reduce((s, d) => s + d, 0) / diffs.length : 0;
  }, [sorted]);

  // Count-up
  const thisAnimated = useCountUp(thisAmt);
  const prevAnimated = useCountUp(prevAmt);

  // ── SVG layout ──────────────────────────────────────────────────────────────

  const W = 600; const H = 240; const padL = 8; const padR = 16; const padY = 18;
  const maxV  = Math.max(...sorted.map(p => p.totalAmount), 1);
  const minV  = Math.min(...sorted.map(p => p.totalAmount));
  const range2 = maxV - minV || 1;
  const cx    = (i: number) => padL + (n > 1 ? (i / (n - 1)) : 0.5) * (W - padL - padR);
  const cy    = (v: number) => padY + (1 - (v - minV) / range2) * (H - padY * 2);

  const coords: [number, number][] = sorted.map((p, i) => [cx(i), cy(p.totalAmount)]);
  const linePath  = smoothBezier(coords);
  const areaPath  = n > 0
    ? `M ${cx(0).toFixed(1)},${H} ` +
      sorted.map((p, i) => `L ${cx(i).toFixed(1)},${cy(p.totalAmount).toFixed(1)}`).join(' ') +
      ` L ${cx(n - 1).toFixed(1)},${H} Z`
    : '';

  const [ax, ay] = coords[n - 1] ?? [0, 0];

  // Zero baseline
  const zeroY = cy(0);
  const showZero = minV > 0 && zeroY < H && zeroY > padY;

  // Txn count secondary line
  const maxTxn  = Math.max(...sorted.map(p => p.totalCount), 1);
  const cyTxn   = (v: number) => padY + (1 - v / maxTxn) * (H - padY * 2);
  const txnPath = smoothBezier(sorted.map((p, i) => [cx(i), cyTxn(p.totalCount)]));

  const lineColor = isUp || isFlat ? 'var(--success)' : 'var(--danger)';

  // Hover: find nearest x
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || n < 2) return;
    const rect = svg.getBoundingClientRect();
    const px   = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let minDx = Infinity;
    for (let i = 0; i < n; i++) {
      const dx = Math.abs(cx(i) - px);
      if (dx < minDx) { minDx = dx; nearest = i; }
    }
    setHovIdx(nearest);
  }, [n, cx, W]);

  // 10,165,80 = var(--brand); 239,68,68 was Tailwind red-500, not this app's --danger-solid.
  const lineColorDark = isUp || isFlat ? 'color-mix(in srgb, var(--brand) 15%, transparent)' : 'color-mix(in srgb, var(--danger-solid) 15%, transparent)';
  const lineColorDark2 = isUp || isFlat ? 'color-mix(in srgb, var(--brand) 4%, transparent)' : 'color-mix(in srgb, var(--danger-solid) 4%, transparent)';

  return (
    <div className="db-root">
      <div className="db-content">
        <div className="db-inner">
          <header className="db-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 24 }}>
            <h1 className="db-card-title" style={{ fontSize: 18, margin: 0 }}>Month-over-Month Growth</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="db-trend-range-toggle" style={{ margin: 0 }}>
                {([3, 6, 12] as const).map(r => (
                  <button key={r} type="button"
                    className={`db-trend-range-btn${range === r ? ' is-active' : ''}`}
                    onClick={() => setRange(r)}
                  >{r}M</button>
                ))}
              </div>
              <button type="button" onClick={fetch} disabled={loading}
                className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                <RefreshCw size={14} className={loading ? 'ds-spin' : ''} /> Refresh
              </button>
            </div>
          </header>
          {/* Error state */}
          {error && (
            <div className="db-error-banner" role="alert" style={{ marginBottom: 24 }}>
              <div className="db-error-body">
                <span className="db-error-title">Failed to load data.</span>
              </div>
              <button className="db-error-retry" onClick={fetch} aria-label="Retry">
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && <ChartSkeleton />}

          {/* Single data point */}
          {!loading && !error && n === 1 && (
            <div className="ds-card db-card" style={{ padding: 24 }}>
              <span className="db-kpi2-foot-meta">{sorted[0].label}</span>
              <span style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)', display: 'block', marginTop: 8 }}>
                {fmtINR(sorted[0].totalAmount)}
              </span>
              <span className="db-kpi2-foot-meta" style={{ marginTop: 8, display: 'block' }}>Only one month of data — trend available next month.</span>
            </div>
          )}

          {!loading && !error && n >= 2 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

              <div className="ds-card db-card" style={{ padding: 24 }}>

                {/* MOM comparison row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  {/* This month (current — left) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="db-kpi2-foot-meta" style={{ letterSpacing: '0.04em' }}>{thisMonth?.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: isUp || isFlat ? 'var(--success)' : 'var(--danger)' }}>
                      {fmtINR(thisAnimated)}
                    </span>
                    <span className="db-kpi2-foot-meta">{thisMonth?.totalCount ?? 0} txns</span>
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
                    <span className="db-kpi2-foot-meta" style={{ letterSpacing: '0.04em' }}>{lastMonth?.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--ink-secondary)' }}>
                      {fmtINR(prevAnimated)}
                    </span>
                    <span className="db-kpi2-foot-meta">{lastMonth?.totalCount ?? 0} txns</span>
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
                    aria-label="Collection trend chart"
                    role="img"
                  >
                    <defs>
                      <linearGradient id="cmom-fill" x1="0" y1="0" x2="0" y2="1">
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

                    {/* Area fill */}
                    <path d={areaPath} fill="url(#cmom-fill)" />

                    {/* Txn count secondary line */}
                    <motion.path
                      d={txnPath} fill="none"
                      stroke="var(--ink-tertiary)" strokeWidth="1" strokeDasharray="3 3"
                      opacity="0.4"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    />

                    {/* Main line */}
                    <motion.path
                      d={linePath} fill="none"
                      stroke={lineColor} strokeWidth="2.5"
                      strokeLinejoin="round" strokeLinecap="round"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {/* Peak marker */}
                    <g>
                      <circle cx={cx(peakIdx)} cy={cy(sorted[peakIdx].totalAmount)} r="4" fill={lineColor} opacity="0.9" />
                      <rect x={cx(peakIdx) - 14} y={cy(sorted[peakIdx].totalAmount) - 26} width="28" height="18" rx="4" fill={lineColor} opacity="0.9" />
                      <text x={cx(peakIdx)} y={cy(sorted[peakIdx].totalAmount) - 17} textAnchor="middle" dominantBaseline="middle" fill="var(--text-on-solid)" fontSize="7" fontWeight="700" fontFamily="var(--font-sans)">PEAK</text>
                    </g>

                    {/* Last point dot */}
                    <motion.circle
                      cx={ax} cy={ay} r="4"
                      fill="var(--bg-surface)" stroke={lineColor} strokeWidth="2.5"
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ delay: 1.3, type: 'spring', stiffness: 400, damping: 18 }}
                    />

                    {/* Hover vertical line + dot */}
                    {hovIdx !== null && (
                      <g>
                        <line x1={cx(hovIdx)} y1={padY} x2={cx(hovIdx)} y2={H - padY} stroke="var(--ink-tertiary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                        <circle cx={cx(hovIdx)} cy={cy(sorted[hovIdx].totalAmount)} r="5" fill={lineColor} opacity="0.9" />
                      </g>
                    )}
                  </svg>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {hovIdx !== null && sorted[hovIdx] && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        style={{
                          position: 'absolute', top: 0, left: `${(cx(hovIdx) / W) * 100}%`,
                          transform: `translate(-50%, -100%)`, zIndex: 10,
                          background: 'var(--ink-solid)', color: 'var(--text-on-solid)',
                          padding: '6px 10px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', pointerEvents: 'none', boxShadow: 'var(--shadow-md)'
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{sorted[hovIdx].label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmtINR(sorted[hovIdx].totalAmount)}</span>
                        <span style={{ fontSize: 10, opacity: 0.8, fontFamily: 'var(--font-mono)' }}>{sorted[hovIdx].totalCount} txns</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* X labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px 0 8px', marginTop: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
                    {sorted.map((p, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: i === n - 1 || hovIdx === i ? 700 : 500,
                          color: i === n - 1 ? 'var(--ink-primary)' : hovIdx === i ? 'var(--ink-primary)' : 'var(--ink-tertiary)',
                          background: i === n - 1 ? 'var(--bg-subtle)' : 'transparent',
                          padding: '2px 6px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s ease',
                        }}
                        onClick={() => navigate(`/app/collections?month=${p.label}`)}
                        role="button" tabIndex={0}
                        title={`View ${p.label} collections`}
                      >
                        {p.label?.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* YTD + Avg growth */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="db-kpi2-foot-meta">YTD Total</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)' }}>{fmtINR(ytd)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                    <span className="db-kpi2-foot-meta">Avg MoM Growth</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: avgGrowth >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {avgGrowth >= 0 ? '+' : ''}{avgGrowth.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span className="db-kpi2-foot-meta">Peak Month</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)' }}>{sorted[peakIdx]?.label?.slice(0, 3)}</span>
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
