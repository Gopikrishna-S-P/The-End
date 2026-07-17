import { useEffect, useState } from 'react';

export interface SessionState {
  /** ISO timestamp of expiry, or null when unknown. */
  expiresAt: string | null;
}

const STORAGE_KEY = 'rp-session-expiry';

type Listener = (state: SessionState) => void;
let state: SessionState = readPersisted();
const listeners = new Set<Listener>();

function readPersisted(): SessionState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { expiresAt: null };
    const parsed = JSON.parse(raw);
    return { expiresAt: typeof parsed?.expiresAt === 'string' ? parsed.expiresAt : null };
  } catch { return { expiresAt: null }; }
}
function persist(): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
function emit(): void {
  const snap = { ...state };
  listeners.forEach(l => l(snap));
}

export const session = {
  get(): SessionState { return { ...state }; },

  setExpiresAt(iso: string | null): void {
    if (state.expiresAt === iso) return;
    state = { expiresAt: iso };
    persist();
    emit();
  },

  /** Extend the session by `ms` from now. No-op if no current expiry. */
  extendBy(ms: number): void {
    const next = new Date(Date.now() + ms).toISOString();
    state = { expiresAt: next };
    persist();
    emit();
  },

  /** Milliseconds until expiry; null when unknown. Negative when expired. */
  remainingMs(): number | null {
    if (!state.expiresAt) return null;
    return new Date(state.expiresAt).getTime() - Date.now();
  },

  clear(): void {
    if (state.expiresAt === null) return;
    state = { expiresAt: null };
    persist();
    emit();
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn({ ...state });
    return () => { listeners.delete(fn); };
  },
};

export function useSession(): SessionState {
  const [v, setV] = useState<SessionState>(() => session.get());
  useEffect(() => session.subscribe(setV), []);
  return v;
}

export function useSessionCountdown(): { remainingMs: number | null } {
  const sess = useSession();
  const [, force] = useState(0);
  useEffect(() => {
    if (!sess.expiresAt) return;
    const remain = new Date(sess.expiresAt).getTime() - Date.now();
    const interval = remain < 5 * 60_000 ? 1_000 : 30_000;
    const id = window.setInterval(() => force(v => v + 1), interval);
    return () => clearInterval(id);
  }, [sess.expiresAt]);
  return { remainingMs: sess.expiresAt ? new Date(sess.expiresAt).getTime() - Date.now() : null };
}

declare global {
  interface Window { rpSession?: typeof session; }
}
if (typeof window !== 'undefined') {
  window.rpSession = session;
}
