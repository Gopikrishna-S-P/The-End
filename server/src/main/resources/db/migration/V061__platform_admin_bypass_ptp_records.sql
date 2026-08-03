-- =============================================================================
-- ptp_records (V040) isolates via an allocation_id subquery
-- ("allocation_id IN (SELECT id FROM allocations WHERE organization_id =
-- current_org_id())"), with no platform-admin escape. Unlike allocations
-- itself (V010: "organization_id = current_org_id() OR current_org_id() IS
-- NULL"), a platform admin's current_org_id() is NULL, and NULL never equals
-- anything, so the subquery returns zero rows for them -- PtpController's
-- several "if platform admin, show cross-org data" branches were all dead:
-- ptpService.getPtpById/getAllPtps/getPtpsByAllocationIds came back empty
-- before those branches could matter.
-- =============================================================================

DROP POLICY rls_ptp_records_isolation ON ptp_records;
CREATE POLICY rls_ptp_records_isolation ON ptp_records
    USING (allocation_id IN (SELECT id FROM allocations WHERE organization_id = current_org_id())
        OR current_setting('app.is_platform_admin', true) = 'true');
