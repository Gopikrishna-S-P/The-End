# SYSTEM 15 — Caching: execution record

Executed from `docs/PRODUCTION-TASKLIST.txt`, SYSTEM 15 block, 2026-08-18 session.
Continuation of the same session that completed SYSTEM 35, SYSTEM 18 TASK 18.1, SYSTEM 28
TASK 28.1, and SYSTEM 26 TASK 26.1.

## Prerequisite check

SYSTEM 01 (RLS/tenancy) — architecture confirmed real and working repeatedly across this session
(RLS policies read/verified for allocations, ptp_records, allocation_name_search_tokens, and the
new ptp_name_search_tokens table). No new investigation needed; the formal automated coverage
guard (SYSTEM 01 TASK 1.1) hasn't been built, but that's a different, narrower gap than what
SYSTEM 15 depends on.

## TASK 15.1 — Wire user cache eviction to every mutation [DONE]

Confirmed the tasklist's claim exactly: `CustomUserDetailsService.evictUserCache()` existed,
correctly annotated `@CacheEvict`, and was called from nowhere. `JwtAuthenticationFilter` calls
the cached `loadUserByUsername()` on every authenticated request, confirmed by reading it directly
— so this cache genuinely is the live authorization gate, not just a login-time optimization.

Wired `evictUserCacheAfterCommit(email)` (a new private helper using
`TransactionSynchronizationManager.registerSynchronization(...).afterCommit()`, falling back to an
immediate call when no transaction is active) into all 8 identity/role/permission/status-changing
methods in `UserServiceImpl` (one more than the tasklist's "seven at audit time" — `updateUser`
needed it too, since it can change the cache-key-bearing email itself):
`updateUser` (evicts both old and new email), `assignRole`, `removeRole`, `enableUser`,
`disableUser`, `deleteUser` (evicts the pre-anonymization email), `grantDirectPermission`,
`revokeDirectPermission`.

**Cross-instance staleness (15.1.d)**: did not add Redis pub/sub broadcast. `TwoTierCache.evict()`
already clears both L1 (this instance's Caffeine) and L2 (shared Redis) — confirmed by reading it
— but a *different* instance's own L1 entry is untouched by any single instance's evict call.
`RedisCacheConfig` already sets `userDetails`' L1 Caffeine TTL to **30 seconds** (separately from
its 5-minute L2/Redis TTL) — this was already the case before this session, not something added
now. That bounds every other instance's worst-case staleness window to 30 seconds regardless, which
is the explicit second option TASK 15.1.d itself offers ("or set L1 TTL short enough... and
document the choice") — documented in code comments on the new helper rather than building new
pub/sub infrastructure for marginal benefit over an already-short window.

**A genuine risk surfaced and resolved during testing, not a real production bug**: a lightweight
Spring caching test (bare `AnnotationConfigApplicationContext`, no Spring Boot auto-configuration)
initially failed to wire `CustomUserDetailsService` into `UserServiceImpl`'s constructor with a
`BeanNotOfRequiredTypeException` — because plain Spring's `@EnableCaching` default
(`proxyTargetClass=false`) JDK-proxies `CustomUserDetailsService` to only its `UserDetailsService`
interface, which doesn't satisfy a constructor parameter typed to the concrete class. Verified
directly against the *real* Spring Boot app context (`PtpAndRestructureIsolationTest`, a full
`@SpringBootTest`) that this is **not** an actual production issue: Spring Boot's own
`AopAutoConfiguration` defaults `proxy-target-class` to `true` (CGLIB) unless overridden, and this
app doesn't override it — confirmed by running that real-context test successfully both before and
after the `UserServiceImpl` change. The lightweight test config was fixed to declare
`@EnableCaching(proxyTargetClass = true)` explicitly, matching Spring Boot's actual default rather
than plain Spring's, so it now faithfully represents what really runs.

**Tests**: `UserServiceImplCacheEvictionTest` (new) — exercises the real Spring caching proxy
(same lightweight pattern as the pre-existing `AgentContextServiceImplCachingTest`): disabling a
user immediately flips `UserDetails.isEnabled()` on the very next lookup; assigning a role
immediately adds the new authority on the very next lookup — the literal acceptance criterion
("deactivating a user immediately blocks their next request") proven end to end, not just that
`evictUserCache()` was called. `UserServiceImplTest` (existing, pure-Mockito) still covers the
wiring itself and continues to pass unmodified in behavior (only its constructor call gained the
new mock).

## TASK 15.2 — Verify tenant-safe cache keys [DONE — audited, no bug found]

Full audit (not a sample — there are only 3 `@Cacheable`/`@CacheEvict`/`@CachePut` namespaces in
the entire codebase, all read directly):
- `userDetails`, keyed by `#email` — safe: `User.email` has `@Column(unique = true)`, globally
  unique across the platform, not per-org, so the key alone already discriminates every tenant.
- `lucienContext`, keyed by `#sessionId` — safe: session IDs are globally unique per session,
  same reasoning.
- `systemPrompts`, keyed by `#promptKey` — safe: `SystemPromptConfig` (`lucien_system_prompts`
  table) has `promptKey` as a globally `unique` column and **no `organization_id` column at
  all** — it's a genuinely platform-wide table by design, not org-scoped data with a missing key
  component.

No code changes were needed for this task — there is no cross-tenant cache leak in the current,
very small cache surface. Locked in with `loadUserByUsername_twoDifferentOrgsUsers_neverCrossContaminate`
in the same new test file, proving two different orgs' cached users never collide.

## Not done this session (deferred)

**TASK 15.3 — Cache metrics and stampede protection** [P2]: Caffeine `recordStats()`/Micrometer
export and concurrent-cold-key locking. Not started — P2, distinct from 15.1/15.2's P0 correctness
concerns, and the tasklist's own severity marking puts it lowest priority in this system.

## Verification

Targeted: `UserServiceImplCacheEvictionTest` + `UserServiceImplTest` — see session's final report
for pass/fail counts. Full suite and SYSTEM 15's own specified command
(`-Dtest='*Cache*Test'`) run at the end of this session.
