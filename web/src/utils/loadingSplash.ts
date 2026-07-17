type Listener = (visible: boolean, message?: string) => void;

const listeners = new Set<Listener>();
let visible = false;
let currentMessage = 'Signing you in';
let hideTimer: number | null = null;
let shownAt: number | null = null;

function setVisible(next: boolean, message?: string): void {
  if (visible === next && message === currentMessage) return;
  visible = next;
  if (message) currentMessage = message;
  listeners.forEach(l => l(visible, currentMessage));
}

function clearTimer(): void {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export const loadingSplash = {
  /** Show the splash. Pass autoHideMs > 0 for an auto-hide timer; 0 = manual hide only. */
  show(autoHideMs: number = 0, message: string = 'Signing you in'): void {
    clearTimer();
    shownAt = Date.now();
    setVisible(true, message);
    if (autoHideMs > 0) {
      hideTimer = window.setTimeout(() => {
        hideTimer = null;
        shownAt = null;
        setVisible(false);
      }, autoHideMs);
    }
  },

  /** Hide immediately (e.g. on login error or MFA stage transition). */
  hide(): void {
    clearTimer();
    shownAt = null;
    setVisible(false);
  },

  /**
   * Hide the splash, but only after at least `minMs` have elapsed since show().
   * If the minimum time has already passed, hides immediately.
   */
  hideAfterMin(minMs: number): void {
    const elapsed = shownAt != null ? Date.now() - shownAt : minMs;
    const remaining = Math.max(0, minMs - elapsed);
    clearTimer();
    if (remaining <= 0) {
      shownAt = null;
      setVisible(false);
    } else {
      hideTimer = window.setTimeout(() => {
        hideTimer = null;
        shownAt = null;
        setVisible(false);
      }, remaining);
    }
  },

  /** Subscribe to visibility changes; returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(visible, currentMessage);
    return () => { listeners.delete(fn); };
  },
};
