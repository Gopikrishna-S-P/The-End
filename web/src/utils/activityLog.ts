import { useEffect, useState } from 'react';

export type ActivityKind = 'visit' | 'action';

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  /** Primary line — e.g. page title or action verb. */
  label: string;
  /** Optional secondary line, e.g. context. */
  detail?: string;
  /** Route path, when kind === 'visit'. */
  path?: string;
  /** ISO timestamp. */
  timestamp: string;
}

const STORAGE_KEY = 'rp-activity-log';
const MAX = 20;

type Listener = (entries: ActivityEntry[]) => void;

let entries: ActivityEntry[] = readPersisted();
const listeners = new Set<Listener>();

function readPersisted(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is ActivityEntry =>
        !!e && typeof e.id === 'string' && typeof e.label === 'string' && typeof e.timestamp === 'string')
      .slice(0, MAX);
  } catch { return []; }
}

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

function emit(): void {
  const snap = entries.slice();
  listeners.forEach(l => l(snap));
}

function makeId(): string {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const activityLog = {
  log(input: Omit<ActivityEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): void {
    const entry: ActivityEntry = {
      id:        input.id        ?? makeId(),
      kind:      input.kind,
      label:     input.label,
      detail:    input.detail,
      path:      input.path,
      timestamp: input.timestamp ?? new Date().toISOString(),
    };
    const top = entries[0];
    if (top && top.kind === 'visit' && entry.kind === 'visit' && top.path === entry.path) {
      entries = [{ ...top, timestamp: entry.timestamp }, ...entries.slice(1)];
    } else {
      entries = [entry, ...entries].slice(0, MAX);
    }
    persist();
    emit();
  },

  clear(): void {
    if (entries.length === 0) return;
    entries = [];
    persist();
    emit();
  },

  getAll(): ActivityEntry[] {
    return entries.slice();
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(entries.slice());
    return () => { listeners.delete(fn); };
  },
};

export function useActivityLog(): ActivityEntry[] {
  const [v, setV] = useState<ActivityEntry[]>(() => entries.slice());
  useEffect(() => activityLog.subscribe(setV), []);
  return v;
}

declare global {
  interface Window { rpActivityLog?: typeof activityLog; }
}
