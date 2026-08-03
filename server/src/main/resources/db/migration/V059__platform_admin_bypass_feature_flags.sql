-- =============================================================================
-- V059__platform_admin_bypass_feature_flags.sql  --  Let platform admins actually
-- manage another org's feature flags/subscription when they explicitly ask for it.
-- =============================================================================
-- Same gap as V050 (file_uploads), found the same way: FeatureFlagAdminController
-- lets a PLATFORM_ADMIN target any organization's feature_flags via an
-- organizationId param, and its own requireScopeAccess() check already allows
-- it -- but V058's fail-closed policies (organization_id = current_org_id(),
-- only a NULL-row escape for feature_flags' deliberate global rows) block the
-- write regardless, since current_org_id() is always the platform admin's own
-- org, never the tenant's. Confirmed live: PUT /admin/feature-flags for a
-- specific org, authenticated as PLATFORM_ADMIN, threw an unhandled RLS
-- violation surfaced as a bare 500.
--
-- Same fix as V050: a session-GUC-gated policy branch that only
-- RlsAwareDataSource can set, and only after PlatformAdminAccessGuard has
-- recorded who/whose/why. FeatureFlagAdminController is updated alongside this
-- migration to actually call that guard for cross-org requests instead of
-- relying on the RLS policy to reject them.
-- =============================================================================

DROP POLICY rls_feature_flags_isolation ON feature_flags;
CREATE POLICY rls_feature_flags_isolation ON feature_flags
    USING (organization_id = current_org_id()
        OR organization_id IS NULL
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_org_subscriptions_isolation ON org_subscriptions;
CREATE POLICY rls_org_subscriptions_isolation ON org_subscriptions
    USING (org_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
