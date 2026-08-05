-- =============================================================================
-- Found while reviewing ReportingController: every one of its 14 endpoints is
-- explicitly PLATFORM_ADMIN-accessible (@PreAuthorize allows it alongside
-- ORG_ADMIN/MANAGER/TL) and every one takes an explicit orgId/agentId to
-- report on. None of it has ever worked for a platform admin -- every table
-- these reports read from went fail-closed in V040 ("organization_id =
-- current_org_id()", no escape) and never got a platform-admin bypass added
-- afterwards, unlike payment_intents/ptp_records/reconciliation_runs earlier
-- this pass. A platform admin's current_org_id() is NULL, so every query
-- silently returns zero rows regardless of which org's report was requested --
-- not an error, just an empty/zero-value report that looks like "no data"
-- rather than "access denied".
--
-- Same fix, same pattern, bundled into one migration because all 10 tables
-- share the identical root cause and were found in the same pass (matching
-- the V057/V058 "remaining tables" precedent for bundling same-cause fixes).
-- These tables are also read by controllers already reviewed earlier this
-- session (AllocationController, CollectionController, NpaController) and
-- controllers not yet reviewed (VisitLogController, VisitSessionController,
-- NonContactableController, DailyDispatchController) -- the bypass is inert
-- until a caller actually goes through PlatformAdminAccessGuard, so this
-- fixes the shared root cause without changing behavior for any endpoint that
-- doesn't call it.
-- =============================================================================

DROP POLICY rls_agent_performance_snapshots_isolation ON agent_performance_snapshots;
CREATE POLICY rls_agent_performance_snapshots_isolation ON agent_performance_snapshots
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_monthly_loan_book_snapshots_isolation ON monthly_loan_book_snapshots;
CREATE POLICY rls_monthly_loan_book_snapshots_isolation ON monthly_loan_book_snapshots
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_report_jobs_isolation ON report_jobs;
CREATE POLICY rls_report_jobs_isolation ON report_jobs
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_collections_isolation ON collections;
CREATE POLICY rls_collections_isolation ON collections
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_npa_records_isolation ON npa_records;
CREATE POLICY rls_npa_records_isolation ON npa_records
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_allocations_isolation ON allocations;
CREATE POLICY rls_allocations_isolation ON allocations
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_visit_sessions_isolation ON visit_sessions;
CREATE POLICY rls_visit_sessions_isolation ON visit_sessions
    USING (org_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_visit_logs_isolation ON visit_logs;
CREATE POLICY rls_visit_logs_isolation ON visit_logs
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_non_contactables_isolation ON non_contactables;
CREATE POLICY rls_non_contactables_isolation ON non_contactables
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_daily_visit_list_isolation ON daily_visit_list;
CREATE POLICY rls_daily_visit_list_isolation ON daily_visit_list
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
