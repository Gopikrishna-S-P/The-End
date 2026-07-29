import type { ElementType } from 'react';
import { motion, type Variants } from 'framer-motion';
import type { PtpResponse, PtpStatus } from '../types';
import { Calendar, CheckCircle2, Clock, AlertTriangle, XCircle, ChevronRight, Phone } from 'lucide-react';

export const STATUS_VARIANT: Record<PtpStatus, string> = {
  PENDING:             'is-warn',
  FULFILLED:           'is-success',
  PARTIALLY_FULFILLED: 'is-info',
  BROKEN:              'is-danger',
  CANCELLED:           'is-neutral',
};

export const STATUS_ICON: Record<PtpStatus, ElementType> = {
  PENDING:             Clock,
  FULFILLED:           CheckCircle2,
  PARTIALLY_FULFILLED: CheckCircle2,
  BROKEN:              AlertTriangle,
  CANCELLED:           XCircle,
};

export const StatusPill = ({ status }: { status: PtpStatus }) => (
  <span className={`ds-pill ${STATUS_VARIANT[status]}`}>{status.replace('_', ' ')}</span>
);

export const fmtINR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

interface PtpRowProps {
  ptp: PtpResponse;
  onSelect: (p: PtpResponse) => void;
  isSelected?: boolean;
  variants?: Variants;
}

export function PtpRow({ ptp, onSelect, isSelected, variants }: PtpRowProps) {
  const isPast = new Date(ptp.promisedDate) < new Date() && ptp.status === 'PENDING';

  return (
    <motion.button
      variants={variants}
      onClick={() => onSelect(ptp)}
      className="db-att-row"
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px 16px',
        borderRadius: 0,
        width: '100%',
        textAlign: 'left',
        background: isSelected ? 'var(--bg-active)' : 'transparent',
      }}
      whileHover={{ background: 'var(--bg-subtle)' }}
      aria-label={`PTP for ${ptp.borrowerName}, ${ptp.status}`}
    >
      <div style={{ flex: 1, marginLeft: 0, minWidth: 0 }}>
        <span className="db-att-label" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Phone size={13} style={{ color: 'var(--ink-tertiary)' }} />
          {ptp.borrowerName}
        </span>
        <div className="db-ml-tooltip-row" style={{ gap: 16, padding: 0, marginTop: 10, flexWrap: 'wrap' }}>
          <StatusPill status={ptp.status} />
          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {ptp.loanNumber ?? '—'}
          </span>
          <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
            / {ptp.agentName}
          </span>
          <span className="db-kpi2-foot-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: isPast ? 'var(--danger)' : undefined }}>
            <Calendar size={11} /> Due {fmtDate(ptp.promisedDate)}
            {isPast && <span className="ds-pill is-danger" style={{ fontSize: 9, height: 16, padding: '0 4px', marginLeft: 2 }}>OVERDUE</span>}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
            {fmtINR(ptp.promisedAmount)}
          </span>
          {ptp.collectedAmount > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--success)' }}>
              {fmtINR(ptp.collectedAmount)} collected
            </span>
          )}
        </div>
        <ChevronRight size={16} style={{ color: 'var(--ink-tertiary)' }} />
      </div>
    </motion.button>
  );
}

