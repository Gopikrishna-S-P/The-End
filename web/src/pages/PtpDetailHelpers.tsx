import type { ReactNode, ElementType } from 'react';
import type { PtpStatus } from '../types';

export const fmtINR = (v?: number | null) =>
  v != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) : '—';

export const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const STATUS_VARIANT: Record<PtpStatus, string> = {
  PENDING:             'is-warn',
  FULFILLED:           'is-accent',
  PARTIALLY_FULFILLED: 'is-info',
  BROKEN:              'is-error',
  CANCELLED:           '',
};

export const DR = ({ label, children }: { label: string; children: ReactNode }) => {
  if (children == null || children === '' || children === '—') return null;
  return (
    <div className="alloc-def-row">
      <span className="alloc-def-label">{label}</span>
      <span className="alloc-def-value">{children}</span>
    </div>
  );
};

export const Group = ({ title, icon: Icon, children }: { title: string; icon: ElementType; children: ReactNode }) => (
  <div className="ptp-drawer-group">
    <div className="ptp-drawer-group-label"><Icon size={11} />{title}</div>
    <div className="ptp-drawer-group-body">{children}</div>
  </div>
);

export interface PtpHistoryEntry {
  id: string;
  oldStatus: PtpStatus;
  newStatus: PtpStatus;
  changedAt: string;
  changedBy?: string;
}
