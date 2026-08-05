import type { CollectionStatus, PaymentMode } from '../types';

export const STATUS_VARIANT: Record<CollectionStatus, string> = {
  PENDING_APPROVAL: 'is-warn',
  APPROVED:         'is-accent',
  REJECTED:         'is-error',
  DEPOSITED:        'is-info',
  CANCELLED:        '',
};

export const PAYMENT_VARIANT: Record<PaymentMode, string> = {
  CASH:   'is-accent',
  UPI:    'is-info',
  CHEQUE: 'is-info',
  NEFT:   '',
  RTGS:   '',
};

export const StatusPill = ({ status }: { status: CollectionStatus }) => (
  <span className={`ds-pill ${STATUS_VARIANT[status]}`}>{status.replace('_', ' ')}</span>
);

export const PaymentModePill = ({ mode }: { mode: PaymentMode }) => (
  <span className={`ds-pill ${PAYMENT_VARIANT[mode]}`}>{mode}</span>
);

export const fmtINR = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }) : '—';
