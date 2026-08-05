import { useEffect, useState } from 'react';

export interface Bookmark {
  id: string;
  /** Full path + search string, e.g. "/app/allocations?status=active". */
  url: string;
  /** User-supplied or auto-derived label. */
  label: string;
  /** ISO timestamp. */
  savedAt: string;
}

const STORAGE_KEY = 'rp-bookmarks';
const MAX = 50;

type Listener = (list: Bookmark[]) => void;
let list: Bookmark[] = readPersisted();
const listeners = new Set<Listener>();

function readPersisted(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((b): b is Bookmark =>
          !!b && typeof b.id === 'string' && typeof b.url === 'string' && typeof b.label === 'string')
      : [];
  } catch { return []; }
}
function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}
function emit(): void {
  const snap = list.slice();
  listeners.forEach(l => l(snap));
}
function makeId(): string {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const bookmarks = {
  list(): Bookmark[] { return list.slice(); },

  isBookmarked(url: string): boolean { return list.some(b => b.url === url); },

  add(url: string, label: string): Bookmark {
    /* De-dupe by URL — refresh the timestamp + label of existing entry */
    const existing = list.find(b => b.url === url);
    if (existing) {
      list = list.map(b => b.id === existing.id ? { ...b, label, savedAt: new Date().toISOString() } : b);
      persist();
      emit();
      return list.find(b => b.id === existing.id)!;
    }
    const bm: Bookmark = { id: makeId(), url, label, savedAt: new Date().toISOString() };
    list = [bm, ...list].slice(0, MAX);
    persist();
    emit();
    return bm;
  },

  remove(id: string): void {
    const before = list.length;
    list = list.filter(b => b.id !== id);
    if (list.length !== before) { persist(); emit(); }
  },

  removeByUrl(url: string): void {
    const before = list.length;
    list = list.filter(b => b.url !== url);
    if (list.length !== before) { persist(); emit(); }
  },

  clear(): void {
    if (list.length === 0) return;
    list = [];
    persist();
    emit();
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(list.slice());
    return () => { listeners.delete(fn); };
  },
};

export function useBookmarks(): Bookmark[] {
  const [v, setV] = useState<Bookmark[]>(() => list.slice());
  useEffect(() => bookmarks.subscribe(setV), []);
  return v;
}

declare global {
  interface Window { rpBookmarks?: typeof bookmarks; }
}
if (typeof window !== 'undefined') {
  window.rpBookmarks = bookmarks;
}
