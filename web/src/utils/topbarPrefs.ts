import { useEffect, useState } from 'react';

export type TopbarButtonId =
  | 'help'         // ? keyboard shortcuts
  | 'sound'        // sound toggle
  | 'dark'         // dark / light mode
  | 'palette';     // search / ⌘K palette trigger

export interface TopbarButtonDef {
  id: TopbarButtonId;
  label: string;
  description: string;
  /** Some buttons aren't really negotiable (e.g. palette trigger). */
  alwaysVisible?: boolean;
}

export const TOPBAR_BUTTONS: TopbarButtonDef[] = [
  { id: 'palette',    label: 'Command palette',   description: 'The ⌘K search & action launcher trigger.', alwaysVisible: true },
  { id: 'help',       label: 'Keyboard shortcuts', description: 'The "?" tooltip help button.' },
  { id: 'sound',      label: 'Sound toggle',       description: 'Mute / unmute interaction sounds.' },
  { id: 'dark',       label: 'Dark mode toggle',   description: 'Switch between light and dark themes.' },
];

const STORAGE_KEY = 'rp-topbar-hidden';

type Listener = (hidden: Set<TopbarButtonId>) => void;
let hidden: Set<TopbarButtonId> = readPersisted();
const listeners = new Set<Listener>();

function readPersisted(): Set<TopbarButtonId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x: unknown): x is TopbarButtonId =>
      typeof x === 'string' && TOPBAR_BUTTONS.some(b => b.id === x)));
  } catch { return new Set(); }
}

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden])); } catch {}
}
function emit(): void {
  const snap = new Set(hidden);
  listeners.forEach(l => l(snap));
}

export const topbarPrefs = {
  isHidden(id: TopbarButtonId): boolean { return hidden.has(id); },

  setHidden(id: TopbarButtonId, hide: boolean): void {
    const def = TOPBAR_BUTTONS.find(b => b.id === id);
    if (def?.alwaysVisible && hide) return; // protected
    if (hide === hidden.has(id)) return;
    hidden = new Set(hidden);
    if (hide) hidden.add(id); else hidden.delete(id);
    persist();
    emit();
  },

  reset(): void {
    if (hidden.size === 0) return;
    hidden = new Set();
    persist();
    emit();
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(new Set(hidden));
    return () => { listeners.delete(fn); };
  },
};

export function useTopbarPrefs(): Set<TopbarButtonId> {
  const [v, setV] = useState<Set<TopbarButtonId>>(() => new Set(hidden));
  useEffect(() => topbarPrefs.subscribe(setV), []);
  return v;
}
