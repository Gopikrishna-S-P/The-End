import L from 'leaflet';
// Self-hosted (bundled by Vite) instead of hotlinking unpkg.com -- one less
// third-party origin the CSP needs to allow, and one less runtime dependency
// on a CDN staying up.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export const TILE_LIGHT_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const TILE_DARK_URL  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const TILE_ATTRIB    = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors '
                            + '&copy; <a href="https://carto.com/attributions">CARTO</a>';
export const STREET_ZOOM = 16;
export const CITY_ZOOM   = 11;
export const REFRESH_MS  = 30_000;

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

export const agentIcon = L.divIcon({
  className: '',
  html: `<span class="fo-dot fo-dot-agent"></span>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

export const sosIcon = L.divIcon({
  className: '',
  html: `<span class="fo-dot fo-dot-sos"></span>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

export interface AgentPos {
  agentId: string;
  agentName?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  ts: string;
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function wsUrl(path: string, token: string | null): string {
  const base = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${base}/${path}${q}`;
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '??';
}

export function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 10)    return 'just now';
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
}
