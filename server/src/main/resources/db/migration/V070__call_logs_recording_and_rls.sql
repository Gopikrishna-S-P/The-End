-- =============================================================================
-- Table: call_logs
-- =============================================================================
-- This table has existed live in the database since before Flyway tracked it
-- (no prior migration created it -- confirmed via full migration-history grep).
-- CREATE TABLE IF NOT EXISTS reproduces its live schema exactly so this
-- migration is safe to apply both here (table already exists) and on any
-- fresh environment (table doesn't exist yet).
CREATE TABLE IF NOT EXISTS call_logs (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    organization_id  UUID          NOT NULL,
    allocation_id    UUID          NOT NULL,
    agent_id         UUID          NOT NULL,
    initiated_at     TIMESTAMPTZ   NOT NULL,
    ended_at         TIMESTAMPTZ,
    duration_seconds INTEGER,
    outcome          VARCHAR(25),
    phone_masked     VARCHAR(20),
    notes            TEXT,
    created_at       TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ,
    PRIMARY KEY (id),
    CONSTRAINT call_logs_outcome_check CHECK (outcome IN
        ('ANSWERED', 'NO_ANSWER', 'BUSY', 'WRONG_NUMBER', 'CALLBACK_REQUESTED', 'REFUSED', 'SWITCHED_OFF'))
);

-- New columns for the call-recording feature -- not part of the table's
-- pre-existing live schema.
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_path VARCHAR(512);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_status VARCHAR(20);
ALTER TABLE call_logs ADD CONSTRAINT call_logs_recording_status_check CHECK (recording_status IN
    ('PENDING', 'UPLOADED', 'FAILED', 'NOT_RECORDED'));

CREATE INDEX IF NOT EXISTS idx_call_log_agent ON call_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_call_log_allocation ON call_logs (allocation_id);
CREATE INDEX IF NOT EXISTS idx_call_log_org ON call_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_call_log_initiated_at ON call_logs (initiated_at);

ALTER TABLE call_logs
    ADD CONSTRAINT fk_call_logs_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_call_logs_allocation   FOREIGN KEY (allocation_id)   REFERENCES allocations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_call_logs_agent        FOREIGN KEY (agent_id)        REFERENCES users (id)         ON DELETE RESTRICT;

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_call_logs_isolation ON call_logs
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
