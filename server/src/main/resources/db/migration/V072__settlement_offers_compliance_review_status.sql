-- settlement_offers.status originally only allowed DRAFT/PROPOSED/APPROVED/ACCEPTED/PAID/
-- REJECTED/EXPIRED (set when the table was first created, before this feature existed).
-- The settlement-offer workflow adds a COMPLIANCE_REVIEW status for high-discount offers
-- pending org-admin sign-off (see docs/superpowers/specs/2026-08-04-settlement-offers-design.md).
ALTER TABLE settlement_offers DROP CONSTRAINT IF EXISTS settlement_offers_status_check;

ALTER TABLE settlement_offers
    ADD CONSTRAINT settlement_offers_status_check CHECK (status IN (
        'DRAFT', 'COMPLIANCE_REVIEW', 'APPROVED', 'PROPOSED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'PAID'
    ));
