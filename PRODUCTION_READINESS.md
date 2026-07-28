# RecoverPro — Production Readiness Task List

Generated 2026-07-29 from a deep audit of `server/`, `web/`, `mobile/` (security, error handling,
deployment automation, frontend-backend wiring, dead code, scalability). Target: production launch
next week.

Scope note: this is a mature codebase (RLS-backed multi-tenancy, Argon2id auth, thorough file-upload
validation, a real refresh-token flow, a working Redis-backed live-tracking pipeline). The gaps below
are real but mostly *finishing* work, not foundational rework — nothing found requires re-architecting.

---

## TL;DR — the 6 things most likely to actually break launch

1. **No CI/CD and no server/mobile Dockerfile exist at all.** There is currently no automated path from
   a commit to a running production server or a distributable mobile build. This is the single biggest
   gap and blocks everything else in "automated deployment."
2. **Mobile: offline-queued visit logs can never sync — a silent data-loss bug, not just a gap.** The
   app tells field officers their visit is "saved, will sync automatically," but the backend rejects
   that sync payload every time. Queued visits are lost forever, silently. This is live in the codebase
   today, independent of any deployment work.
3. **Web: the production CSP will block the Live Track and SOS Live Monitor WebSockets.** `index.html`
   only allow-lists `ws://localhost:*`/`wss://localhost:*`. This directly breaks the live location
   tracking + SOS audio feature just verified end-to-end — it works in dev only.
4. **Server: the documented S3 config does nothing.** `application.properties` documents `app.aws.*`
   env vars; the code actually reads a different, undocumented set (`aws.s3.enabled`, `aws.region`,
   etc., no defaults). Every deployment that only sets the documented vars silently falls back to
   local disk — which doesn't survive a restart or scale past one instance.
5. **Server: the app cannot start at all without Redis reachable**, even though every other Redis
   touchpoint in the code is written as best-effort/non-fatal. `LiveTrackRedisSubscriber`'s
   `@PostConstruct` eagerly subscribes and throws at boot if Redis is down — Redis is a hard single
   point of failure for startup, not just for cross-pod fan-out as the rest of the design intends.
6. **No crash/error reporting anywhere** — not server-side APM, not web `ErrorBoundary` reporting, not
   mobile Sentry. If any of the above breaks in production, the team finds out from a user complaint,
   not a dashboard.

---

## SERVER (`recoverpro/server`)

### Blocker
- [ ] Create a Dockerfile (multi-stage: Maven build → JRE-21 runtime, non-root user). Nothing runs
      this in a container today.
- [ ] Stand up CI (build + `mvn test` gate on PR, at minimum) before any deploy path exists.
- [ ] Fix the S3 property-name mismatch: rename the code's `@Value` keys to match the documented
      `app.aws.*` properties (or vice versa), and add an explicit `aws.s3.enabled=${AWS_S3_ENABLED:false}`
      line to `application.properties` so the toggle is documented and discoverable.

### High
- [ ] Create `application-prod.properties` (or equivalent env-var matrix) with the *corrected* S3 keys,
      prod logging config, and any other prod-only overrides.
- [ ] Decide on SOS-audio cross-pod fan-out before scaling past 1 replica: `SosAudioWebSocketHandler`
      has no Redis pub/sub (unlike `LiveTrackWebSocketHandler`, whose fan-out is genuinely complete) —
      a supervisor connected to pod B will never hear SOS audio uploaded via pod A.
- [ ] Fix the Redis hard-dependency-at-startup issue (item 5 above): make `LiveTrackRedisSubscriber`'s
      `@PostConstruct` subscribe resilient to Redis being briefly unreachable at boot, matching the
      non-fatal pattern used everywhere else Redis is touched.
- [ ] Decide on ClamAV before accepting production file uploads (loan/borrower documents, visit
      photos): provision a daemon and set `clamav.enabled=true`, or explicitly accept the no-AV-scan
      risk for launch and revisit after.
- [ ] Document/automate the `ops_platform` BYPASSRLS role creation (`V040` migration) in the deploy
      runbook — today it's a manual "run this as superuser" step outside `flyway migrate`.

### Medium
- [ ] Fix Stripe webhook handling so a `dispatch()` failure doesn't still return `200` — today a
      transient error during subscription upsert is logged and silently dropped; Stripe never retries.
- [ ] Batch `AgentFieldServiceImpl.listActiveAgents()`'s per-agent last-ping lookup into one query
      (confirmed N+1 on the live team-status endpoint).
- [ ] Either implement the `/api/v1/cadence/dlr/**` controller (webhook filter + signature verification
      + startup check already exist for it) or delete the orphaned scaffolding.
- [ ] Add pagination/limit to `NotificationController.getUnread()` — the one unbounded list endpoint
      found (everything else paginates correctly).
- [ ] Provision an Ollama (or compatible) instance for Lucien AI as part of the deploy plan, or
      explicitly scope Lucien out of the initial launch.

### Low
- [ ] Add RLS to `allocation_audit_logs` and sibling audit-log tables, or document why app-level-only
      enforcement is the accepted policy for that table family.
- [ ] Add general rate limiting to business write endpoints (collections, PTPs, bulk-assign, uploads) —
      today only auth-adjacent endpoints and the one location-ping cap are throttled.
- [ ] Load-test Hikari pool sizing (20 max / 5 min) against real expected concurrent load before launch.
- [ ] Normalize the ad hoc JSON error bodies in `JwtAuthenticationFilter`/`RefreshTokenRateLimitFilter`
      to match `GlobalExceptionHandler`'s `ErrorResponse` shape (or confirm the frontend already
      tolerates both shapes).

---

## WEB (`recoverpro/web`)

### Blocker
- [ ] Fix the CSP `connect-src` in `index.html` to allow the real production `wss://` origin, not just
      `localhost` — as configured, Live Track and SOS Live Monitor cannot connect in production.

### High
- [ ] Add real security headers at the nginx layer: HSTS, X-Content-Type-Options,
      `frame-ancestors`/X-Frame-Options via HTTP header (the current meta-tag version is a documented
      spec no-op — there is effectively no clickjacking protection today), Referrer-Policy.
- [ ] Compress/resize `src/assets/images/lucien-logo.png` — 1.5MB PNG loaded on every `/app/*` page.
- [ ] Route-split the heaviest eagerly-loaded pages with `React.lazy` (only 4/59 pages are split
      today) — prioritize the Leaflet pages (`LiveTrackPage`, `FieldOpsPage`), xlsx-touching pages,
      and the whole Platform Admin console. Main bundle is currently 1.9MB.
- [ ] Wire the notification center to the existing SSE endpoint (`GET /api/v1/notifications/stream`)
      instead of 25s polling — the backend capability already exists and is unused.
- [ ] Verify `/api/v1/analytics/dashboard`, `/api/v1/dashboard/field-agent/{id}`, and
      `/api/v1/platform/subscriptions/{orgId}/comp` against the live backend route table — not present
      in `feature-inventory.txt`; the dashboard endpoint is the highest-traffic call in the app.
- [ ] Decide on `pages/ReportsAnalyticsPanel.tsx` — a complete, feature-gated component that is never
      mounted anywhere. Wire it into `ReportsPage` or delete it.

### Medium
- [ ] Add nginx cache-control headers (long max-age immutable for hashed `/assets/*`) and gzip/brotli.
- [ ] Add per-route (or per-section) React error boundaries — today one boundary wraps the entire app,
      so any single page's render crash takes down the whole shell.
- [ ] Wire `AppErrorBoundary.componentDidCatch` to real error reporting — it currently swallows errors
      silently with an empty function body.
- [ ] Fix `ProtectedRoute.tsx` to check all of `user.roles`, not just `user.roles[0]` — a multi-role
      user whose access-granting role isn't first gets incorrectly shown "Access Denied."
- [ ] Standardize list pages on the existing shared `EmptyState`/`Skeleton` components (used in only
      5 of ~59 routed pages today).
- [ ] Remove the unused `recharts` dependency (zero imports, zero bundle presence — every chart is
      hand-rolled SVG).
- [ ] Add a `.env.example`/config manifest now, before the first `VITE_*` var is added — Vite bakes
      these in at build time and the current Dockerfile has no runtime-templating step, so this needs
      to be decided deliberately rather than discovered later.
- [ ] Self-host Leaflet marker icons instead of hotlinking `unpkg.com`.

### Low
- [ ] Switch `Dockerfile`'s `npm install` to `npm ci` for reproducible builds.
- [ ] Add an nginx health-check location for container orchestration probes.
- [ ] Upgrade off `xlsx@0.18.5` (known unpatched CVEs upstream; current usage is write-only/export-only
      so urgency is low).
- [ ] Stop the redundant REST polling fallback in `useLiveTrackSocket`/`useFieldOpsTrack` once the
      WebSocket reports connected (currently runs unconditionally in parallel).
- [ ] Schedule removal of the legacy `/admin/*`, `/bank/*`, `/agent/*` redirect routes once confirmed
      no old bookmarks/clients still need them.

---

## MOBILE (`recoverpro/mobile`)

### Blocker
- [ ] **Fix the offline-queue/backend mismatch for visit logs** (item 2 above) — either replay queued
      visits individually against `POST /api/v1/visit-logs` instead of the batch `/agent/sync`
      endpoint, or add real `VISIT_METADATA` handling server-side. Every offline-queued visit
      currently fails to sync, forever, with no user-visible error.
- [ ] Create `eas.json` with dev/preview/production build profiles, and add `ios.bundleIdentifier` +
      `android.package` to `app.json` — both are absent, so `eas build` cannot even start today.

### High
- [ ] Add an `Idempotency-Key` header to `visitLogApi.create()` (the backend already supports and
      expects it — `ptpsApi`/`paymentApi` already do this correctly, visit logs were missed).
- [ ] Wire up crash reporting (e.g. Sentry via `@sentry/react-native`) — nothing captures production
      crashes today, and there are zero `console.*` calls anywhere for even manual log inspection.
- [ ] Add `expo-updates` + a `runtimeVersion`/channel policy so post-launch fixes don't require a full
      store resubmission.
- [ ] Add environment-specific config (`.env.staging`/`.env.production` or `eas.json` env blocks) to
      supply `EXPO_PUBLIC_API_URL` per build profile once `eas.json` exists.

### Medium
- [ ] Scope or remove `android.usesCleartextTraffic: true` in `app.json` — currently a blanket flag
      that lets a misconfigured build silently fall back to plain HTTP.
- [ ] Add `.catch()` handling to the initial load in `notifications.tsx` and `cases.tsx` — a failed
      fetch currently renders as an indistinguishable "empty" state rather than an error.
- [ ] Add a resize step (`expo-image-manipulator`) to `PhotoPicker.tsx` before upload — currently only
      JPEG-quality-compressed (0.6), not dimension-resized, which is slow/expensive on field connections.
- [ ] Add an upper bound/pruning policy to the offline queue so a long offline stretch (or the stuck-
      item bug above) can't grow `AsyncStorage` without limit.
- [ ] Implement deep-link handling for `ServerNotification.deepLink` in `notifications.tsx` (the
      `scheme`/`expo-linking` dependency and server payload both exist; tapping a notification
      currently does nothing beyond marking it read).

### Low
- [ ] Delete unused Expo-starter template assets (`react-logo*`, `expo-logo.png`, `expo-badge*.png`,
      `tutorial-web.png`, `logo-glow.png`, `assets/images/tabIcons/*`) and remove
      `scripts/reset-project.js` + its `package.json` entry (a real footgun — it wipes `src/`).
- [ ] Remove unused dependencies: `@expo/ui`, `expo-glass-effect`, `expo-web-browser`, `expo-symbols`,
      `expo-device`.
- [ ] Wire `resolvePhone()` (`allocationHeuristics.ts`) into a "call borrower" action, or delete it —
      currently exported but never used.
- [ ] Show a user-visible message when camera permission is denied in `PhotoPicker.tsx` (currently a
      silent no-op).
- [ ] Tighten `.gitignore` to exclude plain `.env`, not just `.env*.local`, before any staging/prod env
      file is added.

---

## Cross-cutting / already-known, not re-litigated here
- Borrower consent/nominee/data-erasure screens (`BorrowerController`) have zero mobile UI — a real
  DPDP-compliance gap, previously discussed and deliberately deferred as a scoping decision, not new.
- No `.github/workflows` or any CI config exists anywhere in the repo — every "Blocker: stand up CI"
  item above is really one piece of work (pick a CI provider, wire 3 pipelines) rather than three
  separate efforts.

## Suggested order for a one-week runway
1. **Days 1–2 — fix what's actively broken today** (independent of any deployment work): the mobile
   offline-sync data-loss bug, the web CSP WebSocket block, the server S3 property mismatch, the
   Redis-at-startup hard dependency, the Stripe webhook silent-drop.
2. **Days 2–3 — stand up the deployment path**: server Dockerfile + CI, `eas.json` + mobile bundle
   identifiers, nginx security headers.
3. **Days 3–4 — observability**: crash reporting on all three (server APM/logging, web error
   reporting, mobile Sentry) — you want this live *before* launch, not added after the first incident.
4. **Days 4–5 — remaining High items**, then Medium/Low as time allows; Low items are safe to ship
   after launch as fast-follows.
