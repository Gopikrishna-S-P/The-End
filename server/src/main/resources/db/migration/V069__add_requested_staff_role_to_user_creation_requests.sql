-- =============================================================================
-- Found live while testing UserCreationRequestController: review()'s approval
-- path builds the role name to assign as "ROLE_" + requestedRole.name() --
-- correct for ORG_ADMIN ("ROLE_ORG_ADMIN", a real system role), but
-- requestedRole's other value is the coarse category ORG_USER, and
-- "ROLE_ORG_USER" has never been a real role (the actual staff roles are
-- ROLE_FO/ROLE_CALLER/ROLE_TL/ROLE_MANAGER). Every ORG_USER-category approval
-- has always thrown "Role not found: ROLE_ORG_USER" -- confirmed by actually
-- submitting and approving a request through the live UI. Since requestedRole
-- only ever had two values and nothing recorded which specific staff role was
-- wanted, there was no way to fix review() without adding somewhere to store
-- that choice.
-- =============================================================================

ALTER TABLE user_creation_requests ADD COLUMN requested_staff_role VARCHAR(50);
