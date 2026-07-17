-- Append-only audit table for RBI compliance guard denials.
-- Records every COOLING_OFF, CALLING_HOURS, CASH_HANDLING, and WILFUL_DEFAULT denial.
CREATE TABLE IF NOT EXISTS compliance_decisions (
    id             UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    guard_type     VARCHAR(30)  NOT NULL,
    allocation_id  UUID,
    org_id         UUID,
    actor_id       UUID,
    action         VARCHAR(100),
    reason         TEXT,
    decided_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cd_alloc    ON compliance_decisions (allocation_id);
CREATE INDEX IF NOT EXISTS idx_cd_org_date ON compliance_decisions (org_id, decided_at);

-- Immutable: guard denials must never be altered or deleted
CREATE OR REPLACE FUNCTION fn_compliance_decisions_immutable()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    RAISE EXCEPTION 'compliance_decisions is immutable: % is not permitted', TG_OP;
END;
$fn$;

CREATE TRIGGER trg_compliance_decisions_immutable
BEFORE UPDATE OR DELETE ON compliance_decisions
FOR EACH ROW EXECUTE FUNCTION fn_compliance_decisions_immutable();
