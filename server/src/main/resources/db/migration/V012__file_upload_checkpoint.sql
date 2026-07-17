-- Checkpoint column for crash-safe resume of large file uploads.
-- If processing fails mid-file, the next retry skips rows already committed.
ALTER TABLE file_uploads
    ADD COLUMN last_checkpoint_row INTEGER NOT NULL DEFAULT 0;
