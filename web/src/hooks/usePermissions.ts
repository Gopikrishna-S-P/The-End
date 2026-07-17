import { useAuth } from '../AuthContext';

export function usePermissions() {
  const { user } = useAuth();

  const allPermissions = user?.roles?.flatMap(r =>
    r.permissions?.map(p => p.name) || []
  ) || [];

  const permissions = Array.from(new Set(allPermissions));

  const roles = user?.roles?.map(r => r.name) || [];

  const hasPermission = (permission: string): boolean => {
    if (!permission) return false;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (...perms: string[]): boolean => {
    if (!perms.length) return false;
    return perms.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (...perms: string[]): boolean => {
    if (!perms.length) return true;
    return perms.every(p => permissions.includes(p));
  };

  const hasRole = (role: string): boolean => {
    if (!role) return false;
    const normalizedRole = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
    return roles.includes(role) || roles.includes(normalizedRole);
  };

  const getAllPermissions = (): string[] => {
    return [...permissions];
  };

  const getAllRoles = (): string[] => {
    return [...roles];
  };

  return {
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    getAllPermissions,
    getAllRoles,
  };
}
