-- Partial unique index: prevent two concurrent uploads of the same file
-- to the same org from racing past the application-level existsBy check.
-- Excludes soft-deleted rows so the same file can be re-uploaded after deletion.
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_uploads_sha256_org_active
    ON file_uploads (sha256_hash, organization_id)
    WHERE is_deleted = false;
