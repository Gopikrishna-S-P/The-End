-- =============================================================================
-- V002__data_integrity_unique_constraints.sql
--
-- Closes four check-then-act races flagged by Review #3 (Data Integrity) by
-- moving the uniqueness decision from "service code reads then writes" to
-- "the database refuses the insert if the row already exists":
--
--   borrowers          : (organization_id, ckyc_id)
--                        (organization_id, phone_lookup_hash)
--                        (organization_id, email_lookup_hash)
--   user_creation_requests : (LOWER(requested_email))  WHERE status='PENDING'
--
-- Each is a PARTIAL unique index so it only enforces uniqueness on rows
-- that actually carry the column. PostgreSQL treats NULLs as distinct, so
-- borrowers without a CKYC / hash do not collide.
--
-- All indexes use CREATE UNIQUE INDEX IF NOT EXISTS — the migration is
-- idempotent and safe to re-apply.
--
-- PROD ROLLBACK / PRE-FLIGHT
-- --------------------------
-- These statements WILL fail in prod if duplicates already exist for any
-- (organization_id, ckyc_id) etc. group. Run these pre-flight queries
-- against a snapshot before deploying:
--
--   SELECT organization_id, ckyc_id, COUNT(*) FROM borrowers
--    WHERE ckyc_id IS NOT NULL GROUP BY 1, 2 HAVING COUNT(*) > 1;
--   SELECT organization_id, phone_lookup_hash, COUNT(*) FROM borrowers
--    WHERE phone_lookup_hash IS NOT NULL GROUP BY 1, 2 HAVING COUNT(*) > 1;
--   SELECT organization_id, email_lookup_hash, COUNT(*) FROM borrowers
--    WHERE email_lookup_hash IS NOT NULL GROUP BY 1, 2 HAVING COUNT(*) > 1;
--   SELECT LOWER(requested_email), COUNT(*) FROM user_creation_requests
--    WHERE status = 'PENDING' GROUP BY 1 HAVING COUNT(*) > 1;
--
-- Any non-empty result must be reconciled (merge / soft-delete the dupes)
-- before this migration can run.
--
-- ROLLBACK
-- --------
--   DROP INDEX IF EXISTS uq_borrower_org_ckyc;
--   DROP INDEX IF EXISTS uq_borrower_org_phone_hash;
--   DROP INDEX IF EXISTS uq_borrower_org_email_hash;
--   DROP INDEX IF EXISTS uq_user_creation_req_pending_email;
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_borrower_org_ckyc
    ON borrowers (organization_id, ckyc_id)
    WHERE ckyc_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_borrower_org_phone_hash
    ON borrowers (organization_id, phone_lookup_hash)
    WHERE phone_lookup_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_borrower_org_email_hash
    ON borrowers (organization_id, email_lookup_hash)
    WHERE email_lookup_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_creation_req_pending_email
    ON user_creation_requests (LOWER(requested_email))
    WHERE status = 'PENDING';
