-- =============================================================================
-- V050__platform_admin_bypass_file_uploads.sql  --  Let platform admins actually see
-- another org's file_uploads when they explicitly ask for it.
-- =============================================================================
-- V040 went fail-closed on file_uploads (organization_id = current_org_id(), no
-- escape hatch), which is correct for tenant isolation but also silently blocks
-- PLATFORM_ADMIN's own cross-org browsing: current_org_id() is always the
-- platform admin's own org (the reserved RECOVERPRO org), never the tenant org
-- they're trying to inspect via FileUploadController's organizationId override.
--
-- V040 also created an `ops_platform` BYPASSRLS role intended for this, but the
-- app's own DB login role has no ADMIN OPTION on it (confirmed live: GRANT
-- ops_platform TO <app user> fails with "permission denied to grant role" --
-- whatever ran V040 to create ops_platform wasn't the app's own migration
-- role, and CREATE ROLE ... IF NOT EXISTS means a fresh Flyway run won't
-- re-create it as the app user either). Wiring SET ROLE up would require a
-- superuser to grant membership out of band, which we can't assume is
-- available in every environment. So this migration takes the BCR's option
-- (b) instead: a session-GUC-gated policy branch that only the app's own
-- connection-checkout code (RlsAwareDataSource) can set, and only after
-- FileUploadController has already verified the caller is PLATFORM_ADMIN and
-- is deliberately requesting a specific org's data.
--
-- Scoped to file_uploads only, matching what this BCR actually confirmed is
-- broken. The same one-line policy change can be applied to other tables
-- later if/when a platform-admin cross-org need for them shows up too.
-- =============================================================================

DROP POLICY rls_file_uploads_isolation ON file_uploads;
CREATE POLICY rls_file_uploads_isolation ON file_uploads
    USING (organization_id = current_org_id() OR current_setting('app.is_platform_admin', true) = 'true');
