import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import { fieldOpsApi } from '../api';
import { useAuth } from '../AuthContext';
import type { IncidentReportResponse } from '../types';
import { AlertTriangle, AlertCircle, RefreshCw, X, Navigation2, MapPin, Radio, Battery, Compass, Gauge } from 'lucide-react';
import { SosLiveMonitor } from './SosLiveMonitor';
import { useDarkMode } from '../hooks/useDarkMode';
import { REFRESH_MS, relativeTime } from './FieldOpsUtils';
import { useLiveTrackSocket, type AgentDot } from '../hooks/useLiveTrackSocket';
import { FieldOpsMapPanel } from './FieldOpsMapPanel';
import { FieldOpsIncidentPanel } from './FieldOpsIncidentPanel';
import '../styles/AppPage.css';
import './Dashboard.css';
import '../styles/FieldOpsMap.css';

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
  const [selected,            setSelected]            = useState<AgentDot | null>(null);
  const [mapExpanded,         setMapExpanded]         = useState(false);
  const [sidebarTab,          setSidebarTab]          = useState<'officers' | 'incidents'>('officers');
  const [, tick] = useState(0);

  const seenIds      = useRef<Set<string>>(new Set());
  const firstOpenRef = useRef<HTMLLIElement | null>(null);
  const { agents, status: wsStatus } = useLiveTrackSocket(orgId);

  // Keep the detail panel in sync with the latest agent data, same as the
  // old LiveTrackPage did.
  useEffect(() => {
    if (selected) setSelected(prev => prev ? (agents.get(prev.agentId) ?? prev) : null);
  }, [agents]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const openAgentIds = new Set(incidents.filter(i => !i.resolvedAt).map(i => i.agentId));
  const agentList    = [...agents.values()].sort(
    (a, b) => (openAgentIds.has(b.agentId) ? 1 : 0) - (openAgentIds.has(a.agentId) ? 1 : 0),
  );
  const mapCenter: [number, number] = agentList.length > 0
    ? [agentList[0].lat, agentList[0].lng]
    : [20.5937, 78.9629];

  return (
    <div className="db-root db-fill-root">
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

          <div className="db-page-header">
            <div className="db-page-header-left">
              <span className="fo-page-context">
                Monitor field officers' live location and respond to SOS incidents in real time.
              </span>
            </div>
            {/* Tabs + refresh live in the page header, top-right — hidden while
                the map is expanded since there's no sidebar to switch between. */}
            {!mapExpanded && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="fo-tabs">
                  <button type="button" className={`fo-tab${sidebarTab === 'officers' ? ' is-active' : ''}`} onClick={() => setSidebarTab('officers')}>
                    Officers<span className="fo-tab-count">{agentList.length}</span>
                  </button>
                  <button type="button" className={`fo-tab${sidebarTab === 'incidents' ? ' is-active' : ''}`} onClick={() => setSidebarTab('incidents')}>
                    Incidents<span className={`fo-tab-count${openCount > 0 ? ' is-danger' : ''}`}>{openCount}</span>
                  </button>
                </div>
                <button type="button" onClick={load} disabled={refreshing}
                  className="ds-icon-btn is-sm" aria-label="Refresh incidents" title="Refresh incidents">
                  <RefreshCw size={14} className={refreshing ? 'ds-spin' : ''} />
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
            {/* Map Panel (Left, flex: 1) */}
            <motion.div variants={fadeUp} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <FieldOpsMapPanel
                agents={agents} agentList={agentList} openAgentIds={openAgentIds}
                openCount={openCount} mapCenter={mapCenter} selectedAgentId={selected?.agentId ?? null}
                isDark={isDark} wsStatus={wsStatus}
                onSelect={a => { setSelected(a); setSidebarTab('officers'); }}
                isExpanded={mapExpanded} onToggleExpand={() => setMapExpanded(v => !v)}
              />
            </motion.div>

            {/* Sidebar (Right, width: 380px). Officers/Incidents share one card
                via tabs instead of stacking two full cards — only one list is
                ever on screen at a time, and the Incidents tab carries a
                danger badge so an open SOS is never missed while on Officers.
                Hidden while the map is expanded, so the map gets the full row. */}
            {!mapExpanded && (
            <motion.div variants={fadeUp} style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', paddingRight: 4 }}>
              {sidebarTab === 'incidents' ? (
                <FieldOpsIncidentPanel
                  incidents={incidents} loading={loading} showResolved={showResolved}
                  openCount={openCount} firstOpenRef={firstOpenRef}
                  resolvingId={resolvingId} resolveNotes={resolveNotes} resolveLoading={resolveLoading}
                  setShowResolved={setShowResolved} setResolvingId={setResolvingId} setResolveNotes={setResolveNotes}
                  doResolve={doResolve}
                  onListen={(incidentId, agentId) => { setListeningIncidentId(incidentId); setListeningAgentId(agentId); }}
                />
              ) : (
                <div className="ds-card fo-officers-card is-overflow-hidden" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <div className="dd-cases-head" style={{ padding: '12px 16px', borderBottom: 'none', background: 'var(--bg-surface, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 className="dd-ap-header-label db-list-title" style={{ margin: 0 }}>
                      Field Officers
                    </h2>
                    <span className="dd-cp-tab-count">{agentList.length}</span>
                  </div>
                  <div style={{ maxHeight: selected ? 260 : 420, overflowY: 'auto', transition: 'max-height 220ms var(--ease-standard)' }}>
                    {agentList.length === 0 ? (
                      <div className="fo-roster-empty">
                        <span className="fo-roster-empty-icon"><Navigation2 size={20} /></span>
                        <span className="fo-roster-empty-title">No agents on shift</span>
                        <span className="fo-roster-empty-sub">Officers appear here once they go live.</span>
                      </div>
                    ) : agentList.map(a => {
                      const hasSos = openAgentIds.has(a.agentId);
                      return (
                        <div key={a.agentId}
                          className={`fo-roster-row${hasSos ? ' is-sos' : ''}${selected?.agentId === a.agentId ? ' is-selected' : ''}${!a.online ? ' is-offline' : ''}`}
                          onClick={() => setSelected(a)}>
                          <span className={`fo-roster-avatar${hasSos ? ' is-sos' : ''}`}>
                            {`${a.agentName?.[0] ?? '?'}`.toUpperCase()}
                          </span>
                          <div className="fo-roster-info">
                            <span className="fo-roster-name">{a.agentName ?? 'Unknown'}</span>
                            <span className="fo-roster-meta">
                              {a.accuracy > 0 ? `±${a.accuracy.toFixed(0)}m` : 'tracking'}{!a.online && ' · offline'}
                            </span>
                          </div>
                          {hasSos && <span className="fo-roster-sos-tag">SOS</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected agent detail — lives inside this same card now,
                      as a bottom section (matches DispatchAgentPanel's
                      dd-agent-stats-footer), not a separate stacked card. */}
                  <AnimatePresence>
                    {selected && (
                      <motion.div key={selected.agentId} className="fo-detail-footer"
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-primary)' }}>{selected.agentName ?? 'Unknown officer'}</span>
                          <button type="button" onClick={() => setSelected(null)} className="ds-icon-btn is-sm" aria-label="Close">
                            <X size={13} />
                          </button>
                        </div>
                        <div className="fo-detail-grid">
                          <div className="fo-detail-row">
                            <span className="fo-detail-label"><Radio size={11} /> Status</span>
                            <span style={{ fontWeight: 600, color: !selected.online ? 'var(--text-tertiary)' : selected.visitSessionId ? 'var(--success)' : 'var(--info)' }}>
                              {!selected.online ? 'Offline' : selected.visitSessionId ? 'Active visit' : 'On shift'}
                            </span>
                          </div>
                          <div className="fo-detail-row">
                            <span className="fo-detail-label">Last update</span>
                            <span>{relativeTime(new Date(selected.ts).toISOString())}</span>
                          </div>
                          <div className="fo-detail-row">
                            <span className="fo-detail-label"><MapPin size={11} /> GPS accuracy</span>
                            <span>±{Math.round(selected.accuracy)} m</span>
                          </div>
                          {selected.speed != null && (
                            <div className="fo-detail-row">
                              <span className="fo-detail-label"><Gauge size={11} /> Speed</span>
                              <span>{(selected.speed * 3.6).toFixed(1)} km/h</span>
                            </div>
                          )}
                          {selected.heading != null && (
                            <div className="fo-detail-row">
                              <span className="fo-detail-label"><Compass size={11} /> Heading</span>
                              <span>{Math.round(selected.heading)}°</span>
                            </div>
                          )}
                          {selected.batteryLevel != null && (
                            <div className="fo-detail-row">
                              <span className="fo-detail-label"><Battery size={11} /> Battery</span>
                              <span style={{
                                color: selected.batteryLevel < 0.2 ? 'var(--danger)' : undefined,
                                fontWeight: selected.batteryLevel < 0.2 ? 600 : 400,
                              }}>
                                {Math.round(selected.batteryLevel * 100)}%{selected.batteryLevel < 0.2 ? ' ⚠ Low' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        {selected.mockDetected && (
                          <div className="db-att-row is-warn" style={{ padding: '8px 10px', borderRadius: 8, fontSize: 12 }}>
                            <AlertTriangle size={13} style={{ color: 'var(--warning)', marginRight: 6 }} /> Mock GPS detected
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
            )}
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

