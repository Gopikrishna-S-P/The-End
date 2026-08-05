import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './styles/index.css'
import App from './App'
import { installNotificationDispatch } from './utils/notificationDispatch'
import { notifications } from './utils/notifications'

// No-ops until VITE_SENTRY_DSN is supplied at build time (dev/CI builds have
// none) -- see .env.example for where a real staging/production DSN goes.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
Sentry.init({
  dsn: sentryDsn,
  enabled: !!sentryDsn,
  tracesSampleRate: 1.0,
});

/* Theme bootstrap — runs before React mounts so the login screen, the
 * auth-loading splash, and any pre-route flash already wear the user's
 * preferred appearance. The source of truth post-login is the server's
 * `themePreference` (re-synced by AppLayout once /auth/me lands), but this
 * cache makes the very first paint correct for returning users. */
(() => {
  try {
    const stored = localStorage.getItem('rp-theme');
    let isDark = false;
    if (stored === 'dark') isDark = true;
    else if (stored === 'system')
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
  } catch {
    /* localStorage may be blocked in some private modes — light mode is a
     * safe default and React will reconcile once it mounts. */
  }
})();

installNotificationDispatch();

/* Service worker (#65). Only in production — dev relies on hot reload + no
 * caching. The SW caches the app shell so reloads are instant and a brief
 * offline navigation works. When an updated SW takes over (waiting state),
 * surface a system notification with an Open link that reloads the tab. */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            /* A fresh worker is waiting — let the user pick the moment */
            notifications.add({
              type: 'system',
              title: 'Update available',
              body: 'A new version is ready. Reload to use it.',
              to: window.location.pathname,
              actions: { acknowledge: true, snooze: false, open: false },
            });
          }
        });
      });
    }).catch(() => { /* registration failure is non-fatal */ });

    /* Reload once when the new SW takes control (the user-triggered moment). */
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)