# SYSTEM 10 — Audit Logging: execution record

Executed from `docs/PRODUCTION-TASKLIST.txt`, SYSTEM 10 block, 2026-08-18 session.
Continuation of the same session that completed SYSTEM 35, SYSTEM 18 TASK 18.1, SYSTEM 28
TASK 28.1, SYSTEM 26 TASK 26.1, SYSTEM 15 TASKs 15.1–15.2, and SYSTEM 08 TASK 8.1.

## Prerequisite check

SYSTEM 01 (multi-tenancy/RLS) — done, per the tasklist's own state and confirmed indirectly by
every RLS-dependent test in this session passing, including the new `unified_audit_events` case
below.

## TASK 10.1 — Resolve the fake hash chain [DONE]

Re-confirmed the finding exactly as stated: `grep -rn "computeHash|previousHash|rowHash"
server/src/main/java` returned hits only inside `entity/UserActionAuditLog.java`. No drift.

Chose **Option 1** (delete), as recommended — no customer contract or compliance requirement for
a verifiable walkable hash chain has been identified; the existing DB-level immutability trigger
is a stronger, simpler guarantee than an application-computed chain nobody was verifying.

- `UserActionAuditLog.previousHash`, `.rowHash`, `.computeHash()` deleted.
- `V095__drop_fake_audit_hash_chain.sql` drops `previous_hash`/`row_hash`; leaves
  `idx_audit_user_latest` (unrelated, genuinely useful) untouched.
- Decision and reasoning recorded in the entity's javadoc and in `docs/AUDIT-DESIGN.md`, per 10.1.c.

**Correction made mid-task**: the tasklist and this session's own first-draft documentation both
initially attributed `user_action_audit_logs`'s protection to `trg_user_action_audit_immutable` /
`fn_audit_log_immutable()` (V006). Actually running `AuditLogImmutabilityTest` against the real
database showed a *different* exception message than the one V006's function raises. Reading
V016 and V028 confirmed why: V016's partitioning rebuild replaced V006's original trigger on this
one table with a new function, `prevent_audit_log_update()`, and a new trigger,
`trg_audit_immutable` — recreated again by V028's later rebuild, still active today. V006's
original function is still real and still protects `allocation_audit_logs` /
`settlement_audit_logs` (V084) and `unified_audit_events` (V085) — just not this table. All three
places that had cited the wrong trigger (the entity javadoc, V095's migration comment, and
`docs/AUDIT-DESIGN.md`) were corrected to name V016/V028's actual trigger. This is exactly the
"stop and report drift" case the session's operating rule anticipates, except the drift was
between the tasklist and the database rather than between the tasklist and the application code —
corrected in place rather than treated as a blocker, since the underlying finding (fake hash
chain, real trigger) was still true, just attributed to the wrong migration.

**Test coverage**: `AuditLogImmutabilityTest` now covers all four append-only audit tables —
`allocation_audit_logs`, `settlement_audit_logs` (pre-existing), plus `user_action_audit_logs` and
`unified_audit_events` (added this session) — each proving INSERT succeeds and UPDATE/DELETE are
rejected by the real DB trigger, not by assumption.

While adding the `unified_audit_events` case, found (not a defect, but worth recording — see
`docs/AUDIT-DESIGN.md`): that table's RLS `USING` clause has no `current_org_id() IS NULL` bypass,
unlike the pattern used elsewhere in this codebase, so a row with a NULL `organization_id` (the
documented platform-global-event case) is invisible to UPDATE/DELETE from an ordinary org-scoped
session. Immutability is unaffected either way — the trigger blocks any write that does reach a
row — but the test needed a real org + `RlsOrgIdHolder.set(...)` to actually exercise the trigger,
which is what surfaced this.

**ACCEPTANCE** (tasklist's own wording: "no field or method in the codebase implies
tamper-evidence that is not actually enforced") — met: `computeHash()`/`previousHash`/`rowHash` no
longer exist anywhere; the only tamper-evidence claims left in the codebase are the four real DB
triggers, all now test-covered.

## TASK 10.2 — Extend partition maintenance to unified_audit_events [DONE]

Included in this session despite the user's own shorthand framing of SYSTEM 10 as "likely just a
deletion" — the tasklist itself marks TASK 10.2 as P0, same priority as 10.1, and this session's
established pattern is to complete every P0 task per system.

- `PartitionMaintenanceJob` refactored from a single hardcoded `user_action_audit_logs`-only method
  to iterate a `PARTITIONED_TABLES` list (`user_action_audit_logs`, `unified_audit_events`), per
  10.2.b/c.
- `@SchedulerLock` annotation preserved unchanged on the (renamed) scheduled method, per 10.2.d.
- Lookahead extended from "next month only" to `LOOKAHEAD_MONTHS = 3`, per 10.2.e.
- New `PartitionMaintenanceJobTest` runs the real job against the real dev database and asserts
  (via `to_regclass`) that partitions now exist for both tables across the lookahead window, per
  10.2.f. Cleans up only the partitions it created itself — never partitions that pre-existed
  (this must stay safe to run repeatedly against a persistent local database, not a disposable
  one).

**ACCEPTANCE** ("running the job creates next month's partition for both tables; the test
passes") — met: verified both by the test and by the manual `mvn test` run's own log output
showing partitions created for both `user_action_audit_logs_2026_09/10/11` and
`unified_audit_events_2026_09/10/11` (the latter a no-op since V085 pre-created those specific
months — expected, and unproblematic, since `CREATE TABLE IF NOT EXISTS` is idempotent by name).

## Deferred — not done this session

- **TASK 10.3 (retention policy)** — P1. Explicitly requires business sign-off before any purge
  logic is written; the tasklist itself says not to implement deletion without that sign-off. Not
  started.
- **TASK 10.4 (auditor export path)** — P1. No paginated/filterable read endpoint or web page
  built. Not started.
- **TASK 10.5 (orphaned `audit_events` table)** — P2. Provenance not investigated this session.

Per the tasklist's own rollup rule ("Mark [x] only when EVERY task in that system has passed its
acceptance check"), SYSTEM 10's rollup checkbox is left unchecked — 2 of 5 tasks (both P0) done,
3 deferred (P1/P1/P2).

## Verification

`mvn -f server/pom.xml clean test-compile` — clean.

SYSTEM 10's own specified command, `mvn -f server/pom.xml test -Dtest='*Audit*Test'` — 15/15
passed.

Full `mvn -f server/pom.xml clean test` — 602/602 passed (up from 599 at the end of SYSTEM 08;
+3 tests: `userActionAuditLog_...`, `unifiedAuditEvent_...`, `PartitionMaintenanceJobTest`).

Manual psql check specified by the tasklist ("attempt `UPDATE unified_audit_events SET reason='x'`
... confirm the trigger rejects it") — no psql client was available in this environment, so this
was done as an automated JDBC equivalent instead
(`AuditLogImmutabilityTest.unifiedAuditEvent_insertSucceeds_updateAndDeleteAreRejected`), which
exercises the identical UPDATE statement through the real driver and asserts the trigger's
exception — arguably stronger than a one-off manual session since it now runs on every future
test suite execution rather than being checked once and forgotten.
