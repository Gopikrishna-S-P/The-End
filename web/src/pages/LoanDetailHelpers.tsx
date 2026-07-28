import type { ReactNode } from 'react';
import { User, Phone, MapPin, CreditCard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AllocationStatus } from '../types';

export const PILL_VARIANT: Record<string, string> = {
  UNASSIGNED: 'is-warn',    ASSIGNED: 'is-info',       CLOSED: 'is-accent',
  PENDING: 'is-warn',       COMPLETED: 'is-accent',    APPROVED: 'is-accent',
  REJECTED: 'is-error',     FULFILLED: 'is-accent',    BROKEN: 'is-error',
  CANCELLED: 'is-error',    PENDING_APPROVAL: 'is-warn', DEPOSITED: 'is-info',
  IN_PROGRESS: 'is-info',   REASSIGNED: 'is-info',     RESCHEDULED: 'is-info',
  HIGH: 'is-error',         MEDIUM: 'is-warn',         LOW: 'is-accent',
  PARTIALLY_FULFILLED: 'is-warn',
  PAID: 'is-accent',        PTP: 'is-info',            RTP: 'is-error',
  NC_SKIP: 'is-error',      FOLLOW_UP: 'is-warn',
};

export const Pill = ({ status }: { status?: string }) => {
  if (!status) return null;
  const variant = PILL_VARIANT[status] ?? '';
  return <span className={`ds-pill ${variant}`}>{status.replace(/_/g, ' ')}</span>;
};

export const ALL_DISPOSITIONS = ['PAID', 'RTP', 'NC_SKIP', 'PTP', 'FOLLOW_UP'] as const;
export type Disposition = typeof ALL_DISPOSITIONS[number];

export const bucketFor = (daysOverdue: number | null): { label: string; tone: Tone } | null => {
  if (daysOverdue == null) return null;
  if (daysOverdue <= 0)  return { label: 'Current', tone: 'success' };
  if (daysOverdue <= 30) return { label: '1-30',     tone: 'neutral' };
  if (daysOverdue <= 60) return { label: '31-60',    tone: 'warn' };
  if (daysOverdue <= 90) return { label: '61-90',    tone: 'warn' };
  return { label: '90+', tone: 'danger' };
};

export const isEmptyValue = (v: unknown): boolean => {
  if (v == null) return true;
  const EMPTY_VALUES = new Set(['', '-', 'n/a', 'na', 'null', 'undefined', 'none', '0', 'false']);
  return EMPTY_VALUES.has(String(v).trim().toLowerCase());
};

export const Row = ({ label, children, title }: { label: string; children: ReactNode; title?: string }) => {
  if (children == null) return null;
  if (typeof children === 'string' && isEmptyValue(children)) return null;
  return (
    <div className="db-att-row" title={title} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', background: 'transparent' }}>
      <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 13 }}>{label}</span>
      <span className="db-att-value" style={{ color: 'var(--ink-primary)', fontSize: 13, textAlign: 'right', fontWeight: 500 }}>{children}</span>
    </div>
  );
};

export const fmtCurrency = (v?: number | null) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v ?? 0);

export const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const date = new Date(s);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDT = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const fmtRelative = (s?: string | null): string => {
  if (!s) return '—';
  const date = new Date(s);
  if (Number.isNaN(date.getTime())) return '—';
  const sec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(sec);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 45) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(sec / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(sec / 2592000), 'month');
  return rtf.format(Math.round(sec / 31536000), 'year');
};

export const findDueDate = (d?: Record<string, unknown> | null): string | null => {
  if (!d) return null;
  const exact = ['due_date', 'dueDate', 'next_due_date', 'nextDueDate', 'emi_due_date', 'emiDueDate'];
  for (const k of exact) if (d[k] && !isEmptyValue(d[k])) return String(d[k]);
  const fuzzy = Object.keys(d).find(k => /due[\s_-]?date/i.test(k) && !isEmptyValue(d[k]));
  return fuzzy ? String(d[fuzzy]) : null;
};

export const computeDaysOverdue = (dueIso: string | null): number | null => {
  if (!dueIso) return null;
  const due = new Date(dueIso);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
};

interface FieldGroup {
  id: 'borrower' | 'contact' | 'address' | 'loan' | 'other';
  label: string;
  icon: LucideIcon;
  match: RegExp;
}
export const FIELD_GROUPS: FieldGroup[] = [
  { id: 'borrower', label: 'Borrower',  icon: User,       match: /(borrower|name|dob|birth|pan\b|aadhaa?r|gender|mother|father|occupation|age|income|marital|nominee|guardian)/i },
  { id: 'contact',  label: 'Contact',   icon: Phone,      match: /(phone|mobile|email|contact|whatsapp|telephone)/i },
  { id: 'address',  label: 'Address',   icon: MapPin,     match: /(address|city|state|pin[\s_-]?code|zip|landmark|street|locality|country|district|pincode)/i },
  { id: 'loan',     label: 'Loan',      icon: CreditCard, match: /(loan|account|emi|principal|interest|tenure|disburs|sanction|dpd|due|outstanding|balance|branch|ifsc|scheme|product|pos|tos|rate|roi|npa|installment|overdue|maturity)/i },
];

export type GroupedFields = Record<FieldGroup['id'], Array<[string, unknown]>>;

export const groupDynamicData = (d: Record<string, unknown>): GroupedFields => {
  const out: GroupedFields = { borrower: [], contact: [], address: [], loan: [], other: [] };
  for (const [k, v] of Object.entries(d)) {
    if (isEmptyValue(v)) continue;
    const hit = FIELD_GROUPS.find(g => g.match.test(k));
    out[hit?.id ?? 'other'].push([k, v]);
  }
  return out;
};

export type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'info';

export const StatTile = ({
  icon: Icon, label, value, sub, tone = 'neutral', mono = false, help,
}: {
  icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode;
  tone?: Tone; mono?: boolean; help?: string;
}) => (
  <div className={`db-kpi2-card is-hoverable is-${tone}`} title={help} style={{ height: '100%' }}>
    <div className="db-kpi2-top">
      <span className="db-kpi2-label">{label}</span>
      <span className="db-kpi2-icon"><Icon size={14} /></span>
    </div>
    <div className="db-kpi2-value-row">
      <span className={`db-kpi2-value${mono ? ' is-mono' : ''}`} style={{ fontSize: 20 }}>{value}</span>
    </div>
    {sub != null && <div className="db-kpi2-footer"><span className="db-kpi2-foot-meta">{sub}</span></div>}
  </div>
);

export const DetailSkeleton = () => (
  <>
    <div className="ds-card db-card" style={{ marginBottom: 32, padding: '20px 24px' }}>
      <span className="ds-skel" style={{ width: 110, height: 14, marginBottom: 18, display: 'block' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <span className="ds-skel" style={{ width: '60%', height: 34, marginBottom: 10, display: 'block' }} />
          <span className="ds-skel" style={{ width: 160, height: 12, display: 'block' }} />
        </div>
        <span className="ds-skel" style={{ width: 160, height: 38, borderRadius: 8, display: 'block' }} />
      </div>
    </div>
    <div className="db-kpi-band">
      <div className="db-kpi2-card"><span className="ds-skel" style={{ width: '70%', height: 22, display: 'block' }} /></div>
      <div className="db-kpi2-card"><span className="ds-skel" style={{ width: '70%', height: 22, display: 'block' }} /></div>
      <div className="db-kpi2-card"><span className="ds-skel" style={{ width: '70%', height: 22, display: 'block' }} /></div>
      <div className="db-kpi2-card"><span className="ds-skel" style={{ width: '70%', height: 22, display: 'block' }} /></div>
    </div>
    <div className="ds-card db-card" style={{ padding: 24, marginBottom: 24 }}>
      <span className="ds-skel" style={{ width: 120, height: 14, marginBottom: 16, display: 'block' }} />
      <span className="ds-skel" style={{ width: '90%', height: 12, marginBottom: 8, display: 'block' }} />
      <span className="ds-skel" style={{ width: '80%', height: 12, marginBottom: 8, display: 'block' }} />
      <span className="ds-skel" style={{ width: '70%', height: 12, display: 'block' }} />
    </div>
    <div className="ds-card db-card" style={{ padding: 24 }}>
      <span className="ds-skel" style={{ width: 120, height: 14, marginBottom: 16, display: 'block' }} />
      <span className="ds-skel" style={{ width: '85%', height: 12, marginBottom: 8, display: 'block' }} />
      <span className="ds-skel" style={{ width: '75%', height: 12, display: 'block' }} />
    </div>
  </>
);

export interface NextAction {
  status: AllocationStatus;
  label: string;
  needsConfirm?: boolean;
}

export const NEXT_ACTION_FOR: Record<AllocationStatus, NextAction | null> = {
  UNASSIGNED:   null,
  ASSIGNED:     { status: 'CLOSED',   label: 'Close Case', needsConfirm: true },
  CLOSED:       { status: 'ASSIGNED', label: 'Reopen Case' },
  // Server-driven transition only (restructure workflow) — no direct manual next-action here.
  RESTRUCTURED: null,
};
export const ALL_STATUSES: AllocationStatus[] = ['UNASSIGNED', 'ASSIGNED', 'CLOSED', 'RESTRUCTURED'];
export const STATUSES_REQUIRING_CONFIRM = new Set<AllocationStatus>(['CLOSED']);
