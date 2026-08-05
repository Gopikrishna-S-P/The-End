import { useEffect, useState } from 'react';

export type SettingsTab = 'general' | 'account' | 'billing' | 'security' | 'danger';

type Listener = (open: boolean) => void;
let open = false;
let tab: SettingsTab = 'general';
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach(l => l(open));
}

export const profileSettings = {
  show(initialTab: SettingsTab = 'general'): void {
    tab = initialTab;
    if (open) { emit(); return; }
    open = true;
    emit();
  },
  close(): void {
    if (!open) return;
    open = false;
    emit();
  },
  get(): boolean { return open; },
  getTab(): SettingsTab { return tab; },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(open);
    return () => { listeners.delete(fn); };
  },
};

export function useProfileSettingsOpen(): boolean {
  const [v, setV] = useState(() => profileSettings.get());
  useEffect(() => profileSettings.subscribe(setV), []);
  return v;
}
