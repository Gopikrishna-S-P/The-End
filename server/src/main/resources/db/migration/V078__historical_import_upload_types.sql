-- Historical import: let the existing upload pipeline target collections, visits
-- and PTPs in addition to allocations, and let each org define a separate column
-- mapping per entity.
--
-- Deliberately does NOT touch any RLS policy. column_schemas and file_uploads keep
-- the org-isolation policies from V040/V050 exactly as-is; adding a column and
-- swapping a unique constraint does not alter policy evaluation.

-- =============================================================================
-- file_uploads: which entity does this file populate, and is it a backfill?
-- =============================================================================
ALTER TABLE file_uploads
    ADD COLUMN IF NOT EXISTS upload_type VARCHAR(30) NOT NULL DEFAULT 'ALLOCATION';

ALTER TABLE file_uploads
    ADD COLUMN IF NOT EXISTS is_historical_import BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE file_uploads
    DROP CONSTRAINT IF EXISTS chk_file_uploads_upload_type;
ALTER TABLE file_uploads
    ADD CONSTRAINT chk_file_uploads_upload_type
    CHECK (upload_type IN ('ALLOCATION', 'COLLECTION', 'VISIT', 'PTP'));

CREATE INDEX IF NOT EXISTS idx_file_uploads_upload_type
    ON file_uploads (organization_id, upload_type);

-- The V007 dedup index keyed only on (sha256_hash, organization_id), which would
-- now reject the same source file being imported once per entity type - and worse,
-- isDuplicateFile() would hand back the earlier upload of a *different* type.
-- Re-key it to include upload_type so dedup stays per-entity.
DROP INDEX IF EXISTS idx_file_uploads_sha256_org_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_uploads_sha256_org_type_active
    ON file_uploads (sha256_hash, organization_id, upload_type)
    WHERE is_deleted = false;

-- =============================================================================
-- column_schemas: per-entity column definitions
-- =============================================================================
ALTER TABLE column_schemas
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(30) NOT NULL DEFAULT 'ALLOCATION';

ALTER TABLE column_schemas
    DROP CONSTRAINT IF EXISTS chk_column_schemas_entity_type;
ALTER TABLE column_schemas
    ADD CONSTRAINT chk_column_schemas_entity_type
    CHECK (entity_type IN ('ALLOCATION', 'COLLECTION', 'VISIT', 'PTP'));

-- Every pre-existing row describes an allocation column. The DEFAULT above already
-- backfilled them; this is belt-and-braces for any row inserted with an explicit NULL
-- during a concurrent deploy.
UPDATE column_schemas SET entity_type = 'ALLOCATION' WHERE entity_type IS NULL;

-- A column named "amount" must be definable independently for collections and PTPs,
-- so uniqueness widens from (org, name) to (org, entity_type, name).
ALTER TABLE column_schemas
    DROP CONSTRAINT IF EXISTS uq_column_schemas_org_name;
ALTER TABLE column_schemas
    ADD CONSTRAINT uq_column_schemas_org_entity_name UNIQUE (organization_id, entity_type, name);

CREATE INDEX IF NOT EXISTS idx_column_schemas_org_entity_active
    ON column_schemas (organization_id, entity_type)
    WHERE is_active = true;
