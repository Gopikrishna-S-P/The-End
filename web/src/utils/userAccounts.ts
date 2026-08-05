import { useEffect, useState } from 'react';

export interface KnownAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** ISO timestamp of last successful login on this device. */
  lastSeenAt: string;
  /** Display label for the role at last sign-in (cached for offline UX). */
  roleLabel?: string;
}

const STORAGE_KEY = 'rp-known-accounts';
const MAX_KEEP = 5;

type Listener = (accounts: KnownAccount[]) => void;
let accounts: KnownAccount[] = readPersisted();
const listeners = new Set<Listener>();

function readPersisted(): KnownAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x: unknown): x is KnownAccount =>
      !!x
      && typeof (x as KnownAccount).id    === 'string'
      && typeof (x as KnownAccount).email === 'string');
  } catch { return []; }
}

function persist(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); } catch {}
}
function emit(): void {
  const snapshot = accounts.slice();
  listeners.forEach(l => l(snapshot));
}

export const userAccounts = {
  /**
   * Record (or refresh) an account. Called after successful login.
   * Most-recent entries go to the front.
   */
  remember(acc: Omit<KnownAccount, 'lastSeenAt'>): void {
    const lastSeenAt = new Date().toISOString();
    const without = accounts.filter(a => a.id !== acc.id && a.email !== acc.email);
    accounts = [{ ...acc, lastSeenAt }, ...without].slice(0, MAX_KEEP);
    persist();
    emit();
  },

  forget(id: string): void {
    const before = accounts.length;
    accounts = accounts.filter(a => a.id !== id);
    if (accounts.length !== before) { persist(); emit(); }
  },

  list(): KnownAccount[] {
    return accounts.slice();
  },

  clear(): void {
    if (accounts.length === 0) return;
    accounts = [];
    persist();
    emit();
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(accounts.slice());
    return () => { listeners.delete(fn); };
  },
};

export function useKnownAccounts(): KnownAccount[] {
  const [v, setV] = useState<KnownAccount[]>(() => accounts.slice());
  useEffect(() => userAccounts.subscribe(setV), []);
  return v;
}
