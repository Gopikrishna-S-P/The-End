-- =============================================================================
-- payment_intents (V040) had no platform-admin bypass branch, unlike file_uploads
-- (V050), message_templates (V051), incident_reports (V052), feature_flags/
-- org_subscriptions (V059). PaymentController.getIntent's controller-level
-- "PLATFORM_ADMIN can see any" check was consequently dead code: RLS filtered
-- the SELECT down to nothing for any org the platform admin's own session
-- wasn't scoped to, so intentRepository.findById() returned empty and
-- orElseThrow fired before the app-layer check ever got a chance to matter.
-- =============================================================================

DROP POLICY rls_payment_intents_isolation ON payment_intents;
CREATE POLICY rls_payment_intents_isolation ON payment_intents
    USING (organization_id = current_org_id() OR current_setting('app.is_platform_admin', true) = 'true');
