-- =============================================================================
-- Table: allocation_name_search_tokens
-- =============================================================================
-- Blind-index tokens for searching Allocation.borrower_name, which is stored
-- AES/GCM-encrypted with a random IV per row (LocalKeyEnvelopeEncryptor) and
-- can never be pattern-matched directly in SQL. Each row is one HMAC-SHA256
-- (LookupHashService, same key as Borrower's phone/email/ckycId lookup hashes)
-- of a prefix of one word of the borrower's name, so a search for "sm" can
-- find "Smith" without ever decrypting the column at query time.
-- See docs/superpowers/specs/2026-08-06-global-search-design.md.
CREATE TABLE allocation_name_search_tokens (
    allocation_id   UUID         NOT NULL,
    token_hash      VARCHAR(64)  NOT NULL,
    organization_id UUID         NOT NULL,
    PRIMARY KEY (allocation_id, token_hash)
);

CREATE INDEX idx_allocation_name_search_tokens_hash ON allocation_name_search_tokens (token_hash);
CREATE INDEX idx_allocation_name_search_tokens_org  ON allocation_name_search_tokens (organization_id);

ALTER TABLE allocation_name_search_tokens
    ADD CONSTRAINT fk_allocation_name_search_tokens_allocation
        FOREIGN KEY (allocation_id) REFERENCES allocations (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_allocation_name_search_tokens_organization
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;

ALTER TABLE allocation_name_search_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_name_search_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_allocation_name_search_tokens_isolation ON allocation_name_search_tokens
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
