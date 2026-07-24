// Shared Storybook scaffolding for page-level stories (web/src/pages/*.stories.tsx).
// Pages need real AuthContext + FeatureFlagsContext + router state to render at all
// (they call useAuth()/useNavigate()/useParams() directly), which is more than a
// typical presentational component needs — hence a shared helper instead of repeating
// this boilerplate in every one of the ~56 page story files.
import type { ComponentType } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../AuthContext';
import { FeatureFlagsProvider } from '../contexts/FeatureFlagsContext';
import { setAccessToken, setRefreshToken, setUserCache } from '../api/axiosInstance';
import type { Role, UserResponse, PermissionResponse } from '../types/core';

// Every permission name referenced anywhere in the app (hasPermission/hasAnyPermission/
// hasAllPermissions calls) plus the full DataSeeder catalog — granting all of them to the
// story user means pages render their fully-permissioned UI instead of a stripped-down
// "you can't do this" state, which is what you want when just browsing components.
const ALL_PERMISSION_NAMES = [
  'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_VIEW',
  'ROLE_ASSIGN', 'PERMISSION_ASSIGN',
  'FILE_UPLOAD', 'FILE_VIEW', 'FILE_DELETE',
  'CELL_UPDATE', 'ROW_CREATE', 'ROW_UPDATE', 'ROW_DELETE',
  'COLUMN_CREATE', 'COLUMN_DELETE',
  'CASE_VIEW', 'CASE_ASSIGN', 'CASE_REASSIGN', 'CASE_VIEW_UNASSIGNED',
  'DAILY_DISPATCH_CREATE', 'DAILY_DISPATCH_VIEW',
  'VISIT_SUBMIT', 'VISIT_VIEW',
  'COLLECTION_CREATE', 'COLLECTION_VIEW', 'COLLECTION_APPROVE',
  'PTP_CREATE', 'PTP_VIEW',
  'NON_CONTACTABLE_CREATE',
  'AUDIT_VIEW', 'AUDIT_VIEW_PLATFORM',
  'ORG_UPDATE',
] as const;

const ALL_PERMISSIONS: PermissionResponse[] = ALL_PERMISSION_NAMES.map(name => ({
  id: name, name, resource: name.split('_')[0], action: name.split('_').slice(1).join('_'),
}));

export function makeUser(role: Role, overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: 'story-user-1',
    email: 'ravi.kumar@recoverpro.in',
    firstName: 'Ravi',
    lastName: 'Kumar',
    enabled: true,
    accountLocked: false,
    mfaEnabled: true,
    createdAt: new Date().toISOString(),
    organizationId: 'story-org-1',
    agentId: role === 'FO' || role === 'CALLER' || role === 'TRACER' ? 'story-agent-1' : undefined,
    roles: [{
      id: 'story-role-1',
      name: `ROLE_${role}`,
      description: '',
      organizationId: role === 'PLATFORM_ADMIN' ? undefined : 'story-org-1',
      organizationName: undefined,
      systemRole: role === 'PLATFORM_ADMIN',
      permissions: ALL_PERMISSIONS,
    }],
    ...overrides,
  };
}

/** Pre-seeds axios/localStorage auth state. Call at module scope, before `meta`. */
export function seedAuth(role: Role, overrides: Partial<UserResponse> = {}): UserResponse {
  setAccessToken('storybook-fake-access-token');
  setRefreshToken('storybook-fake-refresh-token');
  const user = makeUser(role, overrides);
  setUserCache(user);
  return user;
}

/**
 * Decorator factory wrapping a page in MemoryRouter + AuthProvider + FeatureFlagsProvider.
 * Pass `routePath` (e.g. '/app/agents/:id') + `initialPath` (e.g. '/app/agents/story-agent-1')
 * for pages that read route params via useParams().
 */
export function withPageProviders(routePath?: string, initialPath: string = '/') {
  return (Story: ComponentType) => (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <FeatureFlagsProvider>
          {routePath
            ? <Routes><Route path={routePath} element={<Story />} /></Routes>
            : <Story />}
        </FeatureFlagsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}
