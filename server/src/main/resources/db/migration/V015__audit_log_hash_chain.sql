-- Cryptographic hash chain on user_action_audit_logs.
-- Each row stores SHA-256(previousHash | userId | action | details).
-- Tampering any row invalidates all subsequent hashes for that user.
-- A nightly validator can verify chain integrity by recomputing and comparing.

ALTER TABLE user_action_audit_logs
    ADD COLUMN previous_hash VARCHAR(64),
    ADD COLUMN row_hash      VARCHAR(64);

CREATE INDEX idx_audit_user_latest
    ON user_action_audit_logs (user_id, created_at DESC);
