// Fraud case management. Ground truth: server FraudCaseController.java (/api/v1/fraud-cases).

export type FraudCategory =
  | 'CHEATING_AND_FORGERY'
  | 'MISAPPROPRIATION'
  | 'FRAUDULENT_ENCASHMENT'
  | 'UNAUTHORISED_CREDIT_FACILITIES'
  | 'DOCUMENTATION_FRAUD'
  | 'CYBER_FRAUD'
  | 'OTHER';

export type FraudCaseStatus = 'REPORTED' | 'UNDER_INVESTIGATION' | 'CONFIRMED' | 'REJECTED' | 'CLOSED';

export interface FraudCaseResponse {
  id: string;
  caseNumber: string;
  organizationId: string;
  allocationId?: string;
  borrowerId?: string;
  category: FraudCategory;
  amountInvolved?: number;
  incidentDate?: string;
  description: string;
  evidenceUrl?: string;
  status: FraudCaseStatus;
  investigatedByUserId?: string;
  investigationNotes?: string;
  rejectionReason?: string;
  reportedByUserId?: string;
  reportedAt?: string;
  cfrLookupAt?: string;
  cfrLookupResult?: string;
  frmsSubmittedAt?: string;
  frmsAcknowledgement?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFraudCaseRequest {
  organizationId: string;
  allocationId?: string;
  borrowerId?: string;
  category: FraudCategory;
  amountInvolved?: number;
  incidentDate?: string;
  description: string;
  evidenceUrl?: string;
}

export interface TransitionFraudCaseRequest {
  newStatus: FraudCaseStatus;
  investigationNotes?: string;
  rejectionReason?: string;
}
