// Bank statement reconciliation runs. Ground truth: server ReconciliationController.java
// (/api/v1/reconciliation).

export type ReconciliationOutcome = 'MATCHED' | 'AMOUNT_DIFF' | 'UNMATCHED' | 'DUPLICATE' | 'EXCEPTION';

export interface ReconciliationRunResponse {
  id: string;
  organizationId: string;
  source: string;
  asOfDate: string;
  rowsIngested: number;
  matched: number;
  unmatched: number;
  amountDiff: number;
  duplicates: number;
  exceptions: number;
  reportJobId?: string;
  createdAt: string;
}

export interface BankStatementRowRequest {
  utr?: string;
  txnRef?: string;
  amount: number;
  valueDate: string;
  narration?: string;
  sourceRowId?: string;
}

export interface IngestStatementRequest {
  organizationId: string;
  source: string;
  asOfDate: string;
  rows: BankStatementRowRequest[];
  /** SHA-256 hex digest of the source file; re-ingesting the same hash is idempotent. */
  statementHash?: string;
}

export interface BankStatementRowResponse {
  id: string;
  runId: string;
  utr?: string;
  txnRef?: string;
  amount: number;
  currency?: string;
  valueDate: string;
  narration?: string;
  sourceRowId?: string;
  outcome: ReconciliationOutcome;
  matchedPaymentTxnId?: string;
  matchNotes?: string;
  createdAt: string;
}
