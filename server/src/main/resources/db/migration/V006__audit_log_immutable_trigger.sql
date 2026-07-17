-- Prevent UPDATE and DELETE on audit log tables at the database level.
-- No application code or compromised DBA can tamper with audit history.
-- A SELECT on the trigger function itself is the only way to confirm immutability.

CREATE OR REPLACE FUNCTION fn_audit_log_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit log is immutable: % on % is not permitted',
        TG_OP, TG_TABLE_NAME;
END;
$$;

-- user_action_audit_logs
CREATE TRIGGER trg_user_action_audit_immutable
    BEFORE UPDATE OR DELETE ON user_action_audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();

-- assignment_audit_logs
CREATE TRIGGER trg_assignment_audit_immutable
    BEFORE UPDATE OR DELETE ON assignment_audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();

-- collection_audit_logs
CREATE TRIGGER trg_collection_audit_immutable
    BEFORE UPDATE OR DELETE ON collection_audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();

-- ptp_audit_logs
CREATE TRIGGER trg_ptp_audit_immutable
    BEFORE UPDATE OR DELETE ON ptp_audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();
