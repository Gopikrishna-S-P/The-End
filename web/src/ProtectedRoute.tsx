import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { Logo } from './components/Logo';
import { Loader2 } from 'lucide-react';
import AccessDenied from './components/AccessDenied';
import './components/LoadingSplash.css';
import type { Role } from './types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  allowedPermissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  allowedRoles, 
  allowedPermissions,
  requireAll = true,
  fallback
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { hasAllPermissions, hasAnyRole } = usePermissions();

  // Identical UI to the "Signing you in" LoadingSplash (reuses its CSS). Its
  // z-99999 paints right on top of the HTML boot splash for a seamless handoff.
  if (isLoading) {
    return (
      <div className="app-loading-splash" role="status" aria-live="polite" aria-label="Restoring session">
        <div className="app-loading-splash-content">
          <div className="app-loading-splash-logo">
            <Logo height={56} />
          </div>
          <div className="app-loading-splash-bar" aria-hidden="true">
            <div className="app-loading-splash-bar-fill" />
          </div>
          <p className="app-loading-splash-text">
            <Loader2 size={14} className="app-loading-splash-spin" aria-hidden="true" />
            <span>Restoring session</span>
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // Checks every role the user holds, not just roles[0] -- a multi-role user whose
    // access-granting role isn't first in the array must still be let through.
    if (!hasAnyRole(...allowedRoles)) {
      return fallback || <AccessDenied reason="Your role does not have access to this page" />;
    }
  }

  if (allowedPermissions && allowedPermissions.length > 0) {
    const hasRequiredPermissions = hasAllPermissions(...allowedPermissions);
    if (!hasRequiredPermissions) {
      return fallback || <AccessDenied reason="You do not have the required permissions" />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;