-- =============================================================================
-- Table: ptp_name_search_tokens
-- =============================================================================
-- SYSTEM-PLAN 26.1: PtpRecord.borrower_name is AES/GCM-encrypted (random IV per row,
-- EncryptedStringConverter) and PtpSpecification.withFilters() was matching it with a plain
-- SQL LIKE against the ciphertext -- which can never match, and silently returns zero rows
-- instead of erroring. Same root cause and same fix as allocation_name_search_tokens
-- (V081__allocation_name_search_tokens.sql): a blind-index child table of HMAC-SHA256 prefix
-- tokens (LookupHashService.nameSearchTokens), one row per accepted prefix of each word in the
-- name, so a search for "sm" can find "Smith" without ever decrypting the column at query time.
--
-- ptp_records has no organization_id column of its own (org scope is derived via
-- allocation_id -> allocations.organization_id, see V040/V061's rls_ptp_records_isolation
-- policy) -- organization_id is denormalized onto this token table anyway, mirroring
-- allocation_name_search_tokens, so a lookup never needs a double-nested subquery.
CREATE TABLE ptp_name_search_tokens (
    ptp_id          UUID         NOT NULL,
    token_hash      VARCHAR(64)  NOT NULL,
    organization_id UUID         NOT NULL,
    PRIMARY KEY (ptp_id, token_hash)
);

CREATE INDEX idx_ptp_name_search_tokens_hash ON ptp_name_search_tokens (token_hash);
CREATE INDEX idx_ptp_name_search_tokens_org  ON ptp_name_search_tokens (organization_id);

ALTER TABLE ptp_name_search_tokens
    ADD CONSTRAINT fk_ptp_name_search_tokens_ptp
        FOREIGN KEY (ptp_id) REFERENCES ptp_records (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_ptp_name_search_tokens_organization
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;

ALTER TABLE ptp_name_search_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ptp_name_search_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_ptp_name_search_tokens_isolation ON ptp_name_search_tokens
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
