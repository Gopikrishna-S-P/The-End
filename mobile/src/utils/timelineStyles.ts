import {
  FileText, RefreshCw, Repeat, CheckCircle2, ShieldAlert, ShieldOff,
  UserPlus, UserCheck, UserX, ClipboardCheck, MapPin, XCircle,
  HandCoins, AlertTriangle, Clock, Coins, Landmark,
  MessageSquare, MailWarning, AlertCircle, Pencil, Handshake, History,
  type LucideIcon,
} from 'lucide-react-native';
import type { BadgeTone } from '@/components/ui/Badge';
import type { CaseEventType } from '@/types/domain';

export interface EventStyle {
  icon: LucideIcon;
  tone: BadgeTone;
  label: string;
}

export const TIMELINE_STYLES: Record<CaseEventType, EventStyle> = {
  ALLOCATION_CREATED: { icon: FileText, tone: 'neutral', label: 'Loan created' },
  ALLOCATION_STATUS_CHANGED: { icon: RefreshCw, tone: 'neutral', label: 'Status changed' },
  ALLOCATION_DISPOSITION_CHANGED: { icon: Repeat, tone: 'neutral', label: 'Disposition changed' },
  ALLOCATION_CLOSED: { icon: CheckCircle2, tone: 'success', label: 'Closed' },
  NPA_FLAG_RAISED: { icon: ShieldAlert, tone: 'error', label: 'NPA flagged' },
  COOLING_OFF_STARTED: { icon: ShieldOff, tone: 'warning', label: 'Cooling-off' },

  ASSIGNMENT_CREATED: { icon: UserPlus, tone: 'accent', label: 'Assigned' },
  ASSIGNMENT_REASSIGNED: { icon: UserCheck, tone: 'accent', label: 'Reassigned' },
  ASSIGNMENT_CANCELLED: { icon: UserX, tone: 'neutral', label: 'Unassigned' },
  ASSIGNMENT_COMPLETED: { icon: ClipboardCheck, tone: 'accent', label: 'Done' },

  VISIT_LOGGED: { icon: MapPin, tone: 'success', label: 'Visit' },
  VISIT_APPROVED: { icon: CheckCircle2, tone: 'success', label: 'Visit OK' },
  VISIT_REJECTED: { icon: XCircle, tone: 'error', label: 'Visit rejected' },

  PTP_CREATED: { icon: HandCoins, tone: 'accent', label: 'PTP' },
  PTP_FULFILLED: { icon: CheckCircle2, tone: 'success', label: 'PTP kept' },
  PTP_PARTIALLY_FULFILLED: { icon: HandCoins, tone: 'accent', label: 'PTP partial' },
  PTP_BROKEN: { icon: AlertTriangle, tone: 'error', label: 'PTP broken' },
  PTP_CANCELLED: { icon: XCircle, tone: 'neutral', label: 'PTP cancelled' },
  PTP_RESCHEDULED: { icon: Clock, tone: 'warning', label: 'PTP moved' },

  COLLECTION_SUBMITTED: { icon: Coins, tone: 'accent', label: 'Collection' },
  COLLECTION_APPROVED: { icon: CheckCircle2, tone: 'success', label: 'Approved' },
  COLLECTION_REJECTED: { icon: XCircle, tone: 'error', label: 'Rejected' },
  COLLECTION_DEPOSITED: { icon: Landmark, tone: 'success', label: 'Deposited' },
  COLLECTION_CANCELLED: { icon: XCircle, tone: 'neutral', label: 'Collection cancelled' },

  COMMUNICATION_SENT: { icon: MessageSquare, tone: 'neutral', label: 'Message' },
  COMMUNICATION_SUPPRESSED: { icon: MailWarning, tone: 'warning', label: 'Suppressed' },
  COMMUNICATION_FAILED: { icon: AlertCircle, tone: 'error', label: 'Failed' },

  RESTRUCTURE_PROPOSED: { icon: Pencil, tone: 'warning', label: 'Restructure' },
  RESTRUCTURE_APPROVED: { icon: CheckCircle2, tone: 'warning', label: 'Restructure OK' },
  RESTRUCTURE_REJECTED: { icon: XCircle, tone: 'error', label: 'Restructure no' },
  SETTLEMENT_OFFERED: { icon: Handshake, tone: 'warning', label: 'Settlement' },
  SETTLEMENT_ACCEPTED: { icon: CheckCircle2, tone: 'warning', label: 'Settled' },
  SETTLEMENT_DECLINED: { icon: XCircle, tone: 'neutral', label: 'Declined' },
};

export const TIMELINE_FALLBACK: EventStyle = { icon: History, tone: 'neutral', label: 'Event' };

export function styleForEvent(type: CaseEventType): EventStyle {
  return TIMELINE_STYLES[type] ?? TIMELINE_FALLBACK;
}
