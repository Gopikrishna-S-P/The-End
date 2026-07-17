import { useEffect, useState } from 'react';

export interface Workspace {
  id: string;
  name: string;
  short?: string;
  accent?: string;
}

type Listener = (state: { current: Workspace | null; list: Workspace[] }) => void;

let current: Workspace | null = null;
let list: Workspace[] = [];
const listeners = new Set<Listener>();

function emit() {
  const snap = { current: current ? { ...current } : null, list: list.slice() };
  listeners.forEach(l => l(snap));
}

export const workspace = {
  getCurrent(): Workspace | null {
    return current ? { ...current } : null;
  },
  getList(): Workspace[] {
    return list.slice();
  },
  setCurrent(w: Workspace | null): void {
    if (current?.id === w?.id && current?.name === w?.name) return;
    current = w ? { ...w } : null;
    emit();
  },
  setList(ws: Workspace[]): void {
    list = ws.map(w => ({ ...w }));
    emit();
  },
  switchTo(id: string): void {
    const next = list.find(w => w.id === id);
    if (!next) return;
    current = { ...next };
    emit();
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn({ current: current ? { ...current } : null, list: list.slice() });
    return () => { listeners.delete(fn); };
  },
};

export function useWorkspace(): { current: Workspace | null; list: Workspace[] } {
  const [v, setV] = useState<{ current: Workspace | null; list: Workspace[] }>(
    () => ({ current: workspace.getCurrent(), list: workspace.getList() }),
  );
  useEffect(() => workspace.subscribe(setV), []);
  return v;
}
