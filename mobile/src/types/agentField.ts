// Types for the field-agent shift / live-location / SOS / offline-sync
// subsystem (server's AgentFieldController, "design-doc §7.3/§7.6"). This
// backend surface exists specifically for a mobile client — the web app
// only ever consumes it as a supervisor-side viewer (Live Track, incidents).
import type { CreatePtpRequest, SubmitCollectionRequest, VisitLogRequest } from './domain';

export type ShiftStatus = 'ACTIVE' | 'ENDED' | 'AUTO_ENDED';

export interface StartShiftRequest {
  lat?: number;
  lng?: number;
}

export interface AgentShiftResponse {
  id: string;
  agentId: string;
  organizationId: string;
  startedAt: string;
  endedAt?: string;
  status: ShiftStatus;
}

export interface LocationPingRequest {
  agentId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  batteryLevel?: number;
  mockLocationDetected: boolean;
  recordedAt?: string;
}

export interface SosRequest {
  agentId: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  notes?: string;
}

export interface IncidentReportResponse {
  id: string;
  agentId: string;
  agentName?: string;
  organizationId: string;
  shiftId?: string;
  triggeredAt: string;
  lastKnownLat?: number;
  lastKnownLng?: number;
  lastKnownAccuracy?: number;
  recentPings?: Array<Record<string, unknown>>;
  notes?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolutionNotes?: string;
  createdAt?: string;
}

// ── Offline batch sync ──────────────────────────────────────────────────────

export type SyncItemKind = 'COLLECTION' | 'PTP' | 'VISIT_METADATA';

export interface AgentSyncItem {
  clientId: string;
  kind: SyncItemKind;
  collection?: SubmitCollectionRequest;
  ptp?: CreatePtpRequest;
  visit?: VisitLogRequest;
}

export interface AgentSyncRequest {
  items: AgentSyncItem[];
}

export interface AgentSyncItemResult {
  clientId: string;
  kind: SyncItemKind;
  success: boolean;
  serverId?: string;
  error?: string;
}

export interface AgentSyncResponse {
  succeeded: number;
  failed: number;
  results: AgentSyncItemResult[];
}
