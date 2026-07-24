import { useEffect, useState } from 'react';

type Listener = (open: boolean) => void;
let open = false;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach(l => l(open));
}

export const notificationsDialog = {
  show(): void {
    if (open) return;
    open = true;
    emit();
  },
  close(): void {
    if (!open) return;
    open = false;
    emit();
  },
  get(): boolean { return open; },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(open);
    return () => { listeners.delete(fn); };
  },
};

export function useNotificationsDialogOpen(): boolean {
  const [v, setV] = useState(() => notificationsDialog.get());
  useEffect(() => notificationsDialog.subscribe(setV), []);
  return v;
}
