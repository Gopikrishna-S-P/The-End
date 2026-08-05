export type VisitSessionStatus = 'STARTED' | 'REACHED' | 'WAITING' | 'CLOSED' | 'ABANDONED';
export type VisitSource = 'MOBILE' | 'DISPATCH' | 'ASSIGNED';

export interface VisitSession {
  id: string;
  allocationId: string;
  loanNumber: string | null;
  borrowerName: string | null;
  agentId: string;
  agentName: string;
  status: VisitSessionStatus;
  source: VisitSource;
  startedAt: string;
  startedLat: number | null;
  startedLng: number | null;
  reachedAt: string | null;
  reachedLat: number | null;
  reachedLng: number | null;
  waitingSince: string | null;
  closedAt: string | null;
  distanceMetres: number;
  visitLogId: string | null;
}

export interface TeamStatusEntry {
  agentId: string;
  agentName: string;
  activeStatus: VisitSessionStatus | null;
  activeSessionId: string | null;
  activeLoanNumber: string | null;
  activeBorrowerName: string | null;
  statusSince: string | null;
  totalDistanceMetres: number;
}

export interface DistanceSummaryEntry {
  agentId: string;
  agentName: string;
  totalDistanceMetres: number;
  sessionCount: number;
}

export interface StartVisitRequest {
  allocationId: string;
  source: VisitSource;
  dailyVisitListId?: string;
  assignmentId?: string;
  lat?: number;
  lng?: number;
}

export interface VisitTransitionRequest {
  lat?: number;
  lng?: number;
}

export interface PingRequest {
  lat: number;
  lng: number;
  accuracy?: number;
}
