import type { ElementType } from 'react';

/* ── SpeechRecognition typings ────────────────────────────────────────────── */
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(idx: number): { transcript: string };
  [idx: number]: { transcript: string };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(idx: number): SpeechRecognitionResult;
  [idx: number]: SpeechRecognitionResult;
}
export interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}
export interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

/* ── Public types ─────────────────────────────────────────────────────────── */
export interface PaletteItem {
  id: string;
  label: string;
  category: string;
  icon: ElementType;
  hint?: string;
  keywords?: string[];
  run: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
  recentMax?: number;
  recentKey?: string;
  scope?: { currentPath: string; currentSection?: string };
}

export interface MatchInfo {
  score: number;
  matchedLabel?: [number, number];
  matchedVia?: string;
}

export interface ParsedQuery {
  text: string;
  filters: Record<string, string>;
}

export type ScopeMode = 'all' | 'page';

export const RECENT_KEY_DEFAULT = 'rp-palette-recent';
export const SAVED_KEY          = 'rp-palette-saved';
export const SAVED_MAX          = 12;

const TOKEN_KEYS = new Set(['in', 'cat', 'kind', 'type']);

/* ── localStorage helpers ─────────────────────────────────────────────────── */
export function readStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : [];
  } catch { return []; }
}
export function writeStringArray(key: string, list: string[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

/* ── Query parser ─────────────────────────────────────────────────────────── */
export function parseQuery(raw: string): ParsedQuery {
  const filters: Record<string, string> = {};
  const free: string[] = [];
  for (const part of raw.split(/\s+/).filter(Boolean)) {
    const m = part.match(/^(\w+):(.+)$/);
    if (m && TOKEN_KEYS.has(m[1].toLowerCase())) {
      filters[m[1].toLowerCase()] = m[2].toLowerCase();
    } else {
      free.push(part);
    }
  }
  return { text: free.join(' ').toLowerCase().trim(), filters };
}

/* ── Levenshtein distance ─────────────────────────────────────────────────── */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    const t = prev; prev = curr; curr = t;
  }
  return prev[n];
}

/* ── Scoring ──────────────────────────────────────────────────────────────── */
export function scoreItem(item: PaletteItem, q: string): MatchInfo {
  if (!q) return { score: 0 };
  const label = item.label.toLowerCase();
  const qLen  = q.length;
  if (label === q) return { score: 100, matchedLabel: [0, qLen] };
  if (label.startsWith(q)) return { score: 80, matchedLabel: [0, qLen] };
  const words = label.split(/\s+/);
  let pos = 0;
  for (const w of words) {
    if (w.startsWith(q)) return { score: 60, matchedLabel: [pos, pos + qLen] };
    pos += w.length + 1;
  }
  const idx = label.indexOf(q);
  if (idx >= 0) return { score: 40, matchedLabel: [idx, idx + qLen] };
  const kw = item.keywords?.find(k => k.toLowerCase().includes(q));
  if (kw) return { score: 25, matchedVia: kw };
  if (item.category.toLowerCase().includes(q)) return { score: 15, matchedVia: item.category };
  return { score: 0 };
}

/* ── Token filter check ───────────────────────────────────────────────────── */
export function passesFilters(item: PaletteItem, filters: Record<string, string>): boolean {
  for (const [k, v] of Object.entries(filters)) {
    if (k === 'in' || k === 'cat') {
      if (!item.category.toLowerCase().includes(v)) return false;
    } else if (k === 'kind' || k === 'type') {
      if (item.id.split(':')[0] !== v) return false;
    }
  }
  return true;
}

/* ── Scope check ──────────────────────────────────────────────────────────── */
export function passesScope(
  item: PaletteItem,
  mode: ScopeMode,
  scope: CommandPaletteProps['scope'],
): boolean {
  if (mode === 'all' || !scope) return true;
  if (item.id.startsWith('action:')) return true;
  if (item.id.startsWith('page:')) {
    if (item.hint === scope.currentPath) return true;
    if (scope.currentSection && item.keywords?.includes(scope.currentSection)) return true;
    return false;
  }
  return true;
}

/* ── Typo suggestion ──────────────────────────────────────────────────────── */
export function findTypoSuggestion(items: PaletteItem[], q: string): PaletteItem | null {
  if (q.length < 3) return null;
  const threshold = q.length <= 4 ? 1 : 2;
  let best: { item: PaletteItem; dist: number } | null = null;
  for (const item of items) {
    const label = item.label.toLowerCase();
    const first = label.split(/\s+/)[0];
    for (const c of [label, first]) {
      const d = levenshtein(q, c);
      if (d <= threshold && (!best || d < best.dist)) best = { item, dist: d };
    }
  }
  return best?.item ?? null;
}
