import type { BadgeTone } from '@/components/ui/Badge';
import type { AllocationStatus, CollectionStatus, PtpStatus } from '@/types/core';
import type { Disp } from '@/types/domain';

export function allocationStatusTone(status: AllocationStatus): BadgeTone {
  switch (status) {
    case 'ASSIGNED': return 'accent';
    case 'CLOSED': return 'success';
    case 'RESTRUCTURED': return 'warning';
    default: return 'neutral';
  }
}

export function collectionStatusTone(status: CollectionStatus): BadgeTone {
  switch (status) {
    case 'APPROVED':
    case 'DEPOSITED': return 'success';
    case 'REJECTED':
    case 'CANCELLED': return 'error';
    default: return 'warning';
  }
}

export function ptpStatusTone(status: PtpStatus): BadgeTone {
  switch (status) {
    case 'FULFILLED': return 'success';
    case 'PARTIALLY_FULFILLED': return 'accent';
    case 'BROKEN':
    case 'CANCELLED': return 'error';
    default: return 'warning';
  }
}

export const DISP_LABELS: Record<Disp, string> = {
  PAID: 'Paid in full',
  RTP: 'Refused to pay',
  NC_SKIP: 'Non-contactable / skip',
  PTP: 'Promise to pay',
  FOLLOW_UP: 'Follow-up needed',
};

export function dispositionTone(disp?: Disp): BadgeTone {
  switch (disp) {
    case 'PAID': return 'success';
    case 'PTP': return 'accent';
    case 'RTP':
    case 'NC_SKIP': return 'error';
    case 'FOLLOW_UP': return 'warning';
    default: return 'neutral';
  }
}
