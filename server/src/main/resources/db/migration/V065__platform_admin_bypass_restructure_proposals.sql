-- =============================================================================
-- restructure_proposals had "OR current_org_id() IS NULL" as its platform-admin
-- escape from V031, but V057's fail-closed sweep removed it along with several
-- other tables and never replaced it with the app.is_platform_admin bypass
-- pattern established afterwards (V050+). Same effect as every other table
-- found this pass: RestructureProposalController's assertSameTenantOrg already
-- has an "if platform admin, skip the check" branch, but it was dead --
-- getById/proposeToLender/lenderApprove/lenderReject/borrowerAccept/
-- getByAllocation all fetch through this table first, and that fetch already
-- returned nothing for a platform-admin session.
-- =============================================================================

DROP POLICY rls_restructure_proposals_isolation ON restructure_proposals;
CREATE POLICY rls_restructure_proposals_isolation ON restructure_proposals
    USING (organization_id = current_org_id()
        OR current_setting('app.is_platform_admin', true) = 'true');
