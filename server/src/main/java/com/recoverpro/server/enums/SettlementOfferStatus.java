package com.recoverpro.server.enums;

/**
 * Lifecycle of a debt settlement offer (design spec:
 * docs/superpowers/specs/2026-08-04-settlement-offers-design.md).
 *
 *   DRAFT                     -> COMPLIANCE_REVIEW (discount% over threshold)
 *                              -> APPROVED                 (discount% under threshold, direct approve)
 *   COMPLIANCE_REVIEW -> APPROVED                  (ORG_ADMIN/PLATFORM_ADMIN only)
 *   APPROVED                  -> PROPOSED                  (staff presents to borrower)
 *   PROPOSED                  -> ACCEPTED                  (borrower agrees, staff-attested)
 *                              -> EXPIRED                  (validity_until passed, scheduled sweep)
 *   ACCEPTED                  -> PAID                      (staff confirms payment received)
 *   DRAFT/COMPLIANCE_REVIEW/APPROVED/PROPOSED -> REJECTED (any non-terminal state)
 */
public enum SettlementOfferStatus {
    DRAFT,
    COMPLIANCE_REVIEW,
    APPROVED,
    PROPOSED,
    ACCEPTED,
    REJECTED,
    EXPIRED,
    PAID
}
