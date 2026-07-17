import type { AuditLogResponse, VisitLogResponse, CollectionResponse, PtpResponse } from '../types';
import { User, MapPin, Banknote, Calendar } from 'lucide-react';
import type { ElementType } from 'react';

export type EventKind = 'assignment' | 'visit' | 'collection' | 'ptp';
export type FilterKind = 'all' | EventKind;

export interface OrgEvent {
  key: string;
  kind: EventKind;
  title: string;
  subtitle?: string;
  actor?: string;
  ts: string;
  amount?: number;
  status?: string;
  allocationId?: string;
  reason?: string;
}

export const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtINR = (n?: number | null) =>
  n != null ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : null;

export function fromAudit(l: AuditLogResponse): OrgEvent {
  const title = l.action === 'ASSIGNED' ? 'Case assigned' : l.action === 'REASSIGNED' ? 'Case reassigned'
    : l.action === 'CANCELLED' ? 'Assignment cancelled' : l.action === 'DELETED' ? 'Assignment deleted'
    : l.action.replace(/_/g, ' ');
  return { key: `al-${l.id}`, kind: 'assignment', title, actor: l.performedByName ?? undefined, ts: l.createdAt, allocationId: l.allocationId, reason: l.reason, status: l.action };
}

export function fromVisit(v: VisitLogResponse): OrgEvent {
  const disp = v.disp ?? v.visitOutcome;
  return { key: `vis-${v.id}`, kind: 'visit', title: 'Field visit', subtitle: [disp, v.contactability?.replace(/_/g, ' ')].filter(Boolean).join(' · ') || undefined, actor: v.agentName ?? undefined, ts: v.createdAt, amount: v.amountCollected ?? undefined, status: v.approvalStatus, allocationId: v.allocationId };
}

export function fromCollection(c: CollectionResponse): OrgEvent {
  const title = c.status === 'APPROVED' ? 'Collection approved' : c.status === 'REJECTED' ? 'Collection rejected'
    : c.status === 'DEPOSITED' ? 'Collection deposited' : c.status === 'CANCELLED' ? 'Collection cancelled' : 'Collection submitted';
  return { key: `col-${c.id}`, kind: 'collection', title, subtitle: c.paymentMode?.replace(/_/g, ' '), ts: c.approvedAt ?? c.depositedAt ?? c.createdAt, amount: c.amount, status: c.status, allocationId: c.allocationId, reason: c.rejectionReason };
}

export function fromPtp(p: PtpResponse): OrgEvent {
  const title = p.status === 'FULFILLED' ? 'PTP fulfilled' : p.status === 'BROKEN' ? 'PTP broken'
    : p.status === 'PARTIALLY_FULFILLED' ? 'PTP partial' : p.status === 'CANCELLED' ? 'PTP cancelled' : 'PTP recorded';
  return { key: `ptp-${p.id}`, kind: 'ptp', title, subtitle: p.borrowerName || undefined, actor: p.agentName ?? undefined, ts: p.fulfilledAt ?? p.brokenAt ?? p.updatedAt ?? p.createdAt, amount: p.promisedAmount, status: p.status, allocationId: p.allocationId, reason: p.brokenReason ?? p.cancellationReason };
}

export const KIND_META: Record<EventKind, { label: string; Icon: ElementType }> = {
  assignment: { label: 'Assignment', Icon: User },
  visit:      { label: 'Visit',      Icon: MapPin },
  collection: { label: 'Collection', Icon: Banknote },
  ptp:        { label: 'PTP',        Icon: Calendar },
};

export function dotVariant(e: OrgEvent): string {
  const s = e.status ?? '';
  if (['ASSIGNED', 'APPROVED', 'DEPOSITED', 'FULFILLED'].includes(s)) return 'is-success';
  if (['REJECTED', 'BROKEN', 'CANCELLED', 'DELETED'].includes(s)) return 'is-error';
  if (['PENDING', 'PARTIALLY_FULFILLED', 'PENDING_APPROVAL'].includes(s)) return 'is-warn';
  if (['REASSIGNED'].includes(s)) return 'is-info';
  return '';
}

export const PAGE_SIZE  = 25;
export const FETCH_SIZE = 100;
