# Grievance handling + Grievance Redressal Officer record — design spec

**Date:** 2026-08-04
**Status:** Approved, implementing
**Phase:** Phase 3, feature 3 of 3 (settlement_offers → KFS → grievances)

## Context

`grievances` is the last of three tables (`settlement_offers`, `key_fact_statements`,
`grievances`) that have existed in the schema since the baseline migration
(`V001__baseline.sql:868`) with a complete column design but zero application code. A companion
table, `grievance_officers` (`V001__baseline.sql:897`), holds the RBI-mandated Grievance Redressal
Officer (GRO) contact that must be disclosed to borrowers (lucien-corpus
`02-rbi-digital-lending-master-direction.md §4`); the corpus explicitly flags the response-time SLA
as `[VERIFY: response-time SLA]`, and the collection SOP doc has literal `[FILL IN]` placeholders
for the GRO escalation window -- there is no hard regulatory number to hardcode here, so the SLA is
a configurable default (this org's own commitment), not a cited RBI figure.

Both `grievances` and `grievance_officers` already have complete RLS, FKs, and indexes
(`V038__fk_compliance.sql`, `V040__rls_failclosed_and_extend.sql`) -- no schema-hardening migration
is needed for the tables themselves, unlike `call_logs` earlier this session.

**Post-implementation correction**: live testing surfaced pre-existing `grievances_status_check`/
`grievances_category_check` constraints on the live dev DB that were never captured in any
migration (same "dead constraint" situation `call_logs` was in) -- discovered via a 500 on the
first real `raise()` call. These constraints encode a more complete taxonomy than this spec
originally proposed, including an `INVESTIGATING` status this spec's first draft didn't have. The
workflow and category list below reflect that correction, not the original draft; `V075` brings the
constraints under Flyway. See "Workflow" and "Data model" for the corrected values.

Unlike `settlement_offers`/`RestructureProposal` (multi-role approve/reject workflows), the closest
precedent is `FraudCase`/`FraudCaseServiceImpl` (already built and live): a "case" entity with a
generated reference number (`FRD-{date}-{random6}`, collision-checked), a simple linear status
switch, and **no separate per-transition audit-log table** -- just `log.info` plus the entity's own
timestamp columns. Grievances mirrors this shape rather than the settlement/restructuring
audit-table pattern, because it has no multi-role approve/reject gate to audit.

Building this unblocks the two KPI endpoints left dead when the other 6 were built earlier this
session: `KpiController.complaintRate()`/`grievanceMttr()` already query
`v_kpi_complaint_rate`/`v_kpi_grievance_mttr`, neither of which exists yet.

## Workflow

```
RECEIVED ──acknowledge (sets acknowledged_at)──> ACKNOWLEDGED
                                                       │
                                                  investigate (assigns a handler)
                                                       │
                                                       ▼
                                                 INVESTIGATING
                                                  /            \
                                            escalate          resolve
                                                │                  │
                                                ▼                  ▼
                                          ESCALATED ──resolve──> RESOLVED ──close──> CLOSED
```

`ESCALATED` is also reachable directly from `ACKNOWLEDGED` (a complaint can be serious enough to
escalate before investigation even starts). Acknowledge and assignment are two separate actions
(not combined, as the first draft of this spec proposed) -- `RECEIVED → ACKNOWLEDGED` just confirms
receipt and stops the ack-SLA clock; `ACKNOWLEDGED → INVESTIGATING` is where a handler is actually
assigned (`assignedToUserId`, defaults to the acting user) and work begins. This split exists
because the live DB's pre-existing status taxonomy already distinguished these two states (see the
post-implementation correction note above) -- not an arbitrary design choice.

There is no `REJECTED` status: a grievance investigated and found unfounded is still `RESOLVED` --
the outcome ("no wrongdoing found, explained to borrower") goes in `resolution_notes`. TAT
compliance is about responding within SLA, not about the borrower being right.

`ESCALATED` has no dedicated `escalated_at`/`escalated_by` columns. The transition is captured via
`log.info` (matching `FraudCase`'s precedent) and `updated_at`; a full escalation audit trail is not
needed for this pass since there's no approval gate depending on it.

## Roles

- **Raise**: `FO`, `CALLER`, `TL`, `MANAGER` -- matches the collection SOP's "log the complaint in
  the app" as soon as a borrower raises one, by whoever is on the call/visit.
- **Acknowledge, escalate, resolve, close**: `TL`, `MANAGER`, `ORG_ADMIN`, `PLATFORM_ADMIN` -- these
  actions represent the agency taking ownership of and closing out a complaint against itself, so
  the bar is higher than raising one.
- **Read**: `PLATFORM_ADMIN`, `ORG_ADMIN`, `MANAGER`, `TL`, `FO`, `CALLER`, `TRACER` -- same broad
  set as every other feature this session.
- **GRO record (grievance_officers)**: write restricted to `ORG_ADMIN`/`PLATFORM_ADMIN`; read open
  to the same broad reader set (staff need the GRO's contact details to relay to a borrower, even
  though there's no public disclosure page in this pass).

## SLA configuration

`app.grievance.acknowledgement-sla-days=${GRIEVANCE_ACK_SLA_DAYS:3}`,
`app.grievance.resolution-sla-days=${GRIEVANCE_RESOLUTION_SLA_DAYS:30}`. Computed into
`acknowledgement_due_at`/`resolution_due_at` at raise time (`created_at + N days`).

## Data model

New enums (values match the pre-existing DB constraints, not this spec's original proposal -- see
the post-implementation correction note above):
- `GrievanceStatus`: `RECEIVED`, `ACKNOWLEDGED`, `INVESTIGATING`, `ESCALATED`, `RESOLVED`, `CLOSED`.
- `GrievanceCategory`: `HARASSMENT`, `INCORRECT_INFORMATION`, `RECOVERY_PRACTICE`, `DATA_PRIVACY`,
  `PAYMENT_DISPUTE`, `OTHER`.

`Grievance` entity maps directly onto the existing `grievances` columns -- no new columns needed.
`ticket_number` generated as `GRV-{yyyyMMdd}-{random6}`, mirroring
`FraudCaseServiceImpl.generateUniqueCaseNumber()` exactly (collision-checked via
`existsByTicketNumber`, retried once with a longer suffix on collision).

`GrievanceOfficer` entity maps onto `grievance_officers` -- one row per org
(`uq_grievance_officer_org`), no workflow: `upsert` creates or updates the org's single record.

## Case-timeline integration

Add `CaseEventType.GRIEVANCE_RAISED`/`GRIEVANCE_RESOLVED` to the enum already extended for BCR-1
and settlement offers. `CaseTimelineServiceImpl` emits these only when a grievance has a non-null
`allocation_id` -- general agency-conduct complaints with no allocation have nothing to show a
timeline for. No new audit-log table is queried for this (unlike settlement offers' `SettlementAuditLog`)
since grievances has no separate audit table; the timeline reads directly from `grievances` rows
filtered by `allocation_id`.

## New migrations

`V074__grievance_kpi_views.sql`: the two waiting KPI views (no changes to the `grievances`/
`grievance_officers` tables themselves):
- `v_kpi_complaint_rate`: grievances raised per month per org, as a percentage of that org's active
  allocation count in the same month.
- `v_kpi_grievance_mttr`: mean `resolved_at - created_at` in days, grouped by month and org, over
  grievances that reached `RESOLVED` or `CLOSED`.

`V075__grievances_status_category_checks.sql`: brings the pre-existing (previously
Flyway-untracked) `grievances_status_check`/`grievances_category_check` constraints under Flyway,
idempotently (`DROP CONSTRAINT IF EXISTS` + re-`ADD`).

## API

**`/api/v1/grievances`**

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/` | Raise roles | Body: allocationId (optional), borrowerName/email/phone, category, subject, description, evidenceUrl (optional). Server generates ticketNumber, computes due dates from SLA config, sets status RECEIVED. |
| POST | `/{id}/acknowledge` | Acknowledge roles | Requires RECEIVED; sets acknowledged_at only, no assignment |
| POST | `/{id}/investigate` | Acknowledge roles | Requires ACKNOWLEDGED; body: assignedToUserId (optional, defaults to acting user) |
| POST | `/{id}/escalate` | Acknowledge roles | Requires ACKNOWLEDGED or INVESTIGATING; body: remarks (optional, logged not persisted to a new column) |
| POST | `/{id}/resolve` | Acknowledge roles | Requires INVESTIGATING or ESCALATED; body: resolutionNotes (required) |
| POST | `/{id}/close` | Acknowledge roles | Requires RESOLVED |
| GET | `/{id}` | Readers | |
| GET | `/allocation/{allocationId}` | Readers | |
| GET | `/` | Readers | Paged, filterable by status; platform-admin cross-org via `?orgId=&reason=` |

**`/api/v1/grievance-officers`**

| Method | Path | Role | Notes |
|---|---|---|---|
| PUT | `/` | ORG_ADMIN/PLATFORM_ADMIN | Upsert -- creates or updates the caller's org's single record |
| GET | `/` | Readers | Returns the caller's org's record (404 if never set) |

All cross-org platform-admin handling mirrors every other controller this session
(`elevateIfPlatformAdmin`/`assertSameTenantOrg`).

## Explicitly out of scope for this pass

- Public/unauthenticated complaint submission form (staff-logged only, matching the no-borrower-portal
  pattern used throughout Phase 3)
- RBI Ombudsman referral tracking -- an external process the app cannot observe (the borrower
  pursues it independently after exhausting internal channels); nothing to build
- Per-transition audit-log table (deliberate deviation from settlement_offers/restructuring,
  following `FraudCase`'s simpler precedent instead)
- `lsp_disclosures` table -- adjacent regulatory-disclosure table but not one of the three features
  the user scoped for Phase 3
- Frontend UI (backend-first, consistent with the whole session; revisit once the backend is
  verified)

## Testing plan

Unit tests mirroring `FraudCaseServiceImplTest`'s style (if one exists) or the established
per-service pattern this session: status-transition validation (illegal transitions rejected),
ticket-number generation/collision handling, SLA due-date computation, GRO upsert (create then
update). Controller tests: role gates, tenant isolation, platform-admin elevation. Full `mvn test`
suite must stay green. Live curl verification as QA staff: raise a grievance tied to a real QA
allocation, acknowledge it, escalate, resolve, close, and confirm the case timeline shows
`GRIEVANCE_RAISED`/`GRIEVANCE_RESOLVED`; separately verify the GRO upsert/get round-trip.
