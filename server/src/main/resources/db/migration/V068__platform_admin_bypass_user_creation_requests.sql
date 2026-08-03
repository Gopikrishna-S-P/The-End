-- =============================================================================
-- user_creation_requests went fail-closed in V058 with no platform-admin
-- bypass. UserCreationRequestServiceImpl.listPendingForApprover/
-- countPendingForApprover/review all have a correct, deliberate branch for
-- isPlatformAdmin() -- platform admins are the approver for ORG_ADMIN-role
-- requests, one tier above what an ORG_ADMIN can approve (ORG_USER-role
-- requests) -- but the underlying query was always RLS-scoped to the caller's
-- (null) org first, so that branch silently returned nothing. The entire
-- top tier of this two-tier approval chain was unreachable.
-- =============================================================================

DROP POLICY rls_user_creation_requests_isolation ON user_creation_requests;
CREATE POLICY rls_user_creation_requests_isolation ON user_creation_requests
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
