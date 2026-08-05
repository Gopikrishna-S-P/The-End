-- =============================================================================
-- reconciliation_runs (V040) got fail-closed RLS ("organization_id =
-- current_org_id()") with no platform-admin escape -- unlike allocations
-- (V010: "... OR current_org_id() IS NULL"), a platform admin's
-- current_org_id() is NULL, and NULL never equals anything, so this policy
-- also acts as an implicit WITH CHECK on INSERT. Two effects:
--   1. ReconciliationController.ingest()'s "hasAnyRole('ORG_ADMIN',
--      'PLATFORM_ADMIN')" @PreAuthorize is a lie for platform admins -- every
--      platform-admin ingest attempt fails the RLS WITH CHECK regardless of
--      which org it targets.
--   2. listRuns/getRun/listRows all have "if platform admin, skip the org
--      check" app-layer branches that were dead: the underlying SELECT
--      already returned zero rows for a platform-admin session before those
--      branches could matter -- the same pattern found in ptp_records (V061)
--      and payment_intents (V060).
-- =============================================================================

DROP POLICY rls_reconciliation_runs_isolation ON reconciliation_runs;
CREATE POLICY rls_reconciliation_runs_isolation ON reconciliation_runs
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
