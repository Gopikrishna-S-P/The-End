# RecoverPro Mobile — Page-by-Page Build Prompt

Reusable driver prompt for `MOBILE-DESIGN-PROMPT-BOOK.md`. Paste this same prompt into a fresh AI
coding session (Gemini or otherwise) each time you want to build the next item — one item per run,
one session per item. Don't ask it to chain multiple items in one run.

All progress state lives in the book itself (the `[x] Done` checkboxes and per-item notes), not in
any session's memory — so this is safe to run from a brand-new session every time, on any machine that
has this repo checked out, with no other handoff needed. The next session just re-reads the book and
picks up wherever the last one left off.

---

## The prompt

```
Open F:\f-final\MOBILE-DESIGN-PROMPT-BOOK.md.

Find the first catalog item in Part 2 (checking Phase 0 before Phase 1, Phase 1 before Phase 2, etc.,
in the order they appear in the book) whose checkbox is not [x] Done. If its entry lists a
"Depends on" a foundation item that isn't Done yet, stop and tell me instead of building out of order.

Build that item in F:\f-final\recoverpro\mobile, following:
- Part 1 of the book (design tokens, navigation model, component library mapping, auth/security
  parity, API client conventions, robustness standards, mobile-adaptation methodology) as the binding
  standard for HOW to build — do not deviate from it without flagging the deviation to me first.
- The item's own Part 2 entry as the spec for WHAT to build — its web source file(s), roles, backend
  endpoints, target mobile nav placement, and layout adaptation note.
- The existing mobile codebase's own conventions (file layout under src/app, src/api, src/components,
  src/context, src/theme) — extend existing patterns, don't introduce a parallel convention.

Read the actual web source file(s) named in the entry before building — the catalog entry is a map,
not a full spec; the real behavior (fields, validation, edge cases, endpoint request/response shapes)
lives in the web source and the backend controller in F:\f-final\recoverpro\server.

Match web's feature behavior exactly (same fields, same validation rules, same role/permission gating,
same status transitions) while adapting the LAYOUT to mobile SaaS UI/UX per the book's methodology —
this is a redesign, not a re-skin: don't try to cram web's desktop layout onto a phone screen.

When the screen is done:
1. Run `tsc --noEmit` in mobile/ and fix any type errors.
2. Request the new route's OWN Metro bundle specifically (e.g. GET its .bundle URL), not just
   _layout.tsx's — Expo Router lazy-bundles each route separately, so only checking _layout can pass
   while the actual new screen has a real bundling error. Confirm the bundle actually changed (new
   hash) versus before your edit.
3. If the item touches auth, tokens, permissions, or offline sync, double-check it against Part 1
   §1.4/§1.6 explicitly — these are the areas most likely to introduce a real security or data-loss
   regression if rushed.
4. Update the item's checkbox to [x] Done in MOBILE-DESIGN-PROMPT-BOOK.md, and add a one-line note
   after the checkbox describing anything you deviated from the spec on and why (e.g. "endpoint
   returns a field the book didn't mention — added it" or "used a bottom sheet instead of a stack
   push because the form has only 2 fields").

Then STOP. Do not start the next catalog item in this same run, even if there's context budget left —
each item gets reviewed before the next one starts.
```

---

## Notes on using this prompt

- **Foundation first.** Phase 0 items (0.1–0.8) are prerequisites for almost everything else — expect
  the first several runs of this prompt to be foundation work, not visible new screens. That's
  expected, not a sign of drift.
- **One item, one session.** Resist the temptation to batch — 59 pages plus 8 foundation items is far
  more than one context window can hold reliably, and per-page review is how mismatches against the
  book (or against web's real behavior) get caught early instead of compounding across 20 screens.
- **If the book turns out wrong.** The book was hand-assembled from a point-in-time read of the web
  and mobile codebases (2026-08-10). If a catalog entry's web source file has since moved, or its
  described behavior doesn't match what you find when you actually open it, trust the live code over
  the book — fix the book's entry as part of that item's work rather than building against a stale
  description.
- **Escalate scope changes.** If building an item reveals it's actually two features, or that a
  "verify" note in the book (e.g. #8 Visit Interview, #23 Settlement Offers' role tier) resolves to
  something materially different from what's written, stop and flag it rather than silently
  reinterpreting the spec.
