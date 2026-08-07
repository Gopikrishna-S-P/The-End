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
    title: '1. Welcome to RecoverPro',
    body: 'Welcome to the RBI-aligned recovery operations center. Let\'s review the interface in 10 simple steps.',
    placement: 'bottom',
  },
  {
    id: 'palette',
    selector: '.app-search-trigger',
    title: '2. Command Search',
    body: 'Press ⌘K or click here to search accounts, active loans, configure settings, or trigger theme modes.',
    placement: 'bottom',
  },
  {
    id: 'history',
    selector: '.app-history-nav',
    title: '3. History Controls',
    body: 'Quickly move backwards and forwards between visited case sheets and dashboard views.',
    placement: 'bottom',
  },
  {
    id: 'breadcrumbs',
    selector: '.app-breadcrumb',
    title: '4. Navigation Path',
    body: 'Displays your current location. Right-click segment for quick URL context actions.',
    placement: 'bottom',
  },
  {
    id: 'sidebar',
    selector: '.asb-root',
    title: '5. Main Sidebar',
    body: 'Quickly access today\'s visits, user setup, upload logs, and active case files. Drag the right edge to resize.',
    placement: 'right',
  },
  {
    id: 'collapse',
    selector: '.asb-collapse-toggle',
    title: '6. Sidebar Toggle',
    body: 'Collapse the full sidebar layout into a compact icon rail to maximize screen space.',
    placement: 'right',
  },
  {
    id: 'bell',
    selector: 'button[aria-label*="Notifications"]',
    title: '7. Live Notifications',
    body: 'Displays alerts for payments, assignments, and grievances. Custom preferences can be set in the modal.',
    placement: 'bottom',
  },
  {
    id: 'settings',
    selector: 'button[aria-label*="Settings"]',
    title: '8. Accessibility Settings',
    body: 'Adjust color scales, trigger CVD-safe filters, and enable or mute interactive interface sound alerts.',
    placement: 'bottom',
  },
  {
    id: 'avatar',
    selector: '.avd-trigger',
    title: '9. User Account Dropdown',
    body: 'Review your role credentials, configure organizational billing, or sign out securely.',
    placement: 'bottom',
  },
  {
    id: 'help',
    selector: '.app-help-menu-wrap',
    title: '10. Help & Resources',
    body: 'Review keyboard shortcut booklets, read child-page helper guides, restart tours, or contact support.',
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
