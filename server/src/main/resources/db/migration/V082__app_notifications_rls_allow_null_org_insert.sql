-- =============================================================================
-- V082__app_notifications_rls_allow_null_org_insert.sql
-- =============================================================================
-- V040 gave app_notifications a fail-closed policy with only a USING clause:
--   CREATE POLICY rls_app_notifications_isolation ON app_notifications
--       USING (organization_id = current_org_id());
--
-- With no explicit WITH CHECK, Postgres reuses USING for INSERTs too. That's
-- fine for org-scoped rows, but app_notifications.organization_id is
-- deliberately nullable for platform-level notifications (recipient is a
-- PLATFORM_ADMIN, no tenant org involved) -- and NULL = NULL evaluates to
-- NULL, not true, in SQL. So inserting a platform-level notification while
-- the connection's app.current_org_id is also unset (true during login --
-- there's no authenticated org context yet) was rejected outright, taking
-- the whole request down with it. Confirmed live: logging in from a new
-- device trips the suspicious-login notification, which tried to insert a
-- NULL-org row and threw "new row violates row-level security policy".
--
-- Fix: an explicit WITH CHECK that allows NULL-org inserts unconditionally.
-- This doesn't weaken tenant isolation -- which org's rows a session can
-- INSERT with a real organization_id is unchanged -- it only permits the
-- org-agnostic case the column was already designed to support. Business
-- authorization for *when* a platform-level notification gets created still
-- happens in application code (NotificationServiceImpl.createForPlatformRole,
-- called only from trusted service methods), same as every other insert here.
-- =============================================================================

DROP POLICY rls_app_notifications_isolation ON app_notifications;
CREATE POLICY rls_app_notifications_isolation ON app_notifications
    USING (organization_id = current_org_id() OR organization_id IS NULL)
    WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
