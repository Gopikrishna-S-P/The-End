-- =============================================================================
-- V078__invalidate_bootstrap_admin_default_password.sql
-- =============================================================================
-- V017__bootstrap_data.sql shipped the platform admin account
-- (recoverpro.offl@gmail.com, ROLE_PLATFORM_ADMIN -- full cross-tenant access)
-- with a hardcoded password, in plaintext, in that migration's own source and
-- SQL comment: 'Admin@123'. Nothing in the application ever forced a change
-- on first login, so every environment that ran V017 and was never manually
-- rotated afterward has a platform-superadmin login that anyone with read
-- access to this repository (git history included) already knows.
--
-- This does not delete or lock the account -- it only invalidates that one
-- specific password. gen_random_uuid() is generated inside Postgres and never
-- logged, returned, or stored anywhere in plaintext, so the resulting bcrypt
-- hash is unrecoverable by design. Access is restored the same way any user
-- recovers a forgotten password: POST /api/v1/auth/forgot-password.
--
-- The WHERE clause only matches rows whose password still verifies against
-- the shipped default, so an environment where someone already rotated this
-- password by hand is left untouched.
-- =============================================================================

UPDATE users
SET password_hash = crypt(gen_random_uuid()::text, gen_salt('bf', 12))
WHERE email = 'recoverpro.offl@gmail.com'
  AND password_hash = crypt('Admin@123', password_hash);
