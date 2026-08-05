-- ── app_notifications ────────────────────────────────────────────────────────
CREATE TABLE app_notifications (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id    UUID        NOT NULL,
    organization_id UUID,
    type            VARCHAR(64) NOT NULL,
    priority        VARCHAR(2)  NOT NULL DEFAULT 'P2',
    title           VARCHAR(255) NOT NULL,
    body            VARCHAR(512),
    deep_link       VARCHAR(512),
    payload_json    TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMP,
    snoozed_until   TIMESTAMP,
    dismissed       BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_notif_recipient       ON app_notifications (recipient_id);
CREATE INDEX idx_notif_recipient_read  ON app_notifications (recipient_id, read_at);
CREATE INDEX idx_notif_created         ON app_notifications (created_at DESC);
