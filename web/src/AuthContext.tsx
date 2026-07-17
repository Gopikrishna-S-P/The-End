import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  authApi,
  setAccessToken, setRefreshToken, getRefreshToken, getAccessToken,
  setUserCache, getUserCache, clearAllAuthStorage, proactiveRefresh,
} from './api';
import { refreshStreamToken } from './utils/notifications';
import { session } from './utils/session';
import type { AuthResponse, LoginRequest, UserResponse, ApiResponse } from './types';
import { attendanceApi } from './api/attendanceApi';
import { toastBus } from './utils/toastBus';

interface AuthState {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<{ mfaRequired: boolean; mfaSessionToken?: string }>;
  loginWithMfa: (email: string, password: string, totpCode: string) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/** Stores all auth artifacts from a successful auth response */
const persistAuth = (authData: AuthResponse) => {
  setAccessToken(authData.accessToken);
  if (authData.refreshToken) setRefreshToken(authData.refreshToken);
  setUserCache(authData.user);
  if (authData.expiresIn) {
    session.setExpiresAt(new Date(Date.now() + authData.expiresIn * 1000).toISOString());
  }
};

/** Clears all auth artifacts */
const clearAuth = () => {
  clearAllAuthStorage();
  session.clear();
};

// Access token TTL is 15 min (900s). Fire proactive refresh 2 min before expiry.
const PROACTIVE_REFRESH_MS = 13 * 60 * 1000; // 13 min
// Re-auth on tab focus if the last refresh was more than 12 min ago (token may be stale).
const STALE_THRESHOLD_MS   = 12 * 60 * 1000; // 12 min

// Module-level guard against React StrictMode's double-invocation of the
// init effect in dev. Without this, both invocations call POST /auth/refresh
// with the same refresh-token in parallel. The server's atomic compare-and-set
// rotation (B3) treats the second call as a replay of an already-revoked
// token and revokes the entire session family — user gets logged out on
// every page refresh.
let initAuthInFlight: Promise<void> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const lastRefreshAt = useRef<number>(0);

  // Hard safety cap: under no circumstance keep the app blocked on the
  // "Restoring session" loader for more than 10s. If auth init hasn't settled
  // by then (hung network, unreachable backend), give up and let routing send
  // the user to /login rather than leaving them staring at a spinner forever.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setState(s => (s.isLoading ? { ...s, isLoading: false } : s));
    }, 10_000);
    return () => window.clearTimeout(id);
  }, []);

  // Initialize auth state from storage on mount
  useEffect(() => {
    // If a parallel mount (StrictMode in dev) already started initAuth,
    // wait for its result instead of firing a second /auth/refresh.
    if (initAuthInFlight) {
      initAuthInFlight.finally(() => {
        if (getAccessToken()) {
          const cached = getUserCache();
          if (cached) {
            setState({ user: JSON.parse(cached), isLoading: false, isAuthenticated: true });
            return;
          }
        }
        setState(s => ({ ...s, isLoading: false }));
      });
      return;
    }

    const initAuth = async () => {
      try {
        const storedUser = getUserCache();
        const storedRefreshToken = getRefreshToken();

        if (!storedUser || !storedRefreshToken) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return;
        }

        // If an in-memory access token already exists (e.g. just logged in),
        // restore state from localStorage and rehydrate roles/perms from /me.
        if (getAccessToken()) {
          lastRefreshAt.current = Date.now();
          const cached = JSON.parse(storedUser);
          setState({ user: cached, isLoading: false, isAuthenticated: true });
          authApi.me().then((fresh) => {
            setUserCache(fresh);
            setState({ user: fresh, isLoading: false, isAuthenticated: true });
          }).catch(() => { /* keep cached user; /me will retry on next event */ });
          return;
        }

        // No access token in memory — attempt a silent refresh to restore session.
        // Fail fast: a short timeout and no automatic retries so a slow/restarting
        // backend can't trap the user behind the "Restoring session" splash for the
        // full 90s retry budget. On failure we fall through to /login.
        try {
          const authData = await authApi.refresh(storedRefreshToken, { timeout: 8000, _noRetry: true });
          persistAuth(authData);
          lastRefreshAt.current = Date.now();
          // Pull canonical /me so permissions reflect any backend changes.
          try {
            const fresh = await authApi.me();
            setUserCache(fresh);
            setState({ user: fresh, isLoading: false, isAuthenticated: true });
          } catch {
            setState({ user: authData.user, isLoading: false, isAuthenticated: true });
          }
        } catch {
          clearAuth();
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };

    // Stash the in-flight promise so the StrictMode second-mount sees it
    // and joins instead of firing its own refresh.
    initAuthInFlight = initAuth().finally(() => { initAuthInFlight = null; });
  }, []);

  // Proactive token refresh — fires at 55 min so the 1-hour access token is
  // renewed before it expires, eliminating the 401 cascade on busy pages.
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const id = setInterval(async () => {
      try {
        await proactiveRefresh();
        lastRefreshAt.current = Date.now();
        refreshStreamToken();
      } catch { /* reactive 401 interceptor covers any failure here */ }
    }, PROACTIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [state.isAuthenticated]);

  // Re-auth on tab focus. If the tab was dormant for 50+ min the access token
  // is likely expired — do a full token refresh before calling /me so there is
  // no 401 cascade when the user returns to a long-idle tab.
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const rt = getRefreshToken();
      if (!rt) return;
      const stale = Date.now() - lastRefreshAt.current > STALE_THRESHOLD_MS;
      try {
        if (stale) {
          await proactiveRefresh();
          lastRefreshAt.current = Date.now();
          refreshStreamToken();
        }
        const fresh = await authApi.me();
        setUserCache(fresh);
        setState(s => s.isAuthenticated ? { ...s, user: fresh } : s);
      } catch { /* ignore — interceptor or next focus will retry */ }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const fireAttendanceCheckIn = useCallback(async () => {
    try {
      const req: { lat?: number; lng?: number; accuracy?: number } = {};
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              req.lat = pos.coords.latitude;
              req.lng = pos.coords.longitude;
              req.accuracy = pos.coords.accuracy;
              resolve();
            },
            () => resolve(),
            { timeout: 10000, maximumAge: 60000 }
          );
        });
      }
      const result = await attendanceApi.checkIn(req);
      if (!result.alreadyRecorded) {
        const time = new Date(result.checkedInAt).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit',
        });
        toastBus.success(`Attendance recorded — ${time}`);
      }
    } catch {
      // silent — attendance failure must never block the user
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      const authData = await authApi.login(credentials);

      if (authData.mfaRequired) {
        // Do NOT persist yet — MFA step still pending
        return {
          mfaRequired: true,
          mfaSessionToken: authData.mfaSessionToken,
        };
      }

      persistAuth(authData);
      lastRefreshAt.current = Date.now();
      setState({ user: authData.user, isLoading: false, isAuthenticated: true });
      fireAttendanceCheckIn();
      return { mfaRequired: false };
    } catch (error) {
      throw error;
    }
  }, [fireAttendanceCheckIn]);

  const loginWithMfa = useCallback(async (email: string, password: string, totpCode: string) => {
    try {
      const authData = await authApi.login({
        email,
        password,
        totp_code: totpCode,
      });

      persistAuth(authData);
      lastRefreshAt.current = Date.now();
      setState({ user: authData.user, isLoading: false, isAuthenticated: true });
      fireAttendanceCheckIn();
    } catch (error) {
      throw error;
    }
  }, [fireAttendanceCheckIn]);

  const logout = useCallback(async (allDevices: boolean = false) => {
    try {
      if (allDevices) {
        await authApi.logoutAll();
      } else {
        await authApi.logout();
      }
    } catch {
      // swallow — still clear local state
    } finally {
      clearAuth();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const storedRefreshToken = getRefreshToken();
    if (!storedRefreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const authData = await authApi.refresh(storedRefreshToken);
      persistAuth(authData);
      setState({ user: authData.user, isLoading: false, isAuthenticated: true });
    } catch (error) {
      clearAuth();
      setState({ user: null, isLoading: false, isAuthenticated: false });
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    loginWithMfa,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};