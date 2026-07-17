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
