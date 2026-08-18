# Audit logging — design decisions

## Hash chain: removed, not implemented (TASK 10.1, 2026-08-18)

**Finding**: `UserActionAuditLog` declared `previousHash`, `rowHash`, and a `computeHash()`
method implying a cryptographic hash chain across audit rows. `computeHash()` had zero callers
anywhere in the codebase — confirmed by `grep -rn "computeHash|previousHash|rowHash"
server/src/main/java`, which returned hits only inside the entity itself. The columns were always
`NULL`. This is worse than having no hash chain at all: a schema that *looks* tamper-evident to
someone reading the entity or the database schema, but isn't actually computing or verifying
anything, is a false claim a customer security review or auditor could reasonably rely on and be
misled by.

**Decision: Option 1 (delete), not Option 2 (implement it for real).**

The real tamper-evidence control for this table already exists and already works:
`trg_audit_immutable` / `prevent_audit_log_update()`, a `BEFORE UPDATE OR DELETE` trigger created
in `V016__audit_log_partitioning.sql` (recreated by V028's later table rebuild), unconditionally
rejects both operations at the database level — confirmed applied to `user_action_audit_logs`
specifically by `AuditLogImmutabilityTest` actually running an UPDATE/DELETE against it and
catching the real exception, not just claimed to exist somewhere.

Correction (found while writing `AuditLogImmutabilityTest`'s third case): this table's original
V006 trigger, `trg_user_action_audit_immutable` / `fn_audit_log_immutable()`, was superseded by
V016's partitioning rebuild, which created a *different* function and trigger on this table with a
different exception message ("`%s rows are immutable`" vs. V006's "`audit log is immutable: %s on
%s is not permitted`"). V006's original function is still real and still active — it's what
protects `allocation_audit_logs` and `settlement_audit_logs` (via V084) — it's just not what
protects `user_action_audit_logs` anymore. Either way, a database trigger that makes tampering
*impossible* is a stronger and simpler guarantee than an application-computed hash chain that
nobody was verifying, and that would need a serializing lock on every insert to be race-safe if it
were ever wired up for real (see Option 2's cost, below) — a real throughput cost on a write-heavy
table, for a weaker guarantee than what already exists.

Option 2 (implementing the chain for real: compute `previousHash` from the prior row within the
org under a serializing lock, plus a verification endpoint) was not chosen. No customer contract
or compliance requirement calling for a *verifiable, walkable* hash chain (as opposed to
DB-level tamper-*prevention*, which the trigger already provides) has been identified. If one
surfaces later, this decision should be revisited — the trigger and a hash chain are not mutually
exclusive, but building the chain without a stated requirement was explicitly deprecated by the
tasklist itself ("Do not choose this without a stated requirement").

**What changed**: `UserActionAuditLog.previousHash`, `.rowHash`, and `.computeHash()` deleted from
the entity; `previous_hash`/`row_hash` columns dropped in `V095__drop_fake_audit_hash_chain.sql`.
`idx_audit_user_latest` (also added by the same original migration, on `user_id, created_at`) is
unrelated to the hash chain and was left untouched — it's a genuinely useful lookup index.

This does **not** affect `unified_audit_events` (the newer, actively-used audit table from
`V085__unified_audit_events.sql`) — that table never had a hash-chain concept and relies on its
own immutability trigger (the same `fn_audit_log_immutable()` function, reused).

## Partition maintenance extended to unified_audit_events (TASK 10.2, 2026-08-18)

`PartitionMaintenanceJob` (`scheduler/PartitionMaintenanceJob.java`) previously only rolled
`user_action_audit_logs`; `unified_audit_events` had explicit partitions only through 2026-12
(V085), so rows land in its `DEFAULT` partition after that with no automated follow-up. Refactored
to iterate a `PARTITIONED_TABLES` list (now both tables) and to create partitions
`LOOKAHEAD_MONTHS` (3) ahead rather than just next month, so a single missed run isn't fatal.
`@SchedulerLock` preserved unchanged. Covered by
`server/src/test/java/com/recoverpro/server/scheduler/PartitionMaintenanceJobTest.java`, which runs
the real job against the dev database and confirms partitions exist for both tables via
`to_regclass`, cleaning up only the partitions it created.

## unified_audit_events RLS: no bypass for NULL-org rows (found while writing TASK 10.1's test)

`rls_unified_audit_events_isolation` (V085)'s `USING` clause is
`organization_id = current_org_id() OR is_platform_admin` — unlike the
`OR current_org_id() IS NULL` pattern used elsewhere in this codebase for an unset session GUC,
there is **no** equivalent bypass here. A row with `organization_id IS NULL` (the documented
"true platform-global event" case, e.g. platform-admin actions with no tenant) is therefore
invisible to UPDATE/DELETE from an ordinary org-scoped session — matches 0 rows, no exception —
and only reachable through the platform-admin bypass. This doesn't weaken tamper-evidence (the
immutability trigger still blocks any UPDATE/DELETE that *does* reach a row), but it means
`AuditLogImmutabilityTest`'s `unified_audit_events` case needed a real organization and
`RlsOrgIdHolder.set(...)` to even reach the trigger — an org-less fixture silently no-op'd instead
of raising, which is what surfaced this. Not treated as a bug to fix here — the `WITH CHECK`
clause's `organization_id IS NULL` allowance for inserts appears deliberate (matches the entity's
own javadoc about platform-global events) — but worth knowing before anyone relies on being able
to manage a NULL-org row from a regular org session.

## Other gaps tracked separately (not resolved in this pass)

- **Retention policy** (TASK 10.3) — explicitly undecided, needs business sign-off before any
  purge job is built.
- **Auditor export path** (TASK 10.4) — no paginated/filterable read endpoint over
  `unified_audit_events` yet.
- **Orphaned `audit_events` table** (TASK 10.5) — pre-existing, ~19 rows, no Flyway migration
  owns it, no code references it. Provenance not investigated this pass.
