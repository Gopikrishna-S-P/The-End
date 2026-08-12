import { Fragment, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Navigation2, AlertTriangle, WifiOff } from 'lucide-react';
import type { AgentDot } from '../hooks/useLiveTrackSocket';
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
  isDark: boolean;
  wsStatus: WsStatus;
  onSelect: (agent: AgentDot) => void;
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

export function FieldOpsMapPanel({ agents, agentList, openAgentIds, openCount, mapCenter, isDark, wsStatus, onSelect }: Props) {
  // Breadcrumb history — last 20 positions per agent, kept across renders in a
  // ref (not state) since it's purely a rendering aid and shouldn't re-trigger
  // the effect chain that state would.
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
          {agentList.map(agent => {
            const hasSos = openAgentIds.has(agent.agentId);
            const color = dotColor(agent, hasSos);
            const trail = trailsRef.current.get(agent.agentId) ?? [];
            return (
              <Fragment key={agent.agentId}>
                {agent.accuracy > 0 && (
                  <Circle center={[agent.lat, agent.lng]} radius={agent.accuracy}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.07, weight: 1, opacity: 0.25 }} />
                )}
                {trail.length > 1 && (
                  <Polyline positions={trail} pathOptions={{ color, weight: 2, opacity: 0.45, dashArray: '5 5' }} />
                )}
                <Marker position={[agent.lat, agent.lng]} icon={makeAgentIcon(agent, hasSos)}
                  eventHandlers={{ click: () => onSelect(agent) }}>
                  <Popup>
                    <strong>{agent.agentName ?? 'Unknown agent'}</strong>
                    <br />{agent.online ? (agent.visitSessionId ? 'Active visit' : 'On shift') : 'Offline'}
                    {agent.accuracy > 0 && <><br />±{agent.accuracy.toFixed(0)} m accuracy</>}
                    {agent.speed    != null && <><br />{(agent.speed * 3.6).toFixed(1)} km/h</>}
                    <br />{new Date(agent.ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    {hasSos && (
                      <><br /><span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠ SOS active</span></>
                    )}
                  </Popup>
                </Marker>
              </Fragment>
            );
          })}
        </MapContainer>

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
