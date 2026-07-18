import { useEffect, useState } from 'react';
import { notificationsApi, type ServerNotification, type ServerNotifType } from '../api/notificationsApi';

/** Coarse UI buckets the panel groups by. Maps from server type. */
export type NotifType = 'system' | 'mention' | 'assignment' | 'deadline';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body?: string;
  createdAt: string;
  read?: boolean;
  snoozedUntil?: string;
  to?: string;
  actions?: {
    open?: boolean;
    acknowledge?: boolean;
    snooze?: boolean;
  };
}

/** Translate server enum → UI bucket. */
function mapType(t: ServerNotifType): NotifType {
  if (t === 'MENTION') return 'mention';
  if (
    t.endsWith('_ASSIGNED') ||
    t === 'FO_SHIFT_STARTING' ||
    t === 'FO_DISPATCH_READY'
  ) return 'assignment';
  if (
    t === 'FO_PTP_EXPIRING_SOON' ||
    t === 'FO_PTP_BROKEN' ||
    t === 'ORG_HIGH_VALUE_PTP_BROKEN' ||
    t === 'ORG_APPROVAL_PENDING_OVERDUE' ||
    t === 'TL_CASES_UNASSIGNED'
  ) return 'deadline';
  return 'system';
}

function fromServer(n: ServerNotification): Notification {
  return {
    id: n.id,
    type: mapType(n.type),
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    read: !!n.readAt,
    snoozedUntil: n.snoozedUntil,
    to: n.deepLink,
  };
}

type StateListener = (state: Notification[]) => void;
type AddListener   = (notif: Notification) => void;

let state: Notification[] = [];
const stateListeners = new Set<StateListener>();
const addListeners   = new Set<AddListener>();

function emit(): void {
  const snap = state.slice();
  stateListeners.forEach(l => l(snap));
}

function setState(next: Notification[]): void {
  // Detect new IDs vs. previous state so toasts only fire for genuine arrivals.
  const prevIds = new Set(state.map(n => n.id));
  const arrivals = next.filter(n => !prevIds.has(n.id));
  state = next;
  emit();
  arrivals.forEach(n => addListeners.forEach(l => l(n)));
}

/**
 * The backend has NO push channel for notifications (no SSE/WebSocket endpoint — the
 * `/api/v1/notifications` route only ever returns the caller's current unread set on
 * request). Polling is therefore the *only* delivery mechanism, not a safety net for a
 * stream. See BCR-3 in BACKEND-REQUESTS.md.
 */
const POLL_INTERVAL_MS = 25_000;
let pollTimer: number | null = null;
let pollInflight = false;

async function refreshNow(): Promise<void> {
  if (pollInflight) return;
  pollInflight = true;
  try {
    const list = await notificationsApi.list();
    setState(list.map(fromServer));
  } catch {
    /* swallow — next poll will retry */
  } finally {
    pollInflight = false;
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') refreshNow();
}

/**
 * Kept as a no-op-ish re-poll for backward compatibility with callers (AuthContext) that
 * invoke this right after a token refresh. There is no persistent stream to reopen anymore —
 * just re-fetch immediately with the freshly rotated access token.
 */
export function refreshStreamToken(): void {
  refreshNow();
}

function startPolling(): void {
  if (pollTimer !== null) return;
  refreshNow();
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') refreshNow();
  }, POLL_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', refreshNow);
}

function stopPolling(): void {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('focus', refreshNow);
}

export const notifications = {
  /**
   * No-op — notifications now originate on the server. Kept for backward
   * compatibility with old callers that may still invoke it.
   */
  add(_input: Omit<Notification, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Notification {
    return { id: '', type: 'system', title: '', createdAt: new Date().toISOString() };
  },

  /**
   * The backend has no dismiss/delete endpoint (BCR-3). Since GET /api/v1/notifications
   * only ever returns the caller's *unread* set, marking read has the same visible effect —
   * the item drops out of the list on the next refresh. Mapped to markRead as the closest
   * real equivalent instead of calling a route that doesn't exist.
   */
  async dismiss(id: string): Promise<void> {
    state = state.filter(n => n.id !== id);
    emit();
    try { await notificationsApi.markRead(id); } catch { refreshNow(); }
  },

  async markRead(id: string): Promise<void> {
    state = state.map(n => n.id === id ? { ...n, read: true } : n);
    emit();
    try { await notificationsApi.markRead(id); } catch { refreshNow(); }
  },

  markUnread(_id: string): void {
    /* Server has no "mark unread" endpoint — kept as no-op for API parity. */
  },

  async markAllRead(): Promise<void> {
    state = state.map(n => n.read ? n : { ...n, read: true });
    emit();
    try { await notificationsApi.markAllRead(); } catch { refreshNow(); }
  },

  /** Equivalent to markAllRead here (see `dismiss` doc) — clears the visible/unread set. */
  async clearAll(): Promise<void> {
    state = [];
    emit();
    try { await notificationsApi.markAllRead(); } catch { refreshNow(); }
  },

  /**
   * Local-only — the backend has a `snoozedUntil` column but no endpoint to set it (BCR-3),
   * and the server-returned list carries no persisted snooze either. This optimistically
   * hides the item until `durationMs` elapses, but a page reload / next poll will restore it
   * since nothing was actually persisted server-side.
   */
  snooze(id: string, durationMs: number): void {
    const until = new Date(Date.now() + durationMs).toISOString();
    state = state.map(n => n.id === id ? { ...n, snoozedUntil: until } : n);
    emit();
  },

  refresh(): Promise<void> { return refreshNow(); },

  getAll(): Notification[] { return state.slice(); },

  getActive(): Notification[] {
    const now = Date.now();
    return state.filter(n => !n.snoozedUntil || new Date(n.snoozedUntil).getTime() <= now);
  },

  subscribe(listener: StateListener): () => void {
    stateListeners.add(listener);
    listener(state.slice());
    if (stateListeners.size === 1) startPolling();
    return () => {
      stateListeners.delete(listener);
      if (stateListeners.size === 0) stopPolling();
    };
  },

  onAdd(listener: AddListener): () => void {
    addListeners.add(listener);
    return () => { addListeners.delete(listener); };
  },
};

export function useNotifications(): Notification[] {
  const [list, setList] = useState<Notification[]>(() => state.slice());
  useEffect(() => notifications.subscribe(setList), []);
  return list;
}

/* Expose for dev console — same shape as before. */
declare global {
  interface Window { rpNotifications?: typeof notifications; }
}
if (typeof window !== 'undefined') {
  window.rpNotifications = notifications;
}
