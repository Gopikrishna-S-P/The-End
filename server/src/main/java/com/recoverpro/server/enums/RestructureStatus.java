package com.recoverpro.server.enums;

/**
 * Lifecycle of an EMI restructure proposal. Lender approval (Bank Admin
 * role) gates borrower acceptance.
 *
 *   DRAFT              -> PROPOSED_TO_LENDER (agency-side proposal)
 *   PROPOSED_TO_LENDER  -> APPROVED           (lender agrees)
 *                       -> REJECTED           (lender declines)
 *   APPROVED            -> ACCEPTED           (borrower e-signs)
 *   ACCEPTED            -> ACTIVE             (new Allocation linked back --
 *                                              NOT implemented yet; requires
 *                                              the AllocationService cascade
 *                                              refactor, tracked separately)
 */
public enum RestructureStatus {
    DRAFT,
    PROPOSED_TO_LENDER,
    APPROVED,
    ACCEPTED,
    ACTIVE,
    REJECTED,
    EXPIRED
}
