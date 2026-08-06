# Global search — design spec

**Date:** 2026-08-06
**Status:** Approved, ready for implementation plan

## Context

The topbar currently has two disconnected search UIs:

- **Ctrl/Cmd+K** opens `CommandPalette` (`web/src/components/CommandPalette.tsx`) — a pure
  client-side fuzzy matcher over nav pages (`nav.sections`, already role-filtered by
  `useAppNavState`) plus a handful of hardcoded actions (theme toggle, sound, customize topbar,
  shortcuts, tour, billing, profile, logout). No backend call.
- The topbar **Search button** opens `GlobalSearchModal.tsx` — a debounced (250ms, abort-on-retype)
  call to `GET /api/v1/allocations?searchTerm=...`, rendering a flat list of allocations.

The backend side is broken: `AllocationController.getAllocations` accepts `searchTerm` but never
uses it — `AllocationServiceImpl.getAllocations` calls
`allocationRepository.findAllWithFilters(orgId, status, fileUploadId, assignedToUserId, pageable)`,
and the JPQL query has no predicate on borrower name or loan number at all. Typing anything into
`GlobalSearchModal` returns the same unfiltered, org-scoped page of allocations regardless of query
text.

Making name search work is also blocked by encryption: `Allocation.borrowerName` is stored via
`EncryptedStringConverter` → `LocalKeyEnvelopeEncryptor`, which is AES/GCM with a **random IV per
encryption**. The same name produces different ciphertext every time it's saved, so the database
can never pattern-match it directly. `loan_number` is a plain, indexed column and has no such
problem.

The codebase already has a precedent for solving exactly this class of problem:
`LookupHashService` (`server/src/main/java/.../security/encryption/LookupHashService.java`)
computes an HMAC-SHA256 (dedicated `app.encryption.lookup-hash-key`, falling back to a key derived
from the main encryption key) of a normalized (trim + lowercase) value, stored in a plain sibling
column — used today by `Borrower` for exact-match lookup on `phone`/`email`/`ckycId`
(`phoneLookupHash`/`emailLookupHash`/`ckycIdLookupHash`, recomputed via `@PrePersist`/`@PreUpdate`
`syncLookupHashes()`). `LookupHashBackfillRunner` is the established pattern for recomputing hashes
across existing rows, flag-gated (`app.backfill.lookup-hash=true`), looping per-organization with
`RlsOrgIdHolder` scoping, paginated at 200 rows.

That existing pattern only supports **exact-value** matching (one hash per whole field), which
doesn't support "type a few letters, see matches." This spec extends the same infrastructure
(same service, same key, same backfill-runner shape) to a **per-word prefix token** scheme, which
does.

## Data model

New child table, `allocation_name_search_tokens`:

| Column | Type | Notes |
|---|---|---|
| `allocation_id` | UUID, FK → `allocations.id`, cascade delete | |
| `token_hash` | `char(64)` (hex SHA-256 output, matching `LookupHashService.hash`'s format) | |

Composite primary key `(allocation_id, token_hash)`; index on `token_hash` for lookup. New Flyway
migration (next available version after `V080`), following the same RLS-policy pattern already
used for other org-scoped child tables (join to `allocations` for the org check, since this table
has no `organization_id` column of its own — mirrors how row-level scoping is done for other
allocation-child tables).

**Token generation** (new method on `LookupHashService`, alongside the existing `hash`/`hashPhone`):
given a name, normalize (trim, lowercase, split on whitespace into words), and for each word emit
HMAC hashes of every prefix from length 2 up to the full word length. Example: "John Smith" →
tokens for "jo","joh","john","sm","smi","smit","smith". This supports "type the start of any word
in the name" search (matches how Salesforce/Zendesk-style name search behaves) — it does not match
a substring in the middle of a word (e.g. "ith" won't find "Smith"); that's an accepted, explicit
trade-off, not a gap to fix later.

**Write path**: `Allocation.borrowerName` is set in exactly two places —
`AllocationImportProcessor` (bulk import: builder `.borrowerName(...)` for new rows, and
`existing.setBorrowerName(...)` for updates) and `UploadDataServiceImpl` (same two shapes). Both
call sites, immediately after setting the name, call a new `AllocationSearchIndexService.reindex
(allocation)` that deletes and re-inserts that allocation's token rows. This mirrors `Borrower`'s
approach of keeping the hash in sync at the point of mutation, but as an explicit call rather than
a JPA entity-lifecycle hook — an `@OneToMany` cascade on `Allocation` would rewrite the whole token
collection on every unrelated field save (status change, assignment, etc.), which is wasted work
since only these two call sites ever change the name.

**Backfill**: new `AllocationNameTokenBackfillRunner`, same shape as
`LookupHashBackfillRunner` — flag-gated (`app.backfill.allocation-name-tokens=true`), loops
organizations with `RlsOrgIdHolder` scoping, pages allocations at 200 rows, calls the same
`reindex` used by the write path.

## Search query

New repository query on `AllocationRepository`, added as an additional optional predicate to the
existing `findAllWithFilters`-family query (same org/status/fileUpload/assignedTo scoping as
today):

```
(:searchTerm IS NULL
  OR a.loanNumber ILIKE CONCAT(:searchTerm, '%')
  OR a.id IN (SELECT t.allocationId FROM AllocationNameSearchToken t
              WHERE t.tokenHash = :searchTermHash))
```

`searchTermHash` is computed server-side in `AllocationServiceImpl` by normalizing `searchTerm`
the same way as token generation (trim, lowercase — a single-word hash, since the user is typing
one prefix at a time) and calling `LookupHashService.hash`. This is the actual bug fix: today
`searchTerm` reaches the service and is silently dropped; after this change it drives a real
filter, matched against both loan number (prefix, case-insensitive, existing indexed column) and
borrower name (prefix-per-word, via the new token table).

No changes to the `GET /api/v1/allocations` request/response contract — `searchTerm` already exists
as a query param, the response DTO already carries `id`/`loanNumber`/`borrowerName`/amount fields
that `GlobalSearchModal` already renders today.

## Frontend

Merge into a single component, replacing both existing entry points:

- Keep `CommandPalette`'s shell — it already has full keyboard navigation (arrows/Enter/Home/End/
  Tab), fuzzy scoring + typo suggestions, a scope toggle ("Everywhere"/"This page"), and a
  `key:value` filter syntax. `GlobalSearchModal` has none of that.
- Extend it with a second, debounced (250ms, `AbortController`-cancelled) data source: the
  `GET /api/v1/allocations?searchTerm=` call, fired only once the query is 2+ characters, same
  threshold `GlobalSearchModal` uses today.
- Results render as two grouped sections: **"Loans & Customers"** (from the backend call, each
  item showing borrower name + loan number + amount, `run: () => navigate('/app/allocations/'+id)`
  — a direct jump to the loan detail page, no intermediate list) and **"Pages & Actions"** (today's
  `paletteItems`, unchanged — nav pages already role-filtered via `nav.sections`, plus the existing
  hardcoded actions). A small loading indicator shows in the "Loans & Customers" header while that
  section's request is in flight; the "Pages & Actions" section always filters instantly since it's
  client-side, so it's never blocked by the network call.
- Both **Ctrl/Cmd+K** (`useAppLayoutState.ts` binding) and the topbar **Search button**
  (`TopBar.tsx`) open this one component. `GlobalSearchModal.tsx` and its `onOpenSearch` /
  `searchOpen` plumbing in `AppLayout.tsx` are deleted as dead code once the merge lands.
- Recent items: replace the two separate `localStorage` keys (`rp-palette-recent`,
  `rp-global-search-recent`) with one unified list of `{type: 'page' | 'allocation', id, label}`
  entries, capped at the existing limits from each (palette had no hard cap shown, modal capped at
  5 — keep 5 as the unified cap, most-recent-first).

## Error handling

- Backend call fails (network error, 5xx, or 403 if the caller's role isn't in the allocations
  `READERS` group): the "Loans & Customers" section shows a small inline "Couldn't load loan
  results" message instead of the list. "Pages & Actions" stays fully usable — a failed backend
  call never blocks navigation search.
- Empty/short query (<2 chars): no backend call is fired (matches today's `GlobalSearchModal`
  behavior); "Recent" shows in place of both result groups, same as when the box is first opened.

## Explicitly out of scope

- Other entities (users, file uploads, tickets, tracer batches) — search stays limited to
  allocations + app pages/actions, per the original request.
- Mid-word substring matching (only prefix-per-word) — see trade-off note above.
- External search infrastructure (Elasticsearch, Postgres full-text/`pg_trgm`) — pure Postgres
  blind-index, matching current scale and the existing `LookupHashService` pattern.
- Any change to the `Borrower` entity or its existing exact-match lookup hashes — this spec only
  touches `Allocation`'s denormalized `borrowerName` snapshot, which is what the current UI already
  reads and displays.

## Testing plan

- Backend: unit tests for the new `LookupHashService` prefix-token method (same word → same
  hashes regardless of case/whitespace; different words → different hashes); repository test
  confirming `searchTerm` filters by loan-number prefix and by name-token match, scoped to org;
  `AllocationSearchIndexService.reindex` test confirming old tokens are removed and new ones
  inserted on a name change; backfill runner test on a small multi-org dataset. Full `mvn test`
  suite must stay green (per prior session finding: `mvn compile` alone missed real regressions
  here before).
- Frontend: component test that typing 2+ characters triggers the debounced backend call and
  renders results as links to `/app/allocations/:id`; test that both Ctrl/Cmd+K and the topbar
  button open the same component; test unified recent-item persistence and the 5-item cap.
- Live verification: click through the merged search in the running app (both entry points) as a
  role with allocation read access and as one without, confirming the error-handling fallback.
