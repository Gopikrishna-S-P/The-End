import type { ApprovalAction, ApprovalStatus, CollectionStatus, PaymentMode, PtpStatus, VisitStatus, Role } from "./core";

export interface CollectionDocumentResponse {
  id: string;
  collectionId: string;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

export interface CollectionResponse {
  id: string;
  allocationId: string;
  /** Loan account number from the linked Allocation (enriched server-side). */
  loanNumber?: string;
  /** Borrower display name from the linked Allocation (enriched server-side). */
  borrowerName?: string;
  organizationId: string;
  submittedBy: string;
  /** Display name of the submitting agent (enriched server-side). */
  agentName?: string;
  approvedBy?: string;
  depositedBy?: string;
  amount: number;
  paymentMode: PaymentMode;
  status: CollectionStatus;
  notes?: string;
  rejectionReason?: string;
  receiptNumber?: string;
  collectionDate: string;
  approvedAt?: string;
  depositedAt?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  upiReferenceId?: string;
  transactionReferenceId?: string;
  documents?: CollectionDocumentResponse[];
  createdAt: string;
  updatedAt?: string;
}

export interface SubmitCollectionRequest {
  allocationId: string;
  organizationId: string;
  amount: number;
  paymentMode: PaymentMode;
  collectionDate: string;
  notes?: string;
  idempotencyKey: string;
  visitId: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  upiReferenceId?: string;
  transactionReferenceId?: string;
}

export interface ApprovalRequest {
  action: ApprovalAction;
  remarks?: string;
}

export interface PtpResponse {
  id: string;
  allocationId: string;
  agentId: string;
  agentName: string;
  loanNumber: string;
  borrowerName: string;
  promisedDate: string;
  promisedAmount: number;
  collectedAmount: number;
  status: PtpStatus;
  contactNotes?: string;
  cancellationReason?: string;
  brokenReason?: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  fulfilledAt?: string;
  brokenAt?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
  fulfillmentPercentage: number;
}

export interface CreatePtpRequest {
  allocationId: string;
  agentId: string;
  agentName: string;
  loanNumber: string;
  borrowerName: string;
  promisedDate: string;
  promisedAmount: number;
  contactNotes?: string;
  visitId?: string;
}

export interface UpdatePtpStatusRequest {
  newStatus: PtpStatus;
  collectedAmount?: number;
  reason?: string;
}

export interface VisitImageResponse {
  id: string;
  sequenceNumber: number;
  imagePath?: string;
  s3Key?: string;
  originalFilename?: string;
  uploadStatus: string;
}

export type CaseEventType =
  | 'ALLOCATION_CREATED'
  | 'ALLOCATION_STATUS_CHANGED'
  | 'ALLOCATION_CLOSED'
  | 'NPA_FLAG_RAISED'
  | 'COOLING_OFF_STARTED'
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_REASSIGNED'
  | 'ASSIGNMENT_CANCELLED'
  | 'ASSIGNMENT_COMPLETED'
  | 'VISIT_LOGGED'
  | 'VISIT_APPROVED'
  | 'VISIT_REJECTED'
  | 'PTP_CREATED'
  | 'PTP_FULFILLED'
  | 'PTP_PARTIALLY_FULFILLED'
  | 'PTP_BROKEN'
  | 'PTP_CANCELLED'
  | 'PTP_RESCHEDULED'
  | 'COLLECTION_SUBMITTED'
  | 'COLLECTION_APPROVED'
  | 'COLLECTION_REJECTED'
  | 'COLLECTION_DEPOSITED'
  | 'COMMUNICATION_SENT'
  | 'COMMUNICATION_SUPPRESSED'
  | 'COMMUNICATION_FAILED'
  | 'RESTRUCTURE_PROPOSED'
  | 'RESTRUCTURE_APPROVED'
  | 'RESTRUCTURE_REJECTED'
  | 'SETTLEMENT_OFFERED'
  | 'SETTLEMENT_ACCEPTED'
  | 'SETTLEMENT_DECLINED';

export interface CaseEvent {
  timestamp: string;
  eventType: CaseEventType;
  summary: string;
  actorRole?: string;
  actorId?: string;
  actorName?: string;
  sourceTable: string;
  sourceId: string;
  data?: Record<string, unknown>;
  narrative?: string;
}

export interface CaseTimelineResponse {
  allocationId: string;
  organizationId: string;
  loanNumber: string;
  borrowerName: string;
  currentStatus: string;
  npaFlagged?: boolean;
  totalDue?: number;
  outstandingAmount?: number;
  events: CaseEvent[];
}

export interface VisitLogResponse {
  id: string;
  allocationId: string;
  loanNumber?: string;
  borrowerName?: string;
  allocationDynamicData?: Record<string, unknown>;
  assignmentId?: string;
  agentId: string;
  agentName?: string;
  organizationId: string;
  visitDate: string;
  visitTime?: string;
  contactability?: string;
  contactPerson?: string;
  contactNumber?: string;
  disp?: string;
  visitOutcome?: string;
  nextVisitDate?: string;
  rescheduleReason?: string;
  classificationCode?: string;
  reasonForDefault?: string;
  approvalStatus: ApprovalStatus;
  approvalRemarks?: string;
  approvedBy?: string;
  approvedAt?: string;
  collectionId?: string;
  ptpId?: string;
  amountCollected?: number;
  paymentMode?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  gpsAddress?: string;
  visitStatus: VisitStatus;
  mockLocationDetected: boolean;
  residenceStatus?: string;
  officeStatus?: string;
  customerProfile?: string;
  fieldUpdateFeedback?: string;
  lastVisitedAddress?: string;
  images: VisitImageResponse[];
  visitNotes?: string;
  internalRemarks?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VisitImportRowError {
  row: number;
  loanNumber: string;
  agentEmail: string;
  reason: string;
}

export interface VisitImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: VisitImportRowError[];
}

