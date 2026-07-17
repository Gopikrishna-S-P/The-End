import { useEffect, useState } from 'react';

/**
 * Reactive boolean tracking whether the app is in dark mode.
 *
 * <p>Dark mode is driven globally by adding {@code class="dark"} to
 * {@code <html>} — set on initial paint by {@code main.tsx} (from
 * localStorage cache) and kept in sync by {@code AppLayout} as the user
 * toggles. Components that need to render differently in dark mode
 * (third-party widgets with their own colour systems, e.g. Leaflet map
 * tiles, embedded charts) read it here instead of repeating the
 * class-list / MutationObserver wiring.
 */
export function useDarkMode(): boolean {
  const [dark, setDark] = useState<boolean>(
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const update = () => setDark(html.classList.contains('dark'));
    // Observe class changes on <html>; the topbar toggle is the only writer.
    const obs = new MutationObserver(update);
    obs.observe(html, { attributes: true, attributeFilter: ['class'] });
    update();
    return () => obs.disconnect();
  }, []);

  return dark;
}
