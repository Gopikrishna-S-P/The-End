-- =============================================================================
-- V085__unified_audit_events.sql
-- =============================================================================
-- New unified audit table for everything that previously had no controlled home:
-- auth, RBAC, platform-admin actions, billing, exports, and bulk-import lifecycle
-- stages. Does NOT replace assignment_audit_logs / collection_audit_logs /
-- ptp_audit_logs / settlement_audit_logs / allocation_audit_logs -- those keep
-- their existing shape and call sites for case-timeline UIs; this table exists
-- for the categories that don't fit that per-domain pattern, and for
-- cross-cutting investigation queries ("show every role change this month").
--
-- Named unified_audit_events, not audit_events: this database already has an
-- unrelated table literally named audit_events (19 rows, columns like category/
-- occurred_at/outcome/purpose/retention_until/session_id/target_type) that no
-- Flyway migration created and no current application code queries -- an
-- orphaned artifact from an earlier, abandoned attempt at this same idea
-- (confirmed live: this migration's first draft used that name and failed
-- outright with "relation audit_events already exists" before creating
-- anything). Left untouched rather than dropped or repurposed -- it has real
-- data and unknown provenance, and reusing/clearing it is not this migration's
-- call to make.
--
-- Design decisions carried over unchanged from what this codebase already does
-- elsewhere, not reinvented:
--   - Immutability: reuses fn_audit_log_immutable() from V006, same function now
--     also guarding settlement_audit_logs/allocation_audit_logs since V084.
--   - Partitioning: monthly RANGE on created_at with PRIMARY KEY (id, created_at),
--     same shape as V016's user_action_audit_logs. Extending
--     PartitionMaintenanceJob to also roll this table's future partitions is
--     separate follow-up work, not part of this schema migration.
--   - RLS: FORCE ROW LEVEL SECURITY keyed on current_org_id(), with the same
--     `current_setting('app.is_platform_admin', true) = 'true'` bypass branch
--     introduced in V050, gated by RlsAwareDataSource + PlatformAdminAccessGuard
--     exactly as file_uploads and the other platform_admin_bypass_* tables use it.
--   - organization_id is nullable for true platform-global rows (an action with
--     no tenant relevance, e.g. a platform admin's own login) -- same precedent
--     as compliance_decisions.org_id (V040) and app_notifications.organization_id
--     (V082). The INSERT-time WITH CHECK below mirrors V082's fix for exactly
--     this case: a NULL-org row must be insertable even when the connection's
--     app.current_org_id session GUC is itself unset. The read-time USING clause
--     deliberately does NOT allow organization_id IS NULL -- unlike
--     app_notifications, a NULL-org audit row (e.g. a platform admin's own
--     login) has no tenant relevance and must not be readable by every org,
--     only by platform admins via the is_platform_admin branch.
--   - action/actor_type/severity/result/source/resource_type are constrained
--     with CHECK constraints mirroring their Java enums, same convention as
--     report_jobs.report_type (see V064) -- adding a new action requires
--     updating both AuditAction.java and this constraint by hand.
--
-- Retention policy and MANAGER-role read-scope for this table are explicitly
-- NOT decided by this migration -- both require a business/compliance call this
-- migration doesn't make. Nothing here forecloses either decision.
-- =============================================================================

CREATE TABLE unified_audit_events (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    organization_id     UUID            REFERENCES organizations(id),
    actor_user_id       UUID            REFERENCES users(id),
    actor_type          VARCHAR(20)     NOT NULL,
    actor_role          VARCHAR(100),
    effective_user_id   UUID            REFERENCES users(id),
    action              VARCHAR(50)     NOT NULL,
    resource_type       VARCHAR(30)     NOT NULL,
    resource_id         TEXT,
    severity            VARCHAR(10)     NOT NULL,
    result              VARCHAR(10)     NOT NULL,
    source              VARCHAR(20)     NOT NULL,
    request_id          VARCHAR(64),
    correlation_id      VARCHAR(64),
    ip_address          VARCHAR(45),
    user_agent          VARCHAR(500),
    reason              TEXT,
    before_state        JSONB,
    after_state         JSONB,
    metadata            JSONB,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

    PRIMARY KEY (id, created_at),   -- partition key must be part of PK

    CONSTRAINT chk_unified_audit_events_actor_type CHECK (actor_type IN
        ('USER', 'SYSTEM', 'BACKGROUND_JOB', 'API_CLIENT')),

    CONSTRAINT chk_unified_audit_events_severity CHECK (severity IN
        ('INFO', 'WARNING', 'HIGH', 'CRITICAL')),

    CONSTRAINT chk_unified_audit_events_result CHECK (result IN
        ('SUCCESS', 'FAILURE', 'DENIED', 'PARTIAL')),

    CONSTRAINT chk_unified_audit_events_source CHECK (source IN
        ('WEB', 'MOBILE', 'API', 'ADMIN_CONSOLE', 'SYSTEM', 'BACKGROUND_JOB')),

    CONSTRAINT chk_unified_audit_events_resource_type CHECK (resource_type IN
        ('ALLOCATION', 'BORROWER', 'USER', 'ORGANIZATION', 'VISIT', 'COLLECTION',
         'PTP', 'SETTLEMENT', 'FILE_UPLOAD', 'ROLE', 'SUBSCRIPTION', 'INVOICE',
         'REPORT', 'FEATURE_FLAG')),

    CONSTRAINT chk_unified_audit_events_action CHECK (action IN (
        -- Auth
        'AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILED', 'AUTH_LOGOUT',
        'AUTH_PASSWORD_CHANGED', 'AUTH_PASSWORD_RESET_REQUESTED',
        'AUTH_PASSWORD_RESET_COMPLETED', 'AUTH_MFA_ENABLED', 'AUTH_MFA_DISABLED',
        'AUTH_SESSION_REVOKED', 'AUTH_TOKEN_THEFT_DETECTED',
        -- RBAC
        'ROLE_GRANTED', 'ROLE_REVOKED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED',
        'ACCESS_DENIED',
        -- User lifecycle
        'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_REACTIVATED',
        'USER_ROLE_CHANGED',
        -- Platform admin
        'ORG_SUSPENDED', 'ORG_REACTIVATED', 'ORG_TRIAL_EXTENDED',
        'ENTITLEMENT_GRANTED', 'ENTITLEMENT_REVOKED', 'CROSS_ORG_ACCESS',
        'FEATURE_FLAG_CHANGED',
        -- Billing
        'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_CHANGED', 'SUBSCRIPTION_CANCELLED',
        'INVOICE_PAYMENT_FAILED', 'REFUND_CREATED', 'BILLING_OVERRIDE_APPLIED',
        -- Bulk-import lifecycle
        'FILE_UPLOAD_INITIATED', 'FILE_PROCESSING_STARTED',
        'FILE_PROCESSING_COMPLETED', 'FILE_PROCESSING_PARTIALLY_FAILED',
        'FILE_PROCESSING_FAILED', 'FILE_UPLOAD_DELETED',
        -- Reports & export
        'REPORT_GENERATED', 'REPORT_EXPORTED', 'DATA_EXPORTED', 'AUDIT_LOG_EXPORTED'
    ))
) PARTITION BY RANGE (created_at);

-- Initial partitions: 1 month back + 5 months forward from 2026-08 (current
-- month at authoring time). Follow-up work extends PartitionMaintenanceJob to
-- keep this rolling monthly, same as it already does for user_action_audit_logs.
CREATE TABLE unified_audit_events_2026_07 PARTITION OF unified_audit_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE unified_audit_events_2026_08 PARTITION OF unified_audit_events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE unified_audit_events_2026_09 PARTITION OF unified_audit_events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE unified_audit_events_2026_10 PARTITION OF unified_audit_events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE unified_audit_events_2026_11 PARTITION OF unified_audit_events
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE unified_audit_events_2026_12 PARTITION OF unified_audit_events
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Catches anything outside the explicit ranges (backdated historical-import
-- rows, or a month PartitionMaintenanceJob hasn't created yet).
CREATE TABLE unified_audit_events_default PARTITION OF unified_audit_events DEFAULT;

-- Immutability: reuse the existing generic trigger function (V006, also used by
-- V084). Defined on the partitioned parent; PostgreSQL fires it for every
-- partition automatically.
CREATE TRIGGER trg_unified_audit_events_immutable
    BEFORE UPDATE OR DELETE ON unified_audit_events
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();

-- Tenant isolation, fail-closed, with the established platform-admin bypass.
ALTER TABLE unified_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_unified_audit_events_isolation ON unified_audit_events
    USING (
        organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true'
    )
    WITH CHECK (
        organization_id = current_org_id()
        OR organization_id IS NULL
        OR current_setting('app.is_platform_admin', true) = 'true'
    );

-- Six indexes, each mapping to a named query pattern -- not more, this table is
-- write-heavy.
CREATE INDEX idx_unified_audit_events_org_time ON unified_audit_events (organization_id, created_at DESC);
CREATE INDEX idx_unified_audit_events_org_actor ON unified_audit_events (organization_id, actor_user_id, created_at DESC);
CREATE INDEX idx_unified_audit_events_org_action ON unified_audit_events (organization_id, action, created_at DESC);
CREATE INDEX idx_unified_audit_events_resource ON unified_audit_events (organization_id, resource_type, resource_id);
CREATE INDEX idx_unified_audit_events_severe ON unified_audit_events (organization_id, created_at DESC)
    WHERE severity IN ('HIGH', 'CRITICAL');
CREATE INDEX idx_unified_audit_events_correlation ON unified_audit_events (correlation_id)
    WHERE correlation_id IS NOT NULL;
