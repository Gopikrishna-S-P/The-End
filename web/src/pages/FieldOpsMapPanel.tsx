import { Fragment, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation2, AlertTriangle, WifiOff, Maximize2, Minimize2 } from 'lucide-react';
import type { AgentDot } from '../hooks/useLiveTrackSocket';
import { useAnimatedAgentPositions } from '../hooks/useAnimatedAgentPositions';
import {
  TILE_LIGHT_URL, TILE_DARK_URL, TILE_ATTRIB, STREET_ZOOM, CITY_ZOOM,
  type WsStatus,
} from './FieldOpsUtils';

interface Props {
  agents: Map<string, AgentDot>;
  agentList: AgentDot[];
  openAgentIds: Set<string>;
  openCount: number;
  mapCenter: [number, number];
  selectedAgentId: string | null;
  isDark: boolean;
  wsStatus: WsStatus;
  onSelect: (agent: AgentDot) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

// Leaflet measures its container's size once at mount and never re-checks
// on its own — it has no idea when a CSS/flex layout change (the expand
// toggle, a window resize, the sidebar hiding) makes its box taller or
// wider later. Without this, the map's own tile canvas can end up smaller
// than its container, leaving a blank/gray strip at the edge. A
// ResizeObserver on the map's real DOM container tells Leaflet to
// re-measure any time that box's actual size changes.
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

// Pans/zooms the map to the selected agent exactly once per selection —
// not on every ping while they stay selected, so it doesn't fight the
// supervisor's own panning/zooming once they've looked where they wanted.
function FlyToSelected({ selectedId, agents }: { selectedId: string | null; agents: Map<string, AgentDot> }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const agent = agents.get(selectedId);
    if (!agent) return;
    map.flyTo([agent.lat, agent.lng], STREET_ZOOM, { duration: 1 });
    // Only the selection itself should retrigger the fly-to, not subsequent
    // position pings for the already-selected agent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  return null;
}

// Colour + shape by state, ported from the old LiveTrackPage.tsx's makeIcon()
// — an open SOS always wins, then online/active-visit/offline.
function dotColor(agent: AgentDot, hasSos: boolean): string {
  if (hasSos)            return 'var(--danger)';
  if (!agent.online)     return 'var(--text-tertiary)';
  if (agent.visitSessionId) return 'var(--success)';
  return 'var(--info)';
}

function makeAgentIcon(agent: AgentDot, hasSos: boolean) {
  const color   = dotColor(agent, hasSos);
  const opacity = agent.online ? 1 : 0.45;
  const size    = hasSos ? 32 : 28;
  const arrow   = agent.heading != null
    ? `<div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%) rotate(${agent.heading}deg);color:${color};font-size:14px;line-height:1;filter:drop-shadow(0 0 2px #fff);">▲</div>`
    : '';
  const mock = agent.mockDetected
    ? `<div style="position:absolute;bottom:110%;left:50%;transform:translateX(-50%);background:var(--danger-solid);color:var(--text-on-solid);font-size:9px;padding:1px 5px;border-radius:3px;white-space:nowrap;pointer-events:none;">MOCK GPS</div>`
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">${mock}${arrow}<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);opacity:${opacity};transition:background 0.3s;"></div></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const TRAIL_LEN = 20;

export function FieldOpsMapPanel({ agents, agentList, openAgentIds, openCount, mapCenter, selectedAgentId, isDark, wsStatus, onSelect, isExpanded, onToggleExpand }: Props) {
  // Smoothed marker positions — glides toward each new ping over ~2s instead
  // of snapping, so movement reads as continuous rather than a series of jumps.
  const animatedPositions = useAnimatedAgentPositions(agents);

  // Breadcrumb history — last 20 positions per agent, kept across renders in a
  // ref (not state) since it's purely a rendering aid and shouldn't re-trigger
  // the effect chain that state would. Recorded from the REAL ping positions,
  // not the animated ones, so the trail marks actual sampled points.
  const trailsRef = useRef<Map<string, [number, number][]>>(new Map());
  agentList.forEach(agent => {
    const trail = trailsRef.current.get(agent.agentId) ?? [];
    const last = trail[trail.length - 1];
    if (!last || last[0] !== agent.lat || last[1] !== agent.lng) {
      trail.push([agent.lat, agent.lng]);
      if (trail.length > TRAIL_LEN) trail.shift();
      trailsRef.current.set(agent.agentId, trail);
    }
  });

  return (
    <div className="ds-card fo-map-panel">
      <div className="fo-map-wrap">
        <MapContainer center={mapCenter} zoom={agentList.length > 0 ? STREET_ZOOM : CITY_ZOOM}
          style={{ height: '100%', width: '100%' }} scrollWheelZoom maxZoom={19}>
          <TileLayer attribution={TILE_ATTRIB} url={isDark ? TILE_DARK_URL : TILE_LIGHT_URL}
            maxZoom={19} key={isDark ? 'dark' : 'light'} />
          <InvalidateOnResize />
          <FlyToSelected selectedId={selectedAgentId} agents={agents} />
          {agentList.map(agent => {
            const hasSos = openAgentIds.has(agent.agentId);
            const color = dotColor(agent, hasSos);
            const trail = trailsRef.current.get(agent.agentId) ?? [];
            const pos = animatedPositions.get(agent.agentId) ?? [agent.lat, agent.lng];
            return (
              <Fragment key={agent.agentId}>
                {agent.accuracy > 0 && (
                  <Circle center={pos} radius={agent.accuracy}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.07, weight: 1, opacity: 0.25 }} />
                )}
                {trail.length > 1 && (
                  <Polyline positions={trail} pathOptions={{ color, weight: 2, opacity: 0.45, dashArray: '5 5' }} />
                )}
                {/* No Leaflet Popup here — clicking already opens the sidebar
                    detail panel, which shows everything this would have
                    (name/status/accuracy/speed) plus more (heading, battery,
                    mock-GPS), so a popup bubble would only duplicate it. */}
                <Marker position={pos} icon={makeAgentIcon(agent, hasSos)}
                  eventHandlers={{ click: () => onSelect(agent) }} />
              </Fragment>
            );
          })}
        </MapContainer>

        <button type="button" className="fo-map-expand-btn" onClick={onToggleExpand}
          aria-label={isExpanded ? 'Collapse map' : 'Expand map to full page'}
          title={isExpanded ? 'Collapse map' : 'Expand map to full page'}>
          {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        <div className="fo-map-badges">
          <span className="fo-map-badge"><span className="fo-map-badge-dot" />{agents.size} live</span>
          {openCount > 0 && <span className="fo-map-badge is-sos"><AlertTriangle size={10} />{openCount} SOS</span>}
        </div>

        {agentList.length === 0 && wsStatus === 'connected' && (
          <div className="fo-map-overlay"><Navigation2 size={16} /><span>No agents on shift</span></div>
        )}
        {(wsStatus === 'disconnected' || wsStatus === 'error') && (
          <div className="fo-map-overlay is-warn"><WifiOff size={16} /><span>Live tracking disconnected — reconnecting…</span></div>
        )}
      </div>

    </div>
  );
}
