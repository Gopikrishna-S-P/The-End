-- Add auto-assignment tracking columns to file_uploads.
-- Populated by FileProcessingServiceImpl.autoAssignFromFile() after file processing.

ALTER TABLE file_uploads
    ADD COLUMN IF NOT EXISTS auto_assigned_count  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS auto_assign_failed   INTEGER NOT NULL DEFAULT 0;
