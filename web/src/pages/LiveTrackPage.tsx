// LiveTrackPage.tsx — Supervisor real-time field officer tracking map
// Uses Leaflet (loaded via CDN in index.html) and the useLiveTrackSocket hook.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLiveTrackSocket, type AgentDot } from '../hooks/useLiveTrackSocket';
import './LiveTrackPage.css';

declare const L: any;

// ── helpers ───────────────────────────────────────────────────────────────

function dotColor(a: AgentDot): string {
  if (!a.online)        return '#9ca3af'; // grey  — offline
  if (a.visitSessionId) return '#22c55e'; // green — active visit
  return '#3b82f6';                       // blue  — on shift, no visit
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function makeIcon(agent: AgentDot) {
  const color   = dotColor(agent);
  const opacity = agent.online ? 1 : 0.4;
  const arrow   = agent.heading != null
    ? `<div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%) rotate(${agent.heading}deg);color:${color};font-size:14px;line-height:1;filter:drop-shadow(0 0 2px #fff);">▲</div>`
    : '';
  const mock = agent.mockDetected
    ? `<div style="position:absolute;bottom:110%;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;font-size:9px;padding:1px 5px;border-radius:3px;white-space:nowrap;pointer-events:none;">MOCK GPS</div>`
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:28px;height:28px;">${mock}${arrow}<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);opacity:${opacity};transition:background 0.3s;"></div></div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
  });
}

// ── component ─────────────────────────────────────────────────────────────

export default function LiveTrackPage() {
  const { agents, connected } = useLiveTrackSocket();

  const mapRef       = useRef<any>(null);
  const mapDivRef    = useRef<HTMLDivElement>(null);
  const markersRef   = useRef<Map<string, any>>(new Map());
  const circlesRef   = useRef<Map<string, any>>(new Map());
  const trailsRef    = useRef<Map<string, any>>(new Map());
  const trailDataRef = useRef<Map<string, [number, number][]>>(new Map());

  const [selected, setSelected] = useState<AgentDot | null>(null);
  const [, setTick]             = useState(0);

  // Re-render timeAgo labels every 10 s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  // Init Leaflet map once
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current || typeof L === 'undefined') return;
    const map = L.map(mapDivRef.current, { zoomControl: false }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    // CRITICAL: Leaflet reads container size at init. If CSS hasn't painted yet
    // (common in React), the map sees 0×0 and renders nothing. Force a remeasure.
    requestAnimationFrame(() => { map.invalidateSize(); });

    // Also remeasure whenever the container resizes (sidebar collapse, window resize)
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapDivRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers / circles / trails on every agents change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    agents.forEach((agent, agentId) => {
      const ll: [number, number] = [agent.lat, agent.lng];

      // Marker
      if (!markersRef.current.has(agentId)) {
        const m = L.marker(ll, { icon: makeIcon(agent) })
          .addTo(map)
          .on('click', () => setSelected(agent));
        markersRef.current.set(agentId, m);
      } else {
        const m = markersRef.current.get(agentId)!;
        m.setLatLng(ll);
        m.setIcon(makeIcon(agent));
        m.off('click').on('click', () => setSelected(agent));
      }

      // Accuracy circle
      const r = agent.accuracy || 0;
      if (!circlesRef.current.has(agentId)) {
        const c = L.circle(ll, {
          radius: r, color: dotColor(agent), fillColor: dotColor(agent),
          fillOpacity: 0.07, weight: 1, opacity: 0.25,
        }).addTo(map);
        circlesRef.current.set(agentId, c);
      } else {
        circlesRef.current.get(agentId)!.setLatLng(ll).setRadius(r);
      }

      // Breadcrumb trail (last 20 positions)
      const trail = trailDataRef.current.get(agentId) ?? [];
      trail.push(ll);
      if (trail.length > 20) trail.shift();
      trailDataRef.current.set(agentId, trail);
      trailsRef.current.get(agentId)?.remove();
      const poly = L.polyline(trail, {
        color: dotColor(agent), weight: 2, opacity: 0.45, dashArray: '5 5',
      }).addTo(map);
      trailsRef.current.set(agentId, poly);
    });

    // Remove stale markers for agents no longer present
    markersRef.current.forEach((_, agentId) => {
      if (!agents.has(agentId)) {
        markersRef.current.get(agentId)?.remove(); markersRef.current.delete(agentId);
        circlesRef.current.get(agentId)?.remove(); circlesRef.current.delete(agentId);
        trailsRef.current.get(agentId)?.remove();  trailsRef.current.delete(agentId);
        trailDataRef.current.delete(agentId);
      }
    });
  }, [agents]);

  // Keep the detail panel in sync with the latest agent data
  useEffect(() => {
    if (selected) setSelected(prev => prev ? (agents.get(prev.agentId) ?? prev) : null);
  }, [agents]); // eslint-disable-line react-hooks/exhaustive-deps

  const flyTo = useCallback((agent: AgentDot) => {
    mapRef.current?.flyTo([agent.lat, agent.lng], 16, { animate: true, duration: 0.7 });
    setSelected(agent);
  }, []);

  const agentList = Array.from(agents.values()).sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return b.ts - a.ts;
  });

  return (
    <div className="lt-page">
      {/* ── Map ── */}
      <div className="lt-map-container">
        <div id="lt-map" ref={mapDivRef} />

        <div className="lt-ws-badge">
          <span className={`lt-ws-dot ${connected ? 'live' : 'dead'}`} />
          {connected ? 'Live' : 'Reconnecting…'}
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className="lt-sidebar">
        <div className="lt-sidebar-header">
          <span className="lt-sidebar-title">Field Officers</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {agentList.filter(a => a.online).length} live
          </span>
        </div>

        <div className="lt-agent-list">
          {agentList.length === 0 ? (
            <div className="lt-empty">No agents on shift</div>
          ) : agentList.map(agent => (
            <div
              key={agent.agentId}
              className={`lt-agent-row${selected?.agentId === agent.agentId ? ' is-sel' : ''}`}
              onClick={() => flyTo(agent)}
            >
              <span className="lt-status-dot" style={{ background: dotColor(agent) }} />
              <span className="lt-agent-name">
                {agent.agentName ?? agent.agentId.slice(0, 8)}
              </span>
              <div className="lt-agent-meta">
                <span className="lt-agent-time">{timeAgo(agent.ts)}</span>
                {agent.batteryLevel != null && (
                  <span className="lt-agent-batt">
                    🔋 {Math.round(agent.batteryLevel * 100)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel — shown when an agent is selected */}
        {selected && (
          <div className="lt-detail">
            <div className="lt-detail-name">
              {selected.agentName ?? 'Unknown Officer'}
            </div>

            <div className="lt-detail-row">
              <span className="lt-detail-label">Status</span>
              <span style={{ color: dotColor(selected), fontWeight: 600 }}>
                {!selected.online
                  ? 'Offline'
                  : selected.visitSessionId ? 'Active Visit' : 'On Shift'}
              </span>
            </div>
            <div className="lt-detail-row">
              <span className="lt-detail-label">Last update</span>
              <span>{timeAgo(selected.ts)}</span>
            </div>
            <div className="lt-detail-row">
              <span className="lt-detail-label">GPS accuracy</span>
              <span>±{Math.round(selected.accuracy)} m</span>
            </div>
            {selected.speed != null && (
              <div className="lt-detail-row">
                <span className="lt-detail-label">Speed</span>
                <span>{(selected.speed * 3.6).toFixed(1)} km/h</span>
              </div>
            )}
            {selected.heading != null && (
              <div className="lt-detail-row">
                <span className="lt-detail-label">Heading</span>
                <span>{Math.round(selected.heading)}°</span>
              </div>
            )}
            {selected.batteryLevel != null && (
              <div className="lt-detail-row">
                <span className="lt-detail-label">Battery</span>
                <span style={{
                  color: selected.batteryLevel < 0.2 ? '#ef4444' : undefined,
                  fontWeight: selected.batteryLevel < 0.2 ? 600 : 400,
                }}>
                  {Math.round(selected.batteryLevel * 100)}%
                  {selected.batteryLevel < 0.2 ? ' ⚠ Low' : ''}
                </span>
              </div>
            )}
            {selected.visitSessionId && (
              <div className="lt-detail-row">
                <span className="lt-detail-label">Visit</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                  {selected.visitSessionId.slice(0, 8)}…
                </span>
              </div>
            )}
            {selected.mockDetected && (
              <div className="lt-mock-badge">⚠ Mock GPS Detected</div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
