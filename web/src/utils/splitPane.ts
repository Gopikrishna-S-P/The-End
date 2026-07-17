import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface SplitPaneState {
  open: boolean;
  title?: string;
  content?: ReactNode;
  width?: string;
}

type Listener = (state: SplitPaneState) => void;
let state: SplitPaneState = { open: false };
const listeners = new Set<Listener>();

function emit(): void {
  const snap = { ...state };
  listeners.forEach(l => l(snap));
}

export const splitPane = {
  show(input: Omit<SplitPaneState, 'open'>): void {
    state = { open: true, ...input };
    emit();
  },
  close(): void {
    if (!state.open) return;
    state = { open: false };
    emit();
  },
  get(): SplitPaneState { return { ...state }; },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn({ ...state });
    return () => { listeners.delete(fn); };
  },
};

export function useSplitPane(): SplitPaneState {
  const [v, setV] = useState<SplitPaneState>(() => splitPane.get());
  useEffect(() => splitPane.subscribe(setV), []);
  return v;
}

declare global {
  interface Window { rpSplitPane?: typeof splitPane; }
}
if (typeof window !== 'undefined') {
  window.rpSplitPane = splitPane;
}
