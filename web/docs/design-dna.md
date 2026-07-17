# RecoverPro Web — Design DNA

> Extracted from `Dashboard.css`, `AppLayout.css`, `AppLayout.tokens.css`, `design-tokens.css`, `AppPage.css`, `AppPage.hero.css`, `ds/*.css`.  
> Every new page and overhaul must trace back to this document. No raw hex values in component CSS — use tokens.

---

## 1. Color Tokens

### Brand Accent (single green — no competing hues)
| Token | Light | Dark |
|---|---|---|
| `--accent` | `#0AA550` | `#0AA550` (unchanged) |
| `--accent-hover` | `#088a42` | `#0ec060` |
| `--accent-bright` | `#12C266` | — |
| `--accent-subtle` | `rgba(10,165,80,.10)` | `rgba(10,165,80,.16)` |
| `--rp-grad` | `linear-gradient(90deg, #0AA550, #12C266)` | — |

### Surfaces (cool-slate, not warm-stone)
| Token | Light | Dark |
|---|---|---|
| `--bg-canvas` | `#F0F2F5` | `#0E1015` |
| `--bg-surface` | `#FFFFFF` | `#15171C` |
| `--bg-subtle` | `#EEF0F3` | `#1C1F26` |
| `--bg-glass` | `rgba(255,255,255,.82)` blur(16px) | `rgba(12,14,19,.88)` blur(16px) |

### Borders
| Token | Light | Dark |
|---|---|---|
| `--border` | `#E2E5EA` (solid) / `rgba(226,229,234,.80)` | `rgba(255,255,255,.08)` |
| `--border-strong` | `#CBD0D8` | `rgba(255,255,255,.15)` |
| `--rp-border-hi` | `rgba(10,165,80,.25)` | `rgba(10,165,80,.30)` |

### Ink
| Token | Light | Dark |
|---|---|---|
| `--ink-primary` | `#0E1116` | `#E8EAED` |
| `--ink-secondary` | `#5A6472` | `#9BA1AC` |
| `--ink-tertiary` | `#98A1AE` | `#6B7280` |

### Semantic State
| Role | Light | Dark |
|---|---|---|
| success | `#15803D` | `#22C55E` |
| success-subtle | `rgba(21,128,61,.08)` | `rgba(34,197,94,.10)` |
| error | `#B91C1C` | `#EF4444` |
| error-subtle | `#FEF2F2` | `#1F1315` |
| warn-ink | `#92400E` | `#FBBF24` |
| warn-bg | `#FFFBEB` | `#1F1B0F` |
| warn-border | `#F59E0B` | `#F59E0B` |
| ds-info | `#0369A1` | `#60A5FA` |
| ds-info-bg | `rgba(3,105,161,.10)` | `rgba(96,165,250,.13)` |

### Special
- `--rp-pink: #f43f5e` — notification badge dot only, nowhere else.

---

## 2. Typography

### Fonts
| Alias | Stack | Use |
|---|---|---|
| `var(--sans)` | Inter, system-ui, -apple-system | Body, labels, UI chrome |
| `var(--serif)` | Fraunces, Georgia | Page heroes, editorial titles |
| `var(--mono)` | JetBrains Mono, Fira Mono | Numbers, labels, metadata |

### Type Scale
| Role | Family | Size | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| Hero title | serif | 40–44px | 300 | -0.02em | Italic `<em>` = animated green gradient |
| Page title (compact) | sans | 20px | 700 | -0.02em | `.db-page-title` |
| Card title | sans | 13px | 700 | -0.01em | `.db-card-title` |
| Section label | mono | 11px | 500–600 | +0.08em | uppercase |
| KPI value | mono | 22–27px | 700 | -0.04em | `tnum`, `zero` feature settings |
| Table header | mono | 10.5px | 500 | +0.06em | uppercase |
| Body | sans | clamp(0.875rem,2vw,0.9375rem) | 500 | — | line-height 1.6 |
| Eyebrow | mono | 11px | 500 | +0.06em | uppercase + animated pulse dot |

### Heading defaults
```css
h1, h2 { font-family: var(--sans); font-weight: 600; letter-spacing: -0.012em; }
```

---

## 3. Spacing (8-px grid)

| Token | Value |
|---|---|
| `--rp-s1` | 4px |
| `--rp-s2` | 8px |
| `--rp-s3` | 12px |
| `--rp-s4` | 16px |
| `--rp-s5` | 24px |
| `--rp-s6` | 32px |
| `--ds-card-px` | 16px |
| `--ds-card-py` | 12px |
| `--ds-page-px/py` | 12px |
| `--ds-gap-section` | 12px |
| `--ds-gap-row` | 8px |

---

## 4. Radius

| Token | Value | Use |
|---|---|---|
| `--ds-radius-sm` | 6px | Inline controls, chips, kbd |
| `--ds-radius` | 8px | Cards, inputs, buttons |
| `--ds-radius-lg` | 16px | Modals, drawers, large panels |
| `--ds-radius-pill` | 999px | Badges, toggles, pills |
| Hero / page-hero | 18px | `.app-page-hero` |

---

## 5. Elevation & Shadow

| Level | Value | Use |
|---|---|---|
| e1 (resting card) | `0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)` | `.ds-card` |
| e2 (hover) | `0 4px 8px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)` | Card hover |
| e3 (floating) | `0 8px 16px rgba(0,0,0,.10), 0 4px 8px rgba(0,0,0,.06)` | Popovers, skip link |
| e4 (overlay) | `0 16px 32px rgba(0,0,0,.14), 0 8px 16px rgba(0,0,0,.08)` | Modals |
| card hover (accent) | `0 8px 24px rgba(10,165,80,.08), 0 16px 40px rgba(12,26,16,.06)` | `.app-page-card:hover` |

Dark mode multiplies shadow opacity 3-4×.

---

## 6. Motion

| Variable | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(0.16,1,0.3,1)` | All transitions — spring feel |
| `--transition` / `--rp-t` | `150ms var(--ease)` | Short UI transitions |
| `--rp-t-lg` | `300ms var(--ease)` | Longer transitions |
| fast | 100–160ms | Hover states, row focus |
| skeleton | 1.4s ease-in-out infinite | Shimmer |
| route-fade | 140ms | Cross-section navigation |
| route-slide | 160ms, translateX ±12px | Within-section navigation |
| Framer stagger | 0.05s children, 0.04s delay | List/card grid entry |
| fadeUp variant | y:16→0, 400ms | Card/section entry |
| count-up | 900ms, cubic out | KPI number reveal |

### Atmospheric Background (app-right)
```css
/* Radial green aura at top-right + 22px dot grid, masked bottom */
background:
  radial-gradient(120% 60% at 78% -10%, color-mix(in srgb, accent 9%, transparent) 0%, transparent 55%),
  radial-gradient(circle at 1px 1px, color-mix(in srgb, ink-3 22%, transparent) 0.75px, transparent 0);
background-size: 100% 100%, 22px 22px;
mask: linear-gradient(180deg, #000 0%, #000 55%, transparent 100%);
```
Applied only to `.app-right::before`. Pages inherit it; do not re-implement it.

---

## 7. Core Primitives (CSS classes)

### `.ds-card`
Single source of truth for "a bordered surface":
```css
background: var(--bg-surface);
border: 1px solid var(--border);
border-radius: var(--ds-radius); /* 8px */
box-shadow: var(--ds-shadow-card);
```
Modifiers: `is-flat` (no shadow), `is-pad` (16px/12px inner), `is-pad-lg` (20px), `is-overflow-hidden`, `is-hoverable` (scale 1.025 on hover + elevated shadow).

### `.app-page-hero`
Aurora-backed page header:
```css
border-radius: 18px; padding: 36px 32px 32px;
background: var(--bg-surface); border: 1px solid var(--border);
/* Contains pm-aurora + pm-noise children at z:0 */
```
Always use: eyebrow → title (serif, `.app-page-title`) → sub (`.app-page-sub`).

### `.app-page-card`
Hoverable content tile:
```css
background: var(--bg-surface); border: 1px solid var(--border);
border-radius: 14px; padding: 20px;
transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
```
Hover: `translateY(-2px)` + accent-tinted shadow.

### `.app-page-stat-tile`
Icon-labeled stat cell:
```css
display: flex; align-items: flex-start; gap: 12px;
padding: 14px 16px 14px 18px; border-radius: 12px;
border: 1px solid var(--border); background: var(--bg-surface);
```
Icon box: 34px, 8px radius. Value: serif 20px weight 400 (or `.is-mono` for tabular). Sub: 11px tertiary.  
Tints: `.is-accent`, `.is-success`, `.is-warn`, `.is-danger`, `.is-info`.

### `.app-page-table` / `ds-table`
- `thead`: sticky, bg-surface, border-bottom
- `th`: mono 10.5px uppercase, letter-spacing 0.06em, tertiary
- `td`: padding 11px 16px, border-bottom, hover bg-subtle
- `.is-mono`: JetBrains Mono 12.5px tabular nums
- `.is-currency`: mono 13px weight 600
- `.is-right`: text-align right

### KPI Cards (`.db-kpi2-card`)
```css
background: var(--bg-surface); border: 1px solid var(--border);
border-radius: 12px; padding: 12px 16px 10px;
```
Parts: label (mono uppercase 11px) → value-row (mono 22px 700) + trend badge → footer meta.  
`.is-accent` variant: green gradient tint, accent-tinted border.

### Attention Row (`.db-att-row`)
- Min-height 52px, 100ms hover
- Chip: 32px, 8px radius — `.is-urgent` (red), `.is-warn` (amber), `.is-clear` (green)
- Label: sans 13px weight 500
- Right: count (mono) + arrow (tertiary)

### Eyebrow pattern
```css
font-family: var(--mono); font-size: 11px; font-weight: 500;
letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-tertiary);
/* dot: 6px circle, var(--success) fill, pulse animation */
```

---

## 8. Grid Layouts

| Class | Columns | Gap | Use |
|---|---|---|---|
| `.db-kpi-band` | `repeat(5,1fr)` → 3 → 2 | 12px | Top KPI strip |
| `.db-kpi-grid` | `repeat(4,1fr)` → 2 → 1 | 10px | Agent stats |
| `.db-grid` | 12-col | 12px | Analytics dashboard |
| `.db-body-3col` | `1fr 320px 300px` | 16px | Dashboard body |
| `.grid-2/3/4` | auto-fit, 280/220/180px min | gap-lg | Utility grids |
| `.app-page-stat-grid` | `repeat(auto-fit, minmax(180px,1fr))` | 12px | Stat tiles |

Responsive: always `flex-direction: column` below 768px; collapse grid columns at named breakpoints.

---

## 9. Status Badge / Pill Patterns

```css
/* Inline badge */
display: inline-flex; align-items: center; gap: 4px;
padding: 2px 8px; border-radius: var(--ds-radius-pill);
font-family: var(--mono); font-size: 11px; font-weight: 600;

/* Colors follow the state tokens:
   green tint for success/open, red for error/overdue,
   amber for warn/pending, blue for info/in-progress, slate for neutral */
```

---

## 10. Z-Index Scale

| Layer | Value |
|---|---|
| Topbar | 100 |
| Sidebar | 90 |
| Dropdown | 200 |
| Elevated | 300 |
| Modal | 500 |
| Toast | 800 |
| Command palette | 9000 |
| Skip link | 10000 |

---

## 11. Interaction Patterns

- **Focus ring**: 2px solid `--accent`, offset 2px, 4px color-mix glow. High-contrast: 3px offset 3px + 2px inset.
- **Ripple**: scale(0)→scale(1) at click point, 480ms cubic, `rgba(ink-primary 8%)`.
- **Hover lift**: `translateY(-2px)` for cards, `scale(1.025)` for `.ds-card.is-hoverable`.
- **Icon hover**: icon-box bg → `--accent-subtle`, color → `--accent`.
- **Skeleton**: gradient shimmer left→right, 1.4s loop. Shape-matched to target element.
- **Page entry**: Framer Motion `stagger` container + `fadeUp` children (y:16→0, 400ms spring).

---

## 12. Dark Mode Rules

1. Never hardcode light values — all colors via tokens.
2. Dark canvas is `#0E1015` (near-black with blue tint, not pure black).
3. Surfaces lift slightly: canvas < subtle < surface.
4. All borders become rgba-white at low opacity (8-15%).
5. Accent stays `#0AA550`; only hover/subtle change.
6. Shadows deepen 3-5× opacity; nothing disappears.
7. Atmospheric aura opacity drops to 0.5 (from 0.7).
8. Glass surfaces: `rgba(12,14,19,.88) backdrop-filter:blur(16px) saturate(180%)`.

---

## 13. What NOT to Do

- **No warm-stone in the app shell** — warm palette (`--rp-warm-*`) is for landing/login only.
- **No secondary brand hues** — no teal, indigo, cyan, purple as primary colors.
- **No hardcoded hex** — always `var(--token)`.
- **No large transforms on hover** — max `translateY(-2px)` / `scale(1.025)`.
- **No "NPA" in UI** — every loan is already an NPA; never surface the term.
- **No box shadows on table rows** — rows use bg-subtle hover only.
- **No border-radius > 18px** — hero is 18px, that's the ceiling.

---

## 14. Page Anatomy Checklist

Every page in the app should have:

1. **`.app-page-hero`** — eyebrow (mono uppercase + pulse dot) / serif title (italic accent em) / sub with count chip
2. **Toolbar row** (`.ds-toolbar`) — search/filter inputs + action buttons, 44px height
3. **Content cards** (`.ds-card.is-pad`) — data tables, lists, or stat grids inside
4. **Empty state** (`.ds-empty`) — icon + message + CTA when no data
5. **Skeleton loaders** — shape-matched to real content, shimmer animation
6. **Responsive collapse** — single column below 768px

Optional but common:
- KPI stat tiles above the table (`.app-page-stat-grid` + `.app-page-stat-tile`)
- Section dividers with `.app-page-section-label` (mono uppercase, tertiary)
- Drawer / slide-over for detail (`.ds-drawer`)
