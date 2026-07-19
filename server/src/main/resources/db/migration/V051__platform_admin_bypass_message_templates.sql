-- =============================================================================
-- V051__platform_admin_bypass_message_templates.sql  --  Same fix as V050
-- (file_uploads), applied to message_templates.
-- =============================================================================
-- BCR-3 (BACKEND-REQUESTS.md) added GET /api/v1/message-templates (list, with
-- an organizationId override for platform admins) and GET /{id}. Without this
-- change, that override would hit the exact same silent-empty-result bug
-- BCR-12 found on file_uploads: current_org_id() is always the platform
-- admin's own (reserved RECOVERPRO) org, never the tenant org they're asking
-- about, so a platform admin picking any real tenant org would always get
-- zero rows back despite the app-layer query being correct.
-- =============================================================================

DROP POLICY rls_message_templates_isolation ON message_templates;
CREATE POLICY rls_message_templates_isolation ON message_templates
    USING (organization_id = current_org_id() OR current_setting('app.is_platform_admin', true) = 'true');
