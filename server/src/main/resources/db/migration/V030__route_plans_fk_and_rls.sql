-- V030__route_plans_fk_and_rls.sql
-- route_plans was created in V001__baseline.sql (copied verbatim from source,
-- which had zero FKs) and never got RLS like the other org tables in
-- V010__rls_policies.sql. Adding both now that RoutePlan is actually written to.

ALTER TABLE route_plans
    ADD CONSTRAINT fk_route_plan_organization FOREIGN KEY (organization_id) REFERENCES organizations (id),
    ADD CONSTRAINT fk_route_plan_agent        FOREIGN KEY (agent_id)        REFERENCES users (id),
    ADD CONSTRAINT fk_route_plan_generated_by  FOREIGN KEY (generated_by_user_id) REFERENCES users (id);

ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_route_plans_isolation ON route_plans
    USING (organization_id = current_org_id() OR current_org_id() IS NULL);
