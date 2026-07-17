-- code_hash was sized for BCrypt (60 chars) with headroom to 72, but the
-- password encoder migrated to Argon2id (SEC-PLAN S4), whose encoded output
-- exceeds 72 characters. Widen to match refresh_tokens.token_hash (VARCHAR(255),
-- also an Argon2id-encoded value) so MFA recovery codes can actually be persisted.
ALTER TABLE mfa_recovery_codes ALTER COLUMN code_hash TYPE VARCHAR(255);
