-- V031__ptp_audit_and_restructure_fk_rls.sql
-- Both tables were created in V001__baseline.sql (copied verbatim from source,
-- zero FKs) and were never wired to application code until now.

-- ptp_audit_logs has no organization_id column (org scoping goes through the
-- allocation_id FK at the application layer, same as ptp_records) -- FKs only,
-- no RLS policy, consistent with ptp_records.
ALTER TABLE ptp_audit_logs
    ADD CONSTRAINT fk_ptp_audit_ptp        FOREIGN KEY (ptp_id)        REFERENCES ptp_records (id),
    ADD CONSTRAINT fk_ptp_audit_allocation FOREIGN KEY (allocation_id) REFERENCES allocations (id),
    ADD CONSTRAINT fk_ptp_audit_performed_by FOREIGN KEY (performed_by) REFERENCES users (id);

-- restructure_proposals has organization_id -- gets full FK + RLS treatment.
ALTER TABLE restructure_proposals
    ADD CONSTRAINT fk_restructure_organization FOREIGN KEY (organization_id) REFERENCES organizations (id),
    ADD CONSTRAINT fk_restructure_allocation    FOREIGN KEY (allocation_id)   REFERENCES allocations (id),
    ADD CONSTRAINT fk_restructure_borrower      FOREIGN KEY (borrower_id)     REFERENCES borrowers (id),
    ADD CONSTRAINT fk_restructure_drafted_by    FOREIGN KEY (drafted_by_user_id)      REFERENCES users (id),
    ADD CONSTRAINT fk_restructure_lender_approval FOREIGN KEY (lender_approval_user_id) REFERENCES users (id),
    ADD CONSTRAINT fk_restructure_rejected_by   FOREIGN KEY (rejected_by_user_id)     REFERENCES users (id),
    ADD CONSTRAINT fk_restructure_new_allocation FOREIGN KEY (new_allocation_id)      REFERENCES allocations (id);

ALTER TABLE restructure_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE restructure_proposals FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_restructure_proposals_isolation ON restructure_proposals
    USING (organization_id = current_org_id() OR current_org_id() IS NULL);
