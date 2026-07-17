export interface AgentPerf {
  totalAssigned: number;
  totalVisited: number;
  totalCollected: number;
  totalPending: number;
  amountCollected: number;
  amountOutstanding: number;
  visitCompletionRate: number;
  collectionEfficiency: number;
  efficiencyScore: number;
  rankInOrg: number;
}

export interface CollectionReport {
  totalAmountApproved: number;
  totalAmountDeposited: number;
  totalSubmissions: number;
}

// Maps disposition status to standard semantic dashboard tokens
export const DISP_VARIANT: Record<string, string> = {
  PAID:      'is-success',
  PTP:       'is-info',
  RTP:       'is-danger',
  NC_SKIP:   'is-warn',
  FOLLOW_UP: 'is-neutral',
};

export function DispPill({ status }: { status?: string | null }) {
  if (!status) return <span className="ds-pill is-neutral">N/A</span>;
  return <span className={`ds-pill ${DISP_VARIANT[status] ?? 'is-neutral'}`}>{status.replace(/_/g, ' ')}</span>;
}

