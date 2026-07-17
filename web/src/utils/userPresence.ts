import { useEffect, useState } from 'react';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'dnd' | 'offline';

export interface PresenceState {
  status: PresenceStatus;
  /** ISO timestamp; status reverts to 'online' when this passes. */
  expiresAt?: string;
}

const STORAGE_KEY = 'rp-presence';
const DEFAULT_STATE: PresenceState = { status: 'online' };

type Listener = (state: PresenceState) => void;

let state: PresenceState = readPersisted();
const listeners = new Set<Listener>();
let expiryTimer: number | null = null;

function readPersisted(): PresenceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.status !== 'string') return { ...DEFAULT_STATE };
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      return { ...DEFAULT_STATE };
    }
    return {
      status: parsed.status as PresenceStatus,
      expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : undefined,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function emit(): void {
  const snapshot = { ...state };
  listeners.forEach(l => l(snapshot));
}

function scheduleExpiry(): void {
  if (expiryTimer !== null) {
    window.clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  if (!state.expiresAt) return;
  const remaining = new Date(state.expiresAt).getTime() - Date.now();
  if (remaining <= 0) {
    state = { ...DEFAULT_STATE };
    persist();
    emit();
    return;
  }
  expiryTimer = window.setTimeout(() => {
    expiryTimer = null;
    state = { ...DEFAULT_STATE };
    persist();
    emit();
  }, remaining);
}

scheduleExpiry();

export const presence = {
  get(): PresenceState {
    return { ...state };
  },

  /**
   * Set the status. Optional `durationMs` makes it auto-revert to `online`
   * after the given duration. Passing 0 / undefined clears any prior expiry.
   */
  setStatus(status: PresenceStatus, durationMs?: number): void {
    const expiresAt = durationMs && durationMs > 0
      ? new Date(Date.now() + durationMs).toISOString()
      : undefined;
    state = { status, expiresAt };
    persist();
    emit();
    scheduleExpiry();
  },

  clearExpiry(): void {
    state = { status: state.status };
    persist();
    emit();
    scheduleExpiry();
  },

  /** True when the user has explicitly opted out of notification noise. */
  isMuted(): boolean {
    return state.status === 'dnd';
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn({ ...state });
    return () => { listeners.delete(fn); };
  },
};

export function usePresence(): PresenceState {
  const [v, setV] = useState<PresenceState>(() => presence.get());
  useEffect(() => presence.subscribe(setV), []);
  return v;
}

declare global {
  interface Window { rpPresence?: typeof presence; }
}
if (typeof window !== 'undefined') {
  window.rpPresence = presence;
}
