# RecoverPro Design System

## Architecture

Three layers, each building on the one above:

```
src/styles/design-tokens.css   ← raw values (--rp-* and --rp-warm-*)
src/LandingPage.css            ← .landing {} maps --rp-warm-* → semantic aliases
src/styles/AppLayout.tokens.css ← .app-layout {} maps --rp-* → semantic aliases
```

Rules:
- **No raw hex outside `design-tokens.css`.** Semantic aliases and component classes reference only `var(--token)`.
- Warm stone = landing / pre-login tone. Cool slate = app shell tone.
- Both surfaces use the same accent green (`--rp-accent: #0AA550`).

---

## Warm Stone Tokens (landing page)

Defined in `:root` via `design-tokens.css`. Dark values flip at `@media (prefers-color-scheme: dark)`.

| CSS variable | Light | Dark | Role |
|---|---|---|---|
| `--rp-warm-canvas` | `#FAFAF9` | `#0C0A09` | Page background |
| `--rp-warm-surface` | `#FFFFFF` | `#111110` | Cards, nav, modals |
| `--rp-warm-subtle` | `#F5F5F4` | `#1C1A19` | Hover, input bg |
| `--rp-warm-border` | `#E7E5E4` | `#282624` | Default dividers |
| `--rp-warm-border-strong` | `#D6D3D1` | `#3A3633` | Emphasis dividers |
| `--rp-warm-ink-1` | `#0C0A09` | `#FAFAF9` | Primary text |
| `--rp-warm-ink-2` | `#57534E` | `#A8A29E` | Secondary text |
| `--rp-warm-ink-3` | `#A8A29E` | `#57534E` | Muted / labels |
| `--rp-warm-accent` | `#0AA550` | `#22C55E` | Landing accent (flips in dark) |
| `--rp-warm-accent-hover` | `#088a42` | `#4ADE80` | Accent hover state |
| `--rp-warm-accent-subtle` | `rgba(10,165,80,.10)` | `rgba(34,197,94,.12)` | Accent wash |
| `--rp-accent` (shared) | `#0AA550` | `#0AA550` (app shell dark unchanged) | Brand green (app shell) |
| `--rp-white` | `#ffffff` | `#ffffff` | Constant white — on-accent text |

Scoped as semantic aliases inside `.landing {}` in `src/LandingPage.css`:
`--bg-canvas`, `--bg-surface`, `--bg-subtle`, `--border`, `--border-strong`,
`--ink-primary`, `--ink-secondary`, `--ink-tertiary`, `--accent`, `--accent-hover`, `--accent-subtle`.

Dark mode is fully automatic: `--rp-warm-*` tokens flip at `:root` via `@media (prefers-color-scheme: dark)` in `design-tokens.css`.
No extra `.landing` dark override block is needed.

---

## Cool Slate Tokens (app shell)

Scoped inside `.app-layout {}` in `src/styles/AppLayout.tokens.css`. Same semantic aliases,
cool-neutral gray ramp instead of warm stone.

---

## Typography

Source of truth: `--rp-font`, `--rp-font-serif`, `--rp-font-mono` in `design-tokens.css`.
Short aliases `--sans`, `--serif`, `--mono` promoted to `:root` so all surfaces inherit.

| Family | Token | Stacks |
|---|---|---|
| Sans | `var(--sans)` | Inter, system-ui, -apple-system, sans-serif |
| Serif | `var(--serif)` | Fraunces, Georgia, serif |
| Mono | `var(--mono)` | JetBrains Mono, Fira Mono, monospace |

**Type scale (landing):**

| Role | Size | Weight | Family | Tracking | Leading |
|---|---|---|---|---|---|
| H1 headline | 60px | 300 | Serif | −0.03em | 1.05 |
| Section title | 36px | 300 | Serif | −0.02em | — |
| CTA banner | 40px | 300 | Serif | −0.02em | — |
| Stat value | 28px | 400 | Serif | −0.02em | 1.1 |
| Subhead | 16px | 400 | Sans | — | 1.6 |
| Feature title | 14px | 600 | Sans | −0.01em | — |
| Button | 14px | 600 | Sans | — | — |
| Nav CTA / links | 13px | 600/500 | Sans | — | — |
| Body / desc | 13px | 400 | Sans | — | 1.6 |
| Section label | 11px | 600 | Mono | 0.08em UC | — |
| Form label | 11px | 600 | Sans | 0.06em UC | — |
| Eyebrow pill | 11px | 500 | Mono | 0.08em UC | — |
| Stat label | 10px | 500 | Mono | 0.06em UC | — |

---

## Semantic State Colors

Global tokens in `:root` via `design-tokens.css`. Dark values flip in `@media (prefers-color-scheme: dark)`, `html.dark`, and `.app-layout.dark`.

| CSS variable | Light | Dark | Role |
|---|---|---|---|
| `--rp-success` | `#15803D` | `#22C55E` | Success text / icon / border |
| `--rp-success-subtle` | `rgba(21,128,61,.08)` | `rgba(34,197,94,.10)` | Success banner background |
| `--rp-error` | `#B91C1C` | `#EF4444` | Error text / icon / border |
| `--rp-error-subtle` | `#FEF2F2` | `#1F1315` | Error banner / input background |
| `--rp-warn-bg` | `#FFFBEB` | `#1F1B0F` | Warning banner background |
| `--rp-warn-border` | `#F59E0B` | `#F59E0B` | Warning border / icon |
| `--rp-warn-ink` | `#92400E` | `#FBBF24` | Warning text |

---

## Spacing Scale

8-px grid (`--rp-s1` through `--rp-s6` in `design-tokens.css`).

| Step | Value | Common use |
|---|---|---|
| s1 | 4px | Tight gaps, badge padding |
| s2 | 8px | Component internal gaps |
| s3 | 12px | Form field gaps |
| s4 | 16px | Section label → title |
| s5 | 24px | Stat paddings, CTA row gap |
| s6 | 32px | Card padding extension |
| — | 40px | Section internal padding-top |
| — | 48px | Horizontal section padding |
| — | 80px | Section vertical padding |

Container: `max-width: 1080px; margin: 0 auto`.

---

## Radius

| Token | Value | Used on |
|---|---|---|
| `--rp-r-sm` (4px) | 4px | Tight chips |
| `--rp-r-md` (8px) | 8px | Nav CTA, feature icon, inputs |
| `--rp-r-lg` (12px) | 12px | Section grid containers |
| `999px` (literal) | pill | Eyebrow badge, feature badge |
| `10px` (literal) | — | Primary button |
| `2px` (literal) | — | Progress bar |

---

## Motion

| Token | Value | Use |
|---|---|---|
| `--rp-ease` | `cubic-bezier(0.16,1,0.3,1)` | All spring transitions |
| `--rp-t` | `150ms var(--rp-ease)` | Standard hover (bg, color) |
| `--rp-t-lg` | `300ms var(--rp-ease)` | Longer transitions |
| — | `260ms var(--ease)` | FAQ chevron rotate |
| — | `280ms var(--ease)` | FAQ accordion expand |
| — | `500ms var(--ease)` | Scroll reveal cards |

**Keyframes (in `LandingPage.css`):** `land-fadeUp`, `land-splitUp`, `gradient-pan`, `shine-sweep`, `ripple-expand`.

---

## Component Patterns

### Primary Button — `.landing-btn-primary`
- `background: var(--accent)` · white text · `border-radius: 10px` · `padding: 12px 24px`
- `font-size: 14px; font-weight: 600; font-family: var(--sans)`
- Hover: `background: var(--accent-hover)` + shine sweep animation
- Click: ripple span injected with class `landing-ripple`
- Combine with: `pm-press pm-focus-ring pm-magnetic`

### Ghost Link — `.landing-btn-ghost`
- `color: var(--ink-secondary)` · `font-size: 13px; font-weight: 500`
- Hover: `color: var(--ink-primary)`
- Combine with: `pm-link-underline pm-focus-ring`

### Nav CTA — `.landing-nav-cta`
- `background: var(--accent)` · white · `border-radius: 8px` · `padding: 8px 16px`
- `font-size: 13px; font-weight: 600`

### Nav Link — `.landing-nav-link`
- `color: var(--ink-secondary)` · `padding: 6px 10px` · `border-radius: 6px`
- Hover: `color: var(--ink-primary); background: var(--bg-subtle)`

### Section Header — `.landing-section-label` + `.landing-section-title`
- Label: Mono 11px, 600, 0.08em, UC, `color: var(--ink-tertiary)`, centered, `margin-bottom: 12px`
- Title: Serif 36px, 300, −0.02em, `color: var(--ink-primary)`, centered, `margin-bottom: 48px`

### Eyebrow Pill — `.landing-eyebrow`
- Mono 11px, 500, 0.08em UC · `color: var(--ink-tertiary)`
- `background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 999px; padding: 5px 12px`

### Feature Card — `src/components/landing/FeatureCard.tsx`
- Markup: `.landing-feature-card > .landing-feature-card-top > .landing-feature-icon` + title + desc
- `padding: 32px 28px` · `background: var(--bg-surface)` · hover: `var(--bg-subtle)`
- Icon: `36×36px`, `border-radius: 8px`, `background: var(--accent-subtle)`, `color: var(--accent)`
- Scroll reveal: starts `opacity: 0; translateY(20px)` → `.is-visible` triggers transition
- Stagger delay via `style={{ transitionDelay: \`${index * 70}ms\` }}`
- Combine with: `pm-hover-lift`

### Feature Badge — `.landing-feature-badge`
- Mono 9px, 700, 0.06em UC · `color: var(--accent); background: var(--accent-subtle); border-radius: 999px`

### Stat Item — `src/components/landing/StatItem.tsx`
- Value: Serif 28px, 400, −0.02em · count-up animation on intersection
- Label: Mono 10px, 500, 0.06em UC, `color: var(--ink-tertiary)`

### FAQ Accordion — `src/components/landing/FaqItem.tsx`
- CSS grid height trick: `grid-template-rows: 0fr` → `1fr` on `.is-open`
- Q: Sans 13px, 500 · hover/open: `color: var(--accent)`
- Chevron: `color: var(--ink-tertiary)` · open: `rotate(180deg)` via `260ms var(--ease)`
- A: Sans 13px, `line-height: 1.75`, `color: var(--ink-secondary)`

### Form Input — `.landing-contact-field input / textarea`
- `background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 8px`
- `padding: 9px 12px; font-size: 13px; color: var(--ink-primary)`
- Focus: `border-color: var(--accent); background: var(--bg-surface)`

### Form Label — `.landing-contact-field label`
- Sans 11px, 600, 0.06em UC, `color: var(--ink-tertiary)`

### Contact Detail — `.landing-contact-detail`
- `display: flex; align-items: center; gap: 8px`
- `font-size: 12px; color: var(--ink-secondary)` · hover: `var(--ink-primary)`

### Wave Divider — `src/components/landing/WaveDivider.tsx`
- SVG path fills `var(--bg-surface)` · rendered over `var(--bg-canvas)` for a smooth transition

### Section Grid — `.landing-grid` / `.landing-support-grid`
- `display: grid; gap: 1px; background: var(--border)` — hairlines between cells at zero cost
- Container cells have `background: var(--bg-surface)` so the 1px gap shows through as a border
- Feature grid: `repeat(3, 1fr)` → 2 (1024px) → 1 (600px)
- Support grid: `1.2fr 1fr` → 1 (768px)

---

## Shared Component Locations

| Component | Path |
|---|---|
| StatItem | `src/components/landing/StatItem.tsx` |
| FeatureCard | `src/components/landing/FeatureCard.tsx` |
| FaqItem | `src/components/landing/FaqItem.tsx` |
| WaveDivider | `src/components/landing/WaveDivider.tsx` |
| Barrel export | `src/components/landing/index.ts` |

Styles for all landing components live in `src/LandingPage.css` (`.landing-*` prefix).
CSS classes reference only `var(--bg-*)` / `var(--ink-*)` / `var(--accent*)` / `var(--border*)` semantic aliases — no raw hex.
