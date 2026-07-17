-- V025__visit_sessions.sql
-- Live state machine for a field officer's visit to a borrower.
-- Separate from visit_logs (final audit record).

CREATE TABLE visit_sessions (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    allocation_id        UUID        NOT NULL REFERENCES allocations(id),
    agent_id             UUID        NOT NULL REFERENCES users(id),
    org_id               UUID        NOT NULL REFERENCES organizations(id),
    source               VARCHAR(20) NOT NULL,
    daily_visit_list_id  UUID        REFERENCES daily_visit_list(id),
    assignment_id        UUID        REFERENCES assignments(id),
    status               VARCHAR(20) NOT NULL DEFAULT 'STARTED',
    started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_lat          DOUBLE PRECISION,
    started_lng          DOUBLE PRECISION,
    reached_at           TIMESTAMPTZ,
    reached_lat          DOUBLE PRECISION,
    reached_lng          DOUBLE PRECISION,
    waiting_since        TIMESTAMPTZ,
    closed_at            TIMESTAMPTZ,
    distance_metres      DOUBLE PRECISION NOT NULL DEFAULT 0,
    visit_log_id         UUID,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Enforces one active session per FO at a time at the DB level
CREATE UNIQUE INDEX uq_visit_session_active_agent
    ON visit_sessions (agent_id)
    WHERE status IN ('STARTED', 'REACHED', 'WAITING');

CREATE INDEX idx_visit_session_agent    ON visit_sessions (agent_id, started_at DESC);
CREATE INDEX idx_visit_session_org_date ON visit_sessions (org_id, started_at DESC);
CREATE INDEX idx_visit_session_status   ON visit_sessions (status);
