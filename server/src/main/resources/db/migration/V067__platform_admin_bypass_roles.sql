-- =============================================================================
-- roles' RLS policy (V058) already has "OR organization_id IS NULL" so system
-- roles are visible to everyone -- but that's a different escape than a
-- platform-admin bypass: it does nothing for an org-specific role
-- (organization_id = some real org), which stays invisible to a platform
-- admin (current_org_id() is NULL, never equal to a real org id) regardless.
-- RoleServiceImpl already has correct app-layer logic for this
-- (listRolesForCaller's isPlatformAdmin branch calls findAll() expecting
-- literally everything; assertCanAccessRole/assertCanModifyRole both
-- short-circuit for a platform admin) -- but roleRepository.findById(id) for
-- an org-specific role, or findAll() including org-specific rows, both hit
-- RLS first and silently filtered them out before that logic could run.
-- =============================================================================

DROP POLICY rls_roles_isolation ON roles;
CREATE POLICY rls_roles_isolation ON roles
    USING (organization_id = current_org_id()
        OR organization_id IS NULL
        OR current_setting('app.is_platform_admin', true) = 'true');
