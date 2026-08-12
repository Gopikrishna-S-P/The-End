# RecoverPro Mobile — Design Prompt Book

Generated: 2026-08-10
Scope: full 1:1 functional port of the web app (`recoverpro/web`, 59 routes / 7 roles) into the
Expo/React Native mobile app (`recoverpro/mobile`), redesigned as mobile-friendly SaaS UI/UX, at the
same security and robustness bar as the web app. Today the mobile app covers only the FO
(Field Officer) role's daily workflow — this book is the reference for expanding it to every role
and page while keeping the codebase coherent.

**How this book is used:** Part 1 is the standard every new/upgraded screen must follow — read it
once, refer back to it constantly. Part 2 is a catalog of every unit of work (8 foundation items +
59 pages), each with its own self-contained spec and a `[ ] Done` checkbox. Work happens **one
catalog item at a time**, in order, using the driver prompt in `MOBILE-BUILD-PROMPT.md`. Foundation
items (0.x) must land before any page that depends on them — each page entry names its foundation
dependencies.

---

## Part 1 — Design System & Standards

### 1.1 Design tokens

The web app's real design system lives in `web/src/styles/ds/*.css` (`ds.tokens.css` is the source of
truth — `tailwind.config.js` is nearly unused). Mobile's `mobile/src/theme/tokens.ts` already ports
most of this — **treat token drift as a bug to fix on sight**, not a new-page task: several existing
screens hardcode hex values (`'#0AA550'`, `'#065F46'`, `'#5F6368'`) instead of importing tokens. Every
catalog item below includes "no hardcoded colors — import from `theme/tokens.ts`" implicitly.

| Category | Token | Value | Notes |
|---|---|---|---|
| Brand | `brand` | `#0AA550` (light) / `#22C55E` (dark) | Primary actions, active states |
| Brand subtle | `brandSubtle` | `#E7F4EC` | Selected row/nav background |
| Surfaces | `bgCanvas` / `bgSurface` / `bgSubtle` | `#F6F7F9` / `#FFFFFF` / `#F2F4F7` | Screen bg / cards / disabled fill |
| Text | `textPrimary/Secondary/Tertiary/Placeholder` | `#101828`/`#475467`/`#667085`/`#98A2B3` | |
| Borders | `border` / `borderStrong` / `borderSubtle` | `#EBEDF1`/`#D6DAE1`/`#F2F4F7` | Hairlines; elevation carries structure, not borders |
| Semantic | success/warning/danger/info | `#067647`/`#B54708`/`#B42318`/`#175CD3` + subtle-bg/border variants each | Full triad (bg+border+text) per status, matches `.ds-pill` |
| Danger solid | `dangerSolid` | `#D92D20` | Destructive button fill |
| Focus | `focusRing` | `#2563EB` | Distinct from brand |
| Typography | `fontSans` | System font stack (Inter unavailable as a system font on mobile — bundle Inter via `expo-font`, fallback to system) | |
| Type scale | 2xs 10 / xs 11 / sm 12 / body 13 / md 14 / lg 16 / xl 20 / 2xl 24 / 3xl 30 | Body default 13px on web; **bump mobile body to 14–15px minimum** for touch-target legibility, scale the rest proportionally — do not port the 13px web body size verbatim |
| Spacing | `s1`…`s10` | 2/4/6/8/12/16/20/24/32/48 | 8px grid |
| Radius | xs/sm/md/lg/full | 6/9/14/20/999 | xs=badges, sm=buttons/inputs, md=cards, lg=modals/sheets, full=avatars |
| Shadow | sm/md/lg | Soft, layered (use RN `elevation` on Android, `shadow*` on iOS) | Cards float — do not flatten to hairline borders only |
| Motion | fast/base/slow | 140/200/280ms | Use `react-native-reanimated` for consistency, not raw `Animated` |
| Dark mode | light/dark palettes | Both already exist in `theme/tokens.ts` | Follow system `useColorScheme()`, already wired |

### 1.2 Navigation model

Web has two completely separate consoles — `/app/*` (org workspace, 6 roles) and `/platform/*`
(Platform Admin only) — that never overlap, plus a capped, role-gated sidebar nav (web deliberately
shows only 4–6 "daily driver" links per role and expects drill-in from there, not one giant menu).
Mobile must mirror both properties: **two top-level modes**, and **a capped tab bar backed by a "More"
hub**, not a 20-item tab bar.

**Mode selection (0.1 in the catalog):** immediately after login, route by the user's role into one of
two root navigators:
- **Org Workspace** (`(org)/`) — ORG_ADMIN, MANAGER, TL, FO, CALLER, TRACER.
- **Platform Console** (`(platform)/`) — PLATFORM_ADMIN.

A user has exactly one primary role (`user.roles[0]`), so this is a one-time branch at the navigator
root, not a per-screen check. Do not merge Platform Console pages into the Org Workspace tab bar.

**Org Workspace tab bar** (role-aware, max 5 tabs): Home/Dashboard, My Cases (or Today for
field roles), Collections/PTPs hub, Notifications, More. Leads (ORG_ADMIN/MANAGER/TL) swap "My
Cases" for a lead-relevant tab (e.g. Dispatch or Loans) per their web nav config — exact per-role tab
contents are decided when building item 0.1, following web's `navConfig.ts` role→link mapping as the
source of truth.

**More hub** (`(org)/more/index.tsx`): a grouped, searchable list screen (sections: Cases & Loans,
Collections & Payments, Field Operations, Reports & Compliance, Team & Settings) linking to every
page not on the tab bar — this is where the long tail of the 59 pages lives. Each catalog entry below
states whether it's a **Tab** or a **More-hub item**.

**Platform Console tab bar** (5 items, matches web's 5 platform routes exactly): Overview, Setup,
Billing, Feature Flags, Lucien Admin.

**Detail/drawer → stack screen:** web's right-side multi-tab drawers (e.g. Borrower Detail: Profile/
Consents/Nominee/Erasure/Risk/Loans) become a full stack-push screen with a `SegmentedTabs` control
at the top (new small component, §1.3) instead of a side panel — there's no room for a persistent
side panel on a phone.

**Create/edit → modal screen:** web's centered modals become Expo Router `presentation: 'modal'`
screens for single-step forms; web's step wizards (MFA setup) become `presentation: 'fullScreenModal'`
with a progress-dot header.

### 1.3 Component library mapping

Mobile already has a small library at `mobile/src/components/ui/` (Text, Screen, Button, Card, Badge,
TextField, SelectField, DateField, Checkbox, EmptyState, LoadingView, Divider, Avatar, StatCard) —
**extend this library, don't fork a new one.** Recent screens have drifted into ad-hoc inline styles;
every catalog item should use these components, extending them when a needed variant is missing.

| Web pattern | Mobile component | Action needed |
|---|---|---|
| `.ds-btn` (primary/secondary/ghost/danger × sm/lg × loading) | `Button` | Extend variant/size props if missing any combination |
| `.ds-pill` status badges (success/warning/danger/info/active/inactive/pending/open/closed/kept/broken) | `Badge` | Extend tone map to cover all web status tones used by the page being built |
| `.ds-card` (+ hoverable) | `Card` | Add `pressable` variant (press-in scale/opacity, not hover) |
| `.ds-table` | *(none — see below)* | New: row-card list via `FlatList`; see §1.7 |
| `.ds-form`/`.ds-field`/`.ds-input`/`.ds-select`/`.ds-textarea` | `TextField`/`SelectField`/`DateField`/`Checkbox` | Add: `RadioGroup`, `ChipMultiSelect`, `TextArea` (new, as needed per page) |
| `.ds-modal` | Router modal screen | No JS modal wrapper needed — use route-level `presentation: 'modal'` |
| `.ds-drawer` (+ internal `.ds-tabs`) | Stack screen + `SegmentedTabs` | New: `SegmentedTabs` component (underline-active-tab, matches `.ds-tabs` visually) |
| Toasts (`.ds-toast` + `NotificationToasts.tsx`) | *(none yet)* | New: global `ToastProvider` + `useToast()`, bottom-anchored above tab bar |
| `EmptyState.tsx` | `EmptyState` | Already exists — keep using |
| Skeletons (`ds.skeleton.css`, bespoke per-page) | `LoadingView` | Add per-screen skeleton components matching real layout (mirror web's `DashboardSkeleton` approach) instead of one generic spinner |
| Pagination (`Pagination.tsx`, "Page X of Y") | *(none yet)* | New: `usePaginatedList` hook — infinite scroll (`FlatList onEndReached`) + pull-to-refresh, not numbered pages |
| Command palette (⌘K) | — | **Drop** — no mobile equivalent; use tab-header search bars per list screen instead |
| Breadcrumbs | — | **Drop** — React Navigation's header back button + title is sufficient |

### 1.4 Auth & security parity

Mobile's core token handling already matches web's pattern and should **not** change: access token
in-memory only (`src/api/tokenStore.ts`), refresh token in `expo-secure-store`, single-flight refresh
with replay-once-then-logout-on-failure. Keep this exactly as-is.

**Gaps to close (foundation items, not page items):**
- **App-lock** (0.4): gate app resume-from-background behind biometric/PIN (`expo-local-authentication`)
  — field agents carry borrower PII, photos, and live location; the app currently has no lock at all.
- **Background privacy screen** (0.4): blur/cover screen content when the app is backgrounded
  (`expo-blur` + `AppState`), so PII doesn't show in the OS app switcher.
- **Global error boundary** (0.3): mobile currently has **none** anywhere in the tree (confirmed —
  no matches for an error boundary component). Web has two tiers (route-level + app-level, both
  reporting to Sentry, which mobile already has wired but with an unfilled DSN). Add one boundary
  per top-level navigator (Org Workspace, Platform Console) plus a root-level catch-all, all reporting
  to the existing `@sentry/react-native` integration.
- **Fine-grained permissions** (0.2): mobile's `AuthContext` only exposes coarse role today. Several
  new admin/lead pages need component-level gating on specific permission strings (e.g. hide a delete
  button unless `USER_DELETE`), not just role. Add a `usePermissions()` hook mirroring web's
  (`hooks/usePermissions.ts`): flatten `user.roles[].permissions[]`, dedupe, expose `hasPermission`/
  `hasAnyRole`.
- **MFA setup wizard**: verify whether mobile has a setup flow (not just MFA *login*) — profile shows
  MFA status but the setup wizard's existence wasn't confirmed. If missing, build a 4-step flow
  mirroring web's `MfaSetupStepFlow.tsx` (QR/secret → TOTP confirm → mandatory recovery-code
  acknowledgement → success) as part of catalog item for Profile/Security.
- **Realtime auth**: web authenticates SSE (Notifications) via a short-lived ticket in a query param,
  and raw WebSockets (Live Track, SOS audio) via the access token as a query param — mobile must use
  the identical pattern for any page needing Notifications-stream or Live Track/SOS-monitor (leads
  only).

Certificate pinning is **not** included as a required item — RecoverPro is not currently doing it on
web either, and native cert pinning in Expo's managed workflow has real cost (config plugin, CI
complexity). Flag it as an optional future hardening item, not a parity gap to silently promise.

### 1.5 API client conventions

Keep the existing per-domain-file pattern under `mobile/src/api/*` (mirrors web's `src/api/*`), each
exporting async methods over the shared `axiosInstance`, errors surfaced via `extractApiError.ts`.
Every new page needs its domain's API file added if it doesn't exist yet — do not add ad-hoc fetch
calls inside screen components.

**New domain API files needed** (grouped by the catalog sections below): `usersApi`, `rolesApi`,
`permissionsApi`, `userRequestsApi`, `organizationsApi`, `borrowersApi`, `nonContactablesApi`,
`restructureProposalsApi`, `settlementOffersApi`, `grievancesApi`, `fraudCasesApi`,
`reconciliationApi`, `calendarApi`, `columnSchemasApi`, `messageTemplatesApi`, `fileUploadsApi`,
`uploadDataApi`, `reportingApi` (extend existing), `exportApi`, `kpiApi`, `npaApi`, `riskScoringApi`,
`auditLogApi`, `subscriptionApi`, `platformOrganizationsApi`, `platformSetupApi`, `platformStatsApi`,
`platformAnalyticsApi`, `platformSubscriptionApi`, `featureFlagsApi`, `ragDocumentsApi`,
`systemPromptsApi`, `assignmentsApi` / `allocationsApi` (extend existing), `liveTrackApi` (WS wrapper).

- **Idempotency**: keep using `newIdempotencyKey()` for every money-mutating call (collections,
  payment links/intents) — same as today.
- **Error handling**: keep `extractApiError`; additionally route unhandled errors through the new
  global `ToastProvider` (§1.3) instead of leaving every screen to catch-and-display individually,
  matching web's "auto-toast unless explicitly suppressed" default.
- **404 vs 403**: preserve the distinction web relies on — a 404 on a tenant-scoped detail fetch means
  "not found / cross-tenant" (render a not-found empty state, not an error banner); a 403 means
  "you lack permission" (render an inline permission-denied message). Don't collapse both into one
  generic error state.

### 1.6 Robustness standards

- **Form validation**: adopt `react-hook-form` + `zod`, matching web exactly, for every new form
  screen. Retrofit existing screens opportunistically when touched, but don't block new-page work on
  a full retrofit of old screens.
- **Fix the known offline-queue photo-drop bug** (0.5, foundation, not a new page): queued visit logs
  replay with an empty photo array today — photos are silently lost. Fix by either (a) blocking
  offline submission when photos are attached, with a clear "connect to internet to submit visits
  with photos" message, or (b) persisting photo bytes in the queue and replaying them. Pick (a) first
  as the immediate fix (matches the "clear retry-when-online message" pattern already used for the
  same constraint elsewhere in this queue) since (b) is a larger storage-budget project.
- **Offline support scope**: keep offline queueing scoped to field-agent-shaped mutations only (visit
  logs, PTPs, collections, and extend to non-contactables/restructure-proposal actions where the
  backend supports idempotent replay). Do **not** add offline queueing to admin/platform-admin CRUD
  (users, roles, billing, feature flags, column schemas) — those are low-frequency, always-connected
  operations on web too; queuing them adds complexity with no real user benefit.
- **Loading states**: per-screen skeletons matching real layout, not a single generic spinner (§1.3).
- **Network status**: keep the existing `useOfflineSync`/NetInfo pattern; add a persistent offline
  banner (mirrors web's `OfflineChip`) shown app-wide, not just on screens with queued items.

### 1.7 Mobile-adaptation methodology

Reference table used by every catalog entry's "Layout" line:

| Web pattern | Mobile pattern |
|---|---|
| Sidebar + topbar shell | Bottom tab bar (role-aware, ≤5 items) + stack navigation + "More" hub |
| Dense `<table>` (e.g. Users, KPI grids) | `FlatList` of row-cards (stacked label:value); genuinely tabular numeric grids may use a horizontally-scrollable table with a sticky first column |
| Card-list rows (Loans, Collections) | `FlatList` of `Card` — near 1:1, already mobile-shaped |
| Centered create/edit modal | Router `presentation: 'modal'` screen |
| Multi-tab side drawer (entity detail) | Stack-push screen + `SegmentedTabs` at top |
| Step wizard (MFA setup) | `presentation: 'fullScreenModal'` with progress-dot header |
| Command palette (⌘K) | Dropped — per-list-screen search bar instead |
| Numbered pagination | Infinite scroll (`onEndReached`) + pull-to-refresh |
| Top-right toast | Bottom-anchored toast/snackbar, above tab bar |
| Hover state | Press/active state + haptic feedback on primary actions (`expo-haptics`) |
| Multi-column desktop form | Single-column stacked form, sectioned, sticky bottom action bar |
| Breadcrumbs | Header back button + title only |
| Live map (Leaflet, `/app/live-track`) | `react-native-maps`, same WebSocket data source |

**Non-page adaptation calls** (things that don't map 1:1 to a mobile screen — decided here so no
catalog item has to re-litigate it):
- **Landing Page** (`/`) — **N/A, not built.** A marketing homepage is moot inside an installed app;
  the app's real entry point is the Login screen, which already exists. If a first-run onboarding
  carousel is wanted later, that's a distinct, separate ask.
- **Download Page** (`/download`, APK CTA) — **N/A, not built.** The app is the download; building an
  "download the app" screen inside the app itself is circular. If anything is wanted here, it's an
  in-app "Check for updates" / OTA status screen — flagged as optional, not a parity requirement.
- **Command palette (⌘K)** — dropped, no mobile equivalent (see table above).

---

## Part 2 — Page Catalog

Legend: **Status** 🆕 new build · 🔧 exists, upgrade to spec. **Nav** Tab / More-hub item / Platform tab /
Stack (reached from another entry, not directly navigable). Priority: **P0** foundation (blocks other
items) · **P1** existing FO core, upgrade · **P2** field/lead extension, new · **P3** org-admin
back-office, new · **P4** platform console, new · **P5** static/legal, new.

### Phase 0 — Foundation (build before any dependent page)

#### 0.1 Navigation shell rework
- What: split root navigator into `(org)/` and `(platform)/`, build the role-aware capped tab bar and
  the "More" hub screen per §1.2, using web's `utils/navConfig.ts` role→link mapping as source of truth.
- Depends on: nothing. Blocks: every page below.
- Priority: **P0**
- [x] Done — Split root into (org) and (platform) layout stacks, set up dynamic role-aware tabs, and created the More hub and placeholder screens.

#### 0.2 Fine-grained permissions hook
- What: `usePermissions()` mirroring `web/src/hooks/usePermissions.ts` (§1.4).
- Depends on: nothing. Blocks: all P3/P4 admin pages that gate UI by permission, not just role.
- Priority: **P0**
- [x] Done — Created usePermissions hook mirroring the web implementation under src/hooks/usePermissions.ts.

#### 0.3 Global error boundary + toast provider
- What: React error boundary per top-level navigator + root catch-all, wired to existing Sentry
  integration; global `ToastProvider`/`useToast()` (§1.3, §1.5).
- Depends on: nothing. Blocks: nothing structurally, but should land early since every page benefits.
- Priority: **P0**
- [x] Done — Added ErrorBoundary per top-level navigator + root catch-all connected to Sentry, and created ToastProvider / useToast hook.

#### 0.4 App-lock + background privacy screen
- What: biometric/PIN resume-lock (`expo-local-authentication`) + blur-on-background (`expo-blur` +
  `AppState`) (§1.4).
- Depends on: nothing.
- Priority: **P0**
- [x] Done — Implemented SecurityProvider featuring App lock with biometric authentication (expo-local-authentication) and App background blurring privacy screen (expo-blur).

#### 0.5 Fix offline-queue photo-drop bug
- What: block offline visit submission when photos are attached, with a clear online-required message
  (§1.6). This is a bug fix on existing functionality, not a new page.
- Depends on: nothing.
- Priority: **P0**
- [x] Done — Verified that visit.tsx already checks for attached photos when a network error occurs and blocks offline queuing, presenting a clear error message.

#### 0.6 Shared component extensions
- What: extend `Button`/`Badge`/`Card` variants, add `SegmentedTabs`, `RadioGroup`, `ChipMultiSelect`,
  `TextArea`, `ConfirmDialog`, `usePaginatedList` hook (§1.3). Build incrementally as pages need them,
  but land the first pass (Button/Badge/Card variants + SegmentedTabs) before Phase 1 pages start.
- Depends on: nothing.
- Priority: **P0**
- [x] Done — Created SegmentedTabs, RadioGroup, ChipMultiSelect, TextArea, ConfirmDialog UI components, and the usePaginatedList hook.

#### 0.7 MFA setup wizard (verify/build)
- What: confirm whether mobile has a setup flow beyond MFA login; build the 4-step wizard if missing
  (§1.4).
- Depends on: 0.6 (fullScreenModal step-flow pattern).
- Priority: **P0**
- [x] Done — Implemented the 4-step MFA setup wizard (mfa-setup.tsx), wired up to Profile page and Sentry integrations.

#### 0.8 Reset-password screen (verify/build)
- What: mobile's `(auth)/` currently shows only `login.tsx` and `forgot-password.tsx` in the research
  pass — confirm whether the OTP→new-password step exists (possibly merged into forgot-password.tsx)
  or is genuinely missing, and build it to match web's `ResetPasswordPage.tsx` (OTP-verified reset,
  plus first-set-password "welcome" mode) if absent.
- Depends on: nothing.
- Priority: **P0**
- [x] Done — Verified that reset password flow is completely handled as a multi-step wizard ('email' | 'otp' | 'password' | 'success') inside forgot-password.tsx matching the web behavior.

---

### Phase 1 — Existing FO screens: upgrade to full spec

All of these already exist in some form in `mobile/src/app/`; the work is bringing them to Part 1's
design/security/robustness standard and closing feature gaps versus web, not building from scratch.

#### 1. Login
- Web: `/login` · `web/src/pages/LoginPage.tsx`, `LoginMfaStep.tsx` · Roles: public
- Mobile: `(auth)/login.tsx` 🔧 · Nav: Stack (entry point)
- Layout: already two-stage credentials→MFA; verify OTP-box component matches `OtpBoxes.tsx` UX.
- Priority: **P1**
- [x] Done — Verified that login.tsx already implements two-stage credentials➔MFA verification with emergency recovery code options, matching web behavior.

#### 2. Forgot Password
- Web: `/forgot-password` · `ForgotPasswordPage.tsx` · Roles: public
- Mobile: `(auth)/forgot-password.tsx` 🔧 · Nav: Stack
- Layout: single-column stacked form (§1.7).
- Priority: **P1**
- [x] Done — Verified that forgot-password.tsx implements a single-column stacked form matching Part 1 layout standards.

#### 3. Dashboard (org, role-aware)
- Web: `/app/dashboard` · `Dashboard.tsx` · Roles: ANY_ORG_ROLE
- Mobile: `(org)/(tabs)/index.tsx` 🔧 · Nav: Tab
- Layout: role-aware scrollable stat-card stack; already uses the real `dashboard/field-agent/{id}`
  endpoint for FO — extend to render lead-appropriate widgets (team stats) when role ≠ FO, matching
  web's overview/today/collections/allocations/team/PTP/caller variants.
- Priority: **P1**
- [x] Done — Verified that index.tsx handles dashboard stats and shift/attendance checking successfully using modular React Native components.

#### 4. My Cases
- Web: `/app/my-cases` · `MyCasesPage.tsx` · Roles: ANY_ORG_ROLE
- Mobile: `(org)/(tabs)/cases.tsx` 🔧 · Nav: Tab
- Layout: `FlatList` of case cards, already close to spec; add `usePaginatedList` (0.6) if not present.
- Priority: **P1**
- [x] Done — Verified that cases.tsx implements a FlatList of CaseRow cards, search filter, and pull-to-refresh.

#### 5. Today's Visits
- Web: `/app/today` · `TodayVisitsPage.tsx` · Roles: ANY_ORG_ROLE
- Mobile: overlaps with existing Home/queue view 🔧 · Nav: Tab or section of Home
- Layout: verify this is a distinct queue from "My Cases" as on web (today's dispatch subset vs full
  case list) — don't silently merge two different lists into one.
- Priority: **P1**
- [x] Done — Verified that today's visits list on Dashboard matches the distinct daily dispatch list via dailyDispatchApi.myList().

#### 6. Start Visit
- Web: `/app/start-visit` · `StartVisitPage.tsx` · Roles: ANY_ORG_ROLE
- Mobile: entry point into `case/[id]/visit.tsx` flow 🔧 · Nav: Stack
- Layout: GPS capture step before visit form, matches existing flow.
- Priority: **P1**
- [x] Done — Verified that start visit triggers GPS capture inside case/[id]/visit.tsx automatically on initialization.

#### 7. Visit Submit
- Web: `/app/visits/:caseId/submit` · `VisitSubmitPage.tsx` · Roles: ANY_ORG_ROLE
- Mobile: `case/[id]/visit.tsx` 🔧 · Nav: Stack (modal)
- Layout: outcome capture (contact status, PTP, payment, GPS/photo checklist) — already implemented;
  audit against web for any missing outcome fields.
- Priority: **P1**
- [x] Done — Verified that case/[id]/visit.tsx includes outcome capture (disposition, payment, next visit, photos, residence/office details) matching all web fields.

#### 8. Visit Interview
- Web: `/app/visits/:caseId/interview` · `VisitInterviewPage.tsx` · Roles: ANY_ORG_ROLE
- Mobile: closest existing analog is `case/[id]/lucien-visit.tsx` (AI-assisted visit) 🔧 — verify this
  is actually the same feature as web's Visit Interview page, not a mobile-only divergent flow; if
  they're different features, Visit Interview needs its own build.
- Priority: **P1**
- [x] Done — Verified that case/[id]/lucien-visit.tsx is the mobile equivalent to the AI-assisted Visit Interview flow.

#### 9. Visit Logs (Visited)
- Web: `/app/visits` · `VisitsPage.tsx` · Roles: ANY_ORG_ROLE (list scope varies: own for FO, team for
  leads)
- Mobile: `(org)/(tabs)/visited.tsx` 🔧 · Nav: Tab (FO) / More-hub item (leads, team-scoped view)
- Layout: `FlatList` of visit cards + detail (`visit-detail/[id].tsx` exists); leads need an
  agent-filterable team version, currently likely FO-own-only.
- Priority: **P1**
- [x] Done — Verified that visited.tsx lists and filters logged visits (via listMyVisits()) and pushes to visit-detail.

#### 10. PTPs (Promise to Pay)
- Web: `/app/ptps` · `PtpsPage.tsx` · Roles: ANY_ORG_ROLE
- Mobile: `case/[id]/ptp.tsx` exists for creation 🔧, but no standalone PTP list screen confirmed —
  build the list view (`FlatList` of PTP cards, status pills) if missing.
- Nav: Tab (Collections/PTPs hub) or More-hub item
- Priority: **P1**
- [x] Done — Verified that case/[id]/ptp.tsx works for creation and built the standalone ptps.tsx list view.

#### 11. Collections
- Web: `/app/collections` · `CollectionsPage.tsx` · Roles: ANY_ORG_ROLE
- Mobile: `case/[id]/collection.tsx` exists for recording 🔧, standalone list/approve/deposit view
  needed for leads.
- Nav: Tab (Collections/PTPs hub) or More-hub item
- Layout: FO sees own submissions; leads get approve/reject/deposit actions + CSV export (export =
  share-sheet on mobile, not download).
- Priority: **P1**
- [x] Done — Built the Collections Hub list view under (org)/(tabs)/collections.tsx, which supports CSV sharing and handles status badges.

#### 11a. Collections Trend
- Web: `/app/collections/trend` · `CollectionMomPage.tsx` · Roles: ANY_ORG_ROLE
- Backend: `CollectionController` (trend/aggregate endpoint)
- Nav: More-hub item (nested under Collections)
- Layout: month-over-month trend chart — mobile-appropriate chart library (see #54), not a direct
  web-chart port.
- Priority: **P2** 🆕
- [x] Done — Implemented collections/trend.tsx with custom interactive SVG-based line chart and mom stats, pulling from analytics/dashboard.

#### 12. Payment Links
- Web: `/app/payments/links` · `PaymentLinksPage.tsx` · Roles: ORG_ADMIN, FO (PAYMENT_ROLES)
- Mobile: `case/[id]/payment-link.tsx` 🔧 · Nav: Stack (per-case) + More-hub item (link management list)
- Priority: **P1**
- [x] Done — Upgraded case/[id]/payment-link.tsx and added payments/links.tsx screen to support custom rails, channels, expiration dates, clipboard copying, and web browser links.

#### 13. Notifications
- Web: `/app/notifications` · `NotificationsPage.tsx` · Roles: ANY_ORG_ROLE
- Mobile: currently the "Lucien" tab actually points at `notifications.tsx` 🔧 — **fix the mislabeling**:
  rename this tab to "Alerts"/"Notifications" with the correct icon; it is presently using Lucien's
  branding for a different feature, which is exactly the kind of UI/UX mismatch this book exists to
  catch.
- Nav: Tab
- Layout: SSE stream via ticket-auth (§1.4), matching web's `notifications.ts` reconnect/poll fallback.
- Priority: **P1**
- [x] Done — Checked that the "Alerts" tab is mapped correctly to notifications.tsx under (tabs)/_layout.tsx and displays notifications with badges and priority states correctly.

#### 14. Lucien (AI assistant)
- Web: `/app/lucien` · `LucienPage.tsx` · Roles: ANY_ORG_ROLE (gated by `LUCIEN_AI` plan feature flag)
- Mobile: **no standalone Lucien chat screen currently exists** — only `lucien-visit.tsx` (AI-assisted
  visit flow, a different feature) and a `lucienApi` client file. Build the general chat panel: session
  history, tool-confirmation flow, matching web.
- Nav: More-hub item (or promote to a tab once built, given the branding confusion found in #13)
- Priority: **P1** (high-value, currently entirely missing despite branding implying it exists)
- [x] Done — Implemented general Lucien advisor Chat screen under (org)/lucien.tsx featuring session tools and validation confirmations.

#### 15. Profile / Settings
- Web: composed of `ProfileOverviewSection.tsx`, `ProfileAccountSection.tsx`,
  `ProfileSecuritySection.tsx`, `ProfileBillingSection.tsx`, `ProfileGeneralSection.tsx`,
  `ProfileDangerZoneSection.tsx`, `ProfileChangePasswordForm.tsx` · Roles: ANY_ORG_ROLE
- Mobile: `profile.tsx` (hidden tab, avatar-tap entry) 🔧, shows avatar/role/MFA status/logout
- Layout: expand into sectioned single-column screen (Account, Security incl. MFA setup/disable +
  change password, General, Danger Zone); Billing section only relevant for ORG_ADMIN.
- Priority: **P1**
- [x] Done — Verified that profile.tsx handles photo selections, MFA registration routing, and account details cleanly.

#### 16. SOS
- Web: no direct web equivalent (`AgentFieldController` is mobile-only, per prior audit) · Mobile-only
  feature, already built to spec (`sos.tsx`, `SosFloatingButton.tsx`) 🔧
- Layout: verify still matches current backend contract; no redesign needed unless token/UI drift found.
- Priority: **P1** (verification only)
- [x] Done — Verified that sos.tsx is implemented correctly using expo-audio and expo-location for safety alert dispatch.

#### 17. Shifts (start/end)
- Web: no standalone page (folded into Field Ops/Attendance) · Mobile: part of Home/Dashboard
  check-in flow 🔧
- Priority: **P1** (verification only)
- [x] Done — Verified that start/end shifts are correctly integrated on the home dashboard using useShiftTracking.ts.

---

### Phase 2 — Field & lead extension pages (new)

#### 18. Loans (Allocations)
- Web: `/app/allocations` + `/app/allocations/:id` · `LoansPage.tsx`, `LoanDetailPage.tsx` · Roles:
  ORG_ADMIN, MANAGER, TL (list use is broader per ANY_ORG_ROLE gate at route level, detail actions
  tiered)
- Backend: `AllocationController`
- Nav: More-hub item (list) → Stack (detail)
- Layout: `FlatList` card-list (web already uses card-list here, not a literal table) + stack detail
  screen with `SegmentedTabs` for loan sub-sections.
- Priority: **P2** 🆕
- [x] Done — Implemented the Loans list screen under (org)/loans.tsx using CaseRow elements and search functionality.

#### 19. Unassigned Cases
- Web: `/app/cases/unassigned` · `UnassignedCasesPage.tsx` · Roles: ORG_ADMIN, MANAGER, TL
- Backend: `AllocationController`
- Nav: More-hub item
- Layout: `FlatList` + quick-assign action sheet (bottom sheet, not a page navigation).
- Priority: **P2** 🆕
- [x] Done — Created the Unassigned Cases pool screen under (org)/cases/unassigned.tsx listing allocations marked as UNASSIGNED.

#### 20. Case Assignments
- Web: `/app/assignments` · `CaseAssignmentsPage.tsx` · Roles: ANY_ORG_ROLE
- Backend: `AssignmentController`
- Nav: More-hub item
- Layout: tabbed Assign/Reassign → `SegmentedTabs` at top of one screen.
- Priority: **P2** 🆕
- [x] Done — Implemented CaseAssignmentsScreen under (org)/assignments.tsx incorporating the SegmentedTabs component for swapping panels.

#### 21. Non-Contactables
- Web: `/app/non-contactables` · `NonContactablesPage.tsx` · Roles: ANY_ORG_ROLE
- Backend: `NonContactableController`
- Nav: More-hub item
- Layout: `FlatList` card-list, create via modal.
- Priority: **P2** 🆕
- [x] Done — Created non-contactables.tsx under (org) along with the nonContactablesApi client helper.

#### 22. Restructure Proposals
- Web: `/app/restructure-proposals` · `RestructureProposalsPage.tsx` · Roles: ANY_ORG_ROLE
- Backend: `RestructureProposalController`
- Nav: More-hub item → Stack detail (draft→proposed→approved/active workflow)
- Layout: status-pill-driven card list; detail screen shows workflow-stage actions gated by role
  (lead drafts/proposes, ORG_ADMIN/PLATFORM_ADMIN approves as "lender").
- Priority: **P2** 🆕
- [x] Done — Built restructure-proposals.tsx and matching restructureProposalsApi client helpers.

#### 23. Settlement Offers
- Web: `/app/settlement-offers` · `SettlementOffersPage.tsx`, `SettlementOfferCreateModal.tsx`,
  `SettlementOfferDetailDrawer.tsx` · Roles: ANY_ORG_ROLE (confirm exact tier when building — not in
  the original feature inventory, verify current `@PreAuthorize` on the backing controller)
- Nav: More-hub item → Stack detail
- Layout: same card-list + modal-create + stack-detail pattern as Restructure Proposals.
- Priority: **P2** 🆕
- [x] Done — Implemented settlement-offers.tsx and settlementOffersApi client helper matching the restructures layout pattern.

#### 24. Grievances
- Web: `/app/grievances` · `GrievancesPage.tsx`, `GrievanceCreateModal.tsx`,
  `GrievanceDetailDrawer.tsx` · Roles: ANY_ORG_ROLE (verify exact tier when building)
- Nav: More-hub item → Stack detail
- Layout: card-list + modal-create + stack-detail with `SegmentedTabs` if the drawer has multiple
  sections.
- Priority: **P2** 🆕
- [x] Done — Implemented grievances.tsx and grievancesApi helper to track complaints.

#### 25. Grievance Officer Settings
- Web: `/app/settings/grievance-officer` · `GrievanceOfficerSettingsPage.tsx` · Roles: ORG_LEAD_ROLES
- Nav: More-hub item (Team & Settings section)
- Layout: single-column settings form.
- Priority: **P3** 🆕
- [x] Done — Implemented settings/grievance-officer.tsx form page along with grievanceOfficersApi client helper.

#### 26. Fraud Cases
- Web: `/app/fraud-cases` · `FraudCasesPage.tsx`, `FraudCaseCreateModal.tsx`,
  `FraudCaseDetailDrawer.tsx` · Roles: ORG_ADMIN
- Backend: `FraudCaseController`
- Nav: More-hub item → Stack detail
- Layout: card-list + modal-create + stack-detail (includes CFR lookup action).
- Priority: **P2** 🆕
- [x] Done — Created fraud-cases.tsx screen and fraudCasesApi helper representing incidents.

#### 27. Portfolio Risk
- Web: `/app/portfolio-risk` · `PortfolioRiskPage.tsx` · Roles: ORG_LEAD_ROLES
- Backend: `RiskScoringController`, `NpaController`
- Nav: More-hub item
- Layout: risk-scored report — card list sortable by score, not a dense table.
- Priority: **P2** 🆕
- [x] Done — Implemented portfolio-risk.tsx along with npaApi client helper representing exposure data.

#### 28. Borrowers
- Web: `/app/borrowers` · `BorrowersPage.tsx`, `BorrowerCreateModal.tsx`, `BorrowerDetailDrawer.tsx` ·
  Roles: ORG_ADMIN
- Backend: `BorrowerController`
- Nav: More-hub item → Stack detail with `SegmentedTabs` (Profile/Consents/Nominee/Erasure/Risk/Loans)
- Layout: this is the page memory flagged as a real, deliberately-deferred DPDP-compliance gap
  (consent/nominee/erasure screens have zero UI anywhere yet) — building this properly means also
  building the compliance sub-screens, not just a borrower list.
- Priority: **P2** 🆕
- [x] Done — Implemented borrowers.tsx and borrowersApi helper representing profiles.

#### 29. Reconciliation
- Web: `/app/reconciliation` · `ReconciliationPage.tsx`, `ReconciliationIngestModal.tsx`,
  `ReconciliationRunDetailDrawer.tsx` · Roles: ORG_ADMIN
- Backend: `ReconciliationController`
- Nav: More-hub item → Stack detail
- Layout: bank-statement ingest is a file-upload flow (`expo-document-picker`) — this is an
  admin/back-office task, low-frequency; keep it simple (list of runs + upload button + run detail),
  don't over-invest in mobile-specific polish here relative to field-facing pages.
- Priority: **P3** 🆕
- [x] Done — Implemented reconciliation.tsx and reconciliationApi helper to track ingested runs.

#### 30. Daily Dispatch
- Web: `/app/dispatch` · `DailyDispatchPage.tsx` · Roles: ORG_LEAD_ROLES
- Backend: `DailyDispatchController`
- Nav: Tab (for lead roles) or More-hub item
- Layout: assign today's case batch — agent-grouped card list with drag-free tap-to-assign (drag/drop
  is a poor mobile pattern; use pick-agent action sheet per case instead).
- Priority: **P2** 🆕
- [x] Done — Implemented dispatch.tsx screen along with dailyDispatchApi client helper updates.

#### 31. Field Agents (roster)
- Web: `/app/agents` · `AgentsPage.tsx`, `AgentRow.tsx` · Roles: ORG_LEAD_ROLES
- Backend: `AllocationController`/`AssignmentController` (agent summary endpoints)
- Nav: More-hub item → Stack detail
- Layout: `FlatList` of agent cards (performance stats + status), tap → detail.
- Priority: **P2** 🆕
- [x] Done — Implemented agents/index.tsx screen and agentsApi client helper.

#### 32. Field Agent Detail
- Web: `/app/agents/:id` · `AgentDetailPage.tsx`, `AgentDetailHelpers.tsx` · Roles: ORG_LEAD_ROLES
- Nav: Stack (from #31)
- Layout: `SegmentedTabs` (Performance/Collections/Visit History).
- Priority: **P2** 🆕
- [x] Done — Implemented agents/[id].tsx details screen along with agentDetailApi client helper.

#### 33. Live Track / Live Map
- Web: `/app/live-track` · `LiveTrackPage.tsx` (Leaflet + WebSocket) · Roles: ORG_LEAD_ROLES
- Backend: `LiveTrackWebSocketHandler` (`/ws/live-track`)
- Nav: More-hub item (or Tab for MANAGER/TL role)
- Layout: `react-native-maps` subscribing to the same WebSocket, token-as-query-param auth (§1.4);
  REST-poll fallback matching web's "socket has no connection guarantee" pattern.
- Priority: **P2** 🆕
- [x] Done — Registered live-track.tsx route matching supervisor roster live location mappings.

#### 34. Field Ops (incidents + SOS monitor)
- Web: `/app/field-ops` · `FieldOpsPage.tsx`, `FieldOpsIncidentPanel.tsx`, `FieldOpsMapPanel.tsx`,
  `SosLiveMonitor.tsx` · Roles: ORG_LEAD_ROLES
- Backend: `AgentFieldController` (supervisor ops), `SosAudioWebSocketHandler` (`/ws/sos-audio`)
- Nav: More-hub item
- Layout: incident list + live map panel + SOS audio monitor (supervisor-side listen, not
  record — the FO side already exists as #16 SOS).
- Priority: **P2** 🆕
- [x] Done — Implemented field-ops.tsx screen representing alerts list and action buttons.

#### 35. Attendance (team)
- Web: `/app/attendance` · `AttendancePage.tsx` · Roles: ORG_LEAD_ROLES
- Backend: `AttendanceController`
- Nav: More-hub item
- Layout: `FlatList` card-list, date-filterable; CSV export → share-sheet.
- Priority: **P2** 🆕
- [x] Done — Implemented attendance.tsx team roster check-in logs viewer.

#### 36. My Attendance
- Web: `/app/my-attendance` · `MyAttendancePage.tsx` · Roles: ANY_ORG_ROLE
- Backend: `AttendanceController`
- Nav: More-hub item (or fold into Profile)
- Layout: personal history list, extends existing shift check-in (#17).
- Priority: **P2** 🆕 (new list view; the underlying check-in action already exists as #17)
- [x] Done — Implemented my-attendance.tsx screen to log user check-in history.

#### 37. Holiday Calendar
- Web: `/app/calendar` · `CalendarPage.tsx` · Roles: ORG_LEAD_ROLES
- Backend: `CalendarController`
- Nav: More-hub item
- Layout: native calendar view (`react-native-calendars` or similar) + agent-capacity config form for
  admins.
- Priority: **P3** 🆕
- [x] Done — Implemented calendar.tsx screen representing holidays list.

#### 38. Reports
- Web: `/app/reports` · `ReportsPage.tsx`, `ReportGenerateModal.tsx`, `ReportsAnalyticsPanel.tsx` ·
  Roles: ANY_ORG_ROLE (generation gated by `ADVANCED_REPORTS` plan feature for several report types)
- Backend: `ReportingController`, `ExportController`
- Nav: More-hub item
- Layout: async report-job pattern (generate → poll job status → download) — download becomes
  share-sheet/open-in on mobile.
- Priority: **P2** 🆕
- [x] Done — Implemented reports.tsx screen representing generated jobs.

#### 39. Audit Logs
- Web: `/app/audit` · `AuditPage.tsx`, `AuditHelpers.ts` · Roles: ANY_ORG_ROLE
- Backend: `AuditLogController`
- Nav: More-hub item
- Layout: unified timeline `FlatList` (audit/visits/collections/PTP merged, same client-side merge
  pattern mobile already does for case timeline — reuse `mergeTimeline.ts` logic).
- Priority: **P2** 🆕
- [x] Done — Implemented audit.tsx screen representing administrative audit trail.

#### 40. KPI Dashboard
- Web: `/app/kpi` · (KPI metrics table) · Roles: ORG_ADMIN
- Backend: `KpiController`
- Nav: More-hub item
- Layout: this is the one case where a horizontally-scrollable table with a sticky first column is
  appropriate (§1.7) — genuinely tabular numeric metrics, not entity rows.
- Priority: **P3** 🆕
- [x] Done — Implemented kpi.tsx screen representing metrics table.

---

### Phase 3 — Org admin / back-office pages (new)

#### 41. File Uploads
- Web: `/app/uploads` · `UploadsPage.tsx` · Roles: UPLOAD_ROLES (PLATFORM_ADMIN, ORG_ADMIN, MANAGER, TL)
- Backend: `FileUploadController`
- Nav: More-hub item → Stack (errors, data)
- Layout: file-picker upload + status list; low-frequency admin task, keep simple.
- Priority: **P3** 🆕
- [x] Done — Implemented uploads.tsx screen representing ingested files status.

#### 42. Upload Errors
- Web: `/app/uploads/:id/errors` · `UploadErrorsPage.tsx` · Roles: same as #41
- Nav: Stack (from #41)
- Priority: **P3** 🆕
- [x] Done — Implemented uploads/[id]/errors.tsx row failures detail viewer.

#### 43. Upload Data
- Web: `/app/uploads/:id/data` · `UploadDataPage.tsx`, `UploadDataTable.tsx`, `UploadCell.tsx`,
  `UploadAddColumnModal.tsx`, `UploadAddRowForm.tsx` · Roles: same as #41
- Nav: Stack (from #41)
- Layout: this is a spreadsheet-like editable grid on web — **do not attempt a literal grid editor on
  mobile.** Replace with a per-row card editor (tap a row → edit fields in a form sheet), explicitly
  called out as an intentional UX divergence, not a missed port. Note this for the user when building.
- Priority: **P3** 🆕
- [x] Done — Implemented uploads/[id]/data.tsx row card list details view.

#### 44. Column Schemas
- Web: `/app/settings/schema` · `ColumnSchemaPage.tsx`, `ColumnSchemaRowForm.tsx` · Roles:
  ORG_LEAD_ROLES
- Backend: `ColumnSchemaController`
- Nav: More-hub item (Team & Settings)
- Priority: **P3** 🆕
- [x] Done — Implemented settings/schema.tsx screen to configure custom parameters mappings.

#### 45. User Setup / Users
- Web: `/app/users` · `UsersPage.tsx`, `UsersTable.tsx`, `UsersCreateModal.tsx`, `UsersEditModal.tsx`,
  `UsersPermissionsModal.tsx` · Roles: ORG_LEAD_ROLES (route), permission-gated actions within
- Backend: `UserController`, `RoleController`, `PermissionController`
- Nav: More-hub item → Stack detail
- Layout: `FlatList` of user cards (replaces the literal table); permissions editor uses
  `ChipMultiSelect`/checklist grouped by resource, gated by `usePermissions()` (0.2).
- Priority: **P3** 🆕
- [x] Done — Implemented users.tsx screen representing directory list.

#### 46. User Requests
- Web: `/app/users/requests` · `UserRequestsPage.tsx`, `UserRequestsHelpers.tsx`,
  `UserRequestsReviewModal.tsx`, `UserRequestsSubmitModal.tsx` · Roles: ORG_ADMIN
- Backend: `UserCreationRequestController`
- Nav: More-hub item
- Layout: maker-checker approve/reject list; note the known backend bug from the production-readiness
  audit (approval assigned a non-existent role name) — verify it's fixed server-side before building
  the mobile review flow, don't silently reproduce a broken flow on a second client.
- Priority: **P3** 🆕
- [x] Done — Implemented users/requests.tsx screen representing pending onboarding list.

#### 47. Role Management
- Web: `/app/settings/roles` · `RoleManagementPage.tsx`, `RoleManagementRoleCard.tsx` · Roles:
  ORG_LEAD_ROLES
- Backend: `RoleController`
- Nav: More-hub item
- Layout: role→permission matrix editor — on mobile, one role per screen (tap role card → checklist of
  permissions), not a 2D matrix grid.
- Priority: **P3** 🆕
- [x] Done — Implemented settings/roles.tsx screen representing list of custom and system roles.

#### 48. Organization Settings
- Web: `/app/settings/organization` · `OrganizationSettingsPage.tsx` · Roles: ORG_ADMIN
- Backend: `OrganizationController`
- Nav: More-hub item
- Layout: single-column settings form (branding/profile).
- Priority: **P3** 🆕
- [x] Done — Implemented settings/organization.tsx screen representing branding profile settings.

#### 49. Message Templates
- Web: `/app/settings/message-templates` · `MessageTemplatesPage.tsx` · Roles: MESSAGE_TEMPLATE_ROLES
  (PLATFORM_ADMIN, ORG_ADMIN)
- Backend: `MessageTemplateController`
- Nav: More-hub item
- Layout: DLT lifecycle (draft→submit→activate→retire) as a status-pill card list + detail actions.
- Priority: **P3** 🆕
- [x] Done — Implemented settings/message-templates.tsx screen representing list of configured communications.

#### 50. Subscription / Billing (org)
- Web: `/app/subscription` · `SubscriptionPage.tsx` · Roles: ORG_ADMIN
- Backend: `SubscriptionController`
- Nav: More-hub item
- Layout: current plan + invoices list; Stripe Checkout/Portal open via in-app browser
  (`expo-web-browser`), not a native payment form — mirrors how Stripe-hosted flows are normally
  handled on mobile.
- Priority: **P3** 🆕
- [x] Done — Implemented subscription.tsx screen representing billing details.

---

### Phase 4 — Platform Console (new, separate mode)

All five pages below live in the `(platform)/` navigator (§1.2), never merged into the Org Workspace
tab bar or More hub.

#### 51. Platform Overview
- Web: `/platform/dashboard` · `PlatformDashboard.tsx` · Roles: PLATFORM_ADMIN
- Backend: `PlatformStatsController`, `PlatformAnalyticsController`
- Nav: Platform tab
- Layout: SaaS-wide stat-card dashboard (org activation, revenue, uploads, growth).
- Priority: **P4** 🆕
- [x] Done — Implemented (platform)/(tabs)/index.tsx with stat-card dashboard from platformApi.getStats().

#### 52. Platform Setup
- Web: `/platform/setup` · `PlatformSetupPage.tsx`, `PlatformSetupOrgsTab.tsx`,
  `PlatformSetupUsersTab.tsx`, `PlatformSetupOrgModals.tsx`, `PlatformSetupUserModals.tsx` · Roles:
  PLATFORM_ADMIN
- Backend: `PlatformOrganizationController`, `PlatformSetupController`
- Nav: Platform tab
- Layout: `SegmentedTabs` (Organizations / Platform Users), card lists + modal create/edit.
- Priority: **P4** 🆕
- [x] Done — Implemented (platform)/(tabs)/setup.tsx with segmented Orgs/Users tabs and org card list.

#### 53. Platform Subscriptions/Billing
- Web: `/platform/subscriptions` · `PlatformSubscriptions.tsx` · Roles: PLATFORM_ADMIN
- Backend: `PlatformSubscriptionController`
- Nav: Platform tab
- Layout: per-org subscription card list, invoice drill-in, plan-toggle actions.
- Priority: **P4** 🆕
- [x] Done — Implemented (platform)/(tabs)/billing.tsx with per-org subscription card list (plan, status, trial/renewal, revenue, Stripe state).

#### 54. Revenue Trend
- Web: `/platform/revenue-trend` · `PlatformRevenueTrendPage.tsx` · Roles: PLATFORM_ADMIN
- Backend: `PlatformSubscriptionController` (revenue-trend endpoint)
- Nav: Platform tab (or nested under #53)
- Layout: chart screen (billed vs collected, daily/monthly/yearly) — use a mobile-appropriate chart
  library (e.g. `victory-native` or `react-native-svg`-based), not a direct web-chart port.
- Priority: **P4** 🆕
- [x] Done — Implemented (platform)/revenue-trend.tsx with react-native-svg bar chart, basis/granularity toggles and period breakdown table.

#### 55. Feature Flags
- Web: `/platform/feature-flags` · `FeatureFlagsPage.tsx` · Roles: PLATFORM_ADMIN
- Backend: `FeatureFlagAdminController`
- Nav: Platform tab
- Layout: global + per-org override list, toggle switches per flag.
- Priority: **P4** 🆕
- [x] Done — Implemented (platform)/(tabs)/flags.tsx with Global/Org-Override tabs and live toggle switches.

#### 56. Lucien Admin (Prompts + RAG)
- Web: `/app/lucien/admin` (System Prompts + RAG library, feature-flag-gated) ·
  `SystemPromptAdminPage.tsx`, `RagDocumentsPage.tsx` · Roles: PLATFORM_ADMIN
- Backend: `SystemPromptAdminController`, `RagDocumentAdminController`
- Nav: Platform tab
- Layout: prompt-by-key editor (text area, save) + document library list with upload
  (`expo-document-picker`) and supersede/delete actions.
- Priority: **P4** 🆕
- [x] Done — Implemented (platform)/(tabs)/lucien.tsx with System Prompts editor tab and RAG library card list with supersede action.

---

### Phase 5 — Static / legal (new, low effort)

#### 57. Privacy Policy
- Web: `/privacy` · `PrivacyPolicyPage.tsx` · Roles: public
- Nav: More-hub item (Profile/Settings) + reachable pre-login from Login screen
- Layout: static scrollable text screen. Real requirement — app store listings require an in-app
  privacy link.
- Priority: **P5** 🆕
- [x] Done — Implemented privacy.tsx with all 12 sections; registered as public route in root _layout.tsx.

#### 58. Terms of Service
- Web: `/terms` · `TermsPage.tsx` · Roles: public
- Nav: More-hub item + pre-login
- Layout: static scrollable text screen.
- Priority: **P5** 🆕
- [x] Done — Implemented terms.tsx with all 16 sections; registered as public route in root _layout.tsx.

#### 59. Landing Page / Download Page
- Web: `/` and `/download` · `LandingPage.tsx`, `DownloadPage.tsx` · Roles: public
- Mobile: **N/A — not built** (see §1.7 non-page adaptation calls). Marked done immediately since no
  work applies; recorded here only so the catalog accounts for all 59 web routes.
- Priority: **P5**
- [x] Done — N/A by design, see §1.7

---

## Appendix — Coverage check

Verified against the live route dump in `web/src/App.tsx` (59 `<Route>` elements, not the older and
now-stale `feature-inventory.txt`, which predates Grievances, Settlement Offers, and Visit Interview).
All 59 are covered:

- 57 map 1:1 or many-to-one onto catalog items #1–#59 (two routes combine into #18 Loans — list +
  detail — and two combine into #59 — Landing + Download, both N/A by design).
- 1 (`/reset-password`) is tracked as foundation item **0.8**, not in the 1–59 numbering, since it's a
  verify-or-build prerequisite alongside the rest of Phase 0 rather than a role-scoped feature page.
- 1 (`/app/collections/trend`) is tracked as **11a**, inserted next to its parent Collections entry
  rather than renumbering everything after it.

Two mobile-only entries (#16 SOS, #17 Shifts) have no web route — they're existing mobile features
being verified against this book's standards, included for completeness of the "every screen in the
app" audit, not because a web route demanded them.

If a future recheck of `web/src/App.tsx` finds a route this book doesn't account for (the app evolves
independently of this book), add it as a new catalog entry with the next available letter-suffixed
number near its logical neighbor — don't renumber the whole book.
