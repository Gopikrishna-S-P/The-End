-- =============================================================================
-- V080__platform_admin_null_org_id.sql
-- =============================================================================
-- V017__bootstrap_data.sql attached the seeded platform admin
-- (recoverpro.offl@gmail.com) to the RECOVERPRO platform organization's
-- organization_id, but the rest of the codebase treats organization_id = NULL
-- as the definition of "platform admin":
--   - User.java's own doc comment: "null for platform admins -- they belong
--     to no tenant org"
--   - RequiresFeatureAspect skips feature-flag gating only when
--     organizationId == null
--   - SubscriptionController.requireOrgContext() only refuses self-service
--     billing (POST /subscription/free|checkout|portal) when orgId == null;
--     with a real org id it lets a platform admin through those tenant-only
--     endpoints, capable of creating a live OrgSubscription row (and a real
--     Stripe checkout session via StripeService, which has no org-type guard)
--     against the platform org itself.
--   - PlatformSetupServiceImpl.createAdminUser() already leaves organization_id
--     NULL for every ROLE_PLATFORM_ADMIN created after this one.
--
-- This aligns the original bootstrap account with that invariant. Idempotent
-- and safe to re-run: a no-op once organization_id is already NULL.
-- =============================================================================

UPDATE users
SET organization_id = NULL
WHERE email = 'recoverpro.offl@gmail.com'
  AND organization_id IS NOT NULL;
