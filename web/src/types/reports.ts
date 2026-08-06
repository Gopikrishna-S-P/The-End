import type { ExportFormat, FileUploadStatus, ReportStatus, ReportType } from "./core";

/** Which domain entity a file upload populates. Mirrors the server-side UploadType enum. */
export type UploadType = 'ALLOCATION' | 'COLLECTION' | 'VISIT' | 'PTP';

export interface FileUploadResponse {
  id: string;
  organizationId: string;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  uploadType: UploadType;
  isHistoricalImport?: boolean;
  status: FileUploadStatus;
  totalRows?: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  errorMessage?: string;
  uploadedByUserId: string;
  createdAt: string;
  updatedAt?: string;
  progressPercentage: number;
  autoAssignedCount?: number;
  autoAssignFailed?: number;
}

export interface FileProcessingErrorResponse {
  id: string;
  fileUploadId: string;
  rowNumber: number;
  columnName?: string;
  errorMessage: string;
  rawValue?: string;
  createdAt: string;
}

export interface ReportJobResponse {
  id: string;
  organizationId: string;
  reportType: ReportType;
  status: ReportStatus;
  exportFormat: ExportFormat;
  fileName?: string;
  fileSizeBytes?: number;
  errorMessage?: string;
  requestedBy: string;
  isScheduled: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AuditLogResponse {
  id: string;
  assignmentId?: string;
  allocationId?: string;
  action: string;
  performedBy: string;
  performedByName?: string;
  previousAgentId?: string;
  newAgentId?: string;
  reason?: string;
  metadata?: string;
  createdAt: string;
}

/** Admin/user-action audit trail entry (distinct from AuditLogResponse's assignment/allocation trail). */
export interface UserActionAuditResponse {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details?: string;
  createdAt: string;
}

export interface BorrowerResponse {
  id: string;
  organizationId: string;
  ckycId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  erasurePending: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateBorrowerRequest {
  organizationId: string;
  ckycId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export type ConsentPurpose =
  | 'LOAN_RECOVERY_CONTACT'
  | 'FIELD_VISIT'
  | 'CALL_RECORDING'
  | 'DATA_SHARING_WITH_AGENCY'
  | 'CREDIT_BUREAU_REPORTING'
  | 'AUTOMATED_DECISIONING'
  | 'MARKETING_COMMUNICATIONS';

export type ConsentScope =
  | 'ANY' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'VOICE_CALL' | 'RCS' | 'IN_PERSON';

export type ConsentStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'SUPERSEDED';

export interface ConsentArtifactResponse {
  id: string;
  borrowerId: string;
  organizationId: string;
  purpose: ConsentPurpose;
  scope: ConsentScope;
  termsText: string;
  termsVersion: string;
  signedHash: string;
  evidenceRef?: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  status: ConsentStatus;
  createdAt: string;
}

export interface GrantConsentRequest {
  purpose: ConsentPurpose;
  scope: ConsentScope;
  termsText: string;
  termsVersion: string;
  evidenceRef?: string;
  expiresAt?: string;
}

export type ErasureRequestStatus =
  | 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'PARTIALLY_EXECUTED';

export interface DataErasureRequestResponse {
  id: string;
  borrowerId: string;
  organizationId: string;
  requestedByUserId?: string;
  reason?: string;
  status: ErasureRequestStatus;
  complianceNotes?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  executedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/** POST /api/v1/borrowers/{id}/erasure-request body. Matches server CreateErasureRequestRequest. */
export interface CreateErasureRequestRequest {
  reason: string;
}

// Grievance types moved to ./grievances.ts — this file previously had a speculative,
// never-implemented duplicate set (different shape: single generic UpdateGrievanceStatusRequest,
// organizationId in request bodies) written before the real grievances backend existed. Removed
// to resolve the export collision now that types/grievances.ts matches the live API.

