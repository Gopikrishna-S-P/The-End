import { useEffect, useState } from 'react';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  id: string;
  /** CSS selector of the highlighted element. */
  selector: string;
  title: string;
  body: string;
  /** Where to place the tooltip relative to the target. */
  placement?: TourPlacement;
}

export const DEFAULT_STEPS: TourStep[] = [
  {
    id: 'welcome',
    selector: '.app-topbar-logo',
    title: 'Welcome to Recoverpro',
    body: 'A quick 30-second tour of the shortcuts and surfaces you\'ll use most.',
    placement: 'bottom',
  },
  {
    id: 'palette',
    selector: '.app-search-trigger',
    title: 'Command palette',
    body: 'Press ⌘K to jump to any page, action, or saved view. Try it now.',
    placement: 'bottom',
  },
  {
    id: 'sidebar',
    selector: '.asb-root',
    title: 'Sidebar nav',
    body: 'Navigation lives here — always visible. Drag the right edge to resize it.',
    placement: 'right',
  },
  {
    id: 'bell',
    selector: 'button[aria-label*="Notifications"]',
    title: 'Notifications',
    body: 'Filter, snooze, or open notifications. Per-type sound + desktop preferences live in the gear icon.',
    placement: 'bottom',
  },
  {
    id: 'avatar',
    selector: '.app-topbar-avatar-btn',
    title: 'Your account & preferences',
    body: 'Status, language, density, accent color, shortcuts customization — all here.',
    placement: 'bottom',
  },
];

const STORAGE_KEY = 'rp-tour-completed';

export interface TourState {
  active: boolean;
  stepIndex: number;
  steps: TourStep[];
}

type Listener = (state: TourState) => void;
let state: TourState = { active: false, stepIndex: 0, steps: DEFAULT_STEPS };
const listeners = new Set<Listener>();

function emit(): void {
  const snap: TourState = { ...state, steps: state.steps.slice() };
  listeners.forEach(l => l(snap));
}

export function hasCompletedTour(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
  catch { return true; /* fail closed — don't pester */ }
}

function markCompleted(): void {
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
}

export const tour = {
  start(steps: TourStep[] = DEFAULT_STEPS): void {
    state = { active: true, stepIndex: 0, steps };
    emit();
  },
  next(): void {
    if (!state.active) return;
    if (state.stepIndex + 1 >= state.steps.length) {
      tour.finish();
      return;
    }
    state = { ...state, stepIndex: state.stepIndex + 1 };
    emit();
  },
  prev(): void {
    if (!state.active || state.stepIndex === 0) return;
    state = { ...state, stepIndex: state.stepIndex - 1 };
    emit();
  },
  skip(): void {
    state = { ...state, active: false };
    markCompleted();
    emit();
  },
  finish(): void {
    state = { ...state, active: false };
    markCompleted();
    emit();
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn({ ...state, steps: state.steps.slice() });
    return () => { listeners.delete(fn); };
  },
};

export function useTour(): TourState {
  const [v, setV] = useState<TourState>(() => ({ ...state, steps: state.steps.slice() }));
  useEffect(() => tour.subscribe(setV), []);
  return v;
}

declare global {
  interface Window { rpTour?: typeof tour; }
}
if (typeof window !== 'undefined') {
  window.rpTour = tour;
}
