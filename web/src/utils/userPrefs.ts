import { useEffect, useState } from 'react';

export interface UserPrefs {
  locale: string;
  /** IANA timezone, e.g. "Asia/Kolkata". */
  timezone: string;
}

const STORAGE_KEY = 'rp-user-prefs';

function browserDefaults(): UserPrefs {
  return {
    locale:   typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US',
    timezone: (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC') || 'UTC',
  };
}

function readPersisted(): UserPrefs {
  const fallback = browserDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      locale:   typeof parsed?.locale   === 'string' && parsed.locale   ? parsed.locale   : fallback.locale,
      timezone: typeof parsed?.timezone === 'string' && parsed.timezone ? parsed.timezone : fallback.timezone,
    };
  } catch { return fallback; }
}

type Listener = (prefs: UserPrefs) => void;
let prefs: UserPrefs = readPersisted();
const listeners = new Set<Listener>();

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}
function emit(): void {
  const snapshot = { ...prefs };
  listeners.forEach(l => l(snapshot));
}

export const userPrefs = {
  get(): UserPrefs {
    return { ...prefs };
  },
  setLocale(locale: string): void {
    if (!locale || locale === prefs.locale) return;
    prefs = { ...prefs, locale };
    persist();
    emit();
  },
  setTimezone(timezone: string): void {
    if (!timezone || timezone === prefs.timezone) return;
    prefs = { ...prefs, timezone };
    persist();
    emit();
  },
  reset(): void {
    prefs = browserDefaults();
    persist();
    emit();
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn({ ...prefs });
    return () => { listeners.delete(fn); };
  },
};

export function useUserPrefs(): UserPrefs {
  const [v, setV] = useState<UserPrefs>(() => userPrefs.get());
  useEffect(() => userPrefs.subscribe(setV), []);
  return v;
}

export const LOCALES: Array<{ value: string; label: string }> = [
  { value: 'en-US', label: 'English' },
  { value: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { value: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { value: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'te-IN', label: 'తెలుగు (Telugu)' },
  { value: 'ml-IN', label: 'മലയാളം (Malayalam)' },
];

/** Common timezone shortlist; the UI also accepts free-form via Intl. */
export const TIMEZONES: string[] = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Africa/Johannesburg',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'UTC',
];
