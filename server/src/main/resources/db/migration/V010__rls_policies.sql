-- Row-Level Security for multi-tenant data isolation.
-- app.current_org_id is set per-transaction by the application layer before any query.

-- Helper function that reads the session variable (returns NULL when not set)
CREATE OR REPLACE FUNCTION current_org_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_org_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- ── allocations ───────────────────────────────────────────────────────────────
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_allocations_isolation ON allocations
    USING (organization_id = current_org_id() OR current_org_id() IS NULL);

-- ── borrowers ─────────────────────────────────────────────────────────────────
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowers FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_borrowers_isolation ON borrowers
    USING (organization_id = current_org_id() OR current_org_id() IS NULL);

-- ── file_uploads ──────────────────────────────────────────────────────────────
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_file_uploads_isolation ON file_uploads
    USING (organization_id = current_org_id() OR current_org_id() IS NULL);

-- ── collections ───────────────────────────────────────────────────────────────
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_collections_isolation ON collections
    USING (organization_id = current_org_id() OR current_org_id() IS NULL);

-- NOTE: ptp_records has no direct organization_id; org scoping is enforced
-- through the allocation_id FK at the application layer.

-- NOTE: Platform-admin operations that need cross-org access should use a
-- SUPERUSER or BYPASSRLS role, or set app.current_org_id = '' to match NULL guard.
