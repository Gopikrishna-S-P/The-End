# SYSTEM 28 — Customer Onboarding: execution record

Executed from `docs/PRODUCTION-TASKLIST.txt`, SYSTEM 28 block, 2026-08-18 session.
Continuation of the same session that completed SYSTEM 35.

## The question you asked: revenue leak or broken orgs?

**Revenue leak, confirmed by code, not broken orgs.** Traced the actual gating path used by
real endpoints: `RequiresFeatureAspect` calls `FeatureFlagService.isEnabled(orgId, flagKey,
true)` — `defaultIfMissing=true`. A subscription-less org has no `FeatureFlag` rows at all
(nothing but a subscription event ever called `provisionFlagsFor`), so `LUCIEN_AI` and
`ADVANCED_REPORTS` both resolved to **allowed**. Separately, `EntitlementServiceImpl`'s
`canCreateUser`/`canCreateAllocations` treat `getLimit()` returning `Optional.empty()` (no limit
row, same root cause) as **unlimited**. So every subscription-less org has had free access to
every paid feature plus unlimited users and unlimited loans, indefinitely, since whenever the
bug was introduced.

**Correction to the tasklist's own SYSTEM 20 framing**: it describes "two parallel entitlement
systems" (`EntitlementService.hasFeature()` vs. `RequiresFeatureAspect`/`PlanFeatureMatrix`) as
independently-disagreeing data sources. In the actual code, both paths call the same
`FeatureFlagService.isEnabled()`/`getLimit()` against the same `FeatureFlag` rows — they're not
separate data sources. The real (smaller, but still real) inconsistency: the two call sites pass
different `defaultIfMissing` values (aspect: `true`; `EntitlementServiceImpl.hasFeature()`:
`false`), so the SAME missing-row case resolves differently depending which entry point is used.
Not touched this session — that convergence is SYSTEM 20's own TASK 20.1/20.3, out of scope here.

## Shared-file conflict found and resolved

TASK 28.1 requires editing `PlatformOrganizationController.create()` — but that file is listed
under `SHARED FILES — DO NOT EDIT CASUALLY (owned by this system)` under **SYSTEM 18**, not 28,
and the tasklist's global rule forbids editing an owned file from outside its owning block. This
is almost certainly *why* SYSTEM 18 is SYSTEM 28's stated prerequisite: SYSTEM 18's own TASK 18.1
(remove the client-supplied admin password, a real P0) touches the exact same method. Confirmed
with the user, who chose: do SYSTEM 18 TASK 18.1 first, then layer TASK 28.1 on top in the same
session. SYSTEM 18's other tasks (18.2 org lifecycle, 18.3 invite lifecycle, 18.4 GDPR deletion)
were **not** done — only 18.1, the piece blocking 28.1.

## SYSTEM 18 TASK 18.1 — Remove client-supplied initial password [DONE]

- `CreateOrganizationRequest` no longer has an `adminPassword` field at all (structural
  guarantee, not just "the endpoint ignores it").
- `PlatformOrganizationController.create()` now hashes `UUID.randomUUID() + UUID.randomUUID()`
  as the admin's throwaway initial credential — the exact pattern `UserServiceImpl.createUser()`
  already used for ordinary user invites (found and reused per TASK 18.1.d's own instruction,
  rather than inventing a second mechanism). The real welcome-OTP flow (`sendWelcomeOtp`) was
  already wired and unchanged.
- Frontend: removed the password/confirm-password fields from the platform-admin "New
  organization" form (`web/src/pages/PlatformSetupOrgModals.tsx`,
  `web/src/api/platformApi.ts`) — leaving them would have shown a working-looking password field
  that silently did nothing.
- Tests: `PlatformOrganizationControllerTest` — new coverage asserting the hashed input is
  genuinely random and non-repeating across two org creations.

## SYSTEM 28 TASK 28.1 — Every new org gets a subscription [DONE]

- `PlatformOrganizationController.create()` now creates an `OrgSubscription` (`TRIAL`,
  `STARTER`, `trialEndsAt = now + app.subscription.trial-days` [default 14]) in the **same**
  `@Transactional` method as the org and admin, then calls
  `featureFlagService.provisionFlagsFor(subscription)` so `FeatureFlag` rows exist immediately —
  closing the fail-open gap for every *new* org from the moment of creation. Audited with
  `SUBSCRIPTION_CREATED`.
- **Backfill** (28.1.d): `POST /api/v1/platform/subscriptions/backfill-missing`
  (`PlatformSubscriptionController`) — finds every tenant org with no `OrgSubscription` row and
  gives it the same defined TRIAL state, provisions flags, audits each. Admin-triggered (matching
  the existing `POST /backfill-invoices` convention in the same controller), **not yet run** —
  someone with platform-admin access needs to call it once to actually close the gap for
  pre-existing subscription-less orgs.
  **Business assumption flagged for sign-off**: backfilling to TRIAL grants existing
  (potentially long-running) subscription-less orgs a fresh trial window, rather than e.g.
  immediately requiring payment. This is the safest failure mode (no abrupt cutoff for an org
  that may have real users mid-shift) but is a revenue decision, not a purely technical one —
  confirm before running the backfill in production, or run it and immediately review which orgs
  it affected via the `SUBSCRIPTION_CREATED` audit trail (`reason` = "Backfill: org had no
  subscription row").
- **Trial-expiry bug found and fixed along the way**: `FeatureFlagService.effectivePlan()`
  mapped `TRIAL` straight to `STARTER` regardless of `trialEndsAt` — nothing anywhere checked
  whether a trial had actually expired. TASK 28.1's own acceptance criterion ("an expired trial
  cannot use paid features") could not be true without this fix, independent of TASK 28.2's
  scheduled job. Fixed: an expired `TRIAL` now resolves the same as `CANCELLED` (`Plan.NONE`).
  **Important limitation**: this makes the NEXT provisioning call for that org correct — it does
  not, by itself, make expiry take effect the instant the clock runs out. Nothing currently
  re-provisions purely because time passed; that's what TASK 28.2 ("Add a scheduled job... that
  transitions the org at expiry") is for, and it was **not built this session**. Until 28.2
  exists, a trial that expires with no other subscription event in between (webhook, admin
  action, plan change) keeps its last-provisioned access indefinitely.
- Tests: `PlatformOrganizationControllerTest` (org creation always yields a TRIAL subscription
  + flags provisioned), `FeatureFlagServiceTest` (new file — expired trial denies plan-gated
  features and zeroes limits; trial-still-active is unaffected).

## Not done this session (deferred, in scope for a later pass)

- **TASK 28.2 — Trial lifecycle** (scheduled expiry-transition job, expiry notifications, admin
  trial-extension endpoint, web trial-status banner). The `effectivePlan()` fix above is a
  prerequisite piece of this task's correctness, already done; the scheduled job, notifications,
  and UI are not.
- **TASK 28.3 — Guided activation** (checklist, time-to-first-import metric).
- **TASK 28.4 — Self-serve signup**: per its own instructions, only needed if self-serve
  signup is a real product goal — not assessed this session (would need a product decision, not
  a technical one).
- **SYSTEM 18 TASKs 18.2–18.4** (org suspend/reactivate/delete lifecycle, invite
  resend/revoke/list, GDPR erasure) — untouched; only 18.1 was in scope, as the piece blocking
  28.1.

## Verification

Full `mvn -f server/pom.xml test` and SYSTEM 28's own specified command
(`-Dtest='*Onboarding*Test,*Organization*Test,*Trial*Test'`) both run at the end of this session
— see the session's final report for the actual pass/fail counts.
