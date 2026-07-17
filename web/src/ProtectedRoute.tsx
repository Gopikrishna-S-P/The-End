import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { Logo } from './components/Logo';
import { Loader2, Shield } from 'lucide-react';
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
  const { hasAllPermissions } = usePermissions();

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
    const userRole = user.roles[0]?.name.replace("ROLE_", "").trim() as Role;
    const hasValidRole = allowedRoles.includes(userRole);
    
    if (!hasValidRole) {
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

const AccessDenied: React.FC<{ reason?: string }> = ({ reason }) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {reason || "You do not have permission to access this page. Contact your administrator if you think this is a mistake."}
      </p>
      <a 
        href="/dashboard" 
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
      >
        Back to Dashboard
      </a>
    </div>
  </div>
);

export default ProtectedRoute;