// Borrower profile — nominee records only.
// Ground truth: server BorrowerController.java (/api/v1/borrowers) + ConsentService.
//
// NOTE: BorrowerResponse, CreateBorrowerRequest, ConsentPurpose, ConsentScope, ConsentStatus,
// ConsentArtifactResponse, GrantConsentRequest, ErasureRequestStatus and
// DataErasureRequestResponse are already defined in ./reports.ts (added by a concurrent
// module-group agent working the Grievance/compliance controllers). Reusing them here instead
// of redefining to avoid duplicate-export collisions in types.ts's barrel re-export.

export interface NomineeResponse {
  borrowerId: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineePhone?: string;
  nomineeEmail?: string;
  recordedAt: string;
}

export interface UpsertNomineeRequest {
  nomineeName: string;
  nomineeRelation: string;
  nomineePhone?: string;
  nomineeEmail?: string;
}
