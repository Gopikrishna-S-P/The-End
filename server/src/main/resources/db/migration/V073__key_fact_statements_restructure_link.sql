-- key_fact_statements was designed (V001) with allocation_id/organization_id but no link to a
-- specific RestructureProposal. This feature generates exactly one KFS per approved restructure
-- proposal (see docs/superpowers/specs/2026-08-04-kfs-design.md), so the link -- and its
-- uniqueness -- is the concurrency-safety mechanism that makes generation idempotent.
ALTER TABLE key_fact_statements ADD COLUMN IF NOT EXISTS restructure_proposal_id UUID;

ALTER TABLE key_fact_statements
    ADD CONSTRAINT fk_kfs_restructure_proposal FOREIGN KEY (restructure_proposal_id)
        REFERENCES restructure_proposals (id) ON DELETE RESTRICT;

ALTER TABLE key_fact_statements ALTER COLUMN restructure_proposal_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_kfs_restructure_proposal
    ON key_fact_statements (restructure_proposal_id);
