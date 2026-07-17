-- V033__fk_identity_access.sql
-- FKs for organizations/roles/permissions/users/token tables. V001 baseline
-- had zero FKs anywhere (DATABASE_DESIGN.md issue #1) -- this is the first
-- of 7 bounded-context FK backfill migrations.

ALTER TABLE roles
    ADD CONSTRAINT fk_roles_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE role_permissions
    ADD CONSTRAINT fk_role_permissions_role       FOREIGN KEY (role_id)       REFERENCES roles (id)       ON DELETE CASCADE,
    ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE;

ALTER TABLE users
    ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;

ALTER TABLE user_permissions
    ADD CONSTRAINT fk_user_permissions_user       FOREIGN KEY (user_id)       REFERENCES users (id)       ON DELETE CASCADE,
    ADD CONSTRAINT fk_user_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_user_permissions_granted_by FOREIGN KEY (granted_by)    REFERENCES users (id)       ON DELETE SET NULL;

ALTER TABLE refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE password_reset_tokens
    ADD CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE mfa_recovery_codes
    ADD CONSTRAINT fk_mfa_recovery_codes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

-- FK-column indexes not already present in V001's index section.
CREATE INDEX idx_roles_organization ON roles (organization_id);
CREATE INDEX idx_user_permissions_granted_by ON user_permissions (granted_by);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
CREATE INDEX idx_mfa_recovery_codes_user ON mfa_recovery_codes (user_id);
