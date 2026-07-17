import { useEffect, useState } from 'react';
import { getAccessToken } from '../api/axiosInstance';
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
  if (t.endsWith('_ASSIGNED') || t === 'FO_SHIFT_STARTING') return 'assignment';
  if (
    t === 'FO_PTP_EXPIRING_SOON' ||
    t === 'ORG_HIGH_VALUE_PTP_BROKEN' ||
    t === 'PLATFORM_GRIEVANCE_SLA_BREACH' ||
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

/** Slow safety-net poll. SSE is primary; this catches anything missed during
 *  disconnects (token refresh, network blip). */
const POLL_INTERVAL_MS = 60_000;
let pollTimer: number | null = null;
let pollInflight = false;
let sseSource: EventSource | null = null;

async function refreshNow(): Promise<void> {
  if (pollInflight) return;
  pollInflight = true;
  try {
    const page = await notificationsApi.list(false, 0, 50);
    setState(page.content.map(fromServer));
  } catch {
    /* swallow — next poll will retry */
  } finally {
    pollInflight = false;
  }
}

function openSse(): void {
  if (sseSource) return;
  // Never hold a stream while backgrounded — it will be (re)opened on focus.
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  const token = getAccessToken();
  if (!token) return;

  try {
    sseSource = new EventSource(`/api/v1/notifications/stream?token=${encodeURIComponent(token)}`);
    sseSource.addEventListener('notification', () => { refreshNow(); });
    sseSource.onerror = () => {
      sseSource?.close();
      sseSource = null;
      window.setTimeout(() => {
        // Only retry while subscribed AND foregrounded.
        if (stateListeners.size > 0 && document.visibilityState === 'visible') openSse();
      }, 5_000);
    };
  } catch {
    sseSource = null;
  }
}

function closeSse(): void {
  if (sseSource) { sseSource.close(); sseSource = null; }
}

/** Close and reopen SSE with the current (possibly refreshed) access token. */
function reopenSse(): void {
  closeSse();
  openSse();
}

function onStreamVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    // Foreground again: catch up on anything missed, then resume the stream
    // with the current token (which may have refreshed while hidden).
    refreshNow();
    reopenSse();
  } else {
    // Hidden: close the stream entirely. Browsers throttle/suspend timers on
    // hidden tabs, which otherwise leaves the EventSource reconnect loop
    // half-managed — accumulating half-open sockets against the per-host
    // connection limit until every fetch stalls (the "blank after a few
    // minutes idle, hard-refresh to fix" symptom). Closing here frees the
    // socket; onStreamVisibilityChange reopens it the moment we return.
    closeSse();
  }
}

/** Call after a token refresh so the SSE connection picks up the new token. */
export function refreshStreamToken(): void {
  if (sseSource) reopenSse();
}

function startStream(): void {
  if (pollTimer !== null) return;
  refreshNow();
  openSse();
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') refreshNow();
  }, POLL_INTERVAL_MS);
  document.addEventListener('visibilitychange', onStreamVisibilityChange);
  window.addEventListener('focus', refreshNow);
}

function stopStream(): void {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  document.removeEventListener('visibilitychange', onStreamVisibilityChange);
  window.removeEventListener('focus', refreshNow);
  closeSse();
}

export const notifications = {
  /**
   * No-op — notifications now originate on the server. Kept for backward
   * compatibility with old callers that may still invoke it.
   */
  add(_input: Omit<Notification, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Notification {
    return { id: '', type: 'system', title: '', createdAt: new Date().toISOString() };
  },

  async dismiss(id: string): Promise<void> {
    state = state.filter(n => n.id !== id);
    emit();
    try { await notificationsApi.dismiss(id); } catch { refreshNow(); }
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

  async clearAll(): Promise<void> {
    const toDismiss = state.map(n => n.id);
    state = [];
    emit();
    await Promise.allSettled(toDismiss.map(id => notificationsApi.dismiss(id)));
  },

  async snooze(id: string, durationMs: number): Promise<void> {
    const until = new Date(Date.now() + durationMs).toISOString();
    state = state.map(n => n.id === id ? { ...n, snoozedUntil: until } : n);
    emit();
    try { await notificationsApi.snooze(id, durationMs); } catch { refreshNow(); }
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
    if (stateListeners.size === 1) startStream();
    return () => {
      stateListeners.delete(listener);
      if (stateListeners.size === 0) stopStream();
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
