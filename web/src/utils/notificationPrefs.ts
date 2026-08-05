import { useEffect, useState } from 'react';
import type { NotifType } from './notifications';

export type NotifChannel = 'sound' | 'desktop' | 'email';

export type NotifPrefs = Record<NotifType, Record<NotifChannel, boolean>>;

const STORAGE_KEY = 'rp-notification-prefs';

/* Sensible defaults — only Mentions & Deadlines get email by default to avoid spam */
const DEFAULTS: NotifPrefs = {
  system:     { sound: false, desktop: false, email: false },
  mention:    { sound: true,  desktop: true,  email: true  },
  assignment: { sound: true,  desktop: true,  email: false },
  deadline:   { sound: true,  desktop: true,  email: true  },
};

type Listener = (prefs: NotifPrefs) => void;
const listeners = new Set<Listener>();

function readPersisted(): NotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<NotifPrefs>;
    /* Merge with defaults so newly added types don't crash older clients */
    const merged: NotifPrefs = { ...DEFAULTS };
    (Object.keys(DEFAULTS) as NotifType[]).forEach(t => {
      const incoming = parsed?.[t];
      if (incoming) {
        merged[t] = {
          sound:   typeof incoming.sound   === 'boolean' ? incoming.sound   : DEFAULTS[t].sound,
          desktop: typeof incoming.desktop === 'boolean' ? incoming.desktop : DEFAULTS[t].desktop,
          email:   typeof incoming.email   === 'boolean' ? incoming.email   : DEFAULTS[t].email,
        };
      }
    });
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

let prefs: NotifPrefs = readPersisted();

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}

function emit(): void {
  const snapshot: NotifPrefs = JSON.parse(JSON.stringify(prefs));
  listeners.forEach(l => l(snapshot));
}

export const notificationPrefs = {
  get(): NotifPrefs {
    return JSON.parse(JSON.stringify(prefs));
  },

  /** Set a single (type, channel) cell. */
  set(type: NotifType, channel: NotifChannel, value: boolean): void {
    const curr = prefs[type];
    if (curr[channel] === value) return;
    prefs = { ...prefs, [type]: { ...curr, [channel]: value } };
    persist();
    emit();
  },

  /** Reset to defaults. */
  reset(): void {
    prefs = { ...DEFAULTS };
    persist();
    emit();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(this.get());
    return () => { listeners.delete(listener); };
  },
};

export function useNotificationPrefs(): NotifPrefs {
  const [v, setV] = useState<NotifPrefs>(() => notificationPrefs.get());
  useEffect(() => notificationPrefs.subscribe(setV), []);
  return v;
}
