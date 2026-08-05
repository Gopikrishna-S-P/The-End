-- V057__rls_failclosed_remaining_tables.sql
-- V040 fixed V010's fail-open "OR current_org_id() IS NULL" bug on 4 tables
-- (allocations, borrowers, file_uploads, collections) but 3 more tables added
-- between V010 and V040 -- V029 (collection_ledger_entries), V030
-- (route_plans), V031 (restructure_proposals) -- carried the same fail-open
-- pattern and were never included in V040's fix. Confirmed live via
-- pg_policies before writing this migration: all 3 still had
-- "(organization_id = current_org_id()) OR (current_org_id() IS NULL)" as of
-- schema version 056, meaning any request where app.current_org_id fails to
-- get set (filter bug, missed async/websocket path, future regression) would
-- expose every organization's collection ledger, route plans, and
-- restructure proposals to whichever org happens to be querying.

DROP POLICY rls_collection_ledger_entries_isolation ON collection_ledger_entries;
CREATE POLICY rls_collection_ledger_entries_isolation ON collection_ledger_entries
    USING (organization_id = current_org_id());

DROP POLICY rls_route_plans_isolation ON route_plans;
CREATE POLICY rls_route_plans_isolation ON route_plans
    USING (organization_id = current_org_id());

DROP POLICY rls_restructure_proposals_isolation ON restructure_proposals;
CREATE POLICY rls_restructure_proposals_isolation ON restructure_proposals
    USING (organization_id = current_org_id());
