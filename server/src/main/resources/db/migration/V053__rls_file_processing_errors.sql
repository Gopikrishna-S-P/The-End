-- =============================================================================
-- V053__rls_file_processing_errors.sql  --  Close the last un-RLS'd tenant table.
-- =============================================================================
-- file_processing_errors stores raw_value: the verbatim cell that failed to parse
-- out of a tenant's uploaded loan book. In a collections context that is borrower
-- PII -- mobile numbers, loan account numbers, names -- yet the table was never
-- covered by V010's or V040's RLS sweep.
--
-- It survived only because the one endpoint that reads it
-- (FileUploadController GET /{id}/errors) first looks the parent row up in
-- file_uploads, which *is* fail-closed since V040. That is an accident of call
-- order, not a boundary: assertSameTenant() explicitly returns early for
-- PLATFORM_ADMIN, so the moment that lookup changes the raw values are readable
-- across tenants with nothing underneath to stop it.
--
-- The table carries no organization_id of its own, so this uses the subquery
-- form V040 established for exactly this shape (collection_documents,
-- ptp_records, payment_transactions, agent_location_pings): scope through the
-- FK to the org-owning parent rather than denormalising an org column that can
-- drift out of sync with it.
--
-- Deliberately fail-closed with no `OR current_setting('app.is_platform_admin')`
-- branch, unlike V050/V051/V052. Platform admins cannot read another tenant's
-- raw cell values at all -- which is already the effective behaviour today, so
-- this is no regression. Granting break-glass here would mean handing out raw
-- borrower PII and should be its own deliberate, separately-audited change.
--
-- Note the USING expression governs INSERT too (Postgres applies USING as the
-- WITH CHECK expression when WITH CHECK is omitted). The async writer is safe:
-- AsyncConfig.mdcPropagatingDecorator() propagates RlsOrgIdHolder's org id onto
-- the file-proc- threads, so inserts run under the uploading org's context.
-- =============================================================================

ALTER TABLE file_processing_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_processing_errors FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_file_processing_errors_isolation ON file_processing_errors
    USING (file_upload_id IN (SELECT id FROM file_uploads WHERE organization_id = current_org_id()));
