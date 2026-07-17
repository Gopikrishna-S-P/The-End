export const formatCurrency = (v?: number) =>
  v == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_VARIANT: Record<string, string> = {
  UNASSIGNED: 'is-warn',
  ASSIGNED:   'is-info',
  CLOSED:     'is-accent',
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`ds-pill ${STATUS_VARIANT[status] ?? ''}`}>{status}</span>;
}
