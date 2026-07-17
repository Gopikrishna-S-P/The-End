# RecoverPro — UI Design Blueprint

> The single source of truth for designing pages in the RecoverPro web app.
> Reverse-engineered from the two reference pages — **Dashboard** and **Daily Dispatch** — which are the canonical, hand-tuned examples. Every remaining page must look like it was built by the same hand. When in doubt, open `Dashboard.tsx` / `Dashboard.css` or the `DailyDispatch.*.css` files and copy the pattern verbatim.

---

## 0. The aesthetic in one paragraph

A calm, dense, **operations-tool** aesthetic — light mode only. Think Stripe dashboard meets a financial terminal. White cards on a near-white canvas, separated by **1px hairline borders, not shadows**. Structure comes from borders and spacing; shadows are reserved for things that genuinely float (dropdowns, modals, toasts). One brand green, used sparingly. **All numbers are monospaced.** Generous use of tiny uppercase mono labels as "eyebrows." Nothing is loud. Emphasis comes from weight, size, and a dark ink fill — never from color saturation.

**Five rules that define the look:**
1. **Borders carry structure, shadows only float.** Static cards get a 1px border and `box-shadow: none`.
2. **Numbers are mono.** Every metric, count, amount, date, ID → `var(--font-mono)` + `font-feature-settings: 'tnum','zero'`.
3. **Green is rationed.** `--ink-solid` (a green) for primary actions/active states; `--brand` for links and the active-nav indicator only. Never tint whole surfaces with it.
4. **Tiny mono uppercase labels** (9–11px, `letter-spacing: 0.06–0.1em`) label everything. They are the connective tissue.
5. **No raw hex, ever.** Only `var(--token)`. If a value isn't in the token set, it doesn't belong on screen.

---

## 1. Non-negotiable rules (read before writing any CSS)

| Rule | Why |
|---|---|
| **Never write a raw hex/rgb value** in page or component CSS. Consume `var(--…)` from `ds.tokens.css`. | Single source of truth; themes/contrast modes work for free. |
| **Static surfaces: `box-shadow: none` + `1px solid var(--border)`.** | Borders-not-shadows is the signature. |
| **Money, counts, IDs, dates, %, ranks → `var(--font-mono)`** with `font-variant-numeric: tabular-nums` / `font-feature-settings: 'tnum','zero'`. | Columns of numbers must align; gives the terminal feel. |
| **Prose, names, labels, buttons → `var(--font-sans)`** (Inter). | Sans for language, mono for data. |
| **Don't use `--brand`/green as a fill on cards or rows.** Active row = `--bg-active` (a pale green tint) only. | Green is an accent, not a surface. |
| **Section/field labels are mono, uppercase, ~10px, `letter-spacing: 0.06–0.1em`, `color: var(--text-tertiary)`.** | The eyebrow label is everywhere. |
| **8px spacing grid** (`--space-*`). Dense interiors may use the 4px half-step. | Rhythm consistency. |
| **Focus: `outline: 2px solid var(--focus-ring); outline-offset: 2px`.** Never remove focus rings. | A11y. Focus ring is neutral blue — distinct from green brand. |
| **Reuse `ds-*` primitives before writing bespoke CSS.** | A new button/pill/table should almost never need new CSS. |

---

## 2. Token foundation (`web/src/styles/ds/ds.tokens.css`)

This is the contract. Memorize the categories; reference exact values from the file.

### Surfaces
```
--bg-canvas:  #F7F8FA   /* app background — white cards read as raised against it */
--bg-surface: #FFFFFF   /* cards, panels, inputs, popovers */
--bg-subtle:  #F2F4F7   /* table header, zebra-alt, sunken fills, disabled */
--bg-hover:   #E8EBF0   /* row/item hover */
--bg-active:  var(--brand-subtle)  /* selected row — pale green tint */
```

### Borders (structure lives here)
```
--border:        #E4E7EC   /* default 1px hairline */
--border-strong: #D0D5DD   /* hovered/focused card, active row, input hover */
--border-subtle: #F0F1F4   /* faintest internal divider */
```

### Text (with contrast ratios baked into the choice)
```
--text-primary:     #101828   /* headings, values, money */
--text-secondary:   #475467   /* body, labels */
--text-tertiary:    #667085   /* captions, metadata, eyebrow labels */
--text-placeholder: #98A2B3
--text-on-solid:    #FFFFFF   /* text on dark/green fills */
```
> Legacy aliases `--ink-primary/secondary/tertiary` map to these — both are valid; Dashboard/Dispatch CSS mixes them freely.

### Emphasis & brand (the green discipline)
```
--ink-solid:       #0AA550   /* primary buttons, active states, progress fills, action elements */
--ink-solid-hover: #088A42
--brand:        #0AA550      /* links, active-nav indicator ONLY */
--brand-subtle: #E7F4EC      /* selected nav / active row fill */
--focus-ring:   #2563EB      /* neutral blue — deliberately NOT green */
```

### Semantic status (status meaning only — never decoration)
```
--success #067647 / --success-subtle #ECFDF3 / --success-border #ABEFC6
--warning #B54708 / --warning-subtle #FFFAEB / --warning-border #FEDF89
--danger  #B42318 / --danger-subtle  #FEF3F2 / --danger-border  #FECDCA / --danger-solid #D92D20
--info    #175CD3 / --info-subtle    #EFF8FF / --info-border    #B2DDFF
```

### Typography scale (use the token, don't hardcode px)
```
--font-sans: 'Inter', system-ui, …
--font-mono: 'JetBrains Mono', 'SF Mono', …

--text-2xs 10px  (badge labels, kbd)        --text-md  14px (section labels, sub-headings)
--text-xs  11px  (mono caps, eyebrows)      --text-lg  16px (card titles)
--text-sm  12px  (table meta, captions)     --text-xl  20px (page sub-headers)
--text-body 13px (default body, table cell) --text-2xl 24px (page titles)
                                            --text-3xl 30px (dashboard KPI numbers)
Line heights: --lh-tight 1.25 / --lh-snug 1.4 / --lh-normal 1.55 / --lh-loose 1.7
```

### Spacing (8px grid + 4px half-step)
```
--space-1 2 / --space-2 4 / --space-3 6 / --space-4 8 / --space-5 12 /
--space-6 16 / --space-7 20 / --space-8 24 / --space-9 32 / --space-10 48
```

### Radius
```
--radius-xs 4 (badges, chips, checkboxes)   --radius-md 8  (cards, panels, popovers)
--radius-sm 6 (buttons, inputs, segments)   --radius-lg 12 (modals, large containers)
--radius-full 999 (avatars, dots, pills)
```

### Elevation (sparse — most things use `--shadow-none`)
```
--shadow-none / --shadow-xs / --shadow-sm / --shadow-md / --shadow-lg
--ds-shadow-card:       none      /* static cards */
--ds-shadow-card-hover: shadow-sm
--ds-shadow-float:      shadow-md /* dropdowns, popovers */
--ds-shadow-overlay:    shadow-lg /* modals */
```

### Motion
```
--dur-instant 80ms / --dur-fast 140ms / --dur-base 200ms / --dur-slow 280ms
--ease-standard cubic-bezier(0.2,0,0,1)
--ease-out      cubic-bezier(0.16,1,0.3,1)   /* the signature spring-out */
```

### Control sizes & shorthands
```
--ds-row-h 44px  --ds-ctl-h 32px  --ds-ctl-h-sm 28px
--ds-card-px 16px  --ds-card-py 12px  --ds-page-px 32px  --ds-page-py 24px
```

### Z-index scale
```
topbar 100 / sidebar 90 / dropdown 200 / elevated 300 / modal 500 / toast 800 / palette 9000 / skip 10000
```

---

## 3. Component primitives (`web/src/styles/ds/ds.*.css`)

**Use these classes directly in JSX. They already encode every rule above.** Do not re-implement them.

### Button — `ds.button.css`
- `.ds-btn` + modifier: `.is-primary` (green fill), `.is-secondary` (outlined, hover fills green), `.is-ghost` (text only), `.is-danger` (red solid).
- Sizes: `.is-sm` / `.is-lg`. Loading: `.is-loading` (auto spinner).
- Icon-only: `.ds-icon-btn` (32px), `.ds-icon-btn.is-sm` (28px).
- Primary emphasis is the **dark/green fill** — never a glow or gradient.

### Card — `ds.card.css`
- `.ds-card` = bordered white surface, no shadow.
- Modifiers: `.is-pad` (12/16), `.is-pad-lg` (20), `.is-flat`, `.is-overflow-hidden`, `.is-hoverable` (border-strengthens + tiny shadow on hover only).

### Pill / Dot — `ds.pill.css`
- `.ds-pill` (mono, 11px, rounded-full) + tone: `.is-success/.is-warning/.is-danger/.is-info`, or semantic aliases `.is-active/.is-pending/.is-closed/.is-open/.is-broken/.is-kept`.
- `.ds-pill.is-bare` for color-only in dense rows. Matching `.ds-dot` status dots.

### Table — `ds.table.css`
- `.ds-table-card > .ds-table-wrap > .ds-table`. Sticky `thead` on `--bg-subtle`, mono uppercase `th`.
- Cell modifiers: `.is-right/.is-center/.is-mono/.is-currency/.is-muted/.is-clamp`. Row `.is-clickable/.is-selected`.
- `.ds-table-empty` for no-data; `.ds-pagination` for pager.

### Form — `ds.form.css`
- `.ds-field > .ds-label + .ds-input/.ds-select/.ds-textarea`. Label `.is-required` adds red `*`.
- Validation: `.is-invalid` + `.ds-error` / `.ds-help`.
- Layout: `.ds-form-shell` (max 720, centered) → `.ds-form-section` → `.ds-form-actions` (sticky bottom, right-aligned).

### Tabs — `ds.tabs.css`
- `.ds-tabs > .ds-tab` (underline-on-active, mono `.ds-tab-count` badge).

### Toolbar / Search — `ds.toolbar.css`
- `.ds-toolbar` (44px bar) containing `.ds-search` (icon + input + `.ds-search-clear`), `.ds-toolbar-divider`, `.ds-filter-btn` (`.is-open`, `.ds-filter-dot`).

### Empty state — `ds.empty.css`
- `.ds-empty > .ds-empty-icon (48px boxed) + .ds-empty-title + .ds-empty-sub + .ds-empty-actions`.

### Also available: `ds.modal.css`, `ds.drawer.css`, `ds.toast.css`, `ds.skeleton.css`, `ds.section.css`.
- Section primitive: `.ds-section > .ds-section-label` + `.ds-section-grid.is-cols-{2,3,4}` (auto-collapse responsive) or `.ds-section-split` (60/40).

---

## 4. Page anatomy

Every page is a vertical flex column. Two canonical shells:

### A. Scrolling analytics page (Dashboard model)
```
.db-root  (flex column, transparent bg, min-height:100%)
 ├─ .db-error-banner            (optional, danger-subtle)
 ├─ page header row             (title eyebrow + date-range/actions, justify-between)
 ├─ .db-kpi-band                (grid, repeat(4,1fr), gap 16 → 2-up <1180 → …)
 │   └─ .db-kpi2-card ×4        (mono value, eyebrow label, icon box, trend sub)
 └─ .db-grid                    (12-col grid, gap 16)
     ├─ .db-span-8  → primary chart card
     └─ .db-span-4 / .db-rail   → side cards (attention list, donut, top agents…)
```

### B. Fixed two-pane workspace (Daily Dispatch model)
```
.dd-page  (flex column, height:100%, overflow hidden, padding 16, bg transparent)
 ├─ toast / error banner (absolute, animated)
 ├─ .dd-page-header        (titles left, date-nav control right)
 └─ .dd-main-container > .dd-grid  (flex, gap 12, min-height 0)
     ├─ .dd-agent-panel  (flex 0 0 288px — fixed left list)
     └─ .dd-case-panel   (flex 1 — list + sticky action/send bar)
   → stacks vertically under 960px
```

### The card shell (used everywhere)
```css
.x-card {
  display: flex; flex-direction: column;
  padding: 16px 18px; gap: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: none;
}
.x-card-head  { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.x-card-title { font: 700 13px var(--font-sans); letter-spacing:-0.01em; color:var(--ink-primary); }
.x-card-sub   { font: 500 10.5px var(--font-mono); text-transform:uppercase; letter-spacing:0.04em; color:var(--ink-tertiary); }
```

---

## 5. Recurring micro-patterns (copy these exactly)

**KPI / stat card** — eyebrow (mono uppercase 11px tertiary) → value (mono 24–30px, weight 700, `letter-spacing:-0.02em`, `tnum`) → meta row (trend in green/danger, `.is-up`/`.is-down`). Optional 26px icon box that tints green on card hover. Cards are buttons; add a subtle ripple if interactive (see `.db-ripple`).

**List/queue row** (`.dd-case-row`, `.db-att-row`) — 44–50px min-height, `gap:12px`, `border-bottom:1px solid var(--border)`, hover `--bg-subtle`. Selected: `background:var(--bg-active)` + `box-shadow: inset 3px 0 0 var(--ink-solid)` (left rail). Structure: control/avatar · stacked info (name sans 13px + meta mono) · right-aligned mono amount.

**Avatar** — circle, `--bg-subtle` fill, 1px border, **mono** initials. Sizes 22/32/52px.

**DPD / severity tag** — tiny mono (9.5px, 700), `radius-xs`, colored by status token set (`is-neutral/is-warn/is-high/is-critical` → subtle bg + border + ink from semantic tokens).

**Eyebrow section label** — `.ds-section-label` or inline: mono, 9–11px, 600, uppercase, `letter-spacing:0.06–0.1em`, tertiary.

**Progress bar** — 6px track on `--bg-subtle` w/ border, fill `--ink-solid`, `radius-full`, `transition: width 600ms`.

**Mini charts are hand-rolled SVG/divs**, not a chart lib: vertical bars (`.db-bars`), horizontal ranked bars (`.db-hbars`), donut + legend (`.db-donut-card`), line chart with crosshair tooltip (`.db-trend-*`). Fills use `--ink-solid`; axis/labels are mono tertiary. Copy the existing markup.

**Segmented toggle / date-range** — wrapper `--bg-subtle`, 2–3px pad, inactive btn transparent tertiary, active btn `--bg-surface` + `shadow-sm` + primary text.

**Toast** — `.ds-toast.is-ok`, animated in via Framer Motion (`y:-8 → 0`, 0.22s). Error uses an inline `*-error-banner` (danger-subtle, icon + title + sub + retry/dismiss).

**Empty state** — `.ds-empty` (or page-local `.dd-cp-empty`): boxed 48px icon, 14px/600 title, 12.5px tertiary sub. "All clear" variants swap icon box to success tones.

---

## 6. Motion (Framer Motion)

Pages animate content in on mount. Standard variants (from `DailyDispatchPage.tsx`):
```ts
const stagger = { hidden:{}, show:{ transition:{ staggerChildren:0.05, delayChildren:0.04 } } };
const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0, transition:{duration:0.40, ease:[0.22,1,0.36,1]}} };
const fadeIn  = { hidden:{opacity:0},     show:{opacity:1,      transition:{duration:0.28, ease:'easeOut'}} };
```
- Lists: parent `stagger`, children `fadeUp`. Overlays/toasts: `AnimatePresence` with short y-translate.
- CSS transitions: keep them 120–200ms with `--ease-standard`/`--ease-out`. Progress/number fills may run 600ms.
- Respect `prefers-reduced-motion` (the shell already gates focus transitions).

---

## 7. Responsive breakpoints (match existing)

```
1180px : KPI band 4→2 cols; 12-col spans collapse to full; rails go row.
1100px : section grids 3/4-col → 2-col; split rows stack.
960px  : Dispatch two-pane → stacked single column.
860/768/760px : grids → single column; some captions hidden.
700/600px : everything single column.
```
Always give fixed-height workspaces `min-height:0` on flex children so inner lists scroll instead of the page.

---

## 8. Checklist before declaring a page "done"

- [ ] Zero raw hex/rgb in the page CSS — only `var(--…)`.
- [ ] Static cards: 1px border, `box-shadow:none`, `radius-md`.
- [ ] Every number/amount/date/ID is mono with `tnum`.
- [ ] Eyebrow labels are mono, uppercase, tertiary, letter-spaced.
- [ ] Green only on primary actions, active states, and links — not as a surface tint.
- [ ] Buttons/inputs/pills/tables use `ds-*` primitives, not bespoke clones.
- [ ] Focus rings present (`--focus-ring`, never removed).
- [ ] Hover states on all interactive rows/cards/buttons.
- [ ] Loading skeletons + empty states + error banner all designed (not just the happy path).
- [ ] Mount animation (stagger/fadeUp) wired.
- [ ] Collapses cleanly at 1180 / 960 / 768 / 600.
- [ ] Spacing on the 8px grid.
- [ ] Side-by-side diff against Dashboard/Dispatch — does it look like the same product?

---

## 9. How to build a new page (recipe)

1. **Pick the shell**: analytics/list → Dashboard model; focused workspace/two-pane → Dispatch model.
2. **Import** `AppPage.css` + the `ds/` primitives you need + your page CSS file. Name CSS `PageName.css` (or split `PageName.area.css` when it grows, like the `DailyDispatch.*` files).
3. **Lay out** with the card shell + `.ds-section`/grid helpers. Header row = title eyebrow + actions.
4. **Fill with primitives**: `ds-card`, `ds-table`, `ds-btn`, `ds-pill`, `ds-field`, `ds-empty`. Only write new CSS for genuinely novel layout — and even then, consume tokens only.
5. **Wire the four states**: loading (skeleton), empty (`ds-empty`), error (banner), success.
6. **Add motion** (stagger + fadeUp).
7. **Run the §8 checklist** and eyeball it next to the two reference pages.

> Reference files to keep open: `web/src/styles/ds/ds.tokens.css` (tokens), `web/src/pages/Dashboard.css` (analytics patterns), `web/src/styles/DailyDispatch.*.css` (workspace patterns), `web/src/pages/DailyDispatchPage.tsx` (JSX/motion composition).
