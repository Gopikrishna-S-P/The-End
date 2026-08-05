import type { ElementType } from 'react';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { ReportStatus, ReportType } from '../types';

export const TERMINAL_STATUSES: ReportStatus[] = ['COMPLETED', 'FAILED'];

export const REPORT_LABELS: Partial<Record<ReportType, string>> = {
  AGENT_PERFORMANCE:          'Agent performance',
  DAILY_VISIT_COMPLETION:     'Visit report',
  MONTHLY_VISIT_COMPLETION:   'Monthly visit report',
  COLLECTION_EFFICIENCY:      'Collection report',
  MONTHLY_LOAN_BOOK_SNAPSHOT: 'Loan book',
  BANK_RECONCILIATION:        'Bank reconciliation',
  TEAM_PERFORMANCE:           'Team performance',
  AGENCY_PERFORMANCE:         'Agency performance',
  REASSIGNMENT_FREQUENCY:     'Reassignment frequency',
  NPA_IDENTIFICATION:         'Risk identification',
  MIS_EOD:                    'Daily MIS',
};

const STATUS_META: Record<ReportStatus, { label: string; icon: ElementType; variant: string }> = {
  QUEUED:     { label: 'Queued',     icon: Clock,         variant: ''          },
  GENERATING: { label: 'Generating', icon: Loader2,       variant: 'is-info'   },
  COMPLETED:  { label: 'Completed',  icon: CheckCircle2,  variant: 'is-success' },
  FAILED:     { label: 'Failed',     icon: XCircle,       variant: 'is-danger'  },
};

export function StatusPill({ status }: { status: ReportStatus }) {
  const { label, icon: Icon, variant } = STATUS_META[status];
  return (
    <span className={`ds-pill ${variant}`}>
      <Icon size={11} className={status === 'GENERATING' ? 'ds-spin' : ''} />
      {label}
    </span>
  );
}

export function fmtDate(s?: string): string {
  return s
    ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';
}

export function fmtFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
