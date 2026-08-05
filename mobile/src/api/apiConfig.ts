import Constants from 'expo-constants';

/**
 * Resolves the backend base URL.
 *
 * - EXPO_PUBLIC_API_URL (set in .env or eas.json) always wins — use this for
 *   staging/production builds, e.g. EXPO_PUBLIC_API_URL=https://api.recoverpro.com
 * - Otherwise, in dev (Expo Go / dev client), derive the LAN IP from the
 *   Metro bundler's own host (Constants.expoConfig.hostUri looks like
 *   "192.168.1.23:8081") so a phone on the same Wi-Fi reaches the backend
 *   without the developer hand-editing an IP every time it changes.
 * - Falls back to localhost for web/simulator use.
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:8080`;
  }

  return 'http://localhost:8080';
}

const resolvedBaseUrl = resolveApiBaseUrl();

// android.usesCleartextTraffic is on app-wide (see app.json) so the LAN-IP dev fallback
// above works on a physical device's Wi-Fi, where a dev server has no TLS cert. That flag
// has no per-domain scoping in a plain Expo config, so this is the other half of the
// guard: a release build (__DEV__ false) must never actually resolve to a plain-http
// URL, whether from a misconfigured EXPO_PUBLIC_API_URL or -- impossible in practice,
// since it's always set for eas.json's preview/production profiles, but worth guarding
// anyway -- silently falling through to the dev-only branches above.
if (!__DEV__ && resolvedBaseUrl.startsWith('http://')) {
  throw new Error(
    `Refusing to run a release build against a plain-http API URL (${resolvedBaseUrl}). `
      + 'Set EXPO_PUBLIC_API_URL to an https:// origin.');
}

export const API_BASE_URL = resolvedBaseUrl;
