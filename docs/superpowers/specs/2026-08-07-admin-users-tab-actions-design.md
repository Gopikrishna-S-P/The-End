# Platform Setup — Admin Users tab row actions — design spec

**Date:** 2026-08-07
**Status:** Approved, ready for implementation plan

## Context

Platform Setup (`web/src/pages/PlatformSetupPage.tsx`) has two page-level tabs: **Organizations**
and **Admin Users**. The Admin Users tab (`UsersTab` in `web/src/pages/PlatformSetupUsersTab.tsx`)
lists every `ROLE_ORG_ADMIN`/`ROLE_PLATFORM_ADMIN` user across all orgs
(`platformApi.listAdminUsers()` → `GET /api/v1/platform/users`), but the table has no per-row
action — only a page-level "New admin user" create modal. There is no way to edit, deactivate, or
delete an admin from this tab today.

Initial framing of the request was "give the Edit Organization panel separate backend endpoints
for org vs. admin, since the Admin Users tab has no action." Investigation showed the backend
already has fully separate endpoints for org update (`PATCH /api/v1/platform/organizations/{id}`)
and org-admin update (`PATCH /api/v1/platform/organizations/{id}/admin`), called separately by
`EditOrgModal`. The real gap is the one described above: the Admin Users tab itself has no
Edit/Delete/Deactivate actions. That's this spec's scope.

The generic user-management backend already covers everything needed and already works
cross-org for a platform admin caller, because `UserController.callerOrg(principal)` returns
`null` for `ROLE_PLATFORM_ADMIN`, and `UserServiceImpl.requireSameOrg` skips its org-match check
whenever `callerOrgId == null`:

- `PATCH /api/v1/users/{id}` — edit `firstName`/`lastName`/`email` (`UpdateUserRequest`)
- `PATCH /api/v1/users/{id}/enable` / `PATCH /api/v1/users/{id}/disable` — activate/deactivate
- `DELETE /api/v1/users/{id}` — soft delete (anonymizes email/name, sets `enabled=false`,
  `deletedAt`)

All four are already wrapped in `web/src/api/usersApi.ts` and already used by the org-level "User
Setup" page (`UsersPage.tsx` + `UsersTable.tsx` + `UsersEditModal.tsx`), which has no org
restriction of its own beyond what the backend enforces — meaning `UsersEditModal` is generic and
directly reusable without modification.

**No new backend endpoints are needed.** The work is: (1) wire the existing endpoints into the
Admin Users tab's row actions, and (2) add two safety guards to the existing `disableUser`/
`deleteUser` service methods to prevent a platform admin from locking the platform out of its own
admin tooling.

## Frontend changes

**`web/src/pages/PlatformSetupUsersTab.tsx`**

Add an "Actions" column to the admin-users table (currently: Name, Email, Role, Organization,
Status), following the exact pattern already used one tab over in
`web/src/pages/PlatformSetupOrgsTab.tsx`:

- A toggle icon (`ToggleRight`/`ToggleLeft`, `ds-table-row-action`) — deactivate/activate, no
  confirmation, calling `usersApi.disableUser`/`usersApi.enableUser` directly and reloading the
  list on success (mirrors `OrgsTab.toggleActive`).
- A pencil icon (`SquarePen`, `ds-table-row-action`) — opens `UsersEditModal` (imported unchanged
  from `web/src/pages/UsersEditModal.tsx`) for that row's user.
- A trash icon (`Trash2`, `ds-table-row-action is-danger`) — opens a new `DeleteUserModal`.

The logged-in platform admin's own row: grey out (disabled, not hidden) the toggle and trash
icons, tooltip "You can't deactivate/delete your own account." Edit stays enabled. Own identity
comes from `useAuth()` (`web/src/AuthContext.tsx`), comparing `user.id` to the row's `u.id`. This
is a UX nicety, not the enforcement boundary — the backend guard (below) is what actually prevents
it, since this table's actions call the same unrestricted endpoints any authenticated client could
call directly.

**New file `web/src/pages/PlatformSetupUserModals.tsx`**

`DeleteUserModal({ user, onClose, onDeleted })` — styled like `DeleteOrgModal` in
`PlatformSetupOrgModals.tsx`: warning banner ("This action cannot be undone... `{name}` will be
permanently deleted"), Cancel/Delete buttons, calls `usersApi.deleteUser(user.id)`, surfaces the
backend's error message (e.g. the last-platform-admin guard's message) in an inline error banner
on failure rather than closing the modal.

## Backend changes

Both guards live inside the **existing** `UserServiceImpl.disableUser` and
`UserServiceImpl.deleteUser` (`server/src/main/java/com/recoverpro/server/service/impl/UserServiceImpl.java`,
currently lines 220–250) — no new endpoints, no new DTOs, no controller changes beyond none. This
mirrors the existing precedent in the same class: `removeRole` already throws
`BusinessException("Cannot remove the user's last role -- user would become orphaned")` when a
similar invariant would be violated.

1. **Self-protection (any caller, any role).** Before disabling or deleting, compare the target id
   to the authenticated caller's own id (read via `SecurityContextHolder`, same
   `UserPrincipal` cast used elsewhere in this class — a new private `currentUserId()` helper,
   *not* a reuse of `currentCallerOrThrow`, which deliberately returns an identity-less placeholder
   for platform-admin callers and must keep doing so for its existing callers). If equal, throw
   `BusinessException("You cannot deactivate/delete your own account")`. Applies regardless of
   role — an org admin disabling their own account through the org-level User Setup page is the
   same self-lockout risk and goes through this same code path today.

2. **Last-platform-admin protection.** If the target user has `ROLE_PLATFORM_ADMIN`, and
   `userRepository.countByRoleNameAndEnabledTrue(ROLE_PLATFORM_ADMIN) <= 1`, throw
   `BusinessException("Cannot deactivate/delete the last active platform admin")`. This is checked
   for *any* caller, not just self — two platform admins can deactivate each other freely down to
   one, but that last one is blocked regardless of who attempts it. Org-admin targets are
   unaffected; an org can end up with zero enabled admins today already (`EditOrgModal` already
   handles "no admin assigned" as a normal state), so no equivalent guard is added there.

Guard order in both methods: self-check first (cheaper, no query), then the count check.

**New repository method** — `UserRepository.countByRoleNameAndEnabledTrue(String roleName)`,
alongside the existing `countByRoleName`:

```java
@Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.enabled = true")
long countByRoleNameAndEnabledTrue(@Param("roleName") String roleName);
```

`deleteUser` already sets `enabled=false` as part of its soft-delete, so the same
`countByRoleNameAndEnabledTrue` check placed *before* the mutation correctly treats a delete of the
last enabled platform admin the same as a disable of them.

## Error handling

All new failure paths (`BusinessException` from either guard, or any existing validation error)
surface through the same interceptor/toast path already used by every other action on this page —
`DeleteUserModal` additionally shows the message inline (matching `DeleteOrgModal`'s pattern of
inline error + banner) since delete is the one destructive action here.

## Testing

- `UserServiceImplTest` (or wherever existing service tests for `disableUser`/`deleteUser`/
  `removeRole` live): new cases — (a) disabling/deleting self throws the self-protection message,
  for both a platform admin and an org admin caller; (b) a *different* platform admin disabling/
  deleting the sole remaining enabled platform admin throws the last-admin message; (c) one of two
  enabled platform admins disabling/deleting the other succeeds; (d) disabling/deleting an org
  admin is unaffected by the platform-admin-only guard, including when they're the org's only
  admin.
- Run the full `mvn test` after this change, not just `mvn compile` — this repo has had real
  regressions slip past compile-only checks before.
- Frontend: manual verification in the running app (per this project's UI-change convention) —
  edit/deactivate/delete a non-self admin from the Admin Users tab; confirm self row shows
  disabled toggle/delete with correct tooltip; confirm attempting to deactivate the last platform
  admin via a second admin account surfaces the backend error message in the toast/modal.
