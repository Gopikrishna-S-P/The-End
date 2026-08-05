-- V028 — Two changes:
-- 1. Convert all TIMESTAMP WITHOUT TIME ZONE → TIMESTAMPTZ.
--    Must skip user_action_audit_logs: its created_at is the PARTITION KEY and
--    PostgreSQL refuses ALTER COLUMN TYPE on a partition key in-place.
--    That table is rebuilt explicitly in step 2.
-- 2. Rebuild user_action_audit_logs with a TIMESTAMPTZ partition key.
-- 3. Create lucien_agent_steps for ReAct audit (SYSTEM_DESIGN §6.1).

-- ─── 1. Bulk convert non-partitioned tables ──────────────────────────────────
-- Joins pg_class to skip:
--   relkind='p'         → partitioned parent (user_action_audit_logs)
--   relispartition=TRUE → partition children (_2026_01 … _default)

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.table_schema, c.table_name, c.column_name
        FROM   information_schema.columns  c
        JOIN   pg_class     pc ON pc.relname   = c.table_name
        JOIN   pg_namespace pn ON pn.oid       = pc.relnamespace
                               AND pn.nspname  = c.table_schema
        WHERE  c.table_schema = 'public'
          AND  c.data_type    = 'timestamp without time zone'
          AND  pc.relkind     = 'r'          -- regular table only
          AND  pc.relispartition = FALSE      -- not a partition child
          AND  c.table_name  != 'flyway_schema_history'  -- Flyway holds this locked
                                                          -- for the whole migrate() run;
                                                          -- altering it here deadlocks
                                                          -- against Flyway's own lock.
        ORDER BY c.table_name, c.column_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE TIMESTAMPTZ'
            ' USING %I AT TIME ZONE ''UTC''',
            r.table_schema, r.table_name, r.column_name, r.column_name
        );
    END LOOP;
END;
$$;

-- ─── 2. Rebuild user_action_audit_logs (partition key = TIMESTAMPTZ) ─────────
-- save rows → DROP parent (CASCADE drops all partitions + indexes + triggers)
-- → recreate as TIMESTAMPTZ → restore trigger & indexes → reload.

CREATE TEMP TABLE _v028_audit_rows AS
SELECT id,
       user_id,
       action,
       details,
       ip_address,
       user_agent,
       previous_hash,
       row_hash,
       -- Treat existing TIMESTAMP values as UTC → emit TIMESTAMPTZ
       created_at AT TIME ZONE 'UTC' AS created_at
FROM   user_action_audit_logs;

-- CASCADE drops every partition + all indexes + trg_audit_immutable trigger.
DROP TABLE user_action_audit_logs CASCADE;

-- Recreate the partitioned parent with TIMESTAMPTZ partition key.
CREATE TABLE user_action_audit_logs (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    action          VARCHAR(100) NOT NULL,
    details         TEXT,
    ip_address      VARCHAR(50),
    user_agent      VARCHAR(500),
    previous_hash   VARCHAR(64),
    row_hash        VARCHAR(64),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions (mirrors V016; add future months via PartitionMaintenanceJob).
CREATE TABLE user_action_audit_logs_2026_01
    PARTITION OF user_action_audit_logs FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE user_action_audit_logs_2026_02
    PARTITION OF user_action_audit_logs FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE user_action_audit_logs_2026_03
    PARTITION OF user_action_audit_logs FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE user_action_audit_logs_2026_04
    PARTITION OF user_action_audit_logs FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE user_action_audit_logs_2026_05
    PARTITION OF user_action_audit_logs FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE user_action_audit_logs_2026_06
    PARTITION OF user_action_audit_logs FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE user_action_audit_logs_2026_07
    PARTITION OF user_action_audit_logs FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE user_action_audit_logs_2026_08
    PARTITION OF user_action_audit_logs FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE user_action_audit_logs_default
    PARTITION OF user_action_audit_logs DEFAULT;

-- Restore immutable-row protection (reuse function from V016).
CREATE TRIGGER trg_audit_immutable
    BEFORE UPDATE OR DELETE ON user_action_audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_update();

-- Restore indexes from V016.
CREATE INDEX idx_audit_user_latest ON user_action_audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_created_at  ON user_action_audit_logs (created_at DESC);

-- Reload data.
INSERT INTO user_action_audit_logs SELECT * FROM _v028_audit_rows;
DROP TABLE _v028_audit_rows;

-- ─── 3. lucien_agent_steps ───────────────────────────────────────────────────
-- Audit record for every ReAct iteration step (SYSTEM_DESIGN §6.1).
-- session_id is a loose FK to chat_sessions (VARCHAR PK); cascaded at service layer.

CREATE TABLE IF NOT EXISTS lucien_agent_steps (
    id             UUID         NOT NULL DEFAULT gen_random_uuid(),
    session_id     VARCHAR(36)  NOT NULL,
    iteration      INTEGER      NOT NULL,
    thought        TEXT,
    tool_name      VARCHAR(100),
    tool_input     TEXT,
    tool_output    TEXT,
    is_write_tool  BOOLEAN      NOT NULL DEFAULT FALSE,
    was_confirmed  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT pk_lucien_agent_steps PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_las_session ON lucien_agent_steps (session_id);
CREATE INDEX IF NOT EXISTS idx_las_created ON lucien_agent_steps (created_at);
