# Dashboard Layout-C Redesign

**Date:** 2026-05-26  
**Status:** Approved

## Goal

Rearrange the dashboard into the Layout-C bento grid (Tactical Ops structure) while keeping all existing app color tokens unchanged. No new colors, no forced dark backgrounds — only the grid structure and KPI tile treatment from Layout C.

## Color Contract

All colors come from existing CSS custom properties:
- Backgrounds: `var(--bg-canvas)`, `var(--bg-surface)`, `var(--bg-subtle)`
- Semantic tints: `var(--success-subtle)`, `var(--info-subtle)`, `var(--warn-subtle)`, `var(--violet-subtle)`
- Text: `var(--ink-primary)`, `var(--ink-secondary)`, `var(--ink-tertiary)`
- Borders: `var(--border)`, `var(--border-strong)`
- Accent: `var(--accent)`

No inline hex values, no forced dark overrides.

## Layout-C Grid Structure

### OrgAdminView (ADMIN / MANAGER / TL)

```
┌─────────────────────────────────────────────────────────────┐
│  KPI TILE ROW — 4 tinted tiles                              │
│  [Unassigned·success-subtle] [Book·info-subtle]             │
│  [Active PTPs·warn-subtle]   [PTP Rate·violet-subtle]       │
└─────────────────────────────────────────────────────────────┘
┌──────────────────────────┬─────────────┬────────────────────┐
│                          │  Dispatch   │  Efficiency ring   │
│  Monthly Trend Chart     │  status     │                    │
│  (col-span 2, row-span 2)├─────────────┴────────────────────┤
│                          │  PTP summary (condensed)         │
└──────────────────────────┴──────────────────────────────────┘
┌─────────────────┬───────────────────┬────────────────────────┐
│ Pending         │  PTPs due today   │  Recent Collections    │
│ Approvals       │                   │                        │
└─────────────────┴───────────────────┴────────────────────────┘
┌─────────────────────────────┬──────────────────────────────┐
│  Agent Leaderboard          │  Visit Completion Rate       │
└─────────────────────────────┴──────────────────────────────┘
```

### FieldView (FO / CALLER / TRACER)

```
┌─────────────────────────────────────────────────────────┐
│  KPI TILE ROW — 4 tiles (total, assigned, unassigned, vol)│
└─────────────────────────────────────────────────────────┘
┌─────────────────────────┬───────────────────────────────┐
│  PTPs due today (hero)  │  Case status card             │
└─────────────────────────┴───────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  Recent Collections (full width)                        │
└─────────────────────────────────────────────────────────┘
```

### PlatformView (PLATFORM_ADMIN)

```
┌─────────────────────────────────────────────────────────┐
│  KPI TILE ROW — 6 tiles (orgs, active, users, allocs,   │
│                           collections MTD, MoM growth)  │
└─────────────────────────────────────────────────────────┘
┌────────────────────────────────────┬────────────────────┐
│  System-wide trend chart (hero)    │  Top orgs list     │
│  (col-span 8)                      │  (col-span 4)      │
├────────────────────────────────────┴────────────────────┤
│  [Org status pie] [Platform summary] [Insight strip]    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  Organization directory table (full width)              │
└─────────────────────────────────────────────────────────┘
```

## KPI Tile Treatment

Replace the current `MetricBar` (flat horizontal bar of plain cells) with a row of tinted KPI tiles:

- Each tile: `border-radius: var(--radius)`, `padding: 14px 16px`, background from semantic subtle token
- Left border: 3px solid matching semantic color (success/info/warn/violet/accent)
- Value: large mono font (`font-size: 22px`, `font-weight: 700`)
- Label: small uppercase mono below the value
- Optional trend arrow (↑↓) with color coding
- On click: navigates to relevant page (same behavior as current MetricBar cells)

## Card Changes

Cards themselves keep `var(--bg-surface)` background. No structural changes to the Card component — only the grid slots they sit in change.

## CSS Changes

### Dashboard.layout.css
- Replace `.dash-metricbar` with `.dash-kpi-row` grid of tinted tiles
- New `.dash-kpi-tile` component with subtle-tinted bg + left border
- New bento grid template for OrgAdmin: named areas (chart, dispatch, ring, ptp, approvals, ptps-today, recent, leaders, visits)
- New bento grid template for Field: named areas (hero-ptps, cases, recent)
- Platform bento: adjust to match 8/4 col split for hero chart

### Dashboard.base.css
- No changes needed

### Dashboard.card-base.css / Dashboard.card-widgets.css / Dashboard.tables.css
- No changes needed

## TSX Changes

### DashboardCommon.tsx
- `MetricBar` component: replace rendered output with `.dash-kpi-row` + `.dash-kpi-tile` elements
- Keep the same props interface (`metrics` array with `label`, `value`, `trend`, `to`)

### DashboardOrgView.tsx
- `OrgAdminView`: replace `<section className="dash-tier">` tiers with single bento grid using named CSS grid areas
- Remove tier labels ("Action queue", "Today", etc.) — layout communicates hierarchy
- `FieldView`: replace current bento with field-specific grid

### DashboardPlatformView.tsx
- `PlatformView`: adjust bento class names to match new grid template areas

## Files Affected

| File | Change |
|---|---|
| `src/styles/Dashboard.layout.css` | KPI tile styles + new bento grid templates |
| `src/pages/DashboardCommon.tsx` | MetricBar → KPI tile output |
| `src/pages/DashboardOrgView.tsx` | OrgAdminView + FieldView grid structure |
| `src/pages/DashboardPlatformView.tsx` | PlatformView bento adjustments |

`DashboardWidgets.tsx`, `DashboardLists.tsx`, `Dashboard.tsx`, `Dashboard.base.css`, `Dashboard.card-base.css`, `Dashboard.card-widgets.css`, `Dashboard.tables.css` — **no changes**.

## Success Criteria

- Dashboard renders correctly in light mode and dark mode
- KPI tiles show correct tint colors (semantic subtle tokens only)
- All 3 views (Platform / OrgAdmin / Field) use the Layout-C bento grid
- No TypeScript errors (`npx tsc --noEmit` passes)
- No regressions in other pages
