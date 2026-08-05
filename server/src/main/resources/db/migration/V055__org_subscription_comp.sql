-- =============================================================================
-- V055__org_subscription_comp.sql  --  Admin-granted plan access ("comp").
-- =============================================================================
-- Platform admins need to give an org a plan it has not paid for: a pilot, a
-- support gesture, a partner, an enterprise trial. Until now the only lever was
-- PUT /platform/subscriptions/{orgId}/plan, which writes org_subscriptions.plan
-- directly. That is the wrong field to write, for two reasons:
--
--   1. Stripe owns it. StripeWebhookService.handleSubscriptionUpserted sets
--      plan, status, plan_amount and current_period_end from the Stripe
--      subscription on every customer.subscription.updated event -- which fires
--      on renewal, payment, card update. A manual grant on a Stripe-billed org
--      is therefore reverted at an unpredictable later moment, silently.
--
--   2. It destroys the distinction between "paying us for Enterprise" and
--      "given Enterprise for free". Once plan is overwritten there is no record
--      that the grant ever happened, who made it, or why.
--
-- These columns are a parallel, admin-owned channel that the webhook never
-- writes. Entitlement resolves to the comp when one is live, otherwise to the
-- Stripe-derived plan; see OrgSubscription.activeComp() and
-- FeatureFlagService.provisionFlagsFor().
--
-- Revenue is deliberately unaffected: collected figures come from settled
-- invoices in platform_invoices, so a comped org correctly contributes zero
-- rather than inflating MRR with money nobody paid.
-- =============================================================================

ALTER TABLE org_subscriptions
    -- NULL = no comp. Non-null overrides the Stripe plan for entitlement only.
    ADD COLUMN IF NOT EXISTS comped_plan   VARCHAR(20),
    -- NULL with a comped_plan set = open-ended grant. Past timestamps expire on
    -- read rather than by a sweep job, so an expired comp needs no cleanup to
    -- stop taking effect.
    ADD COLUMN IF NOT EXISTS comped_until  TIMESTAMPTZ,
    -- Why it was granted. Required by the API so comps stay explainable to the
    -- next admin who finds one.
    ADD COLUMN IF NOT EXISTS comped_reason TEXT,
    ADD COLUMN IF NOT EXISTS comped_by     UUID,
    ADD COLUMN IF NOT EXISTS comped_at     TIMESTAMPTZ;

-- Finding live comps ("who are we carrying?") is the one query this supports.
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_comped
    ON org_subscriptions (comped_plan)
    WHERE comped_plan IS NOT NULL;
