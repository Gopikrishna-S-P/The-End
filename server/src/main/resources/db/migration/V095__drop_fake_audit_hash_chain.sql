-- SYSTEM-PLAN 10.1: previous_hash/row_hash (added by V015__audit_log_hash_chain.sql) were never
-- populated -- UserActionAuditLog.computeHash() had zero callers anywhere in the codebase. A
-- schema that implies a verifiable tamper-evidence chain but computes nothing is a false claim an
-- auditor could reasonably rely on. The real tamper-evidence control for this table is
-- trg_audit_immutable / prevent_audit_log_update() (V016__audit_log_partitioning.sql, recreated
-- by V028's table rebuild), a BEFORE UPDATE OR DELETE trigger enforced at the database level --
-- unaffected by this migration, and confirmed by AuditLogImmutabilityTest to already cover
-- user_action_audit_logs before this change (V016's partitioning rebuild replaced V006's original
-- trigger on this one table). See docs/AUDIT-DESIGN.md.
--
-- idx_audit_user_latest (also added by V015, on user_id/created_at) is unrelated to the hash
-- chain and is NOT touched here -- it's a genuinely useful lookup index, not part of this finding.
ALTER TABLE user_action_audit_logs
    DROP COLUMN previous_hash,
    DROP COLUMN row_hash;
