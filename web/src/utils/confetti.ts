import { useEffect, useState } from 'react';

export interface ConfettiOptions {
  /** Where the burst originates, in viewport coords. Defaults to viewport centre. */
  origin?: { x: number; y: number };
  /** Number of particles. Capped at 60. Defaults to 26. */
  count?: number;
  /** Spread half-angle in degrees from straight up. Defaults to 70 (wide spray). */
  spread?: number;
  /** Total burst lifetime in ms (matches the longest particle animation). Defaults to 1800. */
  durationMs?: number;
  /** Optional palette override. Defaults to brand mixed colors. */
  colors?: string[];
}

export interface ConfettiBurst {
  id: string;
  options: Required<ConfettiOptions>;
  createdAt: number;
}

type Listener = (burst: ConfettiBurst) => void;
const listeners = new Set<Listener>();

const DEFAULT_COLORS = ['#0AA550', '#14b8a6', '#06b6d4', '#6366f1', '#f43f5e', '#f59e0b'];

function makeId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const confetti = {
  fire(opts: ConfettiOptions = {}): void {
    const origin = opts.origin ?? {
      x: typeof window !== 'undefined' ? window.innerWidth / 2 : 200,
      y: typeof window !== 'undefined' ? window.innerHeight / 2 : 200,
    };
    const burst: ConfettiBurst = {
      id: makeId(),
      createdAt: Date.now(),
      options: {
        origin,
        count:      Math.max(1, Math.min(60, opts.count ?? 26)),
        spread:     Math.max(10, Math.min(90, opts.spread ?? 70)),
        durationMs: Math.max(500, Math.min(4000, opts.durationMs ?? 1800)),
        colors:     opts.colors && opts.colors.length > 0 ? opts.colors : DEFAULT_COLORS,
      },
    };
    listeners.forEach(l => l(burst));
  },

  /** Convenience: burst from an element's centre. */
  fireFrom(el: Element, opts: Omit<ConfettiOptions, 'origin'> = {}): void {
    const r = el.getBoundingClientRect();
    this.fire({ ...opts, origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};

export function useConfettiBursts(): ConfettiBurst[] {
  const [bursts, setBursts] = useState<ConfettiBurst[]>([]);
  useEffect(() => {
    const unsub = confetti.subscribe((b) => {
      setBursts(curr => [...curr, b]);
      window.setTimeout(() => {
        setBursts(curr => curr.filter(x => x.id !== b.id));
      }, b.options.durationMs + 80);
    });
    return unsub;
  }, []);
  return bursts;
}

declare global {
  interface Window { rpConfetti?: typeof confetti; }
}
if (typeof window !== 'undefined') {
  window.rpConfetti = confetti;
}
