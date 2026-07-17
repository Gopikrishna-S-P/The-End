-- ── org_subscriptions.plan_amount ───────────────────────────────────────────
-- MRR/ARR in PlatformAnalyticsService read a hardcoded price-per-plan map that
-- silently drifted from real Stripe billing on any price change (SYSTEM-PLAN
-- SP30). Store the actual monthly amount (INR) synced from Stripe's Price
-- object per subscription instead.
ALTER TABLE org_subscriptions ADD COLUMN IF NOT EXISTS plan_amount NUMERIC(12,2);
