import { useEffect, useState } from 'react';

export interface KeyBinding {
  /** Raw `event.key` (case-sensitive for printable chars, "ArrowLeft" etc). */
  key: string;
  /** Primary modifier — Cmd on macOS, Ctrl everywhere else. */
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ActionDef {
  id: string;
  label: string;
  description: string;
  /** Whether the user can rebind this in the shortcuts dialog. */
  rebindable: boolean;
  defaultBinding: KeyBinding;
}

export const ACTIONS: ActionDef[] = [
  {
    id: 'palette.open',
    label: 'Open command palette',
    description: 'Spotlight-style search & action launcher.',
    rebindable: true,
    defaultBinding: { key: 'k', mod: true },
  },
  {
    id: 'help.open',
    label: 'Show keyboard shortcuts',
    description: 'Toggle this dialog.',
    rebindable: true,
    defaultBinding: { key: '?' },
  },
  {
    id: 'escape.all',
    label: 'Close overlays / exit fullscreen',
    description: 'Closes any open panel, modal, or fullscreen mode.',
    rebindable: false,
    defaultBinding: { key: 'Escape' },
  },
  {
    id: 'nav.jump',
    label: 'Jump to nav item 1–9',
    description: 'Open the Nth nav item directly.',
    rebindable: false,
    defaultBinding: { key: '1', alt: true },
  },
];

const STORAGE_KEY = 'rp-keymap-overrides';

type Listener = (overrides: Record<string, KeyBinding | null>) => void;
let overrides: Record<string, KeyBinding | null> = readPersisted();
const listeners = new Set<Listener>();

function readPersisted(): Record<string, KeyBinding | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch { return {}; }
}
function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch {}
}
function emit(): void {
  const snap = { ...overrides };
  listeners.forEach(l => l(snap));
}

export const keymap = {
  getBinding(actionId: string): KeyBinding | null {
    if (actionId in overrides) {
      const o = overrides[actionId];
      return o; // null means "unbound" (user removed default)
    }
    const def = ACTIONS.find(a => a.id === actionId);
    return def?.defaultBinding ?? null;
  },

  /** Set / clear an override. Pass null to unbind. Pass undefined to reset to default. */
  setBinding(actionId: string, binding: KeyBinding | null | undefined): void {
    if (binding === undefined) {
      delete overrides[actionId];
    } else {
      overrides[actionId] = binding;
    }
    overrides = { ...overrides };
    persist();
    emit();
  },

  resetAll(): void {
    overrides = {};
    persist();
    emit();
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn({ ...overrides });
    return () => { listeners.delete(fn); };
  },
};

export function useKeymapOverrides(): Record<string, KeyBinding | null> {
  const [v, setV] = useState(() => ({ ...overrides }));
  useEffect(() => keymap.subscribe(setV), []);
  return v;
}

export function matchEvent(e: KeyboardEvent, b: KeyBinding | null): boolean {
  if (!b) return false;
  const eMod = e.metaKey || e.ctrlKey;
  const keyMatches = e.key === b.key
    || e.key.toLowerCase() === b.key.toLowerCase();
  return keyMatches
    && !!b.mod   === eMod
    && !!b.shift === e.shiftKey
    && !!b.alt   === e.altKey;
}

/** Convert a KeyboardEvent into a binding (for capturing user input). */
export function captureBinding(e: KeyboardEvent): KeyBinding | null {
  const lonelyModifier = ['Control','Meta','Shift','Alt'].includes(e.key);
  if (lonelyModifier) return null;
  if (e.key === 'Escape' || e.key === 'Tab') return null;
  return {
    key:   e.key,
    mod:   e.metaKey || e.ctrlKey || undefined,
    shift: e.shiftKey || undefined,
    alt:   e.altKey || undefined,
  };
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

export function formatBinding(b: KeyBinding | null): string {
  if (!b) return '—';
  const parts: string[] = [];
  if (b.mod)   parts.push(IS_MAC ? '⌘' : 'Ctrl');
  if (b.alt)   parts.push(IS_MAC ? '⌥' : 'Alt');
  if (b.shift) parts.push(IS_MAC ? '⇧' : 'Shift');
  /* Pretty-print special keys */
  const niceKey = b.key === ' ' ? 'Space'
    : b.key.length === 1 ? b.key.toUpperCase()
    : b.key;
  parts.push(niceKey);
  return parts.join('+');
}
