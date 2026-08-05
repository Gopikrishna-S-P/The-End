// Settlement offer workflow. Ground truth: server SettlementOfferController.java
// (/api/v1/settlement-offers). Direct structural precedent: RestructureProposal
// (draft -> propose -> approve/reject -> borrower-accept), extended with a
// compliance-review branch and a terminal mark-paid step.

export type SettlementOfferStatus =
  | 'DRAFT'
  | 'COMPLIANCE_REVIEW'
  | 'APPROVED'
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'PAID';

export interface SettlementOfferResponse {
  id: string;
  organizationId: string;
  allocationId: string;
  borrowerId?: string;
  /** Server-computed from the allocation's outstanding balance at draft time. */
  outstandingAtOffer: number;
  offeredAmount: number;
  /** Server-computed: (outstandingAtOffer - offeredAmount) / outstandingAtOffer * 100. */
  discountPct: number;
  tenorDays: number;
  validityUntil: string;
  conditions?: string;
  status: SettlementOfferStatus;
  draftedByUserId?: string;
  proposedByUserId?: string;
  proposedAt?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectedByUserId?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  complianceReviewRequired: boolean;
  complianceReviewedByUserId?: string;
  complianceReviewedAt?: string;
  acceptedAt?: string;
  borrowerConsentArtifactId?: string;
  paidAt?: string;
  paymentIntentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSettlementOfferRequest {
  allocationId: string;
  offeredAmount: number;
  tenorDays: number;
  /** ISO instant string; must be in the future. */
  validityUntil: string;
  conditions?: string;
}

export interface SettlementRejectRequest {
  reason: string;
}

export interface SettlementBorrowerAcceptRequest {
  borrowerConsentArtifactId?: string;
}

export interface SettlementMarkPaidRequest {
  paymentIntentId?: string;
}
