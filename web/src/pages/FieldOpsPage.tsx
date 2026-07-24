import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import { fieldOpsApi } from '../api';
import { useAuth } from '../AuthContext';
import type { IncidentReportResponse } from '../types';
import { AlertTriangle, AlertCircle, RefreshCw, X, Navigation2, Users, MapPin, CheckCircle2 } from 'lucide-react';
import { SosLiveMonitor } from './SosLiveMonitor';
import { useDarkMode } from '../hooks/useDarkMode';
import { REFRESH_MS } from './FieldOpsUtils';
import { useLiveTrack } from '../hooks/useFieldOpsTrack';
import { FieldOpsMapPanel } from './FieldOpsMapPanel';
import { FieldOpsIncidentPanel } from './FieldOpsIncidentPanel';
import '../styles/AppPage.css';
import './Dashboard.css';
import '../styles/FieldOpsPage.css';

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

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, footer, icon: Icon, accent, warn, danger, onClick }: {
  label: string; value: string | number;
  footer?: React.ReactNode;
  icon?: React.ElementType; accent?: boolean; warn?: boolean; danger?: boolean;
  onClick?: () => void;
}) {
  const { ref, fire } = useRipple<HTMLButtonElement>();
  return (
    <motion.button ref={ref} type="button" variants={fadeUp}
      className={`db-kpi2-card${accent ? ' is-accent' : ''}${warn ? ' is-warn' : ''}${danger ? ' is-danger' : ''}${onClick ? ' is-hoverable' : ''}`}
      onClick={e => { fire(e); onClick?.(); }} disabled={!onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <div className="db-kpi2-top">
        <span className="db-kpi2-label">{label}</span>
        {Icon && <span className="db-kpi2-icon"><Icon size={14} aria-hidden="true" /></span>}
      </div>
      <div className="db-kpi2-value-row">
        <span className="db-kpi2-value">{value}</span>
      </div>
      {footer && <div className="db-kpi2-footer">{footer}</div>}
    </motion.button>
  );
}

export default function FieldOpsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';
  const isDark = useDarkMode();

  const [incidents,           setIncidents]           = useState<IncidentReportResponse[]>([]);
  const [showResolved,        setShowResolved]        = useState(false);
  const [loading,             setLoading]             = useState(true);
  const [refreshing,          setRefreshing]          = useState(false);
  const [error,               setError]               = useState<{ title: string; sub: string } | null>(null);
  const [lastRefreshed,       setLastRefreshed]       = useState<Date | null>(null);
  const [newSosAlert,         setNewSosAlert]         = useState<string | null>(null);
  const [listeningIncidentId, setListeningIncidentId] = useState<string | null>(null);
  const [listeningAgentId,    setListeningAgentId]    = useState<string | null>(null);
  const [resolvingId,         setResolvingId]         = useState<string | null>(null);
  const [resolveNotes,        setResolveNotes]        = useState('');
  const [resolveLoading,      setResolveLoading]      = useState(false);
  const [, tick] = useState(0);

  const seenIds      = useRef<Set<string>>(new Set());
  const firstOpenRef = useRef<HTMLLIElement | null>(null);
  const { agents, wsStatus } = useLiveTrack(orgId);

  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    setRefreshing(true);
    try {
      const page = await fieldOpsApi.listIncidents({ orgId, unresolvedOnly: !showResolved, page: 0, size: 50 });
      setIncidents(page.content);
      setError(null);
      if (seenIds.current.size > 0) {
        const newOnes = page.content.filter(i => !i.resolvedAt && !seenIds.current.has(i.id));
        if (newOnes.length > 0) setNewSosAlert(`New SOS from ${newOnes[0].agentName ?? 'unknown agent'}`);
      }
      page.content.forEach(i => seenIds.current.add(i.id));
    } catch {
      setError({ title: 'Field ops data could not be loaded.', sub: 'Check your connection or try refreshing.' });
    } finally { setLoading(false); setRefreshing(false); setLastRefreshed(new Date()); }
  }, [orgId, showResolved]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!newSosAlert) return;
    const t = setTimeout(() => setNewSosAlert(null), 8000);
    return () => clearTimeout(t);
  }, [newSosAlert]);

  const doResolve = async (id: string) => {
    setResolveLoading(true);
    try {
      await fieldOpsApi.resolveIncident(id, resolveNotes || undefined);
      setResolvingId(null); setResolveNotes(''); load();
    } catch (err: unknown) {
      setError({ title: 'Could not resolve incident.', sub: (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Please try again.' });
      setResolvingId(null);
    } finally { setResolveLoading(false); }
  };

  const openCount    = incidents.filter(i => !i.resolvedAt).length;
  const resolvedCount = incidents.filter(i => !!i.resolvedAt).length;
  const openAgentIds = new Set(incidents.filter(i => !i.resolvedAt).map(i => i.agentId));
  const agentList    = [...agents.values()].sort(
    (a, b) => (openAgentIds.has(b.agentId) ? 1 : 0) - (openAgentIds.has(a.agentId) ? 1 : 0),
  );
  const mapCenter: [number, number] = agentList.length > 0
    ? [agentList[0].lat, agentList[0].lng]
    : [20.5937, 78.9629];

  const liveAgentsAnim = useCountUp(agents.size);
  const openSosAnim = useCountUp(openCount);
  const resolvedAnim = useCountUp(resolvedCount);

  return (
    <div className="db-root">
      <AnimatePresence>
        {newSosAlert && (
          <motion.div key="toast-err" className="ds-toast is-err" role="status"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
            onClick={() => setNewSosAlert(null)}>
            <AlertTriangle size={14} />
            <span>{newSosAlert}</span>
            <X size={13} className="ds-toast-x" />
          </motion.div>
        )}
        {error && (
          <motion.div key="banner-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">{error.title}</span>
              <span className="db-error-sub">{error.sub}</span>
            </div>
            <button className="db-error-retry" onClick={() => { setError(null); load(); }} aria-label="Retry">
              <RefreshCw size={14} aria-hidden="true" />
            </button>
            <button className="db-error-retry" onClick={() => setError(null)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content">


        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">


          <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
            {/* Map Panel (Left, flex: 1) */}
            <motion.div variants={fadeUp} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <FieldOpsMapPanel
                agents={agents} agentList={agentList} openAgentIds={openAgentIds}
                openCount={openCount} mapCenter={mapCenter} isDark={isDark} wsStatus={wsStatus}
              />
            </motion.div>

            {/* Sidebar (Right, width: 380px) */}
            <motion.div variants={fadeUp} style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', paddingRight: 4 }}>
              <div className="ds-card db-card" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 className="db-card-title">Live Tracking</h2>
                    <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                      / Real-time location and SOS monitoring
                    </span>
                    <span className="ds-pill is-neutral" style={{ marginLeft: 8, fontSize: 10 }}>{agentList.length}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button type="button" onClick={load} disabled={refreshing}
                      className="ds-btn is-secondary" style={{ height: 32 }} aria-label="Refresh" title="Refresh">
                      <RefreshCw size={14} className={refreshing ? 'ds-spin' : ''} style={{ marginRight: 6 }} /> Refresh
                    </button>
                  </div>
                </header>
                <div className="db-card-body" style={{ padding: 0, maxHeight: 300, overflowY: 'auto' }}>
                  {agentList.length === 0 ? (
                    <div className="ds-empty" style={{ padding: '40px 0' }}>
                      <Navigation2 size={24} className="ds-empty-icon" />
                      <span className="ds-empty-title" style={{ fontSize: 13 }}>No agents on shift</span>
                      <span className="ds-empty-sub">Officers appear here once they go live.</span>
                    </div>
                  ) : agentList.map(a => (
                    <div key={a.agentId} className="db-att-row" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 20px', borderRadius: 0, background: openAgentIds.has(a.agentId) ? 'var(--danger-subtle)' : 'transparent' }}>
                      <span className="db-att-chip" style={{ width: 32, height: 32, flexShrink: 0, background: openAgentIds.has(a.agentId) ? 'var(--danger)' : 'var(--bg-subtle)', color: openAgentIds.has(a.agentId) ? '#fff' : 'var(--ink-solid)' }}>
                        {`${a.agentName?.[0] ?? '?'}`.toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 12 }}>
                        <span className="db-att-label" style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{a.agentName ?? 'Unknown'}</span>
                        <span className="db-kpi2-foot-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} /> {a.accuracy != null ? `±${a.accuracy.toFixed(0)}m` : 'tracking'}
                        </span>
                      </div>
                      {openAgentIds.has(a.agentId) && <span className="ds-pill is-danger" style={{ fontSize: 9, padding: '0 6px', height: 18 }}>SOS</span>}
                    </div>
                  ))}
                </div>
              </div>

              <FieldOpsIncidentPanel
                incidents={incidents} loading={loading} showResolved={showResolved}
                openCount={openCount} firstOpenRef={firstOpenRef}
                resolvingId={resolvingId} resolveNotes={resolveNotes} resolveLoading={resolveLoading}
                setShowResolved={setShowResolved} setResolvingId={setResolvingId} setResolveNotes={setResolveNotes}
                doResolve={doResolve}
                onListen={(incidentId, agentId) => { setListeningIncidentId(incidentId); setListeningAgentId(agentId); }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {listeningIncidentId && listeningAgentId && (
          <SosLiveMonitor incidentId={listeningIncidentId} agentId={listeningAgentId}
            onClose={() => { setListeningIncidentId(null); setListeningAgentId(null); }} />
        )}
      </AnimatePresence>

    </div>
  );
}

