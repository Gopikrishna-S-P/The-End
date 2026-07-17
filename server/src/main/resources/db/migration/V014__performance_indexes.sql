-- Composite and GIN indexes for multi-tenant query performance.
-- All high-cardinality list endpoints filter on (org_id, status, created_at).
-- Without composite indexes these do sequential scans at 1M+ rows.

-- ── allocations ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_alloc_org_status_created
    ON allocations (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alloc_org_assigned_created
    ON allocations (organization_id, assigned_to_user_id, created_at DESC);

-- GIN index on dynamic_data JSONB for org-scoped attribute lookups
CREATE INDEX IF NOT EXISTS idx_alloc_dynamic_data_gin
    ON allocations USING GIN (dynamic_data);

-- ── collections ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_collection_org_status_date
    ON collections (organization_id, status, collection_date DESC);

CREATE INDEX IF NOT EXISTS idx_collection_org_agent_date
    ON collections (organization_id, submitted_by, collection_date DESC);

-- ── borrowers ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_borrower_org_created
    ON borrowers (organization_id, created_at DESC);

-- ── file_uploads ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_file_uploads_org_status_created
    ON file_uploads (organization_id, status, created_at DESC);

-- ── user_action_audit_logs ────────────────────────────────────────────────────
-- High-volume table; composite on (user_id, created_at) and (org scope via user join)
CREATE INDEX IF NOT EXISTS idx_audit_user_action_created
    ON user_action_audit_logs (user_id, created_at DESC);

-- ── ptp_records ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ptp_org_status_date
    ON ptp_records (allocation_id, status, promised_date ASC);

-- ── collection_ledger_entries ─────────────────────────────────────────────────
-- Already created in V013; added here for completeness of the performance index set.
-- (No duplicates — V013 uses CREATE INDEX, Flyway won't re-run it)
