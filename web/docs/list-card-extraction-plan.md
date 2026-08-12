# LoansPage design extraction — full-page spec

**Goal:** extract *everything* that defines LoansPage's look — page shell, height chain,
page header, error banner, card, rows, filter modal, icon scale, motion — into a
reusable layer, then point the other list pages at it.

**Hard rule: LoansPage must render pixel-identical when you are done.** It is the
reference, not a page to improve. Every value below was read out of its current
inline styles and `src/styles/LoansPage.css` verbatim. If a swap would change how Loans
looks, the swap is wrong.

---

## Part 0 — ONE DECISION NEEDED BEFORE YOU START

LoansPage has **no `<h1>` page title.** Its header is only a context sentence
("You have 1,234 total loans registered on file"). But a previous session standardised
5 other pages onto a 20px/700 `<h1 className="dd-page-title">`.

So "make everything exactly like Loans" and "keep the page titles" conflict.

**Default assumed by this document: option (a).** Do not proceed with a different option
without explicit sign-off.

| | Option | Consequence |
|---|---|---|
| **(a)** | Keep the `<h1>` on all pages; standardise Loans' *context sentence* as a shared class beneath it, and **add** a context sentence to Loans-style pages that lack one | Nothing already approved gets reverted. Loans gains an `<h1>` for consistency. |
| (b) | Follow Loans literally — remove `<h1>` everywhere, context sentence only | Reverts the page-title unification approved earlier. |
| (c) | Leave both as-is, unify nothing in the page header | Header stays the least consistent region of the app. |

Under (a), **LoansPage gains `<h1 className="dd-page-title">Loans</h1>`** as the first
child of `.db-page-header-left`. This is the one intentional visual change to LoansPage
in this whole task — call it out separately in your report.

---

## Part 1 — complete design inventory

Everything LoansPage's look is made of, by region. This is the reference; Part 2 turns
it into CSS.

### 1.1 Page shell + height chain

Currently `src/styles/LoansPage.css` via `.alloc-root` (`<div className="db-root alloc-root">`):

| Selector | Value | Note |
|---|---|---|
| `.alloc-root` | `height:100%; overflow:hidden` | |
| `.alloc-root .db-content` | `display:flex; flex-direction:column; min-height:0; overflow:hidden; padding-bottom:36px` | base `.db-content` is `padding: 20px 24px 64px` |
| `.alloc-root .dd-shell` | `flex:1; min-height:0; overflow:hidden` | plus inline `display:flex` on the element |
| `.alloc-root .dd-cases-card` | `height:auto; flex:1; min-height:0` | now redundant — `.is-list-card` already does this |

**`.db-fill-root` (in `pages/Dashboard.css`, ~line 214) is an exact generic equivalent**
and already covers `.db-content` / `.db-inner` / `.dd-main-container` / `.dd-grid`. It
does **not** yet cover `.dd-shell`. Part 2 adds that.

**Dead rules in `LoansPage.css` — verify then delete.** LoansPage's rows are
`db-att-row`, not `dd-case-row`, so these five never match anything:
`.alloc-root .dd-case-row`, `.alloc-root .dd-cases-card`, `.alloc-root .dd-case-borrower`,
`.alloc-root .dd-case-loan`, `.alloc-root .dd-case-product`.

> ⚠️ **Do not over-delete.** LoansPage *does* use `dd-case-dpd` (the DPD severity pill).
> That class lives in `DailyDispatch.cases.css` and is not overridden in `LoansPage.css`
> — leave it completely alone. Before deleting, run
> `grep -n "dd-case-row\|dd-cases-card\|dd-case-borrower\|dd-case-loan\|dd-case-product" src/pages/LoansPage.tsx`
> and confirm zero matches.

Also verify `.alloc-root .db-page-org` — LoansPage may not render a `db-page-org` element
at all (it uses the `<p>` context sentence instead), in which case that rule is dead too.
Check before deleting.

### 1.2 Page header

```jsx
<div className="db-page-header">                        {/* flex, space-between, wrap, gap 16, margin-bottom 16 */}
  <div className="db-page-header-left"
       style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4 }}>
    <p style={{ fontSize:13, color:'var(--ink-tertiary)', fontWeight:400,
                fontFamily:'var(--font-sans)', margin:0 }}>
      You have <strong>{n} total loans</strong> registered on file.
    </p>
  </div>
  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
    <button className={`ds-btn ${active ? 'is-primary' : 'is-secondary'}`}
            title="Filter" aria-label="Filter">
      <SlidersHorizontal size={14} />
    </button>
  </div>
</div>
```

Note `.db-page-header-left`'s base class is `display:flex; align-items:center; gap:20px`
(row) — Loans overrides it inline to a 4px-gap column. That override becomes the shared
class in Part 2.

### 1.3 Error banner

```jsx
<motion.div className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
  initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
  transition={{duration:0.22}}>
  <AlertCircle size={16} className="db-error-icon" />
  <div className="db-error-body">
    <span className="db-error-title">Loans could not be loaded.</span>
    <span className="db-error-sub">Check your connection or try refreshing the page.</span>
  </div>
  <button className="db-error-retry"><RefreshCw size={14} /></button>   {/* retry */}
  <button className="db-error-retry"><X size={14} /></button>            {/* dismiss */}
</motion.div>
```

Only inline value: `marginBottom: 24`. Everything else is already shared `db-error-*`
classes. Copy this structure — including both retry **and** dismiss buttons — to any page
whose banner is missing one.

### 1.4 Card, header, search, filter bar, body, rows

See the mapping table in Part 3.2 — these are the values already being extracted.

### 1.5 Filter modal

Already fully shared — `Modal` / `FormSection` / `Input` / `ModalFooter` from
`./PlatformSetupShared`. The only page-level styling is the agent `<select>`:

```jsx
<div className="ds-field">
  <label className="ds-label">Agent</label>
  <div className="ps-select-wrap">
    <select className="ds-select" style={{ width:'100%', paddingRight:30,
      appearance:'none', WebkitAppearance:'none',
      textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>
    <ChevronDown size={13} style={{ position:'absolute', right:10, top:'50%',
      transform:'translateY(-50%)', color:'var(--ink-tertiary)', pointerEvents:'none' }} />
  </div>
</div>
```

Modal copy pattern: `title="Filter loans"`, `subtitle="Narrow down the portfolio list"`,
footer `label="Apply filters"`. Any page with a filter dialog should match this shape.

### 1.6 Icon size scale

| Size | Used for |
|---|---|
| 32 | empty-state icon |
| 16 | error-banner icon, row chevron |
| 14 | header action buttons (filter/refresh), search icon, search clear, banner retry/dismiss |
| 13 | row leading icon, select chevron |
| 11 | filter-chip clear (×) |

### 1.7 Motion

LoansPage's local consts:

```js
const stagger = { hidden:{}, show:{ transition:{ staggerChildren:0.04, delayChildren:0.02 } } };
const fadeUp  = { hidden:{opacity:0}, show:{ opacity:1, transition:{ duration:0.35, ease:'easeOut' } } };
const fadeIn  = { hidden:{opacity:0}, show:{ opacity:1, transition:{ duration:0.22, ease:'easeOut' } } };
```

Other pages define same-named consts with **different** values (e.g. FraudCasesPage's
`fadeUp` adds `y:12` and uses `duration:0.32` with a cubic-bezier ease). Under this spec
the Loans values above are canonical.

> Normalise these **in place** — edit each page's local consts to the canonical values.
> Do **not** create a shared motion module; that restructures imports for no visual gain.

### 1.8 Stylesheet import tangle (report only — do not fix)

LoansPage imports seven stylesheets, including **another page's** (`UploadsPage.css`):

```
AppPage.css · PlatformSetupPage.css · DailyDispatch.shell.css
DailyDispatch.cases.css · Dashboard.css · UploadsPage.css · LoansPage.css
```

This is the `db-*` / `dd-*` / `ds-*` three-system overlap. **Out of scope here** — note it
in your report, change nothing.

---

## Part 2 — create `src/styles/ds/ds.listcard.css`

```css
/* ── List-page design system ────────────────────────────────────────────────
   Extracted verbatim from LoansPage — the app-wide reference for the
   "page shell + header + card + scrollable row list + Pagination" pattern.

   Loaded globally from styles/index.css, same reasoning as .up-pagination:
   list pages don't import each other's stylesheets, so a page-scoped
   definition would only work by accident when another page's chunk happened
   to be loaded.
   ───────────────────────────────────────────────────────────────────────── */

/* ── Page shell ─────────────────────────────────────────────────────────────
   Extends the .db-fill-root chain (pages/Dashboard.css) to LoansPage's
   .dd-shell wrapper, which that chain doesn't yet reach. */
.db-fill-root .dd-shell {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── Page header ────────────────────────────────────────────────────────── */
.db-page-header-left.is-list-header {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.db-list-pagecount {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 400;
  color: var(--ink-tertiary);
}
.db-list-pagecount strong { font-weight: 600; color: var(--ink-secondary); }

.db-list-page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Error banner ───────────────────────────────────────────────────────── */
.db-error-banner.is-list-banner { margin-bottom: 24px; }

/* ── Card shell — complements .is-list-card's padding/height rules ──────── */
.is-list-card { width: 100%; }

/* ── Card header: title left, controls right ────────────────────────────── */
.db-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.db-list-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

/* ── Expanding search field (34px tall, r8) ─────────────────────────────── */
.db-list-search {
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-surface);
  overflow: hidden;
}
.db-list-search input {
  width: 100%;
  padding-left: 8px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
}
.db-list-search-clear {
  display: flex;
  flex-shrink: 0;
  padding: 2px;
  border: none;
  background: transparent;
  color: var(--ink-tertiary);
  cursor: pointer;
}
.db-list-search-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: transparent;
  color: var(--ink-secondary);
  cursor: pointer;
}

/* ── Active-filter chip bar, directly under the card header ─────────────── */
.db-list-filterbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border-subtle);
}
.db-list-chip-x {
  display: flex;
  margin-left: 4px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

/* ── Body + scroll region ───────────────────────────────────────────────── */
.db-list-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0;
}
.db-list-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* ── Row internals ──────────────────────────────────────────────────────────
   The row-shell reset is scoped to .db-att-row specifically: those rows are
   <button>/<motion.button> elements needing the UA button styles knocked out,
   whereas .dd-case-row rows are <div>s already sitting on var(--bg-surface).
   Applying it to both families would repaint the dd-case-row background. */
.db-att-row.is-list-row {
  width: 100%;
  border-radius: 0;
  text-align: left;
  background: transparent;
}
.db-list-row-main { flex: 1; min-width: 0; margin-left: 0; }
.is-list-row .db-att-label { display: flex; align-items: center; gap: 6px; }
.db-list-row-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
}
.db-list-row-right {
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: right;
}
.db-list-amount-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.db-list-amount {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-primary);
}
.db-list-amount-label {
  font-size: 10px;
  letter-spacing: 0.02em;
  color: var(--ink-tertiary);
}
.db-list-chevron { color: var(--ink-tertiary); flex-shrink: 0; }

/* ── Skeleton + empty ───────────────────────────────────────────────────── */
.db-list-skel-wrap { padding: 8px; }
.db-list-skel {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-subtle);
}
.is-list-card .ds-empty { padding: 80px 0; }

/* ── Responsive ─────────────────────────────────────────────────────────────
   The single shared responsive rule for this whole pattern. Any page using
   is-list-card/is-list-row inherits it — do not add page-specific list-card
   breakpoints anywhere else. */

@media (max-width: 1024px) {
  .db-list-row-meta  { gap: 12px; }
  .db-list-row-right { gap: 12px; }
}

@media (max-width: 860px) {
  .db-list-search   { width: 160px; }
  .db-list-row-meta { gap: 10px; margin-top: 8px; }
}

@media (max-width: 640px) {
  .db-card.is-list-card,
  .dd-cases-card.is-list-card,
  .ds-table-card.is-list-card { padding: 8px; }

  .db-page-header        { gap: 10px; margin-bottom: 12px; }
  .db-list-page-actions  { width: 100%; }

  .db-list-head          { gap: 10px; padding: 8px 12px; }
  .db-list-head-actions  { width: 100%; margin-left: 0; }
  .db-list-search        { flex: 1; width: auto; }
  .db-list-filterbar     { padding: 8px 12px; }

  .db-att-row.is-list-row,
  .dd-case-row.is-list-row { padding: 10px 12px; flex-wrap: wrap; row-gap: 8px; }

  .db-list-row-main   { flex: 1 1 100%; }
  .db-list-row-right  { width: 100%; justify-content: flex-start; gap: 12px; }
  .db-list-amount-col { align-items: flex-start; }
  .db-list-row-meta   { flex-wrap: wrap; gap: 8px; }

  .db-list-title { font-size: 14px; }
  .up-pagination { padding: 12px 14px; gap: 8px; }
}

@media (max-width: 420px) {
  .db-list-chevron  { display: none; }
  .db-list-row-meta { gap: 6px; }
  .up-page-btn      { min-width: 26px; height: 26px; padding: 0 6px; }
}
```

Then add to `src/styles/index.css`, next to the `.up-pagination` rules:

```css
@import './ds/ds.listcard.css';
```

Confirm `index.css` is globally loaded (check `src/main.tsx` / `src/App.tsx`) before
relying on this. If it is not, import from `src/styles/ds/ds.css` instead and verify all
9 target pages transitively import it.

---

## Part 3 — conversion

### 3.1 What already exists — do NOT rebuild

| Thing | Where |
|---|---|
| `.is-list-card` (padding 12px, gap 0, height auto, flex 1, min-height 0) | `pages/Dashboard.css` ~1485 |
| `.is-list-row` (padding 10px 16px, border-bottom subtle) | `pages/Dashboard.css` |
| `.db-list-title` (15px/700 sans, ink-primary) | `pages/Dashboard.css` |
| `.db-att-row.is-list-row .db-att-label` (600 / 13.5px) | `pages/Dashboard.css` |
| `.dd-case-row.is-list-row .dd-case-borrower/.dd-case-loan/.dd-case-amount` | `styles/DailyDispatch.cases.css` |
| `.db-fill-root` height chain | `pages/Dashboard.css` ~214 |
| a 640px list-card `@media` block | `styles/AppLayout.responsive.css` — **you will delete this**, see 3.5 |

### 3.2 Step A — convert LoansPage.tsx  ⟵ CHECKPOINT, stop after this

Delete only the inline properties the class now supplies. **Keep every inline property
the class does not cover** — framer-motion `initial`/`animate`/`exit`/`variants`/
`whileHover`/`transition`, the search wrapper's animated `width`/`opacity`, and the
skeleton's computed `opacity`.

| Element (current) | Action |
|---|---|
| root `<div className="db-root alloc-root">` | → `className="db-root db-fill-root"` |
| `db-page-header-left` + inline column style | → `className="db-page-header-left is-list-header"`, drop the style |
| *(option (a) only)* | add `<h1 className="dd-page-title">Loans</h1>` as its first child |
| the `<p style={{fontSize:13,color:...,fontWeight:400,fontFamily:...,margin:0}}>` count line | → `className="db-list-pagecount"`, drop the style |
| header actions `<div style={{display:'flex',alignItems:'center',gap:8}}>` | → `className="db-list-page-actions"`, drop the style |
| error banner `style={{marginBottom:24}}` | → add `is-list-banner` to its className, drop the style |
| `<div className="dd-shell" style={{display:'flex'}}>` | drop the inline style (now in `.db-fill-root .dd-shell`) |
| card `<div className="ds-card is-overflow-hidden db-card is-list-card" style={{width:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>` | drop `width`/`overflow` (class + `is-overflow-hidden` cover them); keep `display:flex; flexDirection:column` |
| `<header className="db-card-head" style={{borderBottom:'none',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>` | → `className="db-card-head db-list-head"`; keep `borderBottom:'none'` inline (Loans is the only page that suppresses it) |
| search wrapper `<div style={{display:'flex',alignItems:'center',gap:12,marginLeft:'auto'}}>` | → `className="db-list-head-actions"`, drop the style |
| expanded-search `<motion.div style={{...borderRadius:8,padding:'0 10px',height:34,overflow:'hidden'}}>` | → `className="db-list-search"`; **keep** animated `width`/`opacity` |
| its `<input style={{...fontSize:13,width:'100%',paddingLeft:8}}>` | drop the style entirely |
| its clear `<button style={{...padding:2,color:'var(--ink-tertiary)',flexShrink:0}}>` | → `className="db-list-search-clear"`, drop the style |
| collapsed `<motion.button style={{width:34,height:34,...borderRadius:8,...}}>` | → `className="db-list-search-trigger"`; keep `initial`/`animate`/`exit` |
| filter-chips `<motion.div style={{padding:'8px 16px',background:'var(--bg-subtle)',borderBottom:...,display:'flex',gap:8,flexWrap:'wrap'}}>` | → `className="db-list-filterbar"`, drop the style, keep `variants` |
| each chip's clear `<button style={{background:'transparent',border:'none',marginLeft:4,...}}>` (×3) | → `className="db-list-chip-x"`, drop the style |
| `<div className="db-card-body" style={{display:'flex',flexDirection:'column',flex:1,minHeight:0,padding:0}}>` | → `className="db-card-body db-list-body"`, drop the style |
| skeleton wrapper `<div style={{padding:'8px'}}>` | → `className="db-list-skel-wrap"`, drop the style |
| skeleton row `<div className="dd-case-skel" style={{opacity:…, padding:'16px 0', display:'flex', gap:12, borderBottom:…}}>` | → `className="dd-case-skel db-list-skel"`; **keep** computed `opacity` |
| empty `<motion.div className="ds-empty" style={{padding:'80px 0'}}>` | drop the style |
| scroll region `<div style={{flex:1,minHeight:0,overflowY:'auto'}}>` | → `className="db-list-scroll"`, drop the style |
| row `<motion.button className="db-att-row is-list-row" style={{borderRadius:0,width:'100%',textAlign:'left',background:'transparent'}}>` | drop the style entirely; **keep** `whileHover` |
| row main `<div style={{flex:1,marginLeft:0}}>` | → `className="db-list-row-main"`, drop the style |
| label `<span className="db-att-label" style={{fontWeight:600,fontSize:13.5,color:…,display:'flex',alignItems:'center',gap:6}}>` | drop the style entirely |
| meta row `<div className="db-ml-tooltip-row" style={{gap:16,marginTop:10}}>` | → `className="db-list-row-meta"` (drop `db-ml-tooltip-row`), drop the style |
| meta text `<span className="db-kpi2-foot-meta" style={{fontFamily:'var(--font-mono)',fontSize:11}}>` | **keep exactly as-is** — `.db-kpi2-foot-meta` has no CSS definition anywhere in the repo; those inline styles are load-bearing |
| right col `<div style={{textAlign:'right',display:'flex',alignItems:'center',gap:16}}>` | → `className="db-list-row-right"`, drop the style |
| amount col `<div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>` | → `className="db-list-amount-col"`, drop the style |
| amount `<span style={{fontFamily:'var(--font-mono)',fontSize:13,fontWeight:600,color:…}}>` | → `className="db-list-amount"`, drop the style |
| `OUTSTANDING` `<span style={{fontSize:10,color:…,letterSpacing:'0.02em'}}>` | → `className="db-list-amount-label"`, drop the style |
| `<ChevronRightIcon size={16} style={{color:'var(--ink-tertiary)'}} />` | → `className="db-list-chevron"`, keep `size={16}` |

Then trim `src/styles/LoansPage.css` per §1.1 — run the grep first, delete only rules
confirmed dead, and **never touch `dd-case-dpd`**. If everything in the file turns out
dead, delete the file and its import from LoansPage.tsx.

**STOP. Report before Step B.** Run all three verification commands and confirm Loans is
visually unchanged (except the option-(a) `<h1>`).

### 3.3 Step B — the 8 already-conformant pages

`FraudCasesPage` · `ReconciliationPage` · `GrievancesPage` · `BorrowersPage` ·
`PtpsPage` (rows live in `PtpsHelpers.tsx`) · `RestructureProposalsPage` ·
`SettlementOffersPage` · `NonContactablesPage`

These already copied Loans' values inline verbatim, so this is a mechanical swap with no
intended visual change. Same mapping table, plus:

1. **Only swap an inline style whose values actually match the table.** If a page differs
   (e.g. `fontSize:12.5` vs `13.5`), leave it and list it in your report — do **not** "fix"
   it. Silent visual drift is the failure mode here.
2. **Skip elements the page doesn't have.** Not every page has a search box or chip bar.
   Never add markup that isn't there.
3. These pages' card headers use `borderBottom:'1px solid var(--border-subtle)'` where
   Loans uses `none`. **Keep each page's existing border** — add `db-list-head` for the
   flex behaviour only.
4. Each already has `<h1 className="dd-page-title">` + a `<span className="db-page-org">`
   count pill. Under option (a), **additionally** give the count line the
   `db-list-pagecount` treatment only where a page already renders a context sentence —
   do not invent new copy.

### 3.4 Step C — normalise motion consts

In each of the 9 files, set the local `stagger` / `fadeUp` / `fadeIn` consts to the
canonical values in §1.7. In-place edits only; do not create a shared module.

### 3.5 Step D — consolidate responsive

Delete the `@media (max-width: 640px)` list-card block from
`src/styles/AppLayout.responsive.css` (it opens with a comment naming
`.is-list-card / .is-list-row / <Pagination>`). Part 2's file supersedes it. Leave every
other rule in that file untouched.

---

## Part 4 — constraints, exclusions, verification

### Constraints

- **CSS and markup only.** No business logic, state, data fetching, API calls, routing,
  validation, prop contracts, or hook behaviour — frontend logic included. If a visual
  outcome seems to need a logic change, stop and ask.
- **Add, don't rewrite.** Do not edit existing rules in `Dashboard.css`,
  `DailyDispatch.cases.css`, or `styles/ds/*`. The only deletions in this task are the
  Step D responsive block and the confirmed-dead `LoansPage.css` rules.
- No unrelated refactors, renames, or cleanup.

### Do NOT touch

| Files | Why |
|---|---|
| `DailyDispatchPage.tsx`, `CaseAssignmentsPage.tsx`, `DispatchCasePanel.tsx` | never opt into `is-list-*`; scoped selectors deliberately exclude them |
| `UploadErrorsPage.tsx`, `PortfolioRiskPage.tsx` | real `<table>` grids |
| `CalendarPage.tsx`, `ReportsPage.tsx`, `AuditPage.tsx`, `UploadDataPage.tsx` | real tables / editable data-grid |
| `ReassignPanel.tsx`, `AssignCasePanel.tsx` | card-less embedded fragments, inherit from parent |
| `AttendancePage`, `MyCasesPage`, `TodayVisitsPage`, `UserRequestsPage`, `VisitsPage`/`VisitRow`, `UsersTable`, `UnassignedCasesPage`, `CollectionsPage`, `UploadsPage` | **Phase 2** — different row shapes, need per-page judgement |

### Verification — all three must pass

```bash
cd F:/f-final/recoverpro/web
npx tsc --noEmit -p .
node scripts/check-reset-scope.mjs
npx vite build
```

Report: files changed; the option-(a) `<h1>` addition to Loans called out separately;
any value mismatch found and left alone (§3.3 rule 1); anything you deleted from
`LoansPage.css` and the grep output proving it was dead; and confirmation all three
commands passed. Do not claim visual equivalence you did not verify — state plainly what
you checked.
