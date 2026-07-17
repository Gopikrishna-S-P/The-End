# Dashboard Layout-C Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's flat tier layout with the Layout-C bento grid (named CSS grid areas) and upgrade the MetricBar into color-tinted KPI tiles, using only existing app color tokens.

**Architecture:** Four files change — `Dashboard.layout.css` adds KPI tile styles and named-area bento grids; `DashboardCommon.tsx` updates MetricBar output; `DashboardOrgView.tsx` replaces tier sections with the bento grid; `DashboardPlatformView.tsx` adds color props. Seven other dashboard files are untouched.

**Tech Stack:** React 18, TypeScript, CSS Grid (named areas), Vite HMR, existing CSS custom property token system.

---

## File Map

| File | What changes |
|---|---|
| `src/styles/Dashboard.layout.css` | Remove `.dash-metricbar`/`.dash-metric*`, add `.dash-kpi-*`, add `.dash-bento-org` named-area grid, update `.dash-bento-field`, update responsive rules |
| `src/pages/DashboardCommon.tsx` | `Metric` interface adds `color?`, `MetricBar` renders `.dash-kpi-row`/`.dash-kpi-tile` |
| `src/pages/DashboardOrgView.tsx` | `OrgAdminView` replaces 4 tier sections with single `dash-bento-org` grid; `FieldView` uses updated `dash-bento-field`; drop unused imports |
| `src/pages/DashboardPlatformView.tsx` | Add `color` props to the 6 MetricBar metrics |

**Unchanged:** `Dashboard.tsx`, `DashboardWidgets.tsx`, `DashboardLists.tsx`, `Dashboard.base.css`, `Dashboard.card-base.css`, `Dashboard.card-widgets.css`, `Dashboard.tables.css`

---

## Task 1: KPI tile CSS + bento-org grid (`Dashboard.layout.css`)

**Files:**
- Modify: `src/styles/Dashboard.layout.css`

- [ ] **Step 1: Replace metricbar CSS with KPI tile CSS**

Find and replace the entire `/* metric bar */` block (lines 49–70 in current file) with:

```css
/* kpi tile row */
.dash-kpi-row {
  display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr);
  gap:var(--dash-gap,16px); margin-bottom:var(--dash-section-gap,20px);
}
.dash-kpi-tile {
  display:flex; flex-direction:column; gap:4px;
  padding:14px var(--dash-card-px,16px);
  background:var(--bg-surface); border:1px solid var(--border);
  border-left:3px solid var(--border-strong);
  border-radius:var(--radius-md); min-width:0;
}
.dash-kpi-tile.is-green  { background:var(--success-subtle); border-left-color:var(--success); }
.dash-kpi-tile.is-blue   { background:var(--info-subtle);    border-left-color:var(--info); }
.dash-kpi-tile.is-amber  { background:var(--warn-subtle);    border-left-color:var(--warn); }
.dash-kpi-tile.is-violet { background:var(--violet-subtle);  border-left-color:var(--violet); }
.dash-kpi-tile.is-accent { background:var(--accent-wash);    border-left-color:var(--accent); }
.dash-kpi-link { text-decoration:none; color:inherit; display:block; border-radius:var(--radius-md); }
.dash-kpi-link:hover .dash-kpi-tile { filter:brightness(0.97); }
.dash-kpi-val { font-family:var(--mono); font-size:22px; font-weight:700; line-height:1; letter-spacing:-0.03em; color:var(--ink-primary); }
.dash-kpi-lbl { font-family:var(--mono); font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.085em; color:var(--ink-tertiary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dash-kpi-delta { display:inline-flex; align-items:center; gap:3px; font-family:var(--mono); font-size:11px; font-weight:600; letter-spacing:-0.01em; white-space:nowrap; margin-top:2px; }
.dash-kpi-delta.is-up   { color:var(--success); }
.dash-kpi-delta.is-down { color:var(--error-red); }
.dash-kpi-delta.is-flat { color:var(--ink-tertiary); }
```

- [ ] **Step 2: Replace bento + tier grid CSS**

Find the entire `/* bento grid */` and `/* priority tiers */` blocks and replace with:

```css
/* bento base */
.dash-bento { display:grid; gap:var(--gap-md,16px); margin-bottom:24px; }
.dash-bento > *, .dash-bento-org > *, .dash-bento-field > * { min-width:0; display:flex; }
.dash-bento > * > .dash-card,
.dash-bento-org > * > .dash-card,
.dash-bento-field > * > .dash-card { width:100%; }
.dash-bento > *, .dash-bento-org > *, .dash-bento-field > * { animation:dash-rise 380ms var(--ease) both; }
.dash-bento > *:nth-child(2), .dash-bento-org > *:nth-child(2), .dash-bento-field > *:nth-child(2) { animation-delay:50ms; }
.dash-bento > *:nth-child(3), .dash-bento-org > *:nth-child(3), .dash-bento-field > *:nth-child(3) { animation-delay:100ms; }
.dash-bento > *:nth-child(4), .dash-bento-org > *:nth-child(4)                                      { animation-delay:150ms; }
@keyframes dash-rise { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }

/* platform bento (12-col) */
.dash-bento.dash-bento-platform { grid-template-columns:repeat(12,1fr); grid-auto-flow:dense; }
.dash-bento-platform .bento-hero    { grid-column:span 8; }
.dash-bento-platform .bento-toporgs { grid-column:span 4; }
.dash-bento-platform .bento-status  { grid-column:span 5; }
.dash-bento-platform .bento-summary { grid-column:span 7; }

/* org admin bento (named areas) */
.dash-bento-org {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  grid-template-areas:
    "chart     dispatch    ring"
    "chart     ptp         ptp"
    "approvals ptps-today  recent"
    "leaders   visits      team";
  gap:var(--gap-md,16px); margin-bottom:24px;
}
.dash-bento-org .bento-chart      { grid-area:chart; }
.dash-bento-org .bento-dispatch   { grid-area:dispatch; }
.dash-bento-org .bento-ring       { grid-area:ring; }
.dash-bento-org .bento-ptp        { grid-area:ptp; }
.dash-bento-org .bento-approvals  { grid-area:approvals; }
.dash-bento-org .bento-ptps-today { grid-area:ptps-today; }
.dash-bento-org .bento-recent     { grid-area:recent; }
.dash-bento-org .bento-leaders    { grid-area:leaders; }
.dash-bento-org .bento-visits     { grid-area:visits; }
.dash-bento-org .bento-team       { grid-area:team; }

/* field bento (2-col with named areas) */
.dash-bento-field {
  display:grid;
  grid-template-columns:1fr 1fr;
  grid-template-areas:
    "hero-ptps  cases"
    "recent     recent";
  gap:var(--gap-md,16px); margin-bottom:24px;
}
.dash-bento-field .bento-hero   { grid-area:hero-ptps; }
.dash-bento-field .bento-cases  { grid-area:cases; }
.dash-bento-field .bento-recent { grid-area:recent; }

.dash-grid-1 { margin-bottom:24px; }
```

- [ ] **Step 3: Update responsive rules**

Find the `/* responsive */` block and replace with:

```css
/* responsive */
@media (max-width:1100px) {
  .dash-bento.dash-bento-platform { grid-template-columns:repeat(6,1fr); }
  .dash-bento-platform .bento-hero, .dash-bento-platform .bento-toporgs,
  .dash-bento-platform .bento-summary, .dash-bento-platform .bento-status { grid-column:span 6; }
  .dash-platform-strip { grid-template-columns:repeat(2,1fr); }
  .dash-bento-org { grid-template-columns:1fr 1fr; grid-template-areas:
    "chart      chart"
    "dispatch   ring"
    "ptp        ptp"
    "approvals  ptps-today"
    "recent     recent"
    "leaders    visits"
    "team       team"; }
}
@media (max-width:820px) {
  .dash-shell { padding:var(--dash-section-gap) 16px 56px; }
  .dash-page .dash-header, .dash-stats-strip { padding:0 16px; }
  .dash-bento.dash-bento-platform { grid-template-columns:1fr; }
  .dash-bento-platform .bento-hero, .dash-bento-platform .bento-toporgs,
  .dash-bento-platform .bento-status, .dash-bento-platform .bento-summary { grid-column:1/-1; }
  .dash-bento-org { grid-template-columns:1fr; grid-template-areas:
    "chart" "dispatch" "ring" "ptp" "approvals" "ptps-today" "recent" "leaders" "visits" "team"; }
  .dash-bento-field { grid-template-columns:1fr; grid-template-areas:"hero-ptps" "cases" "recent"; }
  .dash-kpi-row { grid-auto-flow:row; grid-template-columns:repeat(2,1fr); }
  .dash-ring-wrap { flex-direction:column; gap:14px; }
}
@media (max-width:640px) { .dash-header-center, .dash-header-org { display:none; } }
@media (max-width:480px) {
  .dash-platform-strip { grid-template-columns:1fr; }
  .dash-kpi-row { grid-template-columns:1fr; }
}
```

- [ ] **Step 4: Verify line count**

```bash
wc -l src/styles/Dashboard.layout.css
```

Expected: under 200 lines.

- [ ] **Step 5: Commit**

```bash
git add src/styles/Dashboard.layout.css
git commit -m "feat(dashboard): add KPI tile CSS and named-area bento grids"
```

---

## Task 2: MetricBar → KPI tiles (`DashboardCommon.tsx`)

**Files:**
- Modify: `src/pages/DashboardCommon.tsx:13-41`

- [ ] **Step 1: Update the Metric interface and MetricBar component**

Find the `interface Metric` declaration and the `MetricBar` export and replace both with:

```tsx
interface Metric { label: string; value: string; to?: string; trend?: number | null; color?: "green" | "blue" | "amber" | "violet" | "accent"; }

export const MetricBar = ({ metrics, loading }: { metrics: Metric[]; loading: boolean }) => (
  <div className="dash-kpi-row">
    {metrics.map(m => {
      const flat = m.trend == null || m.trend === 0;
      const cls = flat ? "is-flat" : m.trend! > 0 ? "is-up" : "is-down";
      const Icon = flat ? Minus : m.trend! > 0 ? ArrowUpRight : ArrowDownRight;
      const tile = (
        <div className={`dash-kpi-tile${m.color ? ` is-${m.color}` : ""}`}>
          {loading ? <Sk h={22} w={64} /> : <div className="dash-kpi-val">{m.value}</div>}
          <div className="dash-kpi-lbl">{m.label}</div>
          {!loading && m.trend != null && (
            <div className={`dash-kpi-delta ${cls}`}><Icon size={10} />{Math.abs(m.trend).toFixed(1)}%</div>
          )}
        </div>
      );
      return m.to
        ? <Link key={m.label} to={m.to} className="dash-kpi-link">{tile}</Link>
        : <div key={m.label}>{tile}</div>;
    })}
  </div>
);
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Check in browser**

Open http://localhost:3000, navigate to Dashboard. The top KPI bar should now show tinted tiles (green/blue/amber/violet left borders) instead of the flat horizontal bar. If no `color` prop is passed yet, tiles show the default `var(--bg-surface)` with grey left border — that's fine.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardCommon.tsx
git commit -m "feat(dashboard): MetricBar renders color-tinted KPI tiles"
```

---

## Task 3: OrgAdminView + FieldView bento grid (`DashboardOrgView.tsx`)

**Files:**
- Modify: `src/pages/DashboardOrgView.tsx`

- [ ] **Step 1: Replace the file content**

Overwrite `src/pages/DashboardOrgView.tsx` with:

```tsx
import { TrendingUp, Activity, Target, UserCheck } from "lucide-react";
import { Sk, Card, MetricBar, StatRow, TrendChart } from "./DashboardCommon";
import { fmtCurrency, fmtNum, fmtPct, ACCENT, INFO, VIOLET, trendColor } from "./DashboardUtils";
import { CollectionEfficiencyRing, DailyDispatchStatus, AgentLeaderboard } from "./DashboardWidgets";
import { PtpsDueToday, RecentCollections, PendingApprovalsQueue, VisitCompletionRate } from "./DashboardLists";
import type { DashboardData } from "./DashboardTypes";

const SkRows = ({ n = 4 }: { n?: number }) => (
  <>{[...Array(n)].map((_, i) => <div key={i} style={{ marginBottom: 8 }}><Sk h={32} /></div>)}</>
);

const OrgAdminView = ({ data, loading }: { data: DashboardData | null; loading: boolean }) => {
  const ov = data?.orgOverview;
  const co = data?.collections;
  const pt = data?.ptpSummary;
  const tm = data?.team;
  const orgId = ov?.organizationId ?? data?.organizationId ?? "";
  const hasPtp = !!pt && ((pt.activePtps ?? 0) + (pt.fulfilledPtpsThisMonth ?? 0) + (pt.brokenPtpsThisMonth ?? 0)) > 0;

  return (
    <>
      <MetricBar loading={loading} metrics={[
        { label: "Unassigned",       value: fmtNum(ov?.unassignedAllocations),                to: "/app/allocations", color: "amber" },
        { label: "Outstanding book", value: fmtCurrency(ov?.outstandingTotal),                to: "/app/allocations", color: "blue" },
        { label: "Active PTPs",      value: fmtNum(pt?.activePtps),                           to: "/app/ptps",        color: "amber" },
        { label: "PTP fulfillment",  value: hasPtp ? fmtPct(pt?.fulfillmentRatePct) : "—",    to: "/app/ptps",        color: "violet" },
      ]} />

      {orgId && (
        <div className="dash-bento-org">
          {co && (
            <div className="bento-chart">
              <Card title="Monthly collection trend" icon={TrendingUp} iconColor={trendColor(co.growthRate)}>
                <TrendChart data={co.monthlyTrend} color={trendColor(co.growthRate)} dataKey="totalAmount" loading={loading} height={290} />
              </Card>
            </div>
          )}
          <div className="bento-dispatch"><DailyDispatchStatus orgId={orgId} /></div>
          <div className="bento-ring">
            <CollectionEfficiencyRing
              collectedAmount={ov?.collectionVolumeThisMonth ?? co?.collectionVolumeThisMonth ?? 0}
              outstandingAmount={ov?.outstandingTotal ?? 0}
              loading={loading}
            />
          </div>
          {pt && (
            <div className="bento-ptp">
              <Card title="PTP summary" icon={Target} iconColor={VIOLET}>
                {loading ? <SkRows /> : (() => {
                  const dueToday = pt.dueTodayCount ?? 0;
                  const overdue = pt.overdueCount ?? 0;
                  const rate = pt.fulfillmentRatePct ?? 0;
                  const ratePct = Math.max(0, Math.min(100, Number(rate)));
                  const fillCls = ratePct >= 80 ? "" : ratePct >= 50 ? "is-warn" : "is-error";
                  return (
                    <>
                      <StatRow label="Due today" value={fmtNum(dueToday)} valueClass={dueToday > 0 ? "is-warn" : undefined} to={dueToday > 0 ? "/app/ptps?status=PENDING&due=today" : undefined} />
                      <StatRow label="Overdue" value={fmtNum(overdue)} valueClass={overdue > 0 ? "is-error" : undefined} to={overdue > 0 ? "/app/ptps?status=PENDING&overdue=true" : undefined} />
                      <StatRow label="Fulfilled this month" value={fmtNum(pt.fulfilledPtpsThisMonth)} valueClass="is-success" />
                      <StatRow label="Broken this month" value={fmtNum(pt.brokenPtpsThisMonth)} valueClass="is-error" to={pt.brokenPtpsThisMonth > 0 ? "/app/ptps?status=BROKEN" : undefined} />
                      <div className="dash-fulfillment-wrap">
                        <div className="dash-fulfillment-head">
                          <span className="dash-fulfillment-label">Fulfillment rate</span>
                          <span className="dash-fulfillment-pct">{fmtPct(rate)}</span>
                        </div>
                        <div className="dash-fulfillment-track">
                          <div className={`dash-fulfillment-fill ${fillCls}`} style={{ width: `${ratePct}%` }} />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </Card>
            </div>
          )}
          <div className="bento-approvals"><PendingApprovalsQueue orgId={orgId} /></div>
          <div className="bento-ptps-today"><PtpsDueToday orgId={orgId} /></div>
          <div className="bento-recent"><RecentCollections orgId={orgId} /></div>
          <div className="bento-leaders"><AgentLeaderboard orgId={orgId} /></div>
          <div className="bento-visits"><VisitCompletionRate orgId={orgId} /></div>
          {tm && (
            <div className="bento-team">
              <Card title="Team composition" icon={UserCheck} iconColor={INFO}>
                {loading ? <SkRows /> : (
                  <>
                    <StatRow label="Total members" value={fmtNum(tm.totalUsers)} />
                    <StatRow label="Active" value={fmtNum(tm.activeUsers)} valueClass="is-success" />
                    {tm.usersByRole?.map(r => (
                      <StatRow key={r.roleName} label={r.roleName.replace("ROLE_", "")} value={fmtNum(r.count)} />
                    ))}
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  );
};

const FieldView = ({ data, loading }: { data: DashboardData | null; loading: boolean }) => {
  const ov = data?.orgOverview;
  const al = data?.allocations;
  const orgId = ov?.organizationId ?? data?.organizationId ?? "";

  return (
    <>
      <MetricBar loading={loading} metrics={[
        { label: "Total cases", value: fmtNum(ov?.totalAllocations),               to: "/app/allocations", color: "blue" },
        { label: "Assigned",    value: fmtNum(ov?.assignedAllocations),            to: "/app/allocations", color: "green" },
        { label: "Unassigned",  value: fmtNum(ov?.unassignedAllocations),          to: "/app/allocations", color: "amber" },
        { label: "Volume MTD",  value: fmtCurrency(ov?.collectionVolumeThisMonth), to: "/app/collections", color: "violet" },
      ]} />
      <div className="dash-bento-field">
        {orgId && <div className="bento-hero"><PtpsDueToday orgId={orgId} /></div>}
        {al && (
          <div className="bento-cases">
            <Card title="Case status" icon={Activity} iconColor={ACCENT}>
              {loading ? <SkRows n={4} /> : (
                <>
                  <StatRow label="Total loans" value={fmtNum(al.totalAllocations)} />
                  <StatRow label="Unassigned"  value={fmtNum(al.unassignedCount)}  valueClass="is-warn" />
                  <StatRow label="Assigned"    value={fmtNum(al.assignedCount)}    valueClass="is-info" />
                  <StatRow label="Flagged"     value={fmtNum(al.npaFlaggedCount)}  valueClass="is-error" />
                </>
              )}
            </Card>
          </div>
        )}
        {orgId && <div className="bento-recent"><RecentCollections orgId={orgId} /></div>}
      </div>
    </>
  );
};

export { OrgAdminView, FieldView };
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Check in browser (OrgAdmin role)**

Navigate to Dashboard as an ORG_ADMIN or MANAGER user. Verify:
- 4 color-tinted KPI tiles at top (amber/blue/amber/violet)
- 3-column bento grid: trend chart (left, tall) | dispatch + ring (right, stacked) | PTP summary (right, spans 2 cols)
- 3-column row: pending approvals | PTPs today | recent collections
- 3-column row: leaderboard | visit completion | team composition

- [ ] **Step 4: Check in browser (Field role)**

Navigate to Dashboard as a FO/CALLER/TRACER user. Verify:
- 4 color-tinted KPI tiles (blue/green/amber/violet)
- 2-column grid: PTPs due today (left) | Case status (right)
- Full-width: recent collections

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardOrgView.tsx
git commit -m "feat(dashboard): replace tier layout with Layout-C named-area bento grid"
```

---

## Task 4: PlatformView color props (`DashboardPlatformView.tsx`)

**Files:**
- Modify: `src/pages/DashboardPlatformView.tsx:141-148`

- [ ] **Step 1: Add color props to the MetricBar call in PlatformView**

Find this block inside `PlatformView`:

```tsx
      <MetricBar loading={loading} metrics={[
        { label: "Organizations",   value: fmtNum(p?.totalOrganizations) },
        { label: "Active orgs",     value: fmtNum(p?.activeOrganizations) },
        { label: "Total users",     value: fmtNum(p?.totalUsers) },
        { label: "Allocations",     value: fmtNum(p?.totalAllocations) },
        { label: "Collections MTD", value: fmtNum(p?.totalCollectionsThisMonth), trend: p?.collectionGrowthRate ?? null },
        { label: "MoM growth",      value: fmtPct(p?.collectionGrowthRate),      trend: p?.collectionGrowthRate ?? null },
      ]} />
```

Replace with:

```tsx
      <MetricBar loading={loading} metrics={[
        { label: "Organizations",   value: fmtNum(p?.totalOrganizations),                                      color: "blue" },
        { label: "Active orgs",     value: fmtNum(p?.activeOrganizations),                                     color: "green" },
        { label: "Total users",     value: fmtNum(p?.totalUsers),                                              color: "violet" },
        { label: "Allocations",     value: fmtNum(p?.totalAllocations),                                        color: "amber" },
        { label: "Collections MTD", value: fmtNum(p?.totalCollectionsThisMonth), trend: p?.collectionGrowthRate ?? null, color: "green" },
        { label: "MoM growth",      value: fmtPct(p?.collectionGrowthRate),      trend: p?.collectionGrowthRate ?? null, color: "accent" },
      ]} />
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Check in browser (Platform role)**

Navigate to Dashboard as a PLATFORM_ADMIN user. Verify:
- 6 color-tinted KPI tiles (blue/green/violet/amber/green/accent)
- Bento grid: trend chart (8 cols) + top orgs (4 cols)
- Org status pie + platform summary below
- Org directory table at full width

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPlatformView.tsx
git commit -m "feat(dashboard): add color props to platform MetricBar KPI tiles"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Check light mode and dark mode**

In the browser, toggle dark mode. Verify:
- KPI tiles switch to dark subtle tints correctly (the `--success-subtle`, `--info-subtle`, etc. tokens are already dark-mode aware from `Dashboard.base.css`)
- Card backgrounds stay `var(--bg-surface)` in both modes
- No hardcoded hex values causing contrast issues

- [ ] **Step 3: Check responsive at 820px**

Resize browser to 820px width. Verify:
- OrgAdmin: bento collapses to 2-col, then 1-col at 480px
- KPI tiles wrap to 2 per row at 820px, 1 per row at 480px

- [ ] **Step 4: Verify no regressions on other pages**

Navigate to Allocations, Collections, PTPs, Reports, Dispatch pages and confirm they render normally.
