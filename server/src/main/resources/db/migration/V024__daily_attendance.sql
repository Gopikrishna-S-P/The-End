-- V024__daily_attendance.sql
-- Records the first login of each day per user, with GPS coordinates.

CREATE TABLE daily_attendance (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id),
    org_id          UUID        NOT NULL REFERENCES organizations(id),
    attendance_date DATE        NOT NULL,
    checked_in_at   TIMESTAMPTZ NOT NULL,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    accuracy        DOUBLE PRECISION,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT uq_attendance_user_date UNIQUE (user_id, attendance_date)
);

CREATE INDEX idx_attendance_org_date ON daily_attendance (org_id, attendance_date DESC);
CREATE INDEX idx_attendance_user     ON daily_attendance (user_id);
