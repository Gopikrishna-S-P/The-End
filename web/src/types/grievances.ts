// Borrower grievance handling + Grievance Redressal Officer (GRO) record.
// Ground truth: server GrievanceController.java / GrievanceOfficerController.java
// (/api/v1/grievances, /api/v1/grievance-officers) and GrievanceServiceImpl.java.
// Not barrel-exported from '../types' — import directly from '../types/grievances'.

export type GrievanceStatus =
  | 'RECEIVED'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export type GrievanceCategory =
  | 'HARASSMENT'
  | 'INCORRECT_INFORMATION'
  | 'RECOVERY_PRACTICE'
  | 'DATA_PRIVACY'
  | 'PAYMENT_DISPUTE'
  | 'OTHER';

export interface GrievanceResponse {
  id: string;
  ticketNumber: string;
  organizationId: string;
  allocationId?: string;
  raisedByUserId?: string;
  borrowerName?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  category: GrievanceCategory;
  subject: string;
  description: string;
  evidenceUrl?: string;
  status: GrievanceStatus;
  assignedToUserId?: string;
  resolutionNotes?: string;
  acknowledgementDueAt?: string;
  acknowledgedAt?: string;
  resolutionDueAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RaiseGrievanceRequest {
  allocationId?: string;
  borrowerName?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  category: GrievanceCategory;
  subject: string;
  description: string;
  evidenceUrl?: string;
}

/** Defaults to the acting user server-side when assignedToUserId is omitted. */
export interface InvestigateGrievanceRequest {
  assignedToUserId?: string;
}

/** remarks are logged, not persisted to a dedicated column — see design spec. */
export interface EscalateGrievanceRequest {
  remarks?: string;
}

export interface ResolveGrievanceRequest {
  resolutionNotes: string;
}

export interface GrievanceOfficerResponse {
  id: string;
  organizationId: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  address?: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UpsertGrievanceOfficerRequest {
  name: string;
  designation: string;
  email: string;
  phone: string;
  address?: string;
}
