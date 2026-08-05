export type ShiftStatus = 'ACTIVE' | 'ENDED' | 'AUTO_ENDED';

export interface AgentShiftResponse {
  id: string;
  agentId: string;
  organizationId: string;
  startedAt: string;
  endedAt?: string;
  status: ShiftStatus;
}

export interface StartShiftRequest {
  lat?: number;
  lng?: number;
}

export interface SosRequest {
  agentId: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  notes?: string;
}

export interface LocationPingRequest {
  agentId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  batteryLevel?: number;
  mockLocationDetected?: boolean;
  recordedAt?: string;
}

export interface AgentLiveStatusResponse {
  shiftId: string;
  agentId: string;
  shiftStartedAt: string;
  lastLat?: number;
  lastLng?: number;
  lastAccuracy?: number;
  lastPingAt?: string;
  lastMockDetected: boolean;
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
  createdAt: string;
}
