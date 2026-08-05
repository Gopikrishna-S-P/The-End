// The backend's /cases/{id}/timeline deliberately omits VISIT_LOGGED and
// PTP_CREATED (see CaseTimelineServiceImpl's class javadoc) because the web
// app synthesizes those client-side from the visits/ptps endpoints instead —
// this mirrors that same merge so mobile shows an equally complete history.
import { DISP_LABELS } from './statusStyles';
import { formatCurrency } from './allocationHeuristics';
import type { CaseEventResponse, PtpResponse, VisitLogResponse } from '@/types/domain';

export interface TimelineEntry {
  timestamp: string;
  eventType: CaseEventResponse['eventType'] | 'VISIT_LOGGED' | 'PTP_CREATED';
  summary: string;
  actorName?: string;
  narrative?: string;
  sourceId: string;
}

export function mergeTimeline(
  events: CaseEventResponse[],
  visitLogs: VisitLogResponse[],
  ptps: PtpResponse[],
): TimelineEntry[] {
  const fromEvents: TimelineEntry[] = events.map((e) => ({
    timestamp: e.timestamp,
    eventType: e.eventType,
    summary: e.summary,
    actorName: e.actorName,
    narrative: e.narrative,
    sourceId: e.sourceId,
  }));

  const fromVisits: TimelineEntry[] = visitLogs.map((v) => ({
    timestamp: v.visitTime || v.visitDate,
    eventType: 'VISIT_LOGGED',
    summary: v.disp ? `Visit — ${DISP_LABELS[v.disp]}` : 'Visit logged',
    actorName: v.agentName,
    narrative: v.visitNotes,
    sourceId: v.id,
  }));

  const fromPtps: TimelineEntry[] = ptps.map((p) => ({
    timestamp: p.createdAt,
    eventType: 'PTP_CREATED',
    summary: `Promise to pay ${formatCurrency(p.promisedAmount)} by ${p.promisedDate}`,
    actorName: p.agentName,
    narrative: p.contactNotes,
    sourceId: p.id,
  }));

  return [...fromEvents, ...fromVisits, ...fromPtps].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
