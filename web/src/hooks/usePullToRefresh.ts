import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  /** Scroll container. Hook is no-op while ref.current is null. */
  ref: React.RefObject<HTMLElement | null>;
  /** Called when the user releases past threshold. May return a Promise. */
  onRefresh: () => unknown | Promise<unknown>;
  /** Pixels of pull required to trigger refresh. Defaults to 80. */
  threshold?: number;
  /** Disable above this viewport width (default: 768). */
  maxWidthPx?: number;
}

interface PullToRefreshState {
  /** 0 = not pulling; 1 = at threshold; up to ~1.5 = over-pulled (springy). */
  pull: number;
  refreshing: boolean;
}

const DEAD_ZONE_PX = 6;

export function usePullToRefresh({
  ref, onRefresh, threshold = 80, maxWidthPx = 768,
}: UsePullToRefreshOptions): PullToRefreshState {
  const [pull, setPull]             = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullRef   = useRef(0);

  /* Keep ref in sync so async handlers read fresh value */
  pullRef.current = pull;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth > maxWidthPx) return;

    const el = ref.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (el.scrollTop > 0) { startYRef.current = null; return; }
      startYRef.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      const startY = startYRef.current;
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        if (pullRef.current !== 0) setPull(0);
        return;
      }
      if (dy <= DEAD_ZONE_PX) return;
      /* Damp the pull past the threshold so it feels springy */
      const eased = dy < threshold
        ? dy / threshold
        : 1 + (dy - threshold) / (threshold * 2);
      const next = Math.min(eased, 1.5);
      if (next !== pullRef.current) setPull(next);
      /* Once we know it's a pull, stop the page from also scrolling */
      e.preventDefault();
    };

    const onEnd = async () => {
      const wasAt = pullRef.current;
      startYRef.current = null;
      if (refreshing) return;

      if (wasAt >= 1) {
        setRefreshing(true);
        setPull(1);
        try {
          await Promise.resolve(onRefresh());
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    el.addEventListener('touchcancel', onEnd,  { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [ref, onRefresh, threshold, maxWidthPx, refreshing]);

  return { pull, refreshing };
}
