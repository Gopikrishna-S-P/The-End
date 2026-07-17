import { useEffect, useState } from 'react';

export interface Tab {
  id: string;
  path: string;
  title: string;
}

export interface TabsState {
  tabs: Tab[];
  activeId: string | null;
  /** Most-recently closed tabs (newest first). Ctrl+Shift+T pops the head. */
  closed: Tab[];
}

const CLOSED_MAX = 10;

const STORAGE_KEY = 'rp-tabs';
const MAX = 12;

type Listener = (state: TabsState) => void;
let state: TabsState = readPersisted();
const listeners = new Set<Listener>();

function readPersisted(): TabsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tabs: [], activeId: null, closed: [] };
    const parsed = JSON.parse(raw);
    const validate = (t: unknown): t is Tab =>
      !!t && typeof (t as Tab).id === 'string'
        && typeof (t as Tab).path === 'string'
        && typeof (t as Tab).title === 'string';
    const tabs = Array.isArray(parsed?.tabs)
      ? parsed.tabs.filter(validate).slice(0, MAX)
      : [];
    const closed = Array.isArray(parsed?.closed)
      ? parsed.closed.filter(validate).slice(0, CLOSED_MAX)
      : [];
    const activeId = typeof parsed?.activeId === 'string' && tabs.some((t: Tab) => t.id === parsed.activeId)
      ? parsed.activeId
      : (tabs[0]?.id ?? null);
    return { tabs, activeId, closed };
  } catch { return { tabs: [], activeId: null, closed: [] }; }
}

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
function emit(): void {
  const snap: TabsState = {
    tabs: state.tabs.slice(),
    activeId: state.activeId,
    closed: state.closed.slice(),
  };
  listeners.forEach(l => l(snap));
}
function makeId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const tabs = {
  get(): TabsState {
    return { tabs: state.tabs.slice(), activeId: state.activeId, closed: state.closed.slice() };
  },
  getActive(): Tab | null {
    if (!state.activeId) return null;
    return state.tabs.find(t => t.id === state.activeId) ?? null;
  },

  /** Open a new tab and make it active. Returns its id. */
  open(path: string, title: string): string {
    const tab: Tab = { id: makeId(), path, title };
    const nextTabs = [...state.tabs, tab].slice(-MAX);
    state = { ...state, tabs: nextTabs, activeId: tab.id };
    persist();
    emit();
    return tab.id;
  },

  /** Close a tab. If the active tab is closed, focus shifts to a neighbour.
   *  Closed tabs are pushed onto the `closed` history so restoreLast() can
   *  reopen them (Ctrl+Shift+T). */
  close(id: string): void {
    if (state.tabs.length === 0) return;
    const idx = state.tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    const closing = state.tabs[idx];
    const nextTabs = state.tabs.filter(t => t.id !== id);
    let nextActive = state.activeId;
    if (state.activeId === id) {
      nextActive = nextTabs[Math.max(0, idx - 1)]?.id
                ?? nextTabs[0]?.id
                ?? null;
    }
    /* Push to closed history; new id on reopen via restoreLast */
    const nextClosed = [closing, ...state.closed].slice(0, CLOSED_MAX);
    state = { tabs: nextTabs, activeId: nextActive, closed: nextClosed };
    persist();
    emit();
  },

  /** Reopen the most recently closed tab. Returns its id, or null when history is empty. */
  restoreLast(): string | null {
    if (state.closed.length === 0) return null;
    const [first, ...rest] = state.closed;
    const reopened: Tab = { ...first, id: makeId() };
    const nextTabs = [...state.tabs, reopened].slice(-MAX);
    state = { tabs: nextTabs, activeId: reopened.id, closed: rest };
    persist();
    emit();
    return reopened.id;
  },

  /** Switch which tab is active. */
  setActive(id: string): void {
    if (state.activeId === id) return;
    if (!state.tabs.some(t => t.id === id)) return;
    state = { ...state, activeId: id };
    persist();
    emit();
  },

  /** Update the active tab's path + title (called on every route change). */
  updateActive(partial: { path?: string; title?: string }): void {
    if (!state.activeId) return;
    let changed = false;
    state = {
      ...state,
      tabs: state.tabs.map(t => {
        if (t.id !== state.activeId) return t;
        const next: Tab = {
          ...t,
          path:  partial.path  !== undefined ? partial.path  : t.path,
          title: partial.title !== undefined ? partial.title : t.title,
        };
        if (next.path !== t.path || next.title !== t.title) changed = true;
        return next;
      }),
    };
    if (changed) { persist(); emit(); }
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn({ tabs: state.tabs.slice(), activeId: state.activeId, closed: state.closed.slice() });
    return () => { listeners.delete(fn); };
  },
};

export function useTabs(): TabsState {
  const [v, setV] = useState<TabsState>(() => tabs.get());
  useEffect(() => tabs.subscribe(setV), []);
  return v;
}

declare global {
  interface Window { rpTabs?: typeof tabs; }
}
if (typeof window !== 'undefined') {
  window.rpTabs = tabs;
}
