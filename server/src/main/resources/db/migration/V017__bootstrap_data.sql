-- =============================================================================
-- V017__bootstrap_data.sql  --  Platform bootstrap: org, permissions, roles, admin user
-- =============================================================================
-- All inserts are idempotent (ON CONFLICT / WHERE NOT EXISTS).
-- Temp password for platform admin: Admin@123  (bcrypt, change on first login)
-- =============================================================================

-- ── 1. System unique index on roles so ON CONFLICT works for system roles ─────
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_system_name
    ON roles (name) WHERE organization_id IS NULL;

-- ── 2. Platform organization ──────────────────────────────────────────────────
INSERT INTO organizations (id, name, code, org_type, is_active, lookup_hash_pepper, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Recoverpro',
    'RECOVERPRO',
    'PLATFORM',
    TRUE,
    encode(gen_random_bytes(32), 'hex'),
    NOW(),
    NOW()
)
ON CONFLICT (code) DO NOTHING;

-- ── 3. Permission catalog ─────────────────────────────────────────────────────
INSERT INTO permissions (id, name, resource, action, scope, description, created_at) VALUES
    (gen_random_uuid(), 'ORG_CREATE',              'organization',    'create',           'PLATFORM', 'ORG_CREATE -- create on organization',                   NOW()),
    (gen_random_uuid(), 'ORG_UPDATE',              'organization',    'update',           'PLATFORM', 'ORG_UPDATE -- update on organization',                   NOW()),
    (gen_random_uuid(), 'ORG_DELETE',              'organization',    'delete',           'PLATFORM', 'ORG_DELETE -- delete on organization',                   NOW()),
    (gen_random_uuid(), 'ORG_VIEW',                'organization',    'view',             'PLATFORM', 'ORG_VIEW -- view on organization',                       NOW()),
    (gen_random_uuid(), 'USER_CREATE',             'user',            'create',           'ORG',      'USER_CREATE -- create on user',                          NOW()),
    (gen_random_uuid(), 'USER_UPDATE',             'user',            'update',           'ORG',      'USER_UPDATE -- update on user',                          NOW()),
    (gen_random_uuid(), 'USER_DELETE',             'user',            'delete',           'ORG',      'USER_DELETE -- delete on user',                          NOW()),
    (gen_random_uuid(), 'USER_VIEW',               'user',            'view',             'ORG',      'USER_VIEW -- view on user',                              NOW()),
    (gen_random_uuid(), 'ROLE_ASSIGN',             'role',            'assign',           'ORG',      'ROLE_ASSIGN -- assign on role',                          NOW()),
    (gen_random_uuid(), 'PERMISSION_ASSIGN',       'permission',      'assign',           'ORG',      'PERMISSION_ASSIGN -- assign on permission',              NOW()),
    (gen_random_uuid(), 'FILE_UPLOAD',             'file',            'upload',           'ORG',      'FILE_UPLOAD -- upload on file',                          NOW()),
    (gen_random_uuid(), 'FILE_VIEW',               'file',            'view',             'ORG',      'FILE_VIEW -- view on file',                              NOW()),
    (gen_random_uuid(), 'FILE_DELETE',             'file',            'delete',           'ORG',      'FILE_DELETE -- delete on file',                          NOW()),
    (gen_random_uuid(), 'CELL_UPDATE',             'row',             'update_cell',      'ORG',      'CELL_UPDATE -- update_cell on row',                      NOW()),
    (gen_random_uuid(), 'ROW_CREATE',              'row',             'create',           'ORG',      'ROW_CREATE -- create on row',                            NOW()),
    (gen_random_uuid(), 'ROW_UPDATE',              'row',             'update',           'ORG',      'ROW_UPDATE -- update on row',                            NOW()),
    (gen_random_uuid(), 'ROW_DELETE',              'row',             'delete',           'ORG',      'ROW_DELETE -- delete on row',                            NOW()),
    (gen_random_uuid(), 'COLUMN_CREATE',           'column',          'create',           'ORG',      'COLUMN_CREATE -- create on column',                      NOW()),
    (gen_random_uuid(), 'COLUMN_DELETE',           'column',          'delete',           'ORG',      'COLUMN_DELETE -- delete on column',                      NOW()),
    (gen_random_uuid(), 'CASE_VIEW',               'case',            'view',             'ORG',      'CASE_VIEW -- view on case',                              NOW()),
    (gen_random_uuid(), 'CASE_ASSIGN',             'case',            'assign',           'ORG',      'CASE_ASSIGN -- assign on case',                          NOW()),
    (gen_random_uuid(), 'CASE_REASSIGN',           'case',            'reassign',         'ORG',      'CASE_REASSIGN -- reassign on case',                      NOW()),
    (gen_random_uuid(), 'CASE_VIEW_UNASSIGNED',    'case',            'view_unassigned',  'ORG',      'CASE_VIEW_UNASSIGNED -- view_unassigned on case',        NOW()),
    (gen_random_uuid(), 'DAILY_DISPATCH_CREATE',   'daily_dispatch',  'create',           'ORG',      'DAILY_DISPATCH_CREATE -- create on daily_dispatch',      NOW()),
    (gen_random_uuid(), 'DAILY_DISPATCH_VIEW',     'daily_dispatch',  'view',             'ORG',      'DAILY_DISPATCH_VIEW -- view on daily_dispatch',          NOW()),
    (gen_random_uuid(), 'VISIT_SUBMIT',            'visit',           'submit',           'ORG',      'VISIT_SUBMIT -- submit on visit',                        NOW()),
    (gen_random_uuid(), 'VISIT_VIEW',              'visit',           'view',             'ORG',      'VISIT_VIEW -- view on visit',                            NOW()),
    (gen_random_uuid(), 'COLLECTION_CREATE',       'collection',      'create',           'ORG',      'COLLECTION_CREATE -- create on collection',              NOW()),
    (gen_random_uuid(), 'COLLECTION_VIEW',         'collection',      'view',             'ORG',      'COLLECTION_VIEW -- view on collection',                  NOW()),
    (gen_random_uuid(), 'PTP_CREATE',              'ptp',             'create',           'ORG',      'PTP_CREATE -- create on ptp',                            NOW()),
    (gen_random_uuid(), 'PTP_VIEW',                'ptp',             'view',             'ORG',      'PTP_VIEW -- view on ptp',                                NOW()),
    (gen_random_uuid(), 'NON_CONTACTABLE_CREATE',  'non_contactable', 'create',           'ORG',      'NON_CONTACTABLE_CREATE -- create on non_contactable',   NOW()),
    (gen_random_uuid(), 'AUDIT_VIEW',              'audit',           'view',             'ORG',      'AUDIT_VIEW -- view on audit',                            NOW()),
    (gen_random_uuid(), 'AUDIT_VIEW_PLATFORM',     'audit',           'view_platform',    'PLATFORM', 'AUDIT_VIEW_PLATFORM -- view_platform on audit',          NOW())
ON CONFLICT (name) DO NOTHING;

-- ── 4. System roles ───────────────────────────────────────────────────────────
INSERT INTO roles (id, name, description, organization_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ROLE_PLATFORM_ADMIN', 'Full platform superuser',    NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_PLATFORM_ADMIN' AND organization_id IS NULL);

INSERT INTO roles (id, name, description, organization_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ROLE_ORG_ADMIN',      'Organization administrator', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_ORG_ADMIN'      AND organization_id IS NULL);

INSERT INTO roles (id, name, description, organization_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ROLE_MANAGER',        'Operations manager',         NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_MANAGER'        AND organization_id IS NULL);

INSERT INTO roles (id, name, description, organization_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ROLE_TL',             'Team Lead',                  NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_TL'             AND organization_id IS NULL);

INSERT INTO roles (id, name, description, organization_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ROLE_FO',             'Field Officer',              NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_FO'             AND organization_id IS NULL);

INSERT INTO roles (id, name, description, organization_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ROLE_CALLER',         'Caller',                     NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_CALLER'         AND organization_id IS NULL);

INSERT INTO roles (id, name, description, organization_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ROLE_TRACER',         'Tracer',                     NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_TRACER'         AND organization_id IS NULL);

-- ── 5. Role ↔ Permission assignments ─────────────────────────────────────────

-- ROLE_PLATFORM_ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r, permissions p
WHERE  r.name = 'ROLE_PLATFORM_ADMIN' AND r.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- ROLE_ORG_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p ON p.name IN (
    'USER_CREATE','USER_UPDATE','USER_DELETE','USER_VIEW',
    'ROLE_ASSIGN','PERMISSION_ASSIGN',
    'FILE_UPLOAD','FILE_VIEW','FILE_DELETE',
    'CELL_UPDATE','ROW_CREATE','ROW_UPDATE','ROW_DELETE',
    'COLUMN_CREATE','COLUMN_DELETE',
    'CASE_VIEW','CASE_ASSIGN','CASE_REASSIGN','CASE_VIEW_UNASSIGNED',
    'DAILY_DISPATCH_CREATE','DAILY_DISPATCH_VIEW',
    'VISIT_VIEW','COLLECTION_VIEW','PTP_VIEW','AUDIT_VIEW'
)
WHERE  r.name = 'ROLE_ORG_ADMIN' AND r.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- ROLE_MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p ON p.name IN (
    'FILE_VIEW','CELL_UPDATE','ROW_CREATE','ROW_UPDATE','ROW_DELETE',
    'COLUMN_CREATE','COLUMN_DELETE',
    'CASE_VIEW','CASE_ASSIGN','CASE_REASSIGN','CASE_VIEW_UNASSIGNED',
    'DAILY_DISPATCH_CREATE','DAILY_DISPATCH_VIEW',
    'VISIT_VIEW','COLLECTION_VIEW','PTP_VIEW','USER_VIEW','AUDIT_VIEW'
)
WHERE  r.name = 'ROLE_MANAGER' AND r.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- ROLE_TL
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p ON p.name IN (
    'FILE_VIEW','CELL_UPDATE','ROW_CREATE','ROW_UPDATE','ROW_DELETE',
    'CASE_VIEW','CASE_ASSIGN','CASE_REASSIGN','CASE_VIEW_UNASSIGNED',
    'DAILY_DISPATCH_CREATE','DAILY_DISPATCH_VIEW',
    'VISIT_VIEW','COLLECTION_VIEW','PTP_VIEW','USER_VIEW'
)
WHERE  r.name = 'ROLE_TL' AND r.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- ROLE_FO
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p ON p.name IN (
    'FILE_VIEW','CASE_VIEW','CASE_VIEW_UNASSIGNED',
    'DAILY_DISPATCH_VIEW',
    'VISIT_SUBMIT','VISIT_VIEW',
    'COLLECTION_CREATE','PTP_CREATE','NON_CONTACTABLE_CREATE'
)
WHERE  r.name = 'ROLE_FO' AND r.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- ROLE_CALLER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p ON p.name IN (
    'FILE_VIEW','CASE_VIEW','PTP_CREATE','PTP_VIEW','NON_CONTACTABLE_CREATE'
)
WHERE  r.name = 'ROLE_CALLER' AND r.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- ROLE_TRACER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p ON p.name IN (
    'FILE_VIEW','CASE_VIEW','NON_CONTACTABLE_CREATE'
)
WHERE  r.name = 'ROLE_TRACER' AND r.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- ── 6. Platform admin user ────────────────────────────────────────────────────
-- Email   : recoverpro.offl@gmail.com
-- Name    : RecoverPro Admin
-- Password: Admin@123  (bcrypt cost 12 — change on first login)
INSERT INTO users (
    id, email, password_hash,
    first_name, last_name,
    enabled, account_locked, mfa_enabled,
    failed_login_attempts, lockout_count,
    organization_id,
    password_changed_at, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    'recoverpro.offl@gmail.com',
    crypt('Admin@123', gen_salt('bf', 12)),
    'Recoverpro', 'Admin',
    TRUE, FALSE, FALSE,
    0, 0,
    o.id,
    NOW(), NOW(), NOW()
FROM organizations o
WHERE o.code = 'RECOVERPRO'
ON CONFLICT (email) DO NOTHING;

-- ── 7. Assign ROLE_PLATFORM_ADMIN to platform admin ──────────────────────────
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM   users u, roles r
WHERE  u.email = 'recoverpro.offl@gmail.com'
  AND  r.name  = 'ROLE_PLATFORM_ADMIN'
  AND  r.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- ── 8. Enforce single platform admin — DB-level trigger ──────────────────────
CREATE OR REPLACE FUNCTION fn_enforce_single_platform_admin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (SELECT r.name FROM roles r WHERE r.id = NEW.role_id) = 'ROLE_PLATFORM_ADMIN' THEN
        IF EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN   roles r ON r.id = ur.role_id
            WHERE  r.name = 'ROLE_PLATFORM_ADMIN'
              AND  ur.user_id != NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Only one platform admin is permitted in the system';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_platform_admin
    BEFORE INSERT ON user_roles
    FOR EACH ROW EXECUTE FUNCTION fn_enforce_single_platform_admin();
