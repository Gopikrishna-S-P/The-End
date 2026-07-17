-- =============================================================================
-- V001__baseline.sql  --  Full schema baseline (generated from JPA entities)
-- =============================================================================
-- On existing production DB: set spring.flyway.baseline-on-migrate=true
-- and spring.flyway.baseline-version=1 so this file is NOT re-run.
-- On fresh DB: this script runs first, then Hibernate validates (ddl-auto=validate).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Table: organizations
-- =============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL UNIQUE,
    code          VARCHAR(50)  NOT NULL UNIQUE,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    org_type      VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at    TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: roles
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    name            VARCHAR(50)  NOT NULL,
    description     VARCHAR(255),
    organization_id UUID,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: permissions
-- =============================================================================
CREATE TABLE IF NOT EXISTS permissions (
    id          UUID         NOT NULL DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    resource    VARCHAR(100) NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    scope       VARCHAR(20)  NOT NULL,
    created_at  TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: role_permissions  (JoinTable from Role.permissions @ManyToMany)
-- =============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- =============================================================================
-- Table: users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id                    UUID         NOT NULL DEFAULT gen_random_uuid(),
    email                 VARCHAR(255) NOT NULL UNIQUE,
    password_hash         VARCHAR(255) NOT NULL,
    first_name            VARCHAR(100) NOT NULL,
    last_name             VARCHAR(100) NOT NULL,
    enabled               BOOLEAN      NOT NULL DEFAULT TRUE,
    account_locked        BOOLEAN      NOT NULL DEFAULT FALSE,
    mfa_enabled           BOOLEAN      NOT NULL DEFAULT FALSE,
    mfa_secret            VARCHAR(512),
    failed_login_attempts INTEGER      NOT NULL DEFAULT 0,
    lockout_count         INTEGER      NOT NULL DEFAULT 0,
    lockout_until         TIMESTAMP WITHOUT TIME ZONE,
    deleted_at            TIMESTAMP WITHOUT TIME ZONE,
    last_login_at         TIMESTAMP WITHOUT TIME ZONE,
    password_changed_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    organization_id       UUID,
    created_at            TIMESTAMP WITHOUT TIME ZONE,
    updated_at            TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: user_roles  (JoinTable from User.roles @ManyToMany)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

-- =============================================================================
-- Table: user_permissions
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_permissions (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL,
    permission_id UUID         NOT NULL,
    granted_by    UUID,
    is_granted    BOOLEAN      NOT NULL DEFAULT TRUE,
    expires_at    TIMESTAMP WITHOUT TIME ZONE,
    reason        VARCHAR(500),
    granted_at    TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    CONSTRAINT uq_user_permissions_user_permission UNIQUE (user_id, permission_id)
);

-- =============================================================================
-- Table: refresh_tokens
-- =============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    device_info     VARCHAR(500),
    ip_address      VARCHAR(50),
    expires_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    revoked         BOOLEAN      NOT NULL DEFAULT FALSE,
    revoked_at      TIMESTAMP WITHOUT TIME ZONE,
    token_prefix    VARCHAR(16),
    device_id       VARCHAR(128),
    user_agent      VARCHAR(500),
    geo_country     VARCHAR(2),
    anomaly_flagged BOOLEAN      NOT NULL DEFAULT FALSE,
    anomaly_reason  VARCHAR(500),
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: password_reset_tokens
-- =============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL,
    otp_hash   VARCHAR(255) NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: mfa_recovery_codes
-- =============================================================================
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL,
    code_hash  VARCHAR(72) NOT NULL,
    used       BOOLEAN     NOT NULL DEFAULT FALSE,
    used_at    TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: file_uploads
-- =============================================================================
CREATE TABLE IF NOT EXISTS file_uploads (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    organization_id     UUID         NOT NULL,
    original_filename   VARCHAR(500) NOT NULL,
    content_type        VARCHAR(100) NOT NULL,
    file_size_bytes     BIGINT       NOT NULL,
    sha256_hash         VARCHAR(64)  NOT NULL,
    status              VARCHAR(30)  NOT NULL,
    total_rows          INTEGER,
    processed_rows      INTEGER      DEFAULT 0,
    successful_rows     INTEGER      DEFAULT 0,
    failed_rows         INTEGER      DEFAULT 0,
    error_message       TEXT,
    column_order        JSONB,
    uploaded_by_user_id UUID,
    is_deleted          BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP WITHOUT TIME ZONE,
    deleted_by_user_id  UUID,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: column_schemas
-- =============================================================================
CREATE TABLE IF NOT EXISTS column_schemas (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    organization_id  UUID         NOT NULL,
    name             VARCHAR(100) NOT NULL,
    display_name     VARCHAR(200) NOT NULL,
    data_type        VARCHAR(50)  NOT NULL,
    is_required      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_searchable    BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order       INTEGER      NOT NULL DEFAULT 0,
    validation_rules JSONB,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at       TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    CONSTRAINT uq_column_schemas_org_name UNIQUE (organization_id, name)
);

-- =============================================================================
-- Table: allocations
-- =============================================================================
CREATE TABLE IF NOT EXISTS allocations (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    file_upload_id       UUID          NOT NULL,
    organization_id      UUID          NOT NULL,
    loan_number          VARCHAR(100)  NOT NULL,
    borrower_name        VARCHAR(1024) NOT NULL,
    status               VARCHAR(20)   NOT NULL,
    assigned_to_user_id  UUID,
    assigned_at          TIMESTAMP WITHOUT TIME ZONE,
    dynamic_data         JSONB,
    row_number           INTEGER,
    is_deleted           BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_at           TIMESTAMP WITHOUT TIME ZONE,
    deleted_by_user_id   UUID,
    created_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at           TIMESTAMP WITHOUT TIME ZONE,
    npa_flagged          BOOLEAN       NOT NULL DEFAULT FALSE,
    total_due            NUMERIC(15, 2),
    outstanding_amount   NUMERIC(15, 2),
    borrower_id          UUID,
    cooling_off_until    TIMESTAMP WITHOUT TIME ZONE,
    restructured_from_id UUID,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: borrowers
-- =============================================================================
CREATE TABLE IF NOT EXISTS borrowers (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    organization_id     UUID         NOT NULL,
    ckyc_id             VARCHAR(50),
    first_name          VARCHAR(512) NOT NULL,
    last_name           VARCHAR(512),
    email               VARCHAR(512),
    phone               VARCHAR(256),
    address             TEXT,
    erasure_pending     BOOLEAN      NOT NULL DEFAULT FALSE,
    phone_lookup_hash   VARCHAR(64),
    email_lookup_hash   VARCHAR(64),
    nominee_name        VARCHAR(1024),
    nominee_relation    VARCHAR(256),
    nominee_phone       VARCHAR(256),
    nominee_email       VARCHAR(512),
    nominee_recorded_at TIMESTAMP WITHOUT TIME ZONE,
    created_at          TIMESTAMP WITHOUT TIME ZONE,
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: assignments
-- =============================================================================
CREATE TABLE IF NOT EXISTS assignments (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    allocation_id       UUID        NOT NULL,
    agent_id            UUID        NOT NULL,
    organization_id     UUID        NOT NULL,
    assigned_by         UUID        NOT NULL,
    priority            VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    assignment_date     DATE        NOT NULL,
    sequence_order      INTEGER,
    reassignment_reason TEXT,
    previous_agent_id   UUID,
    is_deleted          BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITHOUT TIME ZONE,
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    priority_level      VARCHAR(20),
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: assignment_audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS assignment_audit_logs (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    assignment_id     UUID        NOT NULL,
    allocation_id     UUID        NOT NULL,
    action            VARCHAR(50) NOT NULL,
    performed_by      UUID        NOT NULL,
    previous_agent_id UUID,
    new_agent_id      UUID,
    reason            TEXT,
    metadata          TEXT,
    created_at        TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: visit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS visit_logs (
    id                     UUID             NOT NULL DEFAULT gen_random_uuid(),
    allocation_id          UUID             NOT NULL,
    assignment_id          UUID,
    agent_id               UUID             NOT NULL,
    organization_id        UUID             NOT NULL,
    visit_date             DATE             NOT NULL,
    visit_time             TIMESTAMP WITHOUT TIME ZONE,
    contactability         VARCHAR(50),
    contact_person         VARCHAR(512),
    contact_number         VARCHAR(256),
    disp                   VARCHAR(30),
    visit_outcome          VARCHAR(30),
    next_visit_date        DATE,
    reschedule_reason      TEXT,
    classification_code    VARCHAR(60),
    reason_for_default     VARCHAR(50),
    approval_status        VARCHAR(20)      NOT NULL,
    approval_remarks       TEXT,
    approved_by            UUID,
    approved_at            TIMESTAMP WITHOUT TIME ZONE,
    collection_id          UUID,
    ptp_id                 UUID,
    amount_collected       NUMERIC(15, 2),
    payment_mode           VARCHAR(20),
    residence_status       VARCHAR(60),
    office_status          VARCHAR(60),
    customer_profile       VARCHAR(100),
    field_update_feedback  TEXT,
    last_visited_address   TEXT,
    visit_notes            TEXT,
    internal_remarks       TEXT,
    created_by             UUID             NOT NULL,
    updated_by             UUID,
    created_at             TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at             TIMESTAMP WITHOUT TIME ZONE,
    is_deleted             BOOLEAN          NOT NULL DEFAULT FALSE,
    latitude               DOUBLE PRECISION NOT NULL,
    longitude              DOUBLE PRECISION NOT NULL,
    gps_accuracy           DOUBLE PRECISION,
    gps_altitude           DOUBLE PRECISION,
    gps_captured_at        TIMESTAMP WITHOUT TIME ZONE,
    gps_address            TEXT,
    distance_from_expected DOUBLE PRECISION,
    visit_status           VARCHAR(30)      NOT NULL,
    mock_location_detected BOOLEAN          NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: visit_images
-- =============================================================================
CREATE TABLE IF NOT EXISTS visit_images (
    id                UUID         NOT NULL DEFAULT gen_random_uuid(),
    visit_log_id      UUID         NOT NULL,
    sequence_number   INTEGER      NOT NULL,
    image_path        VARCHAR(500),
    s3_key            VARCHAR(500),
    original_filename VARCHAR(255),
    content_type      VARCHAR(100),
    upload_status     VARCHAR(30),
    uploaded_by       UUID         NOT NULL,
    is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: collections
-- =============================================================================
CREATE TABLE IF NOT EXISTS collections (
    id                         UUID           NOT NULL DEFAULT gen_random_uuid(),
    allocation_id              UUID           NOT NULL,
    organization_id            UUID           NOT NULL,
    submitted_by               UUID           NOT NULL,
    approved_by                UUID,
    deposited_by               UUID,
    amount                     NUMERIC(15, 2) NOT NULL,
    payment_mode               VARCHAR(10)    NOT NULL,
    status                     VARCHAR(20)    NOT NULL,
    notes                      TEXT,
    rejection_reason           TEXT,
    receipt_number             VARCHAR(30)    UNIQUE,
    idempotency_key            VARCHAR(64)    NOT NULL UNIQUE,
    collection_date            DATE           NOT NULL,
    approved_at                TIMESTAMP WITHOUT TIME ZONE,
    deposited_at               TIMESTAMP WITHOUT TIME ZONE,
    cheque_number              VARCHAR(30),
    cheque_date                DATE,
    bank_name                  VARCHAR(100),
    upi_reference_id           VARCHAR(50),
    transaction_reference_id   VARCHAR(50),
    is_deleted                 BOOLEAN        NOT NULL DEFAULT FALSE,
    cash_handling_acknowledged BOOLEAN        NOT NULL DEFAULT FALSE,
    cash_supervisor_signed_by  UUID,
    cash_supervisor_signed_at  TIMESTAMP WITHOUT TIME ZONE,
    created_at                 TIMESTAMP WITHOUT TIME ZONE,
    updated_at                 TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: collection_audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_audit_logs (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    collection_id   UUID        NOT NULL,
    action          VARCHAR(50) NOT NULL,
    performed_by    UUID        NOT NULL,
    previous_status VARCHAR(20),
    new_status      VARCHAR(20),
    remarks         TEXT,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: collection_documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_documents (
    id                UUID         NOT NULL DEFAULT gen_random_uuid(),
    collection_id     UUID         NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename   VARCHAR(255) NOT NULL,
    file_path         VARCHAR(512) NOT NULL,
    content_type      VARCHAR(100) NOT NULL,
    file_size_bytes   BIGINT       NOT NULL,
    uploaded_by       UUID         NOT NULL,
    is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: ptp_records
-- =============================================================================
CREATE TABLE IF NOT EXISTS ptp_records (
    id                  UUID           NOT NULL DEFAULT gen_random_uuid(),
    allocation_id       UUID           NOT NULL,
    agent_id            UUID           NOT NULL,
    agent_name          VARCHAR(255)   NOT NULL,
    loan_number         VARCHAR(255)   NOT NULL,
    borrower_name       VARCHAR(255)   NOT NULL,
    promised_date       DATE           NOT NULL,
    promised_amount     NUMERIC(15, 2) NOT NULL,
    collected_amount    NUMERIC(15, 2) DEFAULT 0,
    status              VARCHAR(30)    NOT NULL,
    contact_notes       TEXT,
    cancellation_reason TEXT,
    broken_reason       TEXT,
    negotiated_amount   NUMERIC(15, 2),
    floor_amount        NUMERIC(15, 2),
    evidence_call_id    VARCHAR(100),
    consent_capture_id  UUID,
    reminder_sent       BOOLEAN        DEFAULT FALSE,
    reminder_sent_at    TIMESTAMP WITHOUT TIME ZONE,
    fulfilled_at        TIMESTAMP WITHOUT TIME ZONE,
    broken_at           TIMESTAMP WITHOUT TIME ZONE,
    created_by          UUID           NOT NULL,
    updated_by          UUID,
    created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    is_deleted          BOOLEAN        NOT NULL DEFAULT FALSE,
    version             BIGINT         NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: ptp_audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS ptp_audit_logs (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    ptp_id          UUID        NOT NULL,
    allocation_id   UUID        NOT NULL,
    action          VARCHAR(50) NOT NULL,
    performed_by    UUID        NOT NULL,
    previous_status VARCHAR(30),
    new_status      VARCHAR(30),
    reason          TEXT,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: ptp_history
-- =============================================================================
CREATE TABLE IF NOT EXISTS ptp_history (
    id                        UUID           NOT NULL DEFAULT gen_random_uuid(),
    ptp_id                    UUID           NOT NULL,
    allocation_id             UUID           NOT NULL,
    previous_status           VARCHAR(30),
    new_status                VARCHAR(30)    NOT NULL,
    collected_amount_snapshot NUMERIC(15, 2),
    change_reason             TEXT,
    changed_by                UUID           NOT NULL,
    changed_by_name           VARCHAR(255)   NOT NULL,
    changed_at                TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: npa_records
-- =============================================================================
CREATE TABLE IF NOT EXISTS npa_records (
    id                  UUID           NOT NULL DEFAULT gen_random_uuid(),
    allocation_id       UUID           NOT NULL,
    organization_id     UUID           NOT NULL,
    loan_number         VARCHAR(50)    NOT NULL,
    borrower_name       VARCHAR(255)   NOT NULL,
    outstanding_amount  NUMERIC(18, 2) NOT NULL,
    overdue_days        INTEGER        NOT NULL,
    risk_level          VARCHAR(10)    NOT NULL,
    flagged_date        DATE           NOT NULL,
    last_payment_date   DATE,
    last_payment_amount NUMERIC(18, 2),
    assigned_agent_id   UUID,
    is_resolved         BOOLEAN        NOT NULL DEFAULT FALSE,
    resolved_date       DATE,
    created_at          TIMESTAMP WITHOUT TIME ZONE,
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: daily_visit_list
-- =============================================================================
CREATE TABLE IF NOT EXISTS daily_visit_list (
    id              UUID    NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID    NOT NULL,
    agent_user_id   UUID    NOT NULL,
    dispatch_date   DATE    NOT NULL,
    allocation_id   UUID    NOT NULL,
    sequence_order  INTEGER NOT NULL DEFAULT 0,
    created_by      UUID    NOT NULL,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    CONSTRAINT uq_dvl_org_agent_date_case UNIQUE (organization_id, agent_user_id, dispatch_date, allocation_id)
);

-- =============================================================================
-- Table: agent_capacity_config
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_capacity_config (
    id                          UUID    NOT NULL DEFAULT gen_random_uuid(),
    organization_id             UUID    NOT NULL UNIQUE,
    max_cases_per_agent_per_day INTEGER NOT NULL DEFAULT 50,
    allow_weekend_assignments   BOOLEAN NOT NULL DEFAULT FALSE,
    allow_holiday_assignments   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMP WITHOUT TIME ZONE,
    updated_at                  TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: agent_performance_snapshots
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_performance_snapshots (
    id                    UUID           NOT NULL DEFAULT gen_random_uuid(),
    agent_id              UUID           NOT NULL,
    organization_id       UUID           NOT NULL,
    snapshot_date         DATE           NOT NULL,
    total_assigned        INTEGER        NOT NULL DEFAULT 0,
    total_visited         INTEGER        NOT NULL DEFAULT 0,
    total_collected       INTEGER        NOT NULL DEFAULT 0,
    total_pending         INTEGER        NOT NULL DEFAULT 0,
    total_reassigned_out  INTEGER        NOT NULL DEFAULT 0,
    total_reassigned_in   INTEGER        NOT NULL DEFAULT 0,
    amount_collected      NUMERIC(18, 2) NOT NULL DEFAULT 0,
    amount_outstanding    NUMERIC(18, 2) NOT NULL DEFAULT 0,
    visit_completion_rate NUMERIC(5, 2),
    collection_efficiency NUMERIC(5, 2),
    efficiency_score      NUMERIC(5, 2),
    rank_in_org           INTEGER,
    created_at            TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: agent_shifts
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_shifts (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    agent_id        UUID        NOT NULL,
    organization_id UUID        NOT NULL,
    started_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ended_at        TIMESTAMP WITHOUT TIME ZONE,
    status          VARCHAR(20) NOT NULL,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: agent_location_pings
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_location_pings (
    id                     UUID             NOT NULL DEFAULT gen_random_uuid(),
    agent_id               UUID             NOT NULL,
    shift_id               UUID             NOT NULL,
    lat                    DOUBLE PRECISION NOT NULL,
    lng                    DOUBLE PRECISION NOT NULL,
    accuracy               DOUBLE PRECISION,
    battery_level          DOUBLE PRECISION,
    mock_location_detected BOOLEAN          NOT NULL DEFAULT FALSE,
    recorded_at            TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at             TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: route_plans
-- =============================================================================
CREATE TABLE IF NOT EXISTS route_plans (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    agent_id             UUID          NOT NULL,
    organization_id      UUID          NOT NULL,
    plan_date            DATE          NOT NULL,
    assignment_ids       JSONB,
    score                NUMERIC(8, 4),
    generated_by_user_id UUID,
    generated_at         TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: holiday_calendar
-- =============================================================================
CREATE TABLE IF NOT EXISTS holiday_calendar (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL,
    holiday_date    DATE         NOT NULL,
    description     VARCHAR(255),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: non_contactables
-- =============================================================================
CREATE TABLE IF NOT EXISTS non_contactables (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL,
    allocation_id   UUID        NOT NULL,
    visit_id        UUID,
    agent_id        UUID        NOT NULL,
    reason          VARCHAR(50) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: incident_reports
-- =============================================================================
CREATE TABLE IF NOT EXISTS incident_reports (
    id                  UUID             NOT NULL DEFAULT gen_random_uuid(),
    agent_id            UUID             NOT NULL,
    organization_id     UUID             NOT NULL,
    shift_id            UUID,
    triggered_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    last_known_lat      DOUBLE PRECISION,
    last_known_lng      DOUBLE PRECISION,
    last_known_accuracy DOUBLE PRECISION,
    recent_pings        JSONB,
    notes               TEXT,
    resolved_at         TIMESTAMP WITHOUT TIME ZONE,
    resolved_by_user_id UUID,
    resolution_notes    TEXT,
    created_at          TIMESTAMP WITHOUT TIME ZONE,
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: file_processing_errors
-- =============================================================================
CREATE TABLE IF NOT EXISTS file_processing_errors (
    id             UUID         NOT NULL DEFAULT gen_random_uuid(),
    file_upload_id UUID         NOT NULL,
    row_number     INTEGER      NOT NULL,
    column_name    VARCHAR(200),
    error_message  TEXT         NOT NULL,
    raw_value      TEXT,
    created_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: monthly_loan_book_snapshots
-- =============================================================================
CREATE TABLE IF NOT EXISTS monthly_loan_book_snapshots (
    id                        UUID           NOT NULL DEFAULT gen_random_uuid(),
    organization_id           UUID           NOT NULL,
    snapshot_month            DATE           NOT NULL,
    total_loans               INTEGER        NOT NULL,
    total_outstanding_amount  NUMERIC(18, 2) NOT NULL,
    total_collected_amount    NUMERIC(18, 2) NOT NULL,
    total_npa_count           INTEGER        NOT NULL,
    total_npa_amount          NUMERIC(18, 2) NOT NULL,
    total_assigned_loans      INTEGER        NOT NULL,
    total_unassigned_loans    INTEGER        NOT NULL,
    collection_efficiency_pct NUMERIC(5, 2),
    recovery_rate_pct         NUMERIC(5, 2),
    created_at                TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: report_jobs
-- =============================================================================
CREATE TABLE IF NOT EXISTS report_jobs (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL,
    report_type     VARCHAR(40) NOT NULL,
    status          VARCHAR(15) NOT NULL,
    export_format   VARCHAR(5)  NOT NULL,
    parameters      TEXT,
    file_path       VARCHAR(512),
    file_name       VARCHAR(255),
    file_size_bytes BIGINT,
    error_message   TEXT,
    requested_by    UUID,
    is_scheduled    BOOLEAN     NOT NULL DEFAULT FALSE,
    started_at      TIMESTAMP WITHOUT TIME ZONE,
    completed_at    TIMESTAMP WITHOUT TIME ZONE,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: user_creation_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_creation_requests (
    id                   UUID         NOT NULL DEFAULT gen_random_uuid(),
    requested_email      VARCHAR(255) NOT NULL,
    requested_first_name VARCHAR(100) NOT NULL,
    requested_last_name  VARCHAR(100) NOT NULL,
    requested_role       VARCHAR(50)  NOT NULL,
    organization_id      UUID,
    requested_by         UUID         NOT NULL,
    status               VARCHAR(20)  NOT NULL,
    reviewed_by          UUID,
    reviewed_at          TIMESTAMP WITHOUT TIME ZONE,
    review_notes         VARCHAR(500),
    created_user_id      UUID,
    created_at           TIMESTAMP WITHOUT TIME ZONE,
    updated_at           TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: user_action_audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_action_audit_logs (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL,
    action     VARCHAR(50) NOT NULL,
    details    TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: feature_flags
-- =============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
    id                 UUID         NOT NULL DEFAULT gen_random_uuid(),
    organization_id    UUID,
    flag_key           VARCHAR(100) NOT NULL,
    enabled            BOOLEAN      NOT NULL DEFAULT FALSE,
    description        VARCHAR(500),
    updated_by_user_id UUID,
    created_at         TIMESTAMP WITHOUT TIME ZONE,
    updated_at         TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    CONSTRAINT uq_feature_flag_org_key UNIQUE (organization_id, flag_key)
);

-- =============================================================================
-- Table: borrower_risk_scores
-- =============================================================================
CREATE TABLE IF NOT EXISTS borrower_risk_scores (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    organization_id      UUID          NOT NULL,
    borrower_id          UUID          NOT NULL,
    model_version        VARCHAR(30)   NOT NULL,
    default_propensity   NUMERIC(5, 4) NOT NULL,
    intent               VARCHAR(20)   NOT NULL,
    ability              VARCHAR(20)   NOT NULL,
    segment              VARCHAR(30)   NOT NULL,
    feature_attributions JSONB,
    feature_snapshot     JSONB,
    scored_at            TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at           TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: model_registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS model_registry (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    model_name          VARCHAR(100) NOT NULL,
    version             VARCHAR(50)  NOT NULL,
    trained_on          TEXT,
    trained_at          TIMESTAMP WITHOUT TIME ZONE,
    eval_metrics        JSONB,
    approved_by_user_id UUID,
    approved_at         TIMESTAMP WITHOUT TIME ZONE,
    effective_from      TIMESTAMP WITHOUT TIME ZONE,
    effective_to        TIMESTAMP WITHOUT TIME ZONE,
    is_current          BOOLEAN      NOT NULL DEFAULT FALSE,
    notes               TEXT,
    created_at          TIMESTAMP WITHOUT TIME ZONE,
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    CONSTRAINT uq_model_name_version UNIQUE (model_name, version)
);

-- =============================================================================
-- Table: consent_artifacts
-- =============================================================================
CREATE TABLE IF NOT EXISTS consent_artifacts (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    borrower_id     UUID        NOT NULL,
    organization_id UUID        NOT NULL,
    purpose         VARCHAR(50) NOT NULL,
    scope           VARCHAR(30) NOT NULL,
    terms_text      TEXT        NOT NULL,
    terms_version   VARCHAR(30) NOT NULL,
    signed_hash     VARCHAR(64) NOT NULL,
    evidence_ref    VARCHAR(500),
    granted_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    expires_at      TIMESTAMP WITHOUT TIME ZONE,
    revoked_at      TIMESTAMP WITHOUT TIME ZONE,
    revoked_reason  VARCHAR(500),
    status          VARCHAR(20) NOT NULL,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: data_erasure_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS data_erasure_requests (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    borrower_id          UUID        NOT NULL,
    organization_id      UUID        NOT NULL,
    requested_by_user_id UUID,
    reason               TEXT,
    status               VARCHAR(30) NOT NULL,
    compliance_notes     TEXT,
    reviewed_by_user_id  UUID,
    reviewed_at          TIMESTAMP WITHOUT TIME ZONE,
    executed_at          TIMESTAMP WITHOUT TIME ZONE,
    created_at           TIMESTAMP WITHOUT TIME ZONE,
    updated_at           TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: grievances
-- =============================================================================
CREATE TABLE IF NOT EXISTS grievances (
    id                     UUID         NOT NULL DEFAULT gen_random_uuid(),
    ticket_number          VARCHAR(30)  NOT NULL UNIQUE,
    organization_id        UUID         NOT NULL,
    allocation_id          UUID,
    raised_by_user_id      UUID,
    borrower_name          VARCHAR(200),
    borrower_email         VARCHAR(255),
    borrower_phone         VARCHAR(30),
    category               VARCHAR(32)  NOT NULL,
    subject                VARCHAR(500) NOT NULL,
    description            TEXT         NOT NULL,
    evidence_url           VARCHAR(1024),
    status                 VARCHAR(20)  NOT NULL,
    assigned_to_user_id    UUID,
    resolution_notes       TEXT,
    acknowledgement_due_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    acknowledged_at        TIMESTAMP WITHOUT TIME ZONE,
    resolution_due_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    resolved_at            TIMESTAMP WITHOUT TIME ZONE,
    closed_at              TIMESTAMP WITHOUT TIME ZONE,
    created_at             TIMESTAMP WITHOUT TIME ZONE,
    updated_at             TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: grievance_officers
-- =============================================================================
CREATE TABLE IF NOT EXISTS grievance_officers (
    id                 UUID         NOT NULL DEFAULT gen_random_uuid(),
    organization_id    UUID         NOT NULL,
    name               VARCHAR(200) NOT NULL,
    designation        VARCHAR(200) NOT NULL,
    email              VARCHAR(255) NOT NULL,
    phone              VARCHAR(30)  NOT NULL,
    address            TEXT,
    updated_by_user_id UUID,
    created_at         TIMESTAMP WITHOUT TIME ZONE,
    updated_at         TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    CONSTRAINT uq_grievance_officer_org UNIQUE (organization_id)
);

-- =============================================================================
-- Table: lsp_disclosures
-- =============================================================================
CREATE TABLE IF NOT EXISTS lsp_disclosures (
    id                     UUID         NOT NULL DEFAULT gen_random_uuid(),
    organization_id        UUID         NOT NULL,
    lender_name            VARCHAR(200) NOT NULL,
    lender_registration_no VARCHAR(100),
    lender_grievance_email VARCHAR(255),
    lsp_name               VARCHAR(200) NOT NULL,
    lsp_address            TEXT,
    lsp_grievance_email    VARCHAR(255),
    lsp_grievance_phone    VARCHAR(30),
    dla_name               VARCHAR(200),
    dla_version            VARCHAR(50),
    dla_privacy_url        VARCHAR(500),
    dla_terms_url          VARCHAR(500),
    updated_by_user_id     UUID,
    created_at             TIMESTAMP WITHOUT TIME ZONE,
    updated_at             TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    CONSTRAINT uq_lsp_disclosure_org UNIQUE (organization_id)
);

-- =============================================================================
-- Table: key_fact_statements
-- =============================================================================
CREATE TABLE IF NOT EXISTS key_fact_statements (
    id                        UUID           NOT NULL DEFAULT gen_random_uuid(),
    allocation_id             UUID           NOT NULL,
    organization_id           UUID           NOT NULL,
    version_label             VARCHAR(50),
    is_current                BOOLEAN        NOT NULL DEFAULT TRUE,
    generation_reason         VARCHAR(50)    NOT NULL,
    sanctioned_amount         NUMERIC(15, 2),
    net_disbursed_amount      NUMERIC(15, 2),
    total_interest_charge     NUMERIC(15, 2),
    processing_fee            NUMERIC(15, 2),
    other_charges             NUMERIC(15, 2),
    total_payable             NUMERIC(15, 2),
    apr_percent               NUMERIC(8, 4),
    interest_rate_percent     NUMERIC(8, 4),
    interest_type             VARCHAR(50),
    tenure_months             INTEGER,
    emi_amount                NUMERIC(15, 2),
    repayment_frequency       VARCHAR(50),
    penal_charges_description TEXT,
    cooling_off_days          INTEGER,
    first_emi_date            DATE,
    last_emi_date             DATE,
    additional_facts          JSONB,
    rendered_html             TEXT,
    content_sha256            VARCHAR(64),
    pdf_path                  VARCHAR(500),
    pdf_sha256                VARCHAR(64),
    generated_by_user_id      UUID,
    created_at                TIMESTAMP WITHOUT TIME ZONE,
    updated_at                TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: settlement_offers
-- =============================================================================
CREATE TABLE IF NOT EXISTS settlement_offers (
    id                              UUID           NOT NULL DEFAULT gen_random_uuid(),
    organization_id                 UUID           NOT NULL,
    allocation_id                   UUID           NOT NULL,
    borrower_id                     UUID,
    outstanding_at_offer            NUMERIC(15, 2) NOT NULL,
    offered_amount                  NUMERIC(15, 2) NOT NULL,
    discount_pct                    NUMERIC(5, 2)  NOT NULL,
    tenor_days                      INTEGER        NOT NULL,
    validity_until                  TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    conditions                      TEXT,
    status                          VARCHAR(20)    NOT NULL,
    drafted_by_user_id              UUID           NOT NULL,
    proposed_by_user_id             UUID,
    proposed_at                     TIMESTAMP WITHOUT TIME ZONE,
    approved_by_user_id             UUID,
    approved_at                     TIMESTAMP WITHOUT TIME ZONE,
    rejected_by_user_id             UUID,
    rejected_at                     TIMESTAMP WITHOUT TIME ZONE,
    rejection_reason                VARCHAR(500),
    compliance_review_required      BOOLEAN        NOT NULL DEFAULT FALSE,
    compliance_reviewed_by_user_id  UUID,
    compliance_reviewed_at          TIMESTAMP WITHOUT TIME ZONE,
    accepted_at                     TIMESTAMP WITHOUT TIME ZONE,
    borrower_consent_artifact_id    UUID,
    acceptance_otp_hash             VARCHAR(64),
    acceptance_otp_expires_at       TIMESTAMP WITHOUT TIME ZONE,
    acceptance_mode                 VARCHAR(20),
    paid_at                         TIMESTAMP WITHOUT TIME ZONE,
    payment_intent_id               UUID,
    created_at                      TIMESTAMP WITHOUT TIME ZONE,
    updated_at                      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: settlement_audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS settlement_audit_logs (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    settlement_offer_id UUID        NOT NULL,
    allocation_id       UUID        NOT NULL,
    action              VARCHAR(50) NOT NULL,
    performed_by        UUID        NOT NULL,
    previous_status     VARCHAR(30),
    new_status          VARCHAR(30),
    remarks             TEXT,
    created_at          TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: restructure_proposals
-- =============================================================================
CREATE TABLE IF NOT EXISTS restructure_proposals (
    id                           UUID           NOT NULL DEFAULT gen_random_uuid(),
    organization_id              UUID           NOT NULL,
    allocation_id                UUID           NOT NULL,
    borrower_id                  UUID,
    original_emi_count           INTEGER        NOT NULL,
    original_emi_amount          NUMERIC(15, 2) NOT NULL,
    original_apr                 NUMERIC(5, 2)  NOT NULL,
    new_emi_count                INTEGER        NOT NULL,
    new_emi_amount               NUMERIC(15, 2) NOT NULL,
    new_apr                      NUMERIC(5, 2)  NOT NULL,
    step_schedule                JSONB,
    rationale                    TEXT,
    status                       VARCHAR(30)    NOT NULL,
    drafted_by_user_id           UUID           NOT NULL,
    proposed_to_lender_at        TIMESTAMP WITHOUT TIME ZONE,
    lender_approval_user_id      UUID,
    lender_approval_at           TIMESTAMP WITHOUT TIME ZONE,
    borrower_accepted_at         TIMESTAMP WITHOUT TIME ZONE,
    borrower_consent_artifact_id UUID,
    new_allocation_id            UUID,
    rejected_by_user_id          UUID,
    rejected_at                  TIMESTAMP WITHOUT TIME ZONE,
    rejection_reason             VARCHAR(500),
    created_at                   TIMESTAMP WITHOUT TIME ZONE,
    updated_at                   TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: payment_intents
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_intents (
    id                 UUID           NOT NULL DEFAULT gen_random_uuid(),
    organization_id    UUID           NOT NULL,
    allocation_id      UUID           NOT NULL,
    borrower_id        UUID,
    amount             NUMERIC(15, 2) NOT NULL,
    currency           VARCHAR(3)     NOT NULL DEFAULT 'INR',
    purpose            VARCHAR(200),
    status             VARCHAR(20)    NOT NULL,
    expires_at         TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    idempotency_key    VARCHAR(100)   UNIQUE,
    created_by_user_id UUID,
    created_at         TIMESTAMP WITHOUT TIME ZONE,
    updated_at         TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: payment_links
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_links (
    id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    intent_id          UUID        NOT NULL,
    token              VARCHAR(64) NOT NULL UNIQUE,
    target_uri         TEXT        NOT NULL,
    issued_via_channel VARCHAR(20),
    single_use         BOOLEAN     NOT NULL DEFAULT TRUE,
    consumed_at        TIMESTAMP WITHOUT TIME ZONE,
    expires_at         TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_by_user_id UUID,
    created_at         TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: payment_transactions
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id              UUID           NOT NULL DEFAULT gen_random_uuid(),
    intent_id       UUID           NOT NULL,
    provider        VARCHAR(50)    NOT NULL,
    provider_txn_id VARCHAR(200),
    utr             VARCHAR(50),
    rail            VARCHAR(20)    NOT NULL,
    amount          NUMERIC(15, 2) NOT NULL,
    currency        VARCHAR(3)     NOT NULL DEFAULT 'INR',
    state           VARCHAR(20)    NOT NULL,
    failure_code    VARCHAR(50),
    failure_message VARCHAR(500),
    value_date      TIMESTAMP WITHOUT TIME ZONE,
    captured_at     TIMESTAMP WITHOUT TIME ZONE,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: payment_splits
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_splits (
    id         UUID           NOT NULL DEFAULT gen_random_uuid(),
    txn_id     UUID           NOT NULL,
    bucket     VARCHAR(30)    NOT NULL,
    amount     NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: reconciliation_runs
-- =============================================================================
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    organization_id    UUID        NOT NULL,
    source             VARCHAR(50) NOT NULL,
    as_of_date         DATE        NOT NULL,
    rows_ingested      INTEGER     NOT NULL DEFAULT 0,
    matched            INTEGER     NOT NULL DEFAULT 0,
    unmatched          INTEGER     NOT NULL DEFAULT 0,
    amount_diff        INTEGER     NOT NULL DEFAULT 0,
    duplicates         INTEGER     NOT NULL DEFAULT 0,
    exceptions         INTEGER     NOT NULL DEFAULT 0,
    statement_hash     VARCHAR(64) UNIQUE,
    report_job_id      UUID,
    started_by_user_id UUID,
    created_at         TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: bank_statement_rows
-- =============================================================================
CREATE TABLE IF NOT EXISTS bank_statement_rows (
    id                     UUID           NOT NULL DEFAULT gen_random_uuid(),
    run_id                 UUID           NOT NULL,
    utr                    VARCHAR(50),
    txn_ref                VARCHAR(100),
    amount                 NUMERIC(15, 2) NOT NULL,
    currency               VARCHAR(3)     NOT NULL DEFAULT 'INR',
    value_date             DATE           NOT NULL,
    narration              VARCHAR(500),
    source_row_id          VARCHAR(200),
    outcome                VARCHAR(20)    NOT NULL,
    matched_payment_txn_id UUID,
    match_notes            VARCHAR(500),
    created_at             TIMESTAMP WITHOUT TIME ZONE,
    updated_at             TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: message_templates
-- =============================================================================
CREATE TABLE IF NOT EXISTS message_templates (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    organization_id     UUID         NOT NULL,
    template_key        VARCHAR(100) NOT NULL,
    version             VARCHAR(30)  NOT NULL,
    channel             VARCHAR(20)  NOT NULL,
    language            VARCHAR(8)   NOT NULL,
    subject             VARCHAR(500),
    body                TEXT         NOT NULL,
    dlt_template_id     VARCHAR(100),
    whatsapp_namespace  VARCHAR(200),
    category            VARCHAR(30),
    status              VARCHAR(20)  NOT NULL,
    created_by_user_id  UUID         NOT NULL,
    approved_by_user_id UUID,
    approved_at         TIMESTAMP WITHOUT TIME ZONE,
    created_at          TIMESTAMP WITHOUT TIME ZONE,
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: communication_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS communication_logs (
    id                     UUID         NOT NULL DEFAULT gen_random_uuid(),
    organization_id        UUID         NOT NULL,
    borrower_id            UUID,
    allocation_id          UUID,
    campaign_id            UUID,
    template_id            UUID,
    channel                VARCHAR(20)  NOT NULL,
    recipient              VARCHAR(320) NOT NULL,
    rendered_body          TEXT,
    scheduled_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    sent_at                TIMESTAMP WITHOUT TIME ZONE,
    delivered_at           TIMESTAMP WITHOUT TIME ZONE,
    read_at                TIMESTAMP WITHOUT TIME ZONE,
    status                 VARCHAR(20)  NOT NULL,
    suppression_reason     VARCHAR(500),
    held_until             TIMESTAMP WITHOUT TIME ZONE,
    provider_message_id    VARCHAR(200),
    provider_response_code VARCHAR(50),
    provider_error_message VARCHAR(500),
    attempt_count          INTEGER      NOT NULL DEFAULT 0,
    idempotency_key        VARCHAR(100),
    created_at             TIMESTAMP WITHOUT TIME ZONE,
    updated_at             TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: fraud_cases
-- =============================================================================
CREATE TABLE IF NOT EXISTS fraud_cases (
    id                      UUID           NOT NULL DEFAULT gen_random_uuid(),
    case_number             VARCHAR(30)    UNIQUE,
    organization_id         UUID           NOT NULL,
    allocation_id           UUID,
    borrower_id             UUID,
    category                VARCHAR(40)    NOT NULL,
    amount_involved         NUMERIC(15, 2),
    incident_date           DATE,
    description             TEXT           NOT NULL,
    evidence_url            VARCHAR(1024),
    status                  VARCHAR(30)    NOT NULL,
    investigated_by_user_id UUID,
    investigation_notes     TEXT,
    rejection_reason        VARCHAR(500),
    reported_by_user_id     UUID           NOT NULL,
    reported_at             TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    cfr_lookup_at           TIMESTAMP WITHOUT TIME ZONE,
    cfr_lookup_result       VARCHAR(500),
    frms_submitted_at       TIMESTAMP WITHOUT TIME ZONE,
    frms_acknowledgement    VARCHAR(200),
    created_at              TIMESTAMP WITHOUT TIME ZONE,
    updated_at              TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: friday_chat_sessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS friday_chat_sessions (
    id               VARCHAR(36) NOT NULL,
    agent_id         UUID        NOT NULL,
    agent_first_name VARCHAR(255) NOT NULL,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    total_messages   INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at       TIMESTAMP WITHOUT TIME ZONE,
    ended_at         TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: friday_chat_messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS friday_chat_messages (
    id                     UUID        NOT NULL DEFAULT gen_random_uuid(),
    session_id             VARCHAR(36) NOT NULL,
    agent_id               UUID        NOT NULL,
    role                   VARCHAR(20) NOT NULL,
    content                TEXT        NOT NULL,
    input_safety_decision  VARCHAR(30),
    output_safety_decision VARCHAR(30),
    input_tokens           INTEGER,
    output_tokens          INTEGER,
    latency_ms             BIGINT,
    model_name             VARCHAR(100),
    was_blocked            BOOLEAN     NOT NULL DEFAULT FALSE,
    block_reason           VARCHAR(500),
    created_at             TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Table: friday_system_prompts
-- =============================================================================
CREATE TABLE IF NOT EXISTS friday_system_prompts (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    prompt_key      VARCHAR(100) NOT NULL UNIQUE,
    prompt_template TEXT         NOT NULL,
    version         INTEGER      NOT NULL DEFAULT 1,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    description     VARCHAR(500),
    updated_by      UUID         NOT NULL,
    created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- agent_capacity_config
CREATE INDEX IF NOT EXISTS idx_capacity_org ON agent_capacity_config (organization_id);

-- agent_performance_snapshots
CREATE UNIQUE INDEX IF NOT EXISTS idx_aps_agent_date ON agent_performance_snapshots (agent_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_aps_org_date ON agent_performance_snapshots (organization_id, snapshot_date);

-- agent_location_pings
CREATE INDEX IF NOT EXISTS idx_ping_agent_recorded ON agent_location_pings (agent_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ping_shift ON agent_location_pings (shift_id);

-- agent_shifts
CREATE INDEX IF NOT EXISTS idx_shift_agent ON agent_shifts (agent_id);
CREATE INDEX IF NOT EXISTS idx_shift_status ON agent_shifts (status);
CREATE INDEX IF NOT EXISTS idx_shift_started_at ON agent_shifts (started_at);

-- allocations
CREATE INDEX IF NOT EXISTS idx_allocations_file_upload_id ON allocations (file_upload_id);
CREATE INDEX IF NOT EXISTS idx_allocations_organization_id ON allocations (organization_id);
CREATE INDEX IF NOT EXISTS idx_allocations_loan_number ON allocations (loan_number);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON allocations (status);
CREATE INDEX IF NOT EXISTS idx_allocations_is_deleted ON allocations (is_deleted);

-- assignment_audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_assignment_id ON assignment_audit_logs (assignment_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON assignment_audit_logs (performed_by);

-- assignments
CREATE INDEX IF NOT EXISTS idx_assignment_agent_date ON assignments (agent_id, assignment_date);
CREATE INDEX IF NOT EXISTS idx_assignment_allocation ON assignments (allocation_id);
CREATE INDEX IF NOT EXISTS idx_assignment_status ON assignments (status);

-- bank_statement_rows
CREATE INDEX IF NOT EXISTS idx_bsr_run ON bank_statement_rows (run_id);
CREATE INDEX IF NOT EXISTS idx_bsr_outcome ON bank_statement_rows (outcome);
CREATE INDEX IF NOT EXISTS idx_bsr_utr ON bank_statement_rows (utr);
CREATE INDEX IF NOT EXISTS idx_bsr_txn_ref ON bank_statement_rows (txn_ref);
CREATE INDEX IF NOT EXISTS idx_bsr_value_date ON bank_statement_rows (value_date);

-- borrower_risk_scores
CREATE INDEX IF NOT EXISTS idx_risk_borrower ON borrower_risk_scores (borrower_id);
CREATE INDEX IF NOT EXISTS idx_risk_org ON borrower_risk_scores (organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_segment ON borrower_risk_scores (segment);
CREATE INDEX IF NOT EXISTS idx_risk_scored_at ON borrower_risk_scores (scored_at);

-- borrowers
CREATE INDEX IF NOT EXISTS idx_borrower_org ON borrowers (organization_id);
CREATE INDEX IF NOT EXISTS idx_borrower_ckyc ON borrowers (ckyc_id);

-- collection_audit_logs
CREATE INDEX IF NOT EXISTS idx_col_audit_collection_id ON collection_audit_logs (collection_id);
CREATE INDEX IF NOT EXISTS idx_col_audit_performed_by ON collection_audit_logs (performed_by);

-- collection_documents
CREATE INDEX IF NOT EXISTS idx_doc_collection_id ON collection_documents (collection_id);

-- collections
CREATE INDEX IF NOT EXISTS idx_collection_agent_date ON collections (submitted_by, collection_date);
CREATE INDEX IF NOT EXISTS idx_collection_status ON collections (status);
CREATE INDEX IF NOT EXISTS idx_collection_allocation ON collections (allocation_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_idempotency ON collections (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_receipt ON collections (receipt_number);
CREATE INDEX IF NOT EXISTS idx_collection_org ON collections (organization_id);

-- communication_logs
CREATE INDEX IF NOT EXISTS idx_comm_log_borrower ON communication_logs (borrower_id);
CREATE INDEX IF NOT EXISTS idx_comm_log_allocation ON communication_logs (allocation_id);
CREATE INDEX IF NOT EXISTS idx_comm_log_org ON communication_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_comm_log_channel ON communication_logs (channel);
CREATE INDEX IF NOT EXISTS idx_comm_log_status ON communication_logs (status);
CREATE INDEX IF NOT EXISTS idx_comm_log_scheduled ON communication_logs (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_comm_log_provider ON communication_logs (provider_message_id);

-- consent_artifacts
CREATE INDEX IF NOT EXISTS idx_consent_borrower ON consent_artifacts (borrower_id);
CREATE INDEX IF NOT EXISTS idx_consent_borrower_purpose ON consent_artifacts (borrower_id, purpose, scope);
CREATE INDEX IF NOT EXISTS idx_consent_status ON consent_artifacts (status);

-- daily_visit_list
CREATE INDEX IF NOT EXISTS idx_dvl_agent_date ON daily_visit_list (agent_user_id, dispatch_date);
CREATE INDEX IF NOT EXISTS idx_dvl_org_date ON daily_visit_list (organization_id, dispatch_date);

-- data_erasure_requests
CREATE INDEX IF NOT EXISTS idx_erasure_borrower ON data_erasure_requests (borrower_id);
CREATE INDEX IF NOT EXISTS idx_erasure_status ON data_erasure_requests (status);

-- file_processing_errors
CREATE INDEX IF NOT EXISTS idx_fpe_file_upload_id ON file_processing_errors (file_upload_id);

-- file_uploads
CREATE INDEX IF NOT EXISTS idx_file_uploads_organization_id ON file_uploads (organization_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads (status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_sha256_hash ON file_uploads (sha256_hash);

-- fraud_cases
CREATE INDEX IF NOT EXISTS idx_fraud_org ON fraud_cases (organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_allocation ON fraud_cases (allocation_id);
CREATE INDEX IF NOT EXISTS idx_fraud_status ON fraud_cases (status);
CREATE INDEX IF NOT EXISTS idx_fraud_reported_at ON fraud_cases (reported_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fraud_case_number ON fraud_cases (case_number);

-- friday_chat_messages
CREATE INDEX IF NOT EXISTS idx_msg_session_id ON friday_chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_msg_agent_id ON friday_chat_messages (agent_id);
CREATE INDEX IF NOT EXISTS idx_msg_created_at ON friday_chat_messages (created_at);

-- friday_chat_sessions
CREATE INDEX IF NOT EXISTS idx_session_agent_id ON friday_chat_sessions (agent_id);
CREATE INDEX IF NOT EXISTS idx_session_active ON friday_chat_sessions (agent_id, is_active);

-- grievances
CREATE INDEX IF NOT EXISTS idx_grievance_org ON grievances (organization_id);
CREATE INDEX IF NOT EXISTS idx_grievance_status ON grievances (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_grievance_ticket ON grievances (ticket_number);
CREATE INDEX IF NOT EXISTS idx_grievance_created_at ON grievances (created_at);

-- holiday_calendar
CREATE UNIQUE INDEX IF NOT EXISTS idx_holiday_org_date ON holiday_calendar (organization_id, holiday_date);

-- incident_reports
CREATE INDEX IF NOT EXISTS idx_incident_agent ON incident_reports (agent_id);
CREATE INDEX IF NOT EXISTS idx_incident_triggered ON incident_reports (triggered_at);
CREATE INDEX IF NOT EXISTS idx_incident_resolved ON incident_reports (resolved_at);

-- key_fact_statements
CREATE INDEX IF NOT EXISTS idx_kfs_allocation ON key_fact_statements (allocation_id);
CREATE INDEX IF NOT EXISTS idx_kfs_organization ON key_fact_statements (organization_id);

-- message_templates
CREATE INDEX IF NOT EXISTS idx_msg_template_org ON message_templates (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_template_key_version ON message_templates (template_key, version);
CREATE INDEX IF NOT EXISTS idx_msg_template_status ON message_templates (status);
CREATE INDEX IF NOT EXISTS idx_msg_template_channel ON message_templates (channel);

-- monthly_loan_book_snapshots
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshot_org_month ON monthly_loan_book_snapshots (organization_id, snapshot_month);

-- non_contactables
CREATE INDEX IF NOT EXISTS idx_nc_allocation ON non_contactables (allocation_id);
CREATE INDEX IF NOT EXISTS idx_nc_org_date ON non_contactables (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_nc_agent ON non_contactables (agent_id);

-- npa_records
CREATE INDEX IF NOT EXISTS idx_npa_org_date ON npa_records (organization_id, flagged_date);
CREATE INDEX IF NOT EXISTS idx_npa_allocation ON npa_records (allocation_id);
CREATE INDEX IF NOT EXISTS idx_npa_risk_level ON npa_records (risk_level);

-- payment_intents
CREATE INDEX IF NOT EXISTS idx_pay_intent_org ON payment_intents (organization_id);
CREATE INDEX IF NOT EXISTS idx_pay_intent_allocation ON payment_intents (allocation_id);
CREATE INDEX IF NOT EXISTS idx_pay_intent_status ON payment_intents (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_intent_idem ON payment_intents (idempotency_key);

-- payment_links
CREATE INDEX IF NOT EXISTS idx_pay_link_intent ON payment_links (intent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_link_token ON payment_links (token);
CREATE INDEX IF NOT EXISTS idx_pay_link_expiry ON payment_links (expires_at);

-- payment_splits
CREATE INDEX IF NOT EXISTS idx_pay_split_txn ON payment_splits (txn_id);
CREATE INDEX IF NOT EXISTS idx_pay_split_bucket ON payment_splits (bucket);

-- payment_transactions
CREATE INDEX IF NOT EXISTS idx_pay_txn_intent ON payment_transactions (intent_id);
CREATE INDEX IF NOT EXISTS idx_pay_txn_state ON payment_transactions (state);
CREATE INDEX IF NOT EXISTS idx_pay_txn_provider ON payment_transactions (provider_txn_id);
CREATE INDEX IF NOT EXISTS idx_pay_txn_utr ON payment_transactions (utr);
CREATE INDEX IF NOT EXISTS idx_pay_txn_value_date ON payment_transactions (value_date);

-- ptp_audit_logs
CREATE INDEX IF NOT EXISTS idx_ptp_audit_ptp_id ON ptp_audit_logs (ptp_id);
CREATE INDEX IF NOT EXISTS idx_ptp_audit_allocation_id ON ptp_audit_logs (allocation_id);
CREATE INDEX IF NOT EXISTS idx_ptp_audit_performed_by ON ptp_audit_logs (performed_by);

-- ptp_history
CREATE INDEX IF NOT EXISTS idx_ptp_history_ptp_id ON ptp_history (ptp_id);
CREATE INDEX IF NOT EXISTS idx_ptp_history_allocation_id ON ptp_history (allocation_id);

-- ptp_records
CREATE INDEX IF NOT EXISTS idx_ptp_allocation_id ON ptp_records (allocation_id);
CREATE INDEX IF NOT EXISTS idx_ptp_status ON ptp_records (status);
CREATE INDEX IF NOT EXISTS idx_ptp_promised_date ON ptp_records (promised_date);
CREATE INDEX IF NOT EXISTS idx_ptp_agent_id ON ptp_records (agent_id);

-- reconciliation_runs
CREATE INDEX IF NOT EXISTS idx_recon_run_org ON reconciliation_runs (organization_id);
CREATE INDEX IF NOT EXISTS idx_recon_run_as_of ON reconciliation_runs (as_of_date);
CREATE INDEX IF NOT EXISTS idx_recon_run_source ON reconciliation_runs (source);

-- report_jobs
CREATE INDEX IF NOT EXISTS idx_rj_org_type ON report_jobs (organization_id, report_type);
CREATE INDEX IF NOT EXISTS idx_rj_status ON report_jobs (status);
CREATE INDEX IF NOT EXISTS idx_rj_requested_by ON report_jobs (requested_by);
CREATE INDEX IF NOT EXISTS idx_rj_scheduled ON report_jobs (is_scheduled);

-- restructure_proposals
CREATE INDEX IF NOT EXISTS idx_restructure_allocation ON restructure_proposals (allocation_id);
CREATE INDEX IF NOT EXISTS idx_restructure_org ON restructure_proposals (organization_id);
CREATE INDEX IF NOT EXISTS idx_restructure_status ON restructure_proposals (status);

-- route_plans
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_plans_agent_date ON route_plans (agent_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_route_plans_org ON route_plans (organization_id);

-- settlement_audit_logs
CREATE INDEX IF NOT EXISTS idx_settlement_audit_offer_id ON settlement_audit_logs (settlement_offer_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_allocation ON settlement_audit_logs (allocation_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_performed_by ON settlement_audit_logs (performed_by);

-- settlement_offers
CREATE INDEX IF NOT EXISTS idx_settlement_allocation ON settlement_offers (allocation_id);
CREATE INDEX IF NOT EXISTS idx_settlement_org ON settlement_offers (organization_id);
CREATE INDEX IF NOT EXISTS idx_settlement_status ON settlement_offers (status);
CREATE INDEX IF NOT EXISTS idx_settlement_validity ON settlement_offers (validity_until);

-- user_action_audit_logs
CREATE INDEX IF NOT EXISTS idx_user_action_audit_user_id ON user_action_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_action_audit_created_at ON user_action_audit_logs (created_at);

-- user_permissions
CREATE INDEX IF NOT EXISTS idx_up_user_id ON user_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_up_permission_id ON user_permissions (permission_id);

-- visit_images
CREATE INDEX IF NOT EXISTS idx_visit_images_visit_id ON visit_images (visit_log_id);

-- visit_logs
CREATE INDEX IF NOT EXISTS idx_visit_allocation_id ON visit_logs (allocation_id);
CREATE INDEX IF NOT EXISTS idx_visit_agent_id ON visit_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_visit_date ON visit_logs (visit_date);
CREATE INDEX IF NOT EXISTS idx_visit_status ON visit_logs (visit_status);
CREATE INDEX IF NOT EXISTS idx_visit_contactability ON visit_logs (contactability);
CREATE INDEX IF NOT EXISTS idx_visit_disp ON visit_logs (disp);
CREATE INDEX IF NOT EXISTS idx_visit_approval_status ON visit_logs (approval_status);
