-- =============================================================================
-- RiskScoringController explicitly allows PLATFORM_ADMIN on all 3 endpoints,
-- and score()/scoreWithFeatures() already pass callerOrgId=null for a platform
-- admin specifically to skip the app-layer ownership check in
-- RiskScoringServiceImpl.loadAndAssertTenant -- but borrowers went fail-closed
-- in V040 with no platform-admin bypass since, so borrowerRepository.findById
-- already returned nothing for a platform-admin session before that check
-- could ever matter. Same for borrower_risk_scores (also fail-closed since
-- V040, never revisited): getLatest() and the INSERT inside persistScore()
-- were both silently broken for platform admins too.
-- =============================================================================

DROP POLICY rls_borrowers_isolation ON borrowers;
CREATE POLICY rls_borrowers_isolation ON borrowers
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');

DROP POLICY rls_borrower_risk_scores_isolation ON borrower_risk_scores;
CREATE POLICY rls_borrower_risk_scores_isolation ON borrower_risk_scores
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
