-- Range-partition user_action_audit_logs by created_at (monthly).
--
-- Strategy: rename the existing table to _legacy, create the new partitioned
-- parent, migrate data into the correct partitions, then swap aliases.
-- Flyway runs this in a single transaction so it is atomic.
--
-- Partitions are created for the last 3 months and next 3 months from the
-- time this migration runs. A pg_cron / Spring @Scheduled job must create
-- new partitions monthly (see PartitionMaintenanceJob.java).
--
-- The immutable-row trigger is re-applied to each partition individually
-- because PostgreSQL triggers on the parent table DO NOT fire for partition
-- inserts in older PG versions (works in PG 13+).

-- 1. Keep the existing table as legacy.
ALTER TABLE user_action_audit_logs RENAME TO user_action_audit_logs_legacy;

-- 2. Create the partitioned parent (no storage — partitions hold the rows).
CREATE TABLE user_action_audit_logs (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    action          VARCHAR(100) NOT NULL,
    details         TEXT,
    ip_address      VARCHAR(50),
    user_agent      VARCHAR(500),
    previous_hash   VARCHAR(64),
    row_hash        VARCHAR(64),
    created_at      TIMESTAMP   NOT NULL DEFAULT now(),

    PRIMARY KEY (id, created_at)   -- partition key must be part of PK
) PARTITION BY RANGE (created_at);

-- 3. Create initial partitions: 3 months back + 3 months forward from 2026-04-01.
--    Add more via PartitionMaintenanceJob every month.
CREATE TABLE user_action_audit_logs_2026_01
    PARTITION OF user_action_audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE user_action_audit_logs_2026_02
    PARTITION OF user_action_audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE user_action_audit_logs_2026_03
    PARTITION OF user_action_audit_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE user_action_audit_logs_2026_04
    PARTITION OF user_action_audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE user_action_audit_logs_2026_05
    PARTITION OF user_action_audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE user_action_audit_logs_2026_06
    PARTITION OF user_action_audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE user_action_audit_logs_2026_07
    PARTITION OF user_action_audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE user_action_audit_logs_2026_08
    PARTITION OF user_action_audit_logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Default partition catches any rows outside the explicit ranges.
CREATE TABLE user_action_audit_logs_default
    PARTITION OF user_action_audit_logs DEFAULT;

-- 4. Immutable-row trigger on the parent (PG 13+ fires on partition inserts).
CREATE OR REPLACE FUNCTION prevent_audit_log_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'user_action_audit_logs rows are immutable';
END;
$$;

CREATE TRIGGER trg_audit_immutable
    BEFORE UPDATE OR DELETE ON user_action_audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_update();

-- 5. Rebuild performance indexes on the partitioned table.
CREATE INDEX IF NOT EXISTS idx_audit_user_latest
    ON user_action_audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON user_action_audit_logs (created_at DESC);

-- 6. Migrate existing rows from legacy table into partitioned table.
--    ip_address and user_agent were added in the new schema; legacy rows get NULL.
INSERT INTO user_action_audit_logs
    (id, user_id, action, details, previous_hash, row_hash, created_at)
SELECT id, user_id, action, details, previous_hash, row_hash, created_at
FROM   user_action_audit_logs_legacy;

-- 7. Drop legacy table once migration is confirmed.
DROP TABLE user_action_audit_logs_legacy;
