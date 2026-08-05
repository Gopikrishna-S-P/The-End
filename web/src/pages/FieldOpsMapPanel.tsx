import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Navigation2, AlertTriangle, WifiOff } from 'lucide-react';
import {
  TILE_LIGHT_URL, TILE_DARK_URL, TILE_ATTRIB, STREET_ZOOM, CITY_ZOOM,
  agentIcon, sosIcon, initials, relativeTime,
  type AgentPos, type WsStatus,
} from './FieldOpsUtils';

interface Props {
  agents: Map<string, AgentPos>;
  agentList: AgentPos[];
  openAgentIds: Set<string>;
  openCount: number;
  mapCenter: [number, number];
  isDark: boolean;
  wsStatus: WsStatus;
}

export function FieldOpsMapPanel({ agents, agentList, openAgentIds, openCount, mapCenter, isDark, wsStatus }: Props) {
  return (
    <div className="ds-card fo-map-panel">
      <div className="fo-map-wrap">
        <MapContainer center={mapCenter} zoom={agentList.length > 0 ? STREET_ZOOM : CITY_ZOOM}
          style={{ height: '100%', width: '100%' }} scrollWheelZoom maxZoom={19}>
          <TileLayer attribution={TILE_ATTRIB} url={isDark ? TILE_DARK_URL : TILE_LIGHT_URL}
            maxZoom={19} key={isDark ? 'dark' : 'light'} />
          {agentList.map(agent => (
            <Marker key={agent.agentId} position={[agent.lat, agent.lng]}
              icon={openAgentIds.has(agent.agentId) ? sosIcon : agentIcon}>
              <Popup>
                <strong>{agent.agentName ?? 'Unknown agent'}</strong>
                {agent.accuracy != null && <><br />±{agent.accuracy.toFixed(0)} m accuracy</>}
                {agent.speed    != null && <><br />{agent.speed.toFixed(1)} m/s</>}
                <br />{new Date(agent.ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                {openAgentIds.has(agent.agentId) && (
                  <><br /><span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠ SOS active</span></>
                )}
              </Popup>
            </Marker>
          ))}
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
