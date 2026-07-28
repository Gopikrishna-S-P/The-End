-- =============================================================================
-- Table: allocation_audit_logs
-- Tracks disposition/status changes on a case so they can appear in the
-- case timeline, same pattern as assignment_audit_logs / collection_audit_logs
-- / ptp_audit_logs. Two sources write here:
--   STATUS_CHANGED      - manual, via PATCH /allocations/{id}/status
--   DISPOSITION_CHANGED - automatic, set from a field officer's visit outcome
-- =============================================================================
CREATE TABLE IF NOT EXISTS allocation_audit_logs (
    id             UUID        NOT NULL DEFAULT gen_random_uuid(),
    allocation_id  UUID        NOT NULL,
    action         VARCHAR(50) NOT NULL,
    performed_by   UUID        NOT NULL,
    previous_value VARCHAR(50),
    new_value      VARCHAR(50),
    reason         TEXT,
    created_at     TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_alloc_audit_allocation_id ON allocation_audit_logs (allocation_id);
CREATE INDEX IF NOT EXISTS idx_alloc_audit_performed_by ON allocation_audit_logs (performed_by);
