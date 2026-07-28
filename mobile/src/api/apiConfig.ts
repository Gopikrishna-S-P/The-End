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

export const API_BASE_URL = resolveApiBaseUrl();
