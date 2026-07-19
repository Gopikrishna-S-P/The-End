-- =============================================================================
-- V052__platform_admin_bypass_incident_reports.sql  --  Same fix as V050/V051,
-- applied to incident_reports.
-- =============================================================================
-- BCR-6's new SosAudioWebSocketHandler.isAuthorizedForIncident() sets the
-- app.is_platform_admin GUC for PLATFORM_ADMIN callers before looking up an
-- incident, exactly like FileUploadController/MessageTemplateController do --
-- but without this policy branch, a platform admin still couldn't monitor a
-- tenant org's SOS incident (their own current_org_id() is always the
-- reserved RECOVERPRO org, never the org that actually owns the incident).
-- =============================================================================

DROP POLICY rls_incident_reports_isolation ON incident_reports;
CREATE POLICY rls_incident_reports_isolation ON incident_reports
    USING (organization_id = current_org_id() OR current_setting('app.is_platform_admin', true) = 'true');
