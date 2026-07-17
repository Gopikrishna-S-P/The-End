-- V029__collection_ledger_fk_and_rls.sql
-- V013 created collection_ledger_entries without FKs or RLS, unlike every
-- other org-scoped table (see V010__rls_policies.sql). Adding both here since
-- V013 is already committed and migrations are forward-only.

ALTER TABLE collection_ledger_entries
    ADD CONSTRAINT fk_ledger_organization FOREIGN KEY (organization_id) REFERENCES organizations (id),
    ADD CONSTRAINT fk_ledger_collection   FOREIGN KEY (collection_id)   REFERENCES collections (id),
    ADD CONSTRAINT fk_ledger_allocation   FOREIGN KEY (allocation_id)   REFERENCES allocations (id),
    ADD CONSTRAINT fk_ledger_actor        FOREIGN KEY (actor_id)        REFERENCES users (id);

ALTER TABLE collection_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_ledger_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_collection_ledger_entries_isolation ON collection_ledger_entries
    USING (organization_id = current_org_id() OR current_org_id() IS NULL);
