import { useEffect, useState } from 'react';

export interface ImpersonatedTarget {
  id: string;
  name: string;
  email: string;
  roleLabel?: string;
}

export interface ImpersonationState {
  target: ImpersonatedTarget;
  /** ISO timestamp when impersonation started. */
  startedAt: string;
  /** Manager-supplied reason captured for audit purposes. */
  reason?: string;
}

type Listener = (state: ImpersonationState | null) => void;

let state: ImpersonationState | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  const snap = state ? { ...state, target: { ...state.target } } : null;
  listeners.forEach(l => l(snap));
}

// TODO: replace with POST to server-side audit endpoint when backend is wired
function audit(event: 'start' | 'end', payload: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.warn(`[audit:impersonation:${event}]`, {
    ts: new Date().toISOString(),
    targetId: (payload.target as ImpersonatedTarget | null)?.id ?? payload.targetId,
    durationMs: payload.durationMs,
  });
}

export const impersonation = {
  start(target: ImpersonatedTarget, reason?: string): void {
    state = {
      target: { ...target },
      reason: reason?.trim() || undefined,
      startedAt: new Date().toISOString(),
    };
    audit('start', { target, reason: state.reason });
    emit();
  },

  stop(): void {
    if (!state) return;
    audit('end', { target: state.target, durationMs: Date.now() - new Date(state.startedAt).getTime() });
    state = null;
    emit();
  },

  get(): ImpersonationState | null {
    return state ? { ...state, target: { ...state.target } } : null;
  },

  isActive(): boolean {
    return state !== null;
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(state ? { ...state, target: { ...state.target } } : null);
    return () => { listeners.delete(fn); };
  },
};

export function useImpersonation(): ImpersonationState | null {
  const [v, setV] = useState<ImpersonationState | null>(() => impersonation.get());
  useEffect(() => impersonation.subscribe(setV), []);
  return v;
}

