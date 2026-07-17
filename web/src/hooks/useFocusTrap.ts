import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[tabindex]',
].join(',');

function isVisible(el: HTMLElement): boolean {
  if (el.hidden) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  /* offsetParent is null for display:none or detached elements */
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  return true;
}

function getFocusables(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter(el => {
    const ti = el.getAttribute('tabindex');
    if (ti === '-1') return false;
    return isVisible(el);
  });
}

export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    /* Move focus inside the container on the next frame so any open-time DOM
       work has settled. Skip if focus is already inside (e.g. an input that
       autoFocused on mount). */
    const r = requestAnimationFrame(() => {
      if (container.contains(document.activeElement)) return;
      const focusables = getFocusables(container);
      if (focusables.length > 0) focusables[0].focus();
      else container.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusables(container);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(r);
      container.removeEventListener('keydown', onKeyDown);
      /* Return focus to the original trigger when the trap deactivates. */
      if (previouslyFocused instanceof HTMLElement
          && previouslyFocused.isConnected
          && previouslyFocused !== document.body) {
        previouslyFocused.focus();
      }
    };
  }, [ref, active]);
}
