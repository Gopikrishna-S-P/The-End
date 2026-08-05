import type { ElementType, ReactNode } from 'react';

export const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtINR = (n?: number | null) =>
  n != null ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';

export const PILL_VARIANT: Record<string, string> = {
  APPROVED: 'is-accent', REJECTED: 'is-error', PENDING: 'is-warn',
  VERIFIED: 'is-accent', NOT_VERIFIED: 'is-warn', GPS_MISMATCH: 'is-warn',
  MOCK_LOCATION_DETECTED: 'is-error', GPS_UNAVAILABLE: '',
  PAID: 'is-accent', PTP: 'is-info', RTP: 'is-error',
  NC_SKIP: 'is-warn', FOLLOW_UP: '',
};

export const VisitPill = ({ status }: { status?: string | null }) => {
  if (!status) return <span className="vis-muted-dash">—</span>;
  return <span className={`ds-pill ${PILL_VARIANT[status] ?? ''}`}>{status.replace(/_/g, ' ')}</span>;
};

export const Row = ({ label, children, title }: { label: string; children: ReactNode; title?: string }) => {
  if (children == null || children === '') return null;
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }} title={title}>{label}</span>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-primary)', wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: 6, minHeight: 18 }}>{children}</div>
    </div>
  );
};

export const getDynField = (data: Record<string, unknown> | undefined | null, key: string): string | null => {
  if (!data) return null;
  const found = Object.keys(data).find((k) => k.toLowerCase() === key.toLowerCase());
  return found && data[found] != null ? String(data[found]) : null;
};

export function agentInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export function avatarColor(name: string | null | undefined): string {
  const colors = ['#0AA550','#0EA5E9','#8B5CF6','#F59E0B','#EF4444','#14B8A6','#EC4899'];
  if (!name) return colors[0];
  const sum = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[sum % colors.length];
}
