# SYSTEM 26 — Search/Filter/Sort Infrastructure: execution record

Executed from `docs/PRODUCTION-TASKLIST.txt`, SYSTEM 26 block, 2026-08-18 session.
Continuation of the same session that completed SYSTEM 35 and SYSTEM 18 TASK 18.1 + SYSTEM 28
TASK 28.1.

## Prerequisite check

SYSTEM 07 (encryption) — already deeply verified during the SYSTEM 35 session (`EncryptedStringConverter`/`LookupHashService` architecture is real). No new investigation needed.

## Major drift found before writing any code

The tasklist's CURRENT STATE says the borrower-name filter bug is unfixed ("the codebase already
has the correct mechanism... it is simply not used here") and predicts Allocation, Collection,
and Visit all have the same LIKE-on-ciphertext problem. Investigation found this only partially
true:

1. **`Allocation`'s borrower-name search was already fully built and working**, referencing a
   design spec (`docs/superpowers/specs/2026-08-06-global-search-design.md`) not mentioned in the
   tasklist at all: `AllocationNameSearchToken` entity/repository, `AllocationSearchIndexService`
   (reindexes on every write path — `AllocationImportProcessor`, `UploadDataServiceImpl`), a
   correct token-hash-based repository query, an `AllocationNameTokenBackfillRunner`, and a merged
   frontend (`GlobalSearchModal` deleted, folded into `CommandPalette`). The **only** actual bug
   was in the test itself (`AllocationRepositorySearchTest`): the loan-number-prefix assertion
   passed a raw substring to a `LIKE` pattern parameter without the trailing `%` the production
   caller (`AllocationServiceImpl`) always appends — so `LIKE` degraded to an exact-match
   comparison that could never pass. This is also the test that showed up as an unrelated,
   pre-existing failure in every earlier session today (SYSTEM 35, SYSTEM 18/28) — it was this
   bug all along, not something separate.
2. **A comprehensive grep (`cb.like`/`criteriaBuilder.like` across the whole server tree) found
   exactly one remaining LIKE-on-ciphertext site**: `PtpSpecification.withFilters()`'s
   `borrowerName` predicate. `Collection` has no encrypted field at all (the tasklist's prediction
   doesn't hold); `VisitLog`, `ChatSession`, `NpaRecord`, `PtpHistory`, `User`, `UserCreationRequest`
   all have encrypted fields but no LIKE/Specification-based search on them anywhere in the
   codebase.
3. **Severity nuance**: no current web or mobile UI actually sends `PtpFilterRequest.borrowerName`
   to the backend — both `PtpsPage.tsx` and the mobile equivalent search client-side over the
   already-fetched, already-decrypted page instead (an explicit, documented design choice: "there
   is no generic free-text searchTerm param... org scope is always derived from the JWT"). The bug
   was still real and required fixing (any direct API caller, including a future frontend change,
   would silently get zero results), just not actively user-visible on any *current* screen the
   way the tasklist's "single most user-visible defect" framing implies.

## TASK 26.1 — Fix encrypted-field search [DONE for the two real cases]

- **Allocation**: fixed the one-line test bug (`AllocationRepositorySearchTest`); verified the
  whole existing pipeline end to end (search-by-name-token, search-by-loan-prefix, no-filter).
- **PtpRecord**: applied the identical architecture already proven for Allocation —
  `ptp_name_search_tokens` table (migration `V094`, RLS policy denormalizing `organization_id`
  since `ptp_records` has none of its own — mirrors `rls_ptp_records_isolation`'s join-to-`allocations`
  approach), `PtpNameSearchToken` entity/repository, `PtpSearchIndexService`/Impl (reindexes on
  both PtpRecord write paths: `PtpServiceImpl.createPtp()` and `PtpImportProcessor.persistBatch()`
  — confirmed via full trace that `updatePtpStatus()` and the Lucien `CreatePtpTool` never touch
  `borrowerName` independently, so no other write path exists), `PtpNameTokenBackfillRunner`
  (flag-gated `app.backfill.ptp-name-tokens=true`, mirrors the Allocation one exactly),
  `PtpSpecification.withFilters()` rewritten to use a Criteria API `Subquery` against the token
  table instead of `cb.like` on ciphertext (the hash is computed once in `PtpServiceImpl.getAllPtps()`
  and passed in, since a static `Specification` factory has no Spring-managed dependencies of its
  own — mirrors how `AllocationServiceImpl` computes its hash before calling the repository).
- **26.1.f (UX honesty)**: no UI currently sends `borrowerName` for PTPs, so there was no filter
  copy to correct; documented the prefix-match (not "contains") semantics directly on
  `PtpFilterRequest.borrowerName`'s field javadoc instead.
- **26.1.g (apply to every encrypted field)**: verified via the comprehensive grep above — done;
  no other entity has this bug.
- **26.1.h (tests)**: `PtpBorrowerNameSearchTest` (new, real create→search integration test,
  confirms both token-row creation and correct search results) plus the fixed
  `AllocationRepositorySearchTest`.

## Not done this session (deferred)

- **TASK 26.2 — Specification consistency audit** (sort-field allowlisting across every
  `*Specification` class; unvalidated sort params are an information-disclosure/injection vector).
  Not started.
- **TASK 26.3 — Pagination correctness** (deterministic tiebreaker sort key; keyset pagination for
  high-volume lists). Not started.

Both are P1, distinct from TASK 26.1's P0 encryption bug, and substantial enough (auditing every
`*Specification` class across the codebase) to warrant their own session rather than a rushed
pass at the end of an already-long one.

## Verification

Full `mvn -f server/pom.xml clean test`: **594 tests, 0 failures, 0 errors, BUILD SUCCESS** — the
first fully-green full-suite run this session (every earlier run had exactly one failure:
`AllocationRepositorySearchTest`, now understood to be this system's own bug rather than an
unrelated pre-existing one). SYSTEM 26's own specified command
(`-Dtest='*Specification*Test,*Search*Test,*Filter*Test'`) run separately — see session's final
report for its pass/fail count.
