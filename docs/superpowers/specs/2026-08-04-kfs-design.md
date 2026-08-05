# Key Fact Statement (KFS) — design spec

**Date:** 2026-08-04
**Status:** Approved, implementing
**Phase:** Phase 3, feature 2 of 3 (settlement_offers → KFS → grievances)

## Context

`key_fact_statements` is one of three tables (`settlement_offers`, `key_fact_statements`,
`grievances`) that have existed in the schema since the baseline migration
(`V001__baseline.sql:939`) with a complete, detailed column design, but zero application code.
Unlike `settlement_offers`, this table's design already anticipates document-generation concerns
that don't apply to a workflow entity: versioning (`version_label`, `is_current`), tamper-evidence
(`content_sha256`, `pdf_sha256`), and a `generation_reason` field — all signs it was designed
around producing an immutable, hashable regulatory document, not a mutable business record.

A KFS is normally the lender's pre-disbursal disclosure of the all-in cost of credit. RecoverPro is
a collections platform, not an origination platform — it never disburses a loan, and `Allocation`
(the core loan record) has no structured interest-rate/APR/tenure/EMI columns, only
`totalDue`/`outstandingAmount` plus an org-dependent `dynamic_data` JSONB blob. A full-fidelity,
reliably-computable KFS is therefore only possible where this codebase actually holds structured
loan-term data — and the only place it does is `RestructureProposal`
(`originalApr`/`newApr`, `originalEmiAmount`/`newEmiAmount`, `originalEmiCount`/`newEmiCount`).
This scopes the feature: **a KFS-style revised-terms disclosure generated once a restructuring is
lender-approved**, giving staff a document to hand the borrower when presenting the new terms —
matching RBI's intent that a borrower see the all-in cost before committing to changed terms.

There is no borrower self-service portal anywhere in this app (settlement offers and restructuring
are both staff-attested, no borrower login) — the KFS follows the same pattern: staff generate and
download the PDF, then share it out-of-band (WhatsApp/email/read aloud on a call). No new
public-facing surface is introduced.

## Data model

**New migration** `V073__key_fact_statements_restructure_link.sql`: adds
`restructure_proposal_id UUID NOT NULL` to `key_fact_statements`, with an FK to
`restructure_proposals(id) ON DELETE RESTRICT` and a **unique index**
(`uq_kfs_restructure_proposal`). The unique index is the concurrency-safety mechanism: it makes
generation naturally idempotent (a duplicate `INSERT` fails the constraint, caught and treated as
"already exists, return it") without needing an application-level lock. RLS and the other FKs
(`allocation_id`, `organization_id`, `generated_by_user_id`) already exist from `V038`/`V040` —
only this one link is missing.

**New enum** `KfsGenerationReason`: `RESTRUCTURING` only for this pass (the column supports future
generation triggers — e.g. settlement, origination-copy — without a schema change; YAGNI applies to
the enum's *members*, not the column).

**Field derivation** — `RestructureProposal` supplies `newApr`/`newEmiAmount`/`newEmiCount`; the
allocation supplies `outstandingAmount`. Everything else is computed or explicitly left absent
rather than fabricated:

| KFS field | Source |
|---|---|
| `interest_rate_percent`, `apr_percent` | `newApr` (both — this app doesn't distinguish nominal rate from APR anywhere) |
| `tenure_months` | `newEmiCount` |
| `emi_amount` | `newEmiAmount` |
| `repayment_frequency` | `"MONTHLY"` (fixed — EMI is used everywhere in this app as a monthly figure) |
| `sanctioned_amount` | `allocation.outstandingAmount` at approval time (interpreted as "principal being restructured") |
| `total_payable` | `newEmiAmount × newEmiCount` (computed) |
| `total_interest_charge` | `total_payable − sanctioned_amount` (computed) |
| `processing_fee`, `other_charges`, `net_disbursed_amount` | left `null` — not applicable to a restructuring (no new disbursal, no new fees); the PDF renders these as "N/A", not ₹0 |
| `cooling_off_days` | left `null` — RBI's cooling-off provision applies to new digital loans, not restructurings |
| `generation_reason` | `RESTRUCTURING` |
| `first_emi_date` / `last_emi_date` | left `null` for this pass — `RestructureProposal` has no explicit start-date field to derive these from without guessing |

`additional_facts` (JSONB) stores the source `restructure_proposal_id` and the raw
`originalApr`/`newApr` for audit traceability (so a reviewer can see what changed, not just the
final numbers).

`rendered_html`/`content_sha256`/`pdf_path`/`pdf_sha256` follow the same populate-on-generate
pattern the schema already implies: render, hash, store, persist the hash alongside the row so a
downloaded PDF can be verified against the DB record later.

## Roles

- **Generate, read**: `PLATFORM_ADMIN`, `ORG_ADMIN`, `MANAGER`, `TL`, `FO`, `CALLER`, `TRACER` — same
  as `RestructureProposal`'s `READERS`. Generating a KFS renders already-approved data; it isn't a
  new compliance decision (that already happened when the proposal was lender-approved), so it
  doesn't need a separate, narrower gate. `FO`/`CALLER` need it in hand before a call/visit.
- No approve/reject/status workflow on the KFS itself — it's a generate-once immutable record.

## API (`/api/v1/kfs`)

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/` | Readers | Body: `restructureProposalId`. Throws `BusinessException` if the proposal isn't `APPROVED`. If a KFS already exists for that proposal (unique index), returns the existing row instead of erroring — idempotent by design. |
| GET | `/{id}` | Readers | Metadata (all fields except the rendered HTML/PDF bytes) |
| GET | `/{id}/pdf` | Readers | Binary download — `ContentDisposition.attachment()`, `MediaType.APPLICATION_PDF`, mirrors `DocumentController`/`ExportController` |
| GET | `/restructure-proposal/{restructureProposalId}` | Readers | Lookup by proposal (404 if none generated yet) |

Cross-org platform-admin handling mirrors every other controller this session:
`elevateIfPlatformAdmin` (unattended) for by-id/by-proposal routes.

## Build shape

Mirrors `SettlementOffer` structurally: `KeyFactStatement` entity, `KeyFactStatementRepository`,
`KfsService`/`KfsServiceImpl`, `KfsController`. One new piece: `KfsPdfBuilder`
(`service/export/`), OpenPDF-based like the existing `PdfReportBuilder`/`DocBuilder`, but laid out
as a formal one-page KFS statement (labeled fields, not a tabular report) rather than reusing
`DocBuilder` directly — the visual shape is different enough (regulatory statement vs. data table)
that forcing it through the report layout would look wrong. Storage follows the established
per-document-type config pattern (task #39 this session): new
`app.storage.kfs-path=${UPLOAD_DIR:./uploads}/kfs` property (sibling to `rag-documents-path`,
`sos-audio-path`, `visits-path`, `call-recordings-path` — not nested under `base-path`), written via
the same local-disk approach `ExportServiceImpl` uses for reports.

## Explicitly out of scope for this pass

- Origination-time KFS (before disbursal) — not applicable, RecoverPro never disburses loans
- Settlement-offer-triggered KFS — `SettlementOffer` has no APR/EMI fields to derive a financial
  breakdown from; revisit only if that data model changes
- Best-effort generation from `dynamic_data` JSONB — organization-dependent, unreliable for a
  compliance document; explicitly rejected during scoping
- Public borrower-facing link (payment-link-style token) — staff download and out-of-band sharing
  only, matching `RestructureProposal`/`SettlementOffer`
- Versioning/supersession UI — `version_label`/`is_current` columns are populated (`"v1"`/`true`)
  for future-proofing but only one KFS per restructure proposal is possible this pass (enforced by
  the unique index), so there's nothing to version yet
- Frontend UI (backend-first per this session's established pattern; revisit once the backend is
  verified)

## Testing plan

Unit tests: field-derivation math (`total_payable`, `total_interest_charge`), idempotent-return on
duplicate generation, blocked-generation when the proposal isn't `APPROVED`, PDF hash computation.
Controller tests: role/tenant isolation, platform-admin elevation — same pattern as every other
controller this session. Full `mvn test` suite must stay green. Live curl verification against a
real QA restructure proposal: approve it, generate the KFS, re-generate (confirm idempotent —
same id returned), download the PDF, confirm the bytes are a valid PDF and `pdf_sha256` matches a
local hash of the downloaded bytes.
