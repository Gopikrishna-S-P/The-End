-- =============================================================================
-- V049__seed_role_user.sql  --  Seed the default self-registration role
-- =============================================================================
-- AuthServiceImpl.register() looks up ROLE_USER via roleRepository.findByName("ROLE_USER")
-- and throws ResourceNotFoundException if it's missing. This role was never seeded,
-- so public self-registration (POST /api/v1/auth/register) always failed with a 404.
-- No permissions are attached: self-registered users have no organization_id, so
-- org-scoped permissions wouldn't apply to them anyway.
-- =============================================================================

INSERT INTO roles (id, name, description, organization_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ROLE_USER', 'Default self-registered user', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_USER' AND organization_id IS NULL);
