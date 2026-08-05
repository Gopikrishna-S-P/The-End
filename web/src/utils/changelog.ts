import { useEffect, useState } from 'react';

export const APP_VERSION = '0.14.0';

export interface ChangelogHighlight {
  title: string;
  description: string;
  /** Lucide icon name — resolved client-side. */
  iconHint?:
    | 'sparkles' | 'palette' | 'rocket' | 'shield' | 'zap'
    | 'eye' | 'bell' | 'compass' | 'workflow';
}

export interface ChangelogEntry {
  version: string;
  date: string;       // ISO YYYY-MM-DD
  headline?: string;
  highlights: ChangelogHighlight[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: APP_VERSION,
    date: '2026-05-13',
    headline: 'Trust signals & chrome',
    highlights: [
      { title: 'Service-worker shell',     description: 'The app shell is cached for instant reloads + light offline support.', iconHint: 'rocket'   },
      { title: 'Session expiry chip',      description: 'Countdown in the topbar in the last 5 minutes of your session with "Stay" / "Sign out" actions.', iconHint: 'shield' },
      { title: 'Offline indicator',        description: 'Topbar chip + bell-feed entries when the network drops or returns.', iconHint: 'compass'  },
      { title: 'Contextual page help',     description: 'A ? button next to every breadcrumb opens a tip drawer for the current page.', iconHint: 'sparkles' },
      { title: 'Changelog popups',         description: 'You\'ll see this dialog once whenever a new version ships.', iconHint: 'bell'     },
    ],
  },
  {
    version: '0.13.0',
    date: '2026-05-12',
    headline: 'Loading & meta states',
    highlights: [
      { title: 'Activity timeline',        description: 'Your last 20 actions, accessible from the sidebar.', iconHint: 'workflow' },
      { title: 'Sound design',             description: 'Distinct tones for click, navigate, toggle, open / close, and success.', iconHint: 'zap' },
      { title: 'Inline progress',          description: 'The topbar sync chip now shows a 0–100 % progress bar for long ops.', iconHint: 'palette' },
      { title: 'Skeleton fallbacks',       description: 'Page transitions render shimmer placeholders matching real layouts.', iconHint: 'sparkles' },
    ],
  },
];

const STORAGE_KEY = 'rp-last-seen-version';

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export function getLastSeenVersion(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function markVersionSeen(version: string = APP_VERSION): void {
  try { localStorage.setItem(STORAGE_KEY, version); } catch {}
}

/** Entries newer than `since` (or all when unseen). */
export function getUnseenEntries(since: string | null): ChangelogEntry[] {
  if (!since) return CHANGELOG.slice(0, 1);  // first-ever visit: just current
  return CHANGELOG.filter(e => compareSemver(e.version, since) > 0);
}

/** Hook returning unseen entries when something needs to show; null otherwise. */
export function useWhatsNew(): ChangelogEntry[] | null {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(() => {
    const seen = getLastSeenVersion();
    if (!seen) return null;  // suppress on very first visit so login is uninterrupted
    const u = getUnseenEntries(seen);
    return u.length > 0 ? u : null;
  });

  /* On first-ever visit, mark the current version so we won't pop next time */
  useEffect(() => {
    if (getLastSeenVersion() === null) markVersionSeen(APP_VERSION);
  }, []);

  return entries;
}

/** Called by the modal's close button — marks current as seen + clears state. */
export function dismissWhatsNew(setter: (next: null) => void): void {
  markVersionSeen(APP_VERSION);
  setter(null);
}
