# RecoverPro — Production Readiness Task List

Generated 2026-07-29 from a deep audit of `server/`, `web/`, `mobile/` (security, error handling,
deployment automation, frontend-backend wiring, dead code, scalability). Target: production launch
next week.

**Update, same day:** all Blocker and High items across all three codebases are implemented and
committed (3 commits — see `git log`). Medium/Low items are untouched, deliberately deferred as
fast-follows per the original scope decision. Two things came up during implementation that weren't
in the original audit — see "New findings" at the bottom before treating this as fully closed out.

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
- [x] Create a Dockerfile (multi-stage: Maven build → JRE-21 runtime, non-root user). Nothing runs
      this in a container today. *(`server/Dockerfile` + `server/.dockerignore`)*
- [x] Stand up CI (build + `mvn test` gate on PR, at minimum) before any deploy path exists.
      *(`.github/workflows/server-ci.yml` — real Postgres+Redis service containers)*
- [x] Fix the S3 property-name mismatch: rename the code's `@Value` keys to match the documented
      `app.aws.*` properties (or vice versa), and add an explicit `aws.s3.enabled=${AWS_S3_ENABLED:false}`
      line to `application.properties` so the toggle is documented and discoverable.

### High
- [x] Create `application-prod.properties` (or equivalent env-var matrix) with the *corrected* S3 keys,
      prod logging config, and any other prod-only overrides.
- [x] Decide on SOS-audio cross-pod fan-out before scaling past 1 replica: `SosAudioWebSocketHandler`
      has no Redis pub/sub (unlike `LiveTrackWebSocketHandler`, whose fan-out is genuinely complete) —
      a supervisor connected to pod B will never hear SOS audio uploaded via pod A.
      *(Built `SosAudioRedisSubscriber` + origin-tagged publish/deliver, mirroring the live-track
      pattern — see "New findings" below, that pattern itself turned out to be broken and got fixed
      as part of this.)*
- [x] Fix the Redis hard-dependency-at-startup issue (item 5 above): make `LiveTrackRedisSubscriber`'s
      `@PostConstruct` subscribe resilient to Redis being briefly unreachable at boot, matching the
      non-fatal pattern used everywhere else Redis is touched.
      *(Verified with a real test run: Postgres up / Redis down — previously failed to load the
      Spring context, now starts cleanly and logs a warning instead.)*
- [ ] Decide on ClamAV before accepting production file uploads (loan/borrower documents, visit
      photos): provision a daemon and set `clamav.enabled=true`, or explicitly accept the no-AV-scan
      risk for launch and revisit after. **Still needs a decision — documented as an open question in
      `DEPLOYMENT.md`, not resolved.**
- [x] Document/automate the `ops_platform` BYPASSRLS role creation (`V040` migration) in the deploy
      runbook — today it's a manual "run this as superuser" step outside `flyway migrate`.
      *(`DEPLOYMENT.md` — also flags that no code actually grants/assumes this role today; worth
      confirming the intended mechanism before relying on it.)*

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
- [x] Fix the CSP `connect-src` in `index.html` to allow the real production `wss://` origin, not just
      `localhost` — as configured, Live Track and SOS Live Monitor cannot connect in production.
      *(Switched to `connect-src 'self'`, which covers same-origin ws/wss in every environment.)*

### High
- [x] Add real security headers at the nginx layer: HSTS, X-Content-Type-Options,
      `frame-ancestors`/X-Frame-Options via HTTP header (the current meta-tag version is a documented
      spec no-op — there is effectively no clickjacking protection today), Referrer-Policy.
- [x] Compress/resize `src/assets/images/lucien-logo.png` — 1.5MB PNG loaded on every `/app/*` page.
      *(1024×1024/1.5MB → 128×128/11.7KB.)*
- [x] Route-split the heaviest eagerly-loaded pages with `React.lazy` (only 4/59 pages are split
      today) — prioritize the Leaflet pages (`LiveTrackPage`, `FieldOpsPage`), xlsx-touching pages,
      and the whole Platform Admin console. Main bundle is currently 1.9MB.
      *(1.92MB → 1.49MB main chunk; also split `VisitsPage` for its xlsx dependency.)*
- [x] Wire the notification center to the existing SSE endpoint (`GET /api/v1/notifications/stream`)
      instead of 25s polling — the backend capability already exists and is unused.
      *(SSE primary, 120s reconciliation poll underneath, reverts to 25s poll when disconnected.)*
- [x] Verify `/api/v1/analytics/dashboard`, `/api/v1/dashboard/field-agent/{id}`, and
      `/api/v1/platform/subscriptions/{orgId}/comp` against the live backend route table — not present
      in `feature-inventory.txt`; the dashboard endpoint is the highest-traffic call in the app.
      *(All 3 confirmed correctly implemented server-side — just missing from the doc. Updated
      `feature-inventory.txt` instead of touching working frontend code.)*
- [x] Decide on `pages/ReportsAnalyticsPanel.tsx` — a complete, feature-gated component that is never
      mounted anywhere. Wire it into `ReportsPage` or delete it.
      *(Mounted into `ReportsPage`, above the report-jobs table. Compiles/builds clean; not manually
      browser-verified against a live backend.)*

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
- [x] **Fix the offline-queue/backend mismatch for visit logs** (item 2 above) — either replay queued
      visits individually against `POST /api/v1/visit-logs` instead of the batch `/agent/sync`
      endpoint, or add real `VISIT_METADATA` handling server-side. Every offline-queued visit
      currently fails to sync, forever, with no user-visible error.
      *(Chose the individual-replay path, matching the backend's own documented intent.)*
- [x] Create `eas.json` with dev/preview/production build profiles, and add `ios.bundleIdentifier` +
      `android.package` to `app.json` — both are absent, so `eas build` cannot even start today.
      *(Bundle id `com.recoverpro.field` is a placeholder — confirm before real store submission.)*

### High
- [x] Add an `Idempotency-Key` header to `visitLogApi.create()` (the backend already supports and
      expects it — `ptpsApi`/`paymentApi` already do this correctly, visit logs were missed).
      *(Bundled with the Blocker fix above — same key, minted once, reused across offline retries.)*
- [x] Wire up crash reporting (e.g. Sentry via `@sentry/react-native`) — nothing captures production
      crashes today, and there are zero `console.*` calls anywhere for even manual log inspection.
      *(No-ops until a real `EXPO_PUBLIC_SENTRY_DSN` is supplied — placeholder in `eas.json`.)*
- [x] Add `expo-updates` + a `runtimeVersion`/channel policy so post-launch fixes don't require a full
      store resubmission.
      *(Fingerprint-based policy; `updates.url`/`extra.eas.projectId` still need a real `eas init`
      run against an actual Expo account — can't be faked without one.)*
- [x] Add environment-specific config (`.env.staging`/`.env.production` or `eas.json` env blocks) to
      supply `EXPO_PUBLIC_API_URL` per build profile once `eas.json` exists.
      *(Production points at `https://recoverpro.in`, inferred from the web app's canonical URL —
      double-check this; a stale code comment elsewhere references a `.com` domain instead. Preview/
      staging is left as an explicit placeholder — no staging environment visibly exists yet.)*

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

## New findings from implementing the fixes (not in the original audit)

- **`LiveTrackRedisSubscriber`'s cross-pod delivery was dead code.** The audit's server-agent pass
  called live-track's Redis fan-out "genuinely complete" — it verified both a publish path and a
  subscribe path existed, but not that the subscribe path actually delivered anywhere.
  `addLocalSubscriber`/`removeLocalSubscriber` were never called from anywhere in the codebase, so
  the subscriber's local-session registry was permanently empty and every cross-pod message it
  received was silently dropped. In a single-instance deployment this was invisible (the in-process
  fast path always worked); it would only have surfaced once someone actually scaled past one pod.
  Fixed by rewiring it to deliver through `LiveTrackWebSocketHandler`'s real subscriber registry, with
  per-pod origin-tagging added to prevent double-delivery on the publishing pod (a new failure mode
  the fix itself would otherwise have introduced). The new SOS-audio fan-out was built on the
  corrected pattern, not the original broken one.
- **`ops_platform` role (V040 migration) has no code path that grants or assumes it.** Documented as
  a decision point in `DEPLOYMENT.md` rather than resolved — needs a look at `DATABASE_DESIGN.md §3`
  or whoever wrote it to confirm the intended mechanism before depending on it.
- **Domain uncertainty for mobile's production API URL.** Set to `https://recoverpro.in` (matching
  `web/index.html`'s canonical URL, the strongest evidence found), but `apiConfig.ts`'s own comment
  gives `.com` as an example — worth a 30-second confirmation before the first real production build.
- **Full `mvn test` suite was not run.** Only the one test directly relevant to the Redis-resilience
  fix was run (with real evidence, Postgres up/Redis down, pass confirmed). The first real CI run may
  surface pre-existing failures unrelated to this pass — check before assuming a red build means a
  regression.
- **`ReportsAnalyticsPanel` mount and the SSE notification wiring were verified via `tsc`/`vite build`
  only**, not in a live browser against a running backend — unlike the live-location-tracking work
  earlier this session, which was.

## Suggested order for a one-week runway

**Blocker + High items across all three codebases are done as of this pass** (see checkboxes above).
What's left:
1. **Now** — the two open decisions: ClamAV (server) and confirming the `recoverpro.in` vs `.com`
   domain (mobile) before a real production build.
2. **Before first real deploy** — run `eas init` against a real Expo account (populates
   `updates.url`/`extra.eas.projectId`) and create a real Sentry project (mobile DSN, plus consider
   web/server error reporting, which weren't in this pass's scope — see Medium items above).
3. **Whenever convenient** — the Medium items (Stripe webhook silent-drop, N+1 query, per-route error
   boundaries, etc.) and Low items, both safe to ship as fast-follows after launch.
