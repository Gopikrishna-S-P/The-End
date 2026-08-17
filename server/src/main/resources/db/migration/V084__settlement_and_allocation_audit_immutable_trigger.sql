-- =============================================================================
-- V084__settlement_and_allocation_audit_immutable_trigger.sql
-- =============================================================================
-- V006 made user_action_audit_logs, assignment_audit_logs, collection_audit_logs,
-- and ptp_audit_logs immutable via fn_audit_log_immutable() (BEFORE UPDATE OR
-- DELETE -> RAISE EXCEPTION). settlement_audit_logs (V001) and allocation_audit_logs
-- (V056) were added later and never got the same trigger -- any DB role with
-- table access can currently UPDATE or DELETE settlement/allocation audit
-- history, unlike the other four audit tables. This closes that gap using the
-- exact same trigger function, no new mechanism introduced.
-- =============================================================================

CREATE TRIGGER trg_settlement_audit_immutable
    BEFORE UPDATE OR DELETE ON settlement_audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();

CREATE TRIGGER trg_allocation_audit_immutable
    BEFORE UPDATE OR DELETE ON allocation_audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();
