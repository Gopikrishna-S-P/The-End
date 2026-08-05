package com.recoverpro.server.enums;

/**
 * Per-row outcome of a reconciliation match (design-doc §5.5).
 *   MATCHED     : found a PaymentTransaction with same UTR/txn-ref and equal amount
 *   AMOUNT_DIFF : found by UTR but amount mismatched (manual review)
 *   UNMATCHED   : no candidate found yet; still re-evaluatable in future runs
 *   DUPLICATE   : a PaymentTransaction is already RECONCILED with this UTR
 *   EXCEPTION   : structural error in the row (missing fields, parse error)
 */
public enum ReconciliationOutcome {
    MATCHED,
    AMOUNT_DIFF,
    UNMATCHED,
    DUPLICATE,
    EXCEPTION
}
