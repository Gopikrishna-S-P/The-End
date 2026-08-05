// EMI restructure proposal workflow. Ground truth: server RestructureProposalController.java
// (/api/v1/restructure-proposals). Genuinely new capability — RecoverPro's original frontend
// had no concept of loan restructuring.

export type RestructureStatus =
  | 'DRAFT'
  | 'PROPOSED_TO_LENDER'
  | 'APPROVED'
  | 'ACCEPTED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'EXPIRED';

export interface RestructureProposalResponse {
  id: string;
  organizationId: string;
  allocationId: string;
  borrowerId?: string;
  originalEmiCount: number;
  originalEmiAmount: number;
  originalApr: number;
  newEmiCount: number;
  newEmiAmount: number;
  newApr: number;
  stepSchedule?: Array<Record<string, unknown>>;
  rationale?: string;
  status: RestructureStatus;
  draftedByUserId?: string;
  proposedToLenderAt?: string;
  lenderApprovalUserId?: string;
  lenderApprovalAt?: string;
  borrowerAcceptedAt?: string;
  borrowerConsentArtifactId?: string;
  newAllocationId?: string;
  rejectedByUserId?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRestructureProposalRequest {
  allocationId: string;
  originalEmiCount: number;
  originalEmiAmount: number;
  originalApr: number;
  newEmiCount: number;
  newEmiAmount: number;
  newApr: number;
  stepSchedule?: Array<Record<string, unknown>>;
  rationale?: string;
}

export interface RestructureBorrowerAcceptRequest {
  borrowerConsentArtifactId?: string;
}

export interface RestructureRejectRequest {
  reason: string;
}
