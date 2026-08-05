-- §8 fix: denormalise loan_number onto activity tables.
--
-- Cases (allocations) are snapshot-scoped — a fresh set of allocation rows is
-- inserted every month under a new file_upload_id, and old rows become history.
-- Activity (visit_logs, collections) must therefore link to the durable business
-- key (organization_id, loan_number), NOT to a single snapshot's allocation row,
-- so history survives monthly re-uploads.
--
-- allocation_id is kept on both tables as an audit pointer ("which snapshot row
-- was active when this was recorded"), but loan_number becomes the join key for
-- current-state and cross-month history queries.

-- ── visit_logs ────────────────────────────────────────────────────────────────
ALTER TABLE visit_logs ADD COLUMN IF NOT EXISTS loan_number VARCHAR(100);

UPDATE visit_logs v
SET loan_number = a.loan_number
FROM allocations a
WHERE v.allocation_id = a.id
  AND v.loan_number IS NULL;

-- Any orphan rows (allocation hard-deleted) get a sentinel so the NOT NULL holds.
UPDATE visit_logs SET loan_number = 'UNKNOWN' WHERE loan_number IS NULL;

ALTER TABLE visit_logs ALTER COLUMN loan_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visit_org_loan_date
    ON visit_logs (organization_id, loan_number, visit_date DESC);

-- ── collections ───────────────────────────────────────────────────────────────
ALTER TABLE collections ADD COLUMN IF NOT EXISTS loan_number VARCHAR(100);

UPDATE collections c
SET loan_number = a.loan_number
FROM allocations a
WHERE c.allocation_id = a.id
  AND c.loan_number IS NULL;

UPDATE collections SET loan_number = 'UNKNOWN' WHERE loan_number IS NULL;

ALTER TABLE collections ALTER COLUMN loan_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collection_org_loan_date
    ON collections (organization_id, loan_number, collection_date DESC);

-- ── allocations: support the active-dataset + carry-over lookups ───────────────
-- Resolver picks the latest non-deleted COMPLETED/PARTIALLY_COMPLETED upload per
-- org; carry-over matching joins activity → current case on (org, loan_number).
CREATE INDEX IF NOT EXISTS idx_alloc_org_loan_file
    ON allocations (organization_id, loan_number, file_upload_id);
