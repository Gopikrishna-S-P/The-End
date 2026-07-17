import { useEffect, useState } from 'react';

export interface BackgroundSyncEntry {
  id: string;
  label: string;
  startedAt: number;
  /** 0–1 fractional progress when known; undefined → indeterminate (spinner). */
  progress?: number;
}

type Listener = (entries: BackgroundSyncEntry[]) => void;

let entries: BackgroundSyncEntry[] = [];
const listeners = new Set<Listener>();

function makeId(): string {
  return `bs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function emit(): void {
  const snapshot = entries.slice();
  listeners.forEach(l => l(snapshot));
}

export const backgroundSync = {
  /**
   * Begin tracking a sync op. Returns an id; pass it to `end()` to clear.
   * Safe to call from anywhere — components don't need to mount the indicator.
   */
  start(label: string = 'Syncing'): string {
    const entry: BackgroundSyncEntry = { id: makeId(), label, startedAt: Date.now() };
    entries = [...entries, entry];
    emit();
    return entry.id;
  },

  end(id: string): void {
    const before = entries.length;
    entries = entries.filter(e => e.id !== id);
    if (entries.length !== before) emit();
  },

  /** Update the fractional progress (0..1) for an active entry. */
  setProgress(id: string, value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    let changed = false;
    entries = entries.map(e => {
      if (e.id !== id) return e;
      if (e.progress === clamped) return e;
      changed = true;
      return { ...e, progress: clamped };
    });
    if (changed) emit();
  },

  /** Convenience: wrap a promise. */
  wrap<T>(label: string, p: Promise<T>): Promise<T> {
    const id = this.start(label);
    return p.finally(() => this.end(id));
  },

  isActive(): boolean {
    return entries.length > 0;
  },

  getEntries(): BackgroundSyncEntry[] {
    return entries.slice();
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(entries.slice());
    return () => { listeners.delete(fn); };
  },
};

export function useBackgroundSync(): BackgroundSyncEntry[] {
  const [v, setV] = useState<BackgroundSyncEntry[]>(() => entries.slice());
  useEffect(() => backgroundSync.subscribe(setV), []);
  return v;
}

declare global {
  interface Window { rpBackgroundSync?: typeof backgroundSync; }
}
if (typeof window !== 'undefined') {
  window.rpBackgroundSync = backgroundSync;
}
