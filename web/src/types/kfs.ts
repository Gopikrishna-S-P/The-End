// Key Fact Statement (KFS) — RBI-mandated revised-terms disclosure generated once a
// RestructureProposal is lender-approved. Ground truth: server KfsController.java
// (/api/v1/kfs) and KeyFactStatementResponse.java. 1:1 link to a RestructureProposal —
// one KFS per proposal, generated once, idempotent (see
// docs/superpowers/specs/2026-08-04-kfs-design.md).

export type KfsGenerationReason = 'RESTRUCTURING';

export interface KeyFactStatementResponse {
  id: string;
  allocationId: string;
  organizationId: string;
  restructureProposalId: string;
  versionLabel: string;
  isCurrent: boolean;
  generationReason: KfsGenerationReason;
  sanctionedAmount: number;
  netDisbursedAmount?: number | null;
  totalInterestCharge: number;
  processingFee?: number | null;
  otherCharges?: number | null;
  totalPayable: number;
  aprPercent: number;
  interestRatePercent: number;
  interestType?: string | null;
  tenureMonths: number;
  emiAmount: number;
  repaymentFrequency: string;
  penalChargesDescription?: string | null;
  coolingOffDays?: number | null;
  firstEmiDate?: string | null;
  lastEmiDate?: string | null;
  contentSha256: string;
  pdfSha256: string;
  generatedByUserId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GenerateKfsRequest {
  restructureProposalId: string;
}
