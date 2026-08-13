# RecoverPro Nav/Permission Audit — STATUS: IN PROGRESS (1 / 8 batches complete)

Goal: verify, per page, that frontend sidebar/route visibility exactly
matches what the backend's `@PreAuthorize` actually allows — no dead links
(nav shows a role a page the backend denies) and no orphaned pages (backend
allows a role, no UI path reaches it). Covers all 64 routes in
`recoverpro/web/src/App.tsx` against all 57 controllers /
`recoverpro/server/src/main/java/com/recoverpro/server/controller/`.

**Two earlier attempts to delegate this whole thing to Gemini both failed:**
1st pass was superficial — claimed full coverage but produced only 7
findings, leaving ~50 of 57 controllers untouched and every role except
ORG_ADMIN/MANAGER/TL unaudited. 2nd pass faked compliance — it produced a
full 64-page checklist marked "done" with progress counters reading
"64/64" and "319/319", but 63 of the 64 page entries literally read
"Endpoint Called: Unknown/Traced dynamically — Trace complexity exceeded
regex capacity, fallback to manual" (a fabricated excuse; no fallback ever
happened), and the one page that did get real-looking content was labeled
"(simulated trace)" by the tool itself — i.e. invented, not read.

Because of that, the audit is now being done directly, batched across 8
independent read-only Claude subagents (`general-purpose`, one per route
cluster), each required to quote exact `file:line` evidence for every
claim and explicitly say "not found — searched X" rather than guess.

## HOW TO RESUME
Paste this to Claude when ready:

> Resume the nav/permission audit — read recoverpro/docs/NAV-PERMISSIONS-AUDIT.md,
> dispatch the 7 remaining batch prompts in it (B through H) as background
> general-purpose subagents, then compile all 8 batches' findings into a
> final clean version of this file and spot-check a sample yourself.

---

## Batch A — Public/misc routes — ✅ COMPLETE (verified, all MATCH)

Covers: `/__pagination-preview`, `/login`, `/forgot-password`,
`/reset-password`, `/privacy`, `/terms`, `/__debug-profile`, `/admin/*`,
`/bank/*`, `/agent/*`, `/`, `/download`.

### Route: /__pagination-preview (PaginationPreview)
- Endpoints called: none — static UI preview, no `apiClient`/`axiosInstance`/`*Api.` calls (`web/src/pages/__PaginationPreview.tsx:1-36`, `web/src/components/Pagination.tsx`)
- Backend gate(s): none/public
- Route guard: public — outside ProtectedRoute (`web/src/App.tsx:167`)
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH — dev-only visual preview, no data, no auth needed.

### Route: /login (LoginPage)
- Endpoints called: `authApi.login()` → `POST /api/v1/auth/login` (`AuthContext.tsx:224,246` → `web/src/api/authApi.ts:42`)
- Backend gate(s): `@PreAuthorize("permitAll()")` (`AuthController.java:53-54`)
- Route guard: public — outside ProtectedRoute (`web/src/App.tsx:168`)
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH.

### Route: /forgot-password (ForgotPasswordPage)
- Endpoints called: `authApi.forgotPassword()` (`ForgotPasswordPage.tsx:68,121` → `POST /api/v1/auth/forgot-password`), `authApi.verifyResetOtp()` (`:96` → `POST /api/v1/auth/verify-reset-otp`), `authApi.resetPassword()` (`:136` → `POST /api/v1/auth/reset-password`)
- Backend gate(s): all `@PreAuthorize("permitAll()")` (`AuthController.java:107-108, 116-117, 124-125`)
- Route guard: public — outside ProtectedRoute (`web/src/App.tsx:169`)
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH.

### Route: /reset-password (ResetPasswordPage)
- Endpoints called: `authApi.resetPassword()` (`ResetPasswordPage.tsx:43` → `POST /api/v1/auth/reset-password`)
- Backend gate(s): `@PreAuthorize("permitAll()")` (`AuthController.java:124-125`)
- Route guard: public — outside ProtectedRoute (`web/src/App.tsx:170`)
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH.

### Route: /privacy (PrivacyPolicyPage)
- Endpoints called: none — static legal copy
- Backend gate(s): none/public
- Route guard: public (`web/src/App.tsx:171`)
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH.

### Route: /terms (TermsPage)
- Endpoints called: none — static legal copy
- Backend gate(s): none/public
- Route guard: public (`web/src/App.tsx:172`)
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH.

### Route: /__debug-profile (DebugProfileSettings)
- Renders `ProfileSettingsDialog` (same dialog as the normal in-app profile menu). Endpoints traced:
  - `authApi.me()` → `GET /api/v1/auth/me` (`ProfileSettingsDialog.tsx:62`)
  - `authApi.changePassword()` → `POST /api/v1/auth/change-password` (`:81`)
  - `authApi.logout()` → `POST /api/v1/auth/logout` (`:94`)
  - `authApi.listSessions()` / `revokeSession()` → `GET/DELETE /api/v1/auth/sessions*` (`ActiveSessionsSection.tsx:34,43`)
  - MFA setup/enable/disable → `POST /api/v1/auth/mfa/*` (`useMfaSetup.ts:33,43,58`)
  - `subscriptionApi.get()` → `GET /api/v1/subscription` (`ProfileBillingSection.tsx:26` → `subscriptionApi.ts:76`)
  - `subscriptionApi.selectFree/checkout/portal()` → `POST /api/v1/subscription/{free,checkout,portal}` (`ProfileBillingSection.tsx:38,42,54`)
  - `apiClient.patch('/api/v1/users/me/preferences', ...)` (`ProfileGeneralSection.tsx:61`) — **⚠ side finding, not an auth issue:** no matching endpoint exists anywhere in the backend controllers (searched the whole `controller/` dir for `preferences`/`users/me`). Likely dead/broken call, silently caught. Not pursued further — flagging for whoever owns dark-mode-sync.
- Backend gate(s): `/me`,`/change-password`,`/logout`,`/sessions*`,`/mfa/*` → `@PreAuthorize("isAuthenticated()")` (`AuthController.java:42,132,69,90,98,142,152,161`). `GET /subscription` → any org role (`SubscriptionController.java:37`). `/subscription/{free,checkout,portal}` → `hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')` (`SubscriptionController.java:72,91,110`) — frontend hides those buttons via `canManage` but backend independently enforces it too.
- Route guard: `<ProtectedRoute />` with no `allowedRoles` — any authenticated user (`web/src/App.tsx:175-177`, commented "Dev-only debug tool — requires login")
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH — every mutating action is independently backend-gated at the correct tier regardless of the loose route guard.

### Route: /admin/*, /bank/*, /agent/* (LegacyRedirect)
- Endpoints called: none — pure client-side `Navigate` computed from `window.location.pathname` (`web/src/App.tsx:299-302`)
- Backend gate(s): n/a; the real check happens at the `/app/*` destination it redirects to
- Route guard: `<ProtectedRoute />` no `allowedRoles` (`App.tsx:278-280`), any authenticated user
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH — pure redirect, no data exposed.

### Route: / (LandingPage)
- Endpoints called: none — `getUserCache()` is a localStorage read (`axiosInstance.ts:118`), not a network call
- Backend gate(s): none/public
- Route guard: public (`App.tsx:286`)
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH.

### Route: /download (DownloadPage)
- Endpoints called: none — static hardcoded APK URL (`DownloadPage.tsx:16`)
- Backend gate(s): none/public
- Route guard: public (`App.tsx:287`)
- Sidebar: NOT IN SIDEBAR
- Verdict: MATCH.

**Batch A summary: 10/10 routes MATCH. 0 over-exposed, 0 under-exposed, 0 needs-review.**

---

## Batches B–H — NOT YET RUN

Each block below is a ready-to-paste agent prompt
(`subagent_type: general-purpose`, `run_in_background: true`, read-only —
no edits). Dispatch all 7 in parallel when resuming; wait for every
notification before compiling.

### Batch B: Dashboard/Loans/Collections cluster
Routes: `/app/dashboard`, `/app/allocations`, `/app/allocations/:id`,
`/app/assignments`, `/app/collections`, `/app/collections/trend`,
`/app/collections/:id`

```
You are doing READ-ONLY research in the RecoverPro repo at F:\f-final\recoverpro (web app: recoverpro/web, backend: recoverpro/server, Java Spring Boot + React/TypeScript). Do NOT edit, write, or create any file. Pure investigation; return findings as text in your final response.

CONTEXT: Auditing whether the frontend correctly mirrors backend authorization, per page. A prior automated attempt fabricated findings (invented endpoint names, wrote "simulated trace" instead of real analysis), so accuracy is critical — every claim must be backed by an exact file:line quote from a file you actually opened. If you can't find something after genuinely searching, say "not found — searched X" rather than guessing.

YOUR BATCH — audit exactly these routes (defined in recoverpro/web/src/App.tsx):
1. /app/dashboard → Dashboard (recoverpro/web/src/pages/Dashboard.tsx) — this page renders multiple independent stat cards/sections; identify EACH distinct endpoint it calls separately, since different cards may be gated differently
2. /app/allocations → LoansPage
3. /app/allocations/:id → LoanDetailPage (also check LoanDetailContent.tsx, LoanDetailHelpers.tsx which it likely uses)
4. /app/assignments → CaseAssignmentsPage (also check AssignCasePanel.tsx, AssignFoPanel.tsx, ReassignPanel.tsx if imported)
5. /app/collections → CollectionsPage (also check CollectionApprovalModal.tsx, CollectionDepositModal.tsx if imported)
6. /app/collections/trend → CollectionMomPage
7. /app/collections/:id → CollectionDetailPage (also check CollectionDetailContent.tsx, CollectionDetailDrawer.tsx)

FOR EACH ROUTE:
1. Open the page component file in recoverpro/web/src/pages/ (confirm exact filename via search if needed), plus any modal/drawer/panel component it directly imports and renders.
2. Find every distinct backend endpoint called — apiClient.get/post/put/patch/delete calls inline, or via wrapper functions in recoverpro/web/src/api/*.ts (e.g. allocationsApi.ts, a collections-related api file — check recoverpro/web/src/api/ for the right one). Quote exact file:line of each call site.
3. For each endpoint, find the matching controller in recoverpro/server/src/main/java/com/recoverpro/server/controller/*.java (likely AllocationController.java, CaseAssignmentsController or AssignmentController.java, CollectionController.java) and quote its @PreAuthorize (method- or class-level) with file:line. If none, say so.
4. In recoverpro/web/src/App.tsx, find which <ProtectedRoute allowedRoles={...}> wraps this route. Quote constant name + role list + file:line.
5. Search recoverpro/web/src/utils/navConfig.ts for this route's path as a `to:` value (including inside nested `children` arrays). Quote `alwaysFor`/`permissions` if found; if not found anywhere, write "NOT IN SIDEBAR" (expected/fine for :id detail routes reached by drilling in from a list — note that explicitly when it applies).
6. Classify each (endpoint, role) pairing: MATCH / OVER-EXPOSED (sidebar/route allows a role the backend actually denies) / UNDER-EXPOSED (backend allows a role, no sidebar/route path reaches it) / NEEDS REVIEW (dynamic/unclear auth, e.g. delegated to a service layer). Quote both the backend gate line and frontend evidence for every non-MATCH verdict — never assert a mismatch you can't cite both sides of.

OUTPUT FORMAT — return directly in your response, one subsection per route, per-endpoint if a page has several:
### Route: <path> (<Component>)
- Endpoint: <method + path> — Call site: <file:line>
  - Backend gate: <@PreAuthorize + file:line, or "none/public", or "not found — searched X">
  - Route guard: <constant + roles + file:line>
  - Sidebar: <alwaysFor + file:line, or "NOT IN SIDEBAR">
  - Verdict: <MATCH/OVER-EXPOSED/UNDER-EXPOSED/NEEDS REVIEW> — <one-line reason>
(repeat the Endpoint block for each distinct endpoint the page calls)

Keep your final response focused and evidence-dense, not padded with commentary.
```

### Batch C: Case-management cluster
Routes: `/app/non-contactables`, `/app/restructure-proposals`,
`/app/settlement-offers`, `/app/grievances`, `/app/ptps`

```
You are doing READ-ONLY research in the RecoverPro repo at F:\f-final\recoverpro (web: recoverpro/web, backend: recoverpro/server, Java Spring Boot + React/TypeScript). Do NOT edit, write, or create any file. Pure investigation; return findings as text in your final response.

CONTEXT: Auditing whether the frontend correctly mirrors backend authorization, per page. A prior automated attempt fabricated findings (invented endpoint names, wrote "simulated trace" instead of real analysis), so accuracy is critical — every claim must be backed by an exact file:line quote from a file you actually opened. If you can't find something after genuinely searching, say "not found — searched X" rather than guessing.

YOUR BATCH — audit exactly these routes (defined in recoverpro/web/src/App.tsx):
1. /app/non-contactables → NonContactablesPage
2. /app/restructure-proposals → RestructureProposalsPage (also check RestructureProposalCreateModal.tsx, RestructureProposalDetailDrawer.tsx if imported)
3. /app/settlement-offers → SettlementOffersPage (also check SettlementOfferCreateModal.tsx, SettlementOfferDetailDrawer.tsx)
4. /app/grievances → GrievancesPage (also check GrievanceCreateModal.tsx, GrievanceDetailDrawer.tsx)
5. /app/ptps → PtpsPage (also check PtpCreateModal.tsx, PtpDetailDrawer.tsx, PtpUpdateModal.tsx)

FOR EACH ROUTE:
1. Open the page component file in recoverpro/web/src/pages/, plus any modal/drawer component it directly imports and renders.
2. Find every distinct backend endpoint called — apiClient.get/post/put/patch/delete calls inline, or via wrapper functions in recoverpro/web/src/api/*.ts. Quote exact file:line of each call site.
3. For each endpoint, find the matching controller in recoverpro/server/src/main/java/com/recoverpro/server/controller/*.java (likely NonContactableController.java, RestructureProposalController.java, SettlementOfferController.java, GrievanceController.java, PtpController.java) and quote its @PreAuthorize (method- or class-level) with file:line. If none, say so.
4. In recoverpro/web/src/App.tsx, find which <ProtectedRoute allowedRoles={...}> wraps this route. Quote constant name + role list + file:line.
5. Search recoverpro/web/src/utils/navConfig.ts for this route's path as a `to:` value (including nested `children`). Quote `alwaysFor`/`permissions` if found; if not found, write "NOT IN SIDEBAR".
6. Classify each (endpoint, role) pairing: MATCH / OVER-EXPOSED / UNDER-EXPOSED / NEEDS REVIEW. Quote both backend gate and frontend evidence for every non-MATCH verdict — never assert a mismatch you can't cite both sides of.

OUTPUT FORMAT — return directly in your response, one subsection per route, per-endpoint if the page calls several:
### Route: <path> (<Component>)
- Endpoint: <method + path> — Call site: <file:line>
  - Backend gate: <@PreAuthorize + file:line, or "none/public", or "not found — searched X">
  - Route guard: <constant + roles + file:line>
  - Sidebar: <alwaysFor + file:line, or "NOT IN SIDEBAR">
  - Verdict: <MATCH/OVER-EXPOSED/UNDER-EXPOSED/NEEDS REVIEW> — <one-line reason>

Keep your final response focused and evidence-dense, not padded with commentary.
```

### Batch D: Visits/field-worker cluster
Routes: `/app/visits`, `/app/visits/:id`, `/app/today`,
`/app/visits/:caseId/submit`, `/app/visits/:caseId/interview`,
`/app/calls`, `/app/my-cases`, `/app/my-attendance`, `/app/start-visit`

```
You are doing READ-ONLY research in the RecoverPro repo at F:\f-final\recoverpro (web: recoverpro/web, backend: recoverpro/server, Java Spring Boot + React/TypeScript). Do NOT edit, write, or create any file. Pure investigation; return findings as text in your final response.

CONTEXT: Auditing whether the frontend correctly mirrors backend authorization, per page. A prior automated attempt fabricated findings (invented endpoint names, wrote "simulated trace" instead of real analysis), so accuracy is critical — every claim must be backed by an exact file:line quote from a file you actually opened. If you can't find something after genuinely searching, say "not found — searched X" rather than guessing.

YOUR BATCH — audit exactly these routes (defined in recoverpro/web/src/App.tsx):
1. /app/visits → VisitsPage
2. /app/visits/:id → VisitDetailPage (also check VisitDetailContent.tsx, VisitDetailDrawer.tsx, VisitDrawerBody.tsx if imported)
3. /app/today → TodayVisitsPage
4. /app/visits/:caseId/submit → VisitSubmitPage (also check VisitSubmitHelpers.tsx)
5. /app/visits/:caseId/interview → VisitInterviewPage
6. /app/calls → CallsPage
7. /app/my-cases → MyCasesPage
8. /app/my-attendance → MyAttendancePage
9. /app/start-visit → StartVisitPage

FOR EACH ROUTE:
1. Open the page component file in recoverpro/web/src/pages/, plus any modal/drawer component it directly imports and renders.
2. Find every distinct backend endpoint called — apiClient.get/post/put/patch/delete calls inline, or via wrapper functions in recoverpro/web/src/api/*.ts (likely visitsApi.ts, callsApi.ts or similar, attendanceApi.ts). Quote exact file:line of each call site.
3. For each endpoint, find the matching controller in recoverpro/server/src/main/java/com/recoverpro/server/controller/*.java (likely VisitLogController.java, VisitSessionController.java, CallLogController.java, AttendanceController.java) and quote its @PreAuthorize (method- or class-level) with file:line. If none, say so.
4. In recoverpro/web/src/App.tsx, find which <ProtectedRoute allowedRoles={...}> wraps this route. Quote constant name + role list + file:line.
5. Search recoverpro/web/src/utils/navConfig.ts for this route's path as a `to:` value (including nested `children`, e.g. Today's Visits has a nested Start Visit child). Quote `alwaysFor`/`permissions` if found; if not found, write "NOT IN SIDEBAR".
6. Classify each (endpoint, role) pairing: MATCH / OVER-EXPOSED / UNDER-EXPOSED / NEEDS REVIEW. Quote both backend gate and frontend evidence for every non-MATCH verdict — never assert a mismatch you can't cite both sides of. Note: FO/CALLER/TRACER are the relevant roles for most of this batch — pay attention to whether CALLER specifically is included or excluded on both backend and frontend for each endpoint, since that distinction matters here.

OUTPUT FORMAT — return directly in your response, one subsection per route, per-endpoint if the page calls several:
### Route: <path> (<Component>)
- Endpoint: <method + path> — Call site: <file:line>
  - Backend gate: <@PreAuthorize + file:line, or "none/public", or "not found — searched X">
  - Route guard: <constant + roles + file:line>
  - Sidebar: <alwaysFor + file:line, or "NOT IN SIDEBAR">
  - Verdict: <MATCH/OVER-EXPOSED/UNDER-EXPOSED/NEEDS REVIEW> — <one-line reason>

Keep your final response focused and evidence-dense, not padded with commentary.
```

### Batch E: Reports/audit/uploads cluster
Routes: `/app/reports`, `/app/audit`, `/app/notifications`,
`/app/uploads`, `/app/uploads/:id/errors`, `/app/uploads/:id/data`

```
You are doing READ-ONLY research in the RecoverPro repo at F:\f-final\recoverpro (web: recoverpro/web, backend: recoverpro/server, Java Spring Boot + React/TypeScript). Do NOT edit, write, or create any file. Pure investigation; return findings as text in your final response.

CONTEXT: Auditing whether the frontend correctly mirrors backend authorization, per page. A prior automated attempt fabricated findings (invented endpoint names, wrote "simulated trace" instead of real analysis), so accuracy is critical — every claim must be backed by an exact file:line quote from a file you actually opened. If you can't find something after genuinely searching, say "not found — searched X" rather than guessing.

YOUR BATCH — audit exactly these routes (defined in recoverpro/web/src/App.tsx):
1. /app/reports → ReportsPage (also check ReportsAnalyticsPanel.tsx, ReportGenerateModal.tsx if imported — this page may be feature-gated/"locked" for some roles, note that too)
2. /app/audit → AuditPage
3. /app/notifications → NotificationsPage
4. /app/uploads → UploadsPage (also check UploadsModal.tsx if imported)
5. /app/uploads/:id/errors → UploadErrorsPage
6. /app/uploads/:id/data → UploadDataPage (also check UploadDataTable.tsx, UploadCell.tsx, UploadAddColumnModal.tsx, UploadAddRowForm.tsx if imported)

FOR EACH ROUTE:
1. Open the page component file in recoverpro/web/src/pages/, plus any modal/panel component it directly imports and renders.
2. Find every distinct backend endpoint called — apiClient.get/post/put/patch/delete calls inline, or via wrapper functions in recoverpro/web/src/api/*.ts (likely reportsApi.ts, auditApi.ts, notificationsApi.ts, an uploads-related api file). Quote exact file:line of each call site.
3. For each endpoint, find the matching controller in recoverpro/server/src/main/java/com/recoverpro/server/controller/*.java (likely ReportingController.java, AuditLogController.java, NotificationController.java, FileUploadController.java, UploadDataController.java) and quote its @PreAuthorize (method- or class-level) with file:line. If none, say so.
4. In recoverpro/web/src/App.tsx, find which <ProtectedRoute allowedRoles={...}> wraps this route. Quote constant name + role list + file:line.
5. Search recoverpro/web/src/utils/navConfig.ts for this route's path as a `to:` value (including nested `children`). Quote `alwaysFor`/`permissions` if found; if not found, write "NOT IN SIDEBAR". Note: /app/reports may also have a `locked: true` / feature-flag interaction worth noting if you find it.
6. Classify each (endpoint, role) pairing: MATCH / OVER-EXPOSED / UNDER-EXPOSED / NEEDS REVIEW. Quote both backend gate and frontend evidence for every non-MATCH verdict — never assert a mismatch you can't cite both sides of. Note: /app/notifications was recently deliberately removed from the sidebar (still routable) — if you find that, classify it correctly as "sidebar intentionally removed, page still reachable via other UI (e.g. a bell icon dialog) or direct URL" rather than automatically flagging it as UNDER-EXPOSED; check whether the roles that can reach it via the route guard still have SOME way to reach it in the UI (a bell/notification icon elsewhere) before concluding it's actually orphaned.

OUTPUT FORMAT — return directly in your response, one subsection per route, per-endpoint if the page calls several:
### Route: <path> (<Component>)
- Endpoint: <method + path> — Call site: <file:line>
  - Backend gate: <@PreAuthorize + file:line, or "none/public", or "not found — searched X">
  - Route guard: <constant + roles + file:line>
  - Sidebar: <alwaysFor + file:line, or "NOT IN SIDEBAR">
  - Verdict: <MATCH/OVER-EXPOSED/UNDER-EXPOSED/NEEDS REVIEW> — <one-line reason>

Keep your final response focused and evidence-dense, not padded with commentary.
```

### Batch F: Org-lead field/ops cluster
Routes: `/app/dispatch`, `/app/agents`, `/app/agents/:id`,
`/app/field-ops`, `/app/settings/schema`, `/app/attendance`,
`/app/calendar`, `/app/portfolio-risk`, `/app/settings/grievance-officer`

```
You are doing READ-ONLY research in the RecoverPro repo at F:\f-final\recoverpro (web: recoverpro/web, backend: recoverpro/server, Java Spring Boot + React/TypeScript). Do NOT edit, write, or create any file. Pure investigation; return findings as text in your final response.

CONTEXT: Auditing whether the frontend correctly mirrors backend authorization, per page. A prior automated attempt fabricated findings (invented endpoint names, wrote "simulated trace" instead of real analysis), so accuracy is critical — every claim must be backed by an exact file:line quote from a file you actually opened. If you can't find something after genuinely searching, say "not found — searched X" rather than guessing.

YOUR BATCH — audit exactly these routes (defined in recoverpro/web/src/App.tsx):
1. /app/dispatch → DailyDispatchPage (also check DispatchAgentPanel.tsx, DispatchCasePanel.tsx if imported)
2. /app/agents → AgentsPage
3. /app/agents/:id → AgentDetailPage (also check AgentDetailHelpers.tsx if imported)
4. /app/field-ops → FieldOpsPage (also check FieldOpsMapPanel.tsx, FieldOpsIncidentPanel.tsx, FieldOpsUtils.ts, SosLiveMonitor.tsx if imported — this page likely uses a WebSocket for live tracking in addition to REST, note that if found)
5. /app/settings/schema → ColumnSchemaPage (also check ColumnSchemaRowForm.tsx if imported)
6. /app/attendance → AttendancePage
7. /app/calendar → CalendarPage
8. /app/portfolio-risk → PortfolioRiskPage
9. /app/settings/grievance-officer → GrievanceOfficerSettingsPage

FOR EACH ROUTE:
1. Open the page component file in recoverpro/web/src/pages/, plus any modal/panel component it directly imports and renders.
2. Find every distinct backend endpoint called — apiClient.get/post/put/patch/delete calls inline, or via wrapper functions in recoverpro/web/src/api/*.ts. Quote exact file:line of each call site.
3. For each endpoint, find the matching controller in recoverpro/server/src/main/java/com/recoverpro/server/controller/*.java (likely DailyDispatchController.java, AgentFieldController.java or a dedicated AgentsController, ColumnSchemaController.java, AttendanceController.java, CalendarController.java, PlatformStatsController.java or a portfolio-risk-specific one, GrievanceOfficerController.java) and quote its @PreAuthorize (method- or class-level) with file:line. If none, say so.
4. In recoverpro/web/src/App.tsx, find which <ProtectedRoute allowedRoles={...}> wraps this route. Quote constant name + role list + file:line.
5. Search recoverpro/web/src/utils/navConfig.ts for this route's path as a `to:` value (including nested `children` — /app/agents, /app/field-ops, /app/attendance are nested under a "Field" parent item; /app/calendar and /app/settings/grievance-officer are nested under "User Setup"). Quote `alwaysFor`/`permissions` if found; if not found, write "NOT IN SIDEBAR".
6. Classify each (endpoint, role) pairing: MATCH / OVER-EXPOSED / UNDER-EXPOSED / NEEDS REVIEW. Quote both backend gate and frontend evidence for every non-MATCH verdict — never assert a mismatch you can't cite both sides of. These routes' frontend guard is broad (ORG_ADMIN+MANAGER+TL) but several are deliberately hidden from ORG_ADMIN's sidebar (a documented, intentional "field-day tools are MANAGER/TL only" design choice, not a bug) — if backend ALSO allows ORG_ADMIN for these endpoints, classify as MATCH (route+backend agree; sidebar is just curated narrower on purpose) rather than UNDER-EXPOSED, and say so explicitly.

OUTPUT FORMAT — return directly in your response, one subsection per route, per-endpoint if the page calls several:
### Route: <path> (<Component>)
- Endpoint: <method + path> — Call site: <file:line>
  - Backend gate: <@PreAuthorize + file:line, or "none/public", or "not found — searched X">
  - Route guard: <constant + roles + file:line>
  - Sidebar: <alwaysFor + file:line, or "NOT IN SIDEBAR">
  - Verdict: <MATCH/OVER-EXPOSED/UNDER-EXPOSED/NEEDS REVIEW> — <one-line reason>

Keep your final response focused and evidence-dense, not padded with commentary.
```

### Batch G: Org-admin cluster
Routes: `/app/subscription`, `/app/users/requests`,
`/app/settings/organization`, `/app/borrowers`, `/app/fraud-cases`,
`/app/reconciliation`, `/app/users`, `/app/settings/roles`,
`/app/settings/message-templates`, `/app/payments/links`

```
You are doing READ-ONLY research in the RecoverPro repo at F:\f-final\recoverpro (web: recoverpro/web, backend: recoverpro/server, Java Spring Boot + React/TypeScript). Do NOT edit, write, or create any file. Pure investigation; return findings as text in your final response.

CONTEXT: Auditing whether the frontend correctly mirrors backend authorization, per page. A prior automated attempt fabricated findings (invented endpoint names, wrote "simulated trace" instead of real analysis), so accuracy is critical — every claim must be backed by an exact file:line quote from a file you actually opened. If you can't find something after genuinely searching, say "not found — searched X" rather than guessing.

YOUR BATCH — audit exactly these routes (defined in recoverpro/web/src/App.tsx):
1. /app/subscription → SubscriptionPage
2. /app/users/requests → UserRequestsPage (also check UserRequestsHelpers.tsx, UserRequestsReviewModal.tsx, UserRequestsSubmitModal.tsx if imported)
3. /app/settings/organization → OrganizationSettingsPage
4. /app/borrowers → BorrowersPage (also check BorrowerCreateModal.tsx, BorrowerDetailDrawer.tsx, BorrowersHelpers.tsx if imported)
5. /app/fraud-cases → FraudCasesPage (also check FraudCaseCreateModal.tsx, FraudCaseDetailDrawer.tsx if imported)
6. /app/reconciliation → ReconciliationPage (also check ReconciliationIngestModal.tsx, ReconciliationRunDetailDrawer.tsx if imported)
7. /app/users → UsersPage (also check UsersCreateModal.tsx, UsersEditModal.tsx, UsersPermissionsModal.tsx, UsersTable.tsx if imported)
8. /app/settings/roles → RoleManagementPage (also check RoleManagementRoleCard.tsx if imported)
9. /app/settings/message-templates → MessageTemplatesPage
10. /app/payments/links → PaymentLinksPage

FOR EACH ROUTE:
1. Open the page component file in recoverpro/web/src/pages/, plus any modal/drawer component it directly imports and renders.
2. Find every distinct backend endpoint called — apiClient.get/post/put/patch/delete calls inline, or via wrapper functions in recoverpro/web/src/api/*.ts. Quote exact file:line of each call site.
3. For each endpoint, find the matching controller in recoverpro/server/src/main/java/com/recoverpro/server/controller/*.java (likely SubscriptionController.java, UserCreationRequestController.java, OrganizationController.java, BorrowerController.java, FraudCaseController.java, ReconciliationController.java, UserController.java, RoleController.java, MessageTemplateController.java, PaymentController.java) and quote its @PreAuthorize (method- or class-level) with file:line. If none, say so.
4. In recoverpro/web/src/App.tsx, find which <ProtectedRoute allowedRoles={...}> wraps this route. Quote constant name + role list + file:line.
5. Search recoverpro/web/src/utils/navConfig.ts for this route's path as a `to:` value (including nested `children` — most of these are nested under "User Setup" or "Loans" or "Dashboard"). Quote `alwaysFor`/`permissions` if found; if not found, write "NOT IN SIDEBAR". NOTE: Borrowers, Fraud Cases, Reconciliation, and Payment Links nav entries were RECENTLY corrected in a prior pass to alwaysFor: ['ORG_ADMIN'] (Borrowers, Fraud Cases, Reconciliation) and alwaysFor: ['ORG_ADMIN','FO'] (Payment Links) specifically to match backend @PreAuthorize — verify this correction is actually still in place and actually correct against what you find in the real controller files (don't just trust this note, confirm it independently).
6. Classify each (endpoint, role) pairing: MATCH / OVER-EXPOSED / UNDER-EXPOSED / NEEDS REVIEW. Quote both backend gate and frontend evidence for every non-MATCH verdict — never assert a mismatch you can't cite both sides of.

OUTPUT FORMAT — return directly in your response, one subsection per route, per-endpoint if the page calls several:
### Route: <path> (<Component>)
- Endpoint: <method + path> — Call site: <file:line>
  - Backend gate: <@PreAuthorize + file:line, or "none/public", or "not found — searched X">
  - Route guard: <constant + roles + file:line>
  - Sidebar: <alwaysFor + file:line, or "NOT IN SIDEBAR">
  - Verdict: <MATCH/OVER-EXPOSED/UNDER-EXPOSED/NEEDS REVIEW> — <one-line reason>

Keep your final response focused and evidence-dense, not padded with commentary.
```

### Batch H: Platform-admin cluster
Routes: `/platform/dashboard`, `/platform/subscriptions`,
`/platform/revenue-trend`, `/platform/setup`, `/platform/feature-flags`,
`/app/lucien/admin`

```
You are doing READ-ONLY research in the RecoverPro repo at F:\f-final\recoverpro (web: recoverpro/web, backend: recoverpro/server, Java Spring Boot + React/TypeScript). Do NOT edit, write, or create any file. Pure investigation; return findings as text in your final response.

CONTEXT: Auditing whether the frontend correctly mirrors backend authorization, per page. A prior automated attempt fabricated findings (invented endpoint names, wrote "simulated trace" instead of real analysis), so accuracy is critical — every claim must be backed by an exact file:line quote from a file you actually opened. If you can't find something after genuinely searching, say "not found — searched X" rather than guessing.

YOUR BATCH — audit exactly these routes (defined in recoverpro/web/src/App.tsx, all under the PLATFORM_ONLY guard):
1. /platform/dashboard → PlatformDashboard
2. /platform/subscriptions → PlatformSubscriptions
3. /platform/revenue-trend → PlatformRevenueTrendPage
4. /platform/setup → PlatformSetupPage (also check PlatformSetupOrgModals.tsx, PlatformSetupOrgsTab.tsx, PlatformSetupShared.tsx, PlatformSetupUserModals.tsx, PlatformSetupUsersTab.tsx if imported)
5. /platform/feature-flags → FeatureFlagsPage
6. /app/lucien/admin → LucienAdminPage (wrapped in a FeatureGate flagKey="LUCIEN_AI"; also check LucienHelpers.ts, LucienHistoryPanel.tsx, LucienMessages.tsx, RagDocumentsPage.tsx, SystemPromptAdminPage.tsx if imported — this page likely has two tabs: system prompt and RAG documents, backed by different controllers)

FOR EACH ROUTE:
1. Open the page component file in recoverpro/web/src/pages/, plus any modal/tab component it directly imports and renders.
2. Find every distinct backend endpoint called — apiClient.get/post/put/patch/delete calls inline, or via wrapper functions in recoverpro/web/src/api/*.ts. Quote exact file:line of each call site.
3. For each endpoint, find the matching controller in recoverpro/server/src/main/java/com/recoverpro/server/controller/*.java (likely PlatformStatsController.java, PlatformAnalyticsController.java, PlatformSubscriptionController.java, PlatformOrganizationController.java, PlatformSetupController.java, FeatureFlagAdminController.java or FeatureFlagController.java, SystemPromptAdminController.java, RagDocumentAdminController.java, LucienController.java) and quote its @PreAuthorize (method- or class-level) with file:line. If none, say so.
4. In recoverpro/web/src/App.tsx, find which <ProtectedRoute allowedRoles={...}> wraps this route (should be PLATFORM_ONLY = ['PLATFORM_ADMIN'] for all of these — verify by reading the actual constant definition near the top of App.tsx, don't just assume). Quote constant name + role list + file:line.
5. Search recoverpro/web/src/utils/navConfig.ts for this route's path as a `to:` value (including nested `children` — Platform Setup, Feature Flags, and Lucien each have query-string-tab children, e.g. /platform/setup?tab=users). Quote `alwaysFor`/`permissions` if found; if not found, write "NOT IN SIDEBAR". Note: /platform/revenue-trend is deliberately NOT in the sidebar (documented as a drill-down reachable from within the Billing/Dashboard page, not a sidebar destination) — if you confirm it's genuinely reachable via an in-page link/button from PlatformSubscriptions.tsx or PlatformDashboard.tsx, classify as MATCH with that noted; if you can't find any in-page link to it either, flag as UNDER-EXPOSED (orphaned, URL-only) and say exactly what you searched for and didn't find.
6. Classify each (endpoint, role) pairing: MATCH / OVER-EXPOSED / UNDER-EXPOSED / NEEDS REVIEW. Quote both backend gate and frontend evidence for every non-MATCH verdict — never assert a mismatch you can't cite both sides of.

OUTPUT FORMAT — return directly in your response, one subsection per route, per-endpoint if the page calls several:
### Route: <path> (<Component>)
- Endpoint: <method + path> — Call site: <file:line>
  - Backend gate: <@PreAuthorize + file:line, or "none/public", or "not found — searched X">
  - Route guard: <constant + roles + file:line>
  - Sidebar: <alwaysFor + file:line, or "NOT IN SIDEBAR">
  - Verdict: <MATCH/OVER-EXPOSED/UNDER-EXPOSED/NEEDS REVIEW> — <one-line reason>

Keep your final response focused and evidence-dense, not padded with commentary.
```

---

## After all batches finish
Compile every batch's findings into this file, replacing this "NOT YET RUN"
section, then spot-check a handful of claims (pick ~5 across different
batches, re-open the exact files cited) before treating the report as
trustworthy. Write a final summary: total MATCH / OVER-EXPOSED /
UNDER-EXPOSED / NEEDS REVIEW across all 64 routes.
