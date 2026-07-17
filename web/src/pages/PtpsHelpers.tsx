import type { ElementType, MouseEvent } from 'react';
import { motion, type Variants } from 'framer-motion';
import type { PtpResponse, PtpStatus } from '../types';
import { Calendar, CheckCircle2, Clock, AlertTriangle, XCircle, Eye } from 'lucide-react';

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
    <motion.tr
      variants={variants}
      onClick={() => onSelect(ptp)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(ptp); } }}
      className="is-clickable"
      tabIndex={0}
      role="row"
      aria-label={`PTP for ${ptp.borrowerName}, ${ptp.status}`}
      style={{ 
        borderBottom: '1px solid var(--border-subtle)',
        background: isSelected ? 'color-mix(in srgb, var(--ink-solid) 4%, transparent)' : 'transparent' 
      }}
      whileHover={{ background: 'var(--bg-subtle)' }}
    >
      <td style={{ padding: '12px 16px', paddingLeft: 24, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}>
        {ptp.loanNumber ?? '—'}
      </td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-secondary)' }}>{ptp.borrowerName}</td>
      <td style={{ padding: '12px 16px', color: 'var(--ink-tertiary)' }}>{ptp.agentName}</td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: isPast ? 'var(--danger)' : 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <Calendar size={12} />
          <span style={{ color: isPast ? 'var(--danger)' : 'var(--ink-secondary)' }}>{fmtDate(ptp.promisedDate)}</span>
          {isPast && <span className="ds-pill is-danger" style={{ fontSize: 9, height: 16, padding: '0 4px', marginLeft: 4 }}>OVERDUE</span>}
        </span>
      </td>
      <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--ink-primary)' }}>{fmtINR(ptp.promisedAmount)}</td>
      <td className="is-right" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: ptp.collectedAmount > 0 ? 'var(--success)' : 'var(--ink-tertiary)' }}>
        {fmtINR(ptp.collectedAmount)}
      </td>
      <td style={{ padding: '12px 16px' }}><StatusPill status={ptp.status} /></td>
      <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }} onClick={(e: MouseEvent) => e.stopPropagation()}>
        <button type="button" onClick={() => onSelect(ptp)} className="db-customize-btn" title="View details" aria-label="View details">
          <Eye size={13} style={{ marginRight: 4 }} /> View
        </button>
      </td>
    </motion.tr>
  );
}

