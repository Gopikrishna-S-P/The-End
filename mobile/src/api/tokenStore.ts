import * as SecureStore from 'expo-secure-store';

// expo-secure-store backs onto iOS Keychain / Android Keystore — appropriate
// for JWTs and refresh tokens on a device handling loan/borrower PII.
const REFRESH_TOKEN_KEY = 'recoverpro_refresh_token';
const USER_CACHE_KEY = 'recoverpro_user_cache';

let accessToken: string | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export async function loadRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveRefreshToken(token: string | null): Promise<void> {
  if (token == null) {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function loadUserCache<T>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(USER_CACHE_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveUserCache(user: unknown | null): Promise<void> {
  if (user == null) {
    await SecureStore.deleteItemAsync(USER_CACHE_KEY);
    return;
  }
  await SecureStore.setItemAsync(USER_CACHE_KEY, JSON.stringify(user));
}

export async function clearAllAuthStorage(): Promise<void> {
  accessToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_CACHE_KEY),
  ]);
}
