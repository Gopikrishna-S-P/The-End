# Settlement offers — design spec

**Date:** 2026-08-04
**Status:** Approved, implementing
**Phase:** Phase 3, feature 1 of 3 (settlement_offers → KFS → grievances)

## Context

`settlement_offers` is one of three tables (`settlement_offers`, `key_fact_statements`,
`grievances`) that have existed in the schema since the project's baseline migration
(`V001__baseline.sql`) with a complete, detailed column design, but have zero application code —
no entity, no repository, no service, no controller, nothing in the frontend. They were flagged in
the endpoint-by-endpoint audit as "zero application code" gaps.

Unlike a from-scratch feature, the schema itself already encodes most of the real design
decisions (see `settlement_offers` in `V001__baseline.sql:976`). This spec fills in the workflow
logic and role gates the schema implies but doesn't state, then implements against it directly —
no new migration needed for the table itself (only RLS + FK reconciliation, following the same
pattern used for `call_logs` in `V070`).

`RestructureProposal` (`RestructureProposalController`/`RestructureProposalServiceImpl`) is the
direct precedent: a near-identical draft → propose → approve/reject → borrower-accept workflow,
already built, tested, and live. This feature mirrors its structure exactly rather than inventing
a new shape.

## Workflow

```
DRAFT ──(discount% > threshold)──> COMPLIANCE_REVIEW ──┐
  │                                                              │
  └──(discount% <= threshold)───────────────────────────────────┤
                                                                  ▼
                                                              APPROVED
                                                                  │
                                                            propose (staff presents to borrower)
                                                                  ▼
                                                              PROPOSED
                                                             /         \
                                                   borrower accepts   borrower/approver rejects
                                                          │                     │
                                                          ▼                     ▼
                                                      ACCEPTED              REJECTED
                                                          │
                                                    mark-paid (manual, staff-confirmed)
                                                          ▼
                                                        PAID

PROPOSED, past validity_until, un-accepted ──(scheduled sweep)──> EXPIRED
```

Reject is reachable from any non-terminal status (`DRAFT`, `COMPLIANCE_REVIEW`, `APPROVED`,
or `PROPOSED`) — an approver can decline before it ever reaches the borrower, staff can cancel an
already-approved offer before presenting it (terms changed, borrower's situation changed), or the
borrower can decline after seeing it. All land in the same terminal `REJECTED` state;
`rejected_by_user_id` distinguishes an internal decline (a real user made the call) from a borrower
decline (staff records it on the borrower's behalf, same user id as whoever was on the call —
there's no separate "borrower declined" flag, matching how `RestructureProposal` has no separate
concept either).

## Roles

- **Draft**: `FO`, `CALLER`, `TL`, `MANAGER` — front-line staff who negotiate directly with
  borrowers, plus their immediate supervisors. (`RestructureProposal` restricts drafting to
  `TL`/`MANAGER`+ only; settlement offers are lower-stakes, more frequent, front-line tools, so
  the bar is lower.)
- **Approve**: `TL`, `MANAGER`, `ORG_ADMIN`, `PLATFORM_ADMIN` when `compliance_review_required` is
  false. When true (discount above threshold), only `ORG_ADMIN`/`PLATFORM_ADMIN` can approve —
  compliance review and approval are the same action for a flagged offer, done by a higher
  authority, not two separate steps. This is enforced in the service layer (checking the flag),
  not by having two different endpoints.
- **Reject, propose, borrower-accept, mark-paid**: same as draft (`FO`/`CALLER`/`TL`/`MANAGER`) —
  these are all "what happened when I talked to the borrower" actions taken by whoever has the
  case.
- **Read**: `PLATFORM_ADMIN`, `ORG_ADMIN`, `MANAGER`, `TL`, `FO`, `CALLER`, `TRACER` (matches
  `RestructureProposal`'s `READERS` exactly).

`compliance_review_required` is computed automatically at draft time: `discount_pct` compared
against a configurable threshold, `app.settlement.compliance-review-discount-threshold-pct`,
default `30`. Not a manual flag the drafter sets.

## Data model

No new entity design needed — `SettlementOffer` maps directly onto the existing
`settlement_offers` columns. New enum `SettlementOfferStatus`: `DRAFT`,
`COMPLIANCE_REVIEW`, `APPROVED`, `PROPOSED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `PAID`.

**No new migration needed** — unlike `call_logs`, this table was never orphaned from Flyway.
`V038__fk_compliance.sql` already added every FK (including to `consent_artifacts` and
`payment_intents`, confirming those are the right integration points), `V040` already enabled RLS
with the standard platform-admin-bypass policy, `V041` already added amount check constraints, and
`V043` already added the `version` optimistic-locking column. The table has been fully
production-ready at the schema level since those migrations shipped — only the application layer
was ever missing.

There's also a pre-existing, populated-by-nobody `settlement_audit_logs` table
(`V001__baseline.sql:1014`), same shape as `CollectionAuditLog`/`PtpAuditLog`/`AllocationAuditLog`
(action, performed_by, previous_status, new_status, remarks). `SettlementOfferServiceImpl` writes
one row here on every transition, matching those three services' established pattern exactly. This
also means `CaseTimelineServiceImpl` (built earlier this session for BCR-1) can finally emit
`SETTLEMENT_OFFERED`/`SETTLEMENT_ACCEPTED`/`SETTLEMENT_DECLINED` — three of the `CaseEventType`
values that were defined but documented as "never produced, no audit trail exists." Wiring that in
is included in this pass.

## API (`/api/v1/settlement-offers`)

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/` | Draft roles | Body: allocationId, offeredAmount, tenorDays, validityUntil, conditions. Server computes `outstandingAtOffer` from the allocation and `discountPct` from that + `offeredAmount`; sets initial status based on the compliance threshold. |
| POST | `/{id}/approve` | Approve roles (compliance-gated) | 403 (via role check, not a custom error) if compliance-required and caller isn't ORG_ADMIN/PLATFORM_ADMIN |
| POST | `/{id}/reject` | Draft roles | Body: reason |
| POST | `/{id}/propose` | Draft roles | Marks presented to borrower; requires APPROVED |
| POST | `/{id}/borrower-accept` | Draft roles | Body: optional borrowerConsentArtifactId (mirrors `RestructureBorrowerAcceptRequest` exactly) |
| POST | `/{id}/mark-paid` | Draft roles | Body: optional paymentIntentId |
| GET | `/{id}` | Readers | |
| GET | `/allocation/{allocationId}` | Readers | |
| GET | `/` | Readers | Paged, filterable by status; platform-admin cross-org via `?orgId=&reason=`, same `resolveListOrgId` pattern as `RestructureProposalController.list` |

All cross-org platform-admin handling mirrors `RestructureProposalController` exactly:
`elevateIfPlatformAdmin` (unattended, target org unknown until fetch) for by-id/by-allocation
routes, `resolveListOrgId` (reason-requiring `beginCrossOrgAccess`) for the list route.

## Scheduled expiry sweep

New `SettlementOfferScheduler`, mirroring `PtpScheduler.markExpiredPtpsAsBroken`: nightly job,
finds `PROPOSED` offers where `validity_until < now()`, transitions to `EXPIRED`. Wired into
`OpsAlertService` on failure, matching every other scheduler in this codebase.

## Explicitly out of scope for this pass

- Real OTP-based borrower self-service acceptance (schema has the columns
  `acceptance_otp_hash`/`acceptance_otp_expires_at`/`acceptance_mode`; left unused, staff-attested
  acceptance only, same as `RestructureProposal`)
- Deep integration with `payment_intents` for `mark-paid` (accepts an optional reference id, no
  validation against a real payment record)
- Frontend UI (backend-first per this session's established pattern for call_logs/KPI views;
  revisit once the backend is verified)

## Testing plan

Unit tests mirroring the established per-controller pattern this session (platform-admin
elevation, tenant isolation, status-transition guards) plus service-level tests for the
compliance-threshold computation and the expiry sweep. Full `mvn test` suite must stay green.
Live curl verification as QA org admin through the full lifecycle (draft → approve → propose →
accept → mark-paid) and the compliance-required branch (high discount → approval blocked for
TL/MANAGER, allowed for ORG_ADMIN).
