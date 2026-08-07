import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, UserCheck, Clock, X, ArrowRight,
} from 'lucide-react';
import { notifications, type Notification, type NotifType } from '../utils/notifications';
import { presence } from '../utils/userPresence';
import './NotificationToasts.css';

interface ActiveToast {
  notif: Notification;
  /** Wall-clock timestamp when the toast was created. */
  startedAt: number;
  /** Auto-dismiss timer id. */
  timerId: number | null;
  /** Currently animating out. */
  leaving: boolean;
}

const TOAST_TTL_MS = 5200;
const STACK_MAX    = 4;

const TYPE_ICON: Record<NotifType, React.ElementType> = {
  system:     Bell,
  assignment: UserCheck,
  deadline:   Clock,
};

const TYPE_TONE: Record<NotifType, string> = {
  system:     'tone-neutral',
  assignment: 'tone-assignment',
  deadline:   'tone-deadline',
};

export default function NotificationToasts() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const toastsRef = useRef<ActiveToast[]>([]);
  toastsRef.current = toasts;

  const scheduleAutoDismiss = (id: string): number => {
    return window.setTimeout(() => {
      setToasts(curr => curr.map(t => t.notif.id === id ? { ...t, leaving: true } : t));
      window.setTimeout(() => {
        setToasts(curr => curr.filter(t => t.notif.id !== id));
      }, 240);
    }, TOAST_TTL_MS);
  };

  useEffect(() => {
    const unsub = notifications.onAdd((notif) => {
      /* When user is DND/Busy, the feed still records but no toast pops. */
      if (presence.isMuted()) return;
      setToasts(curr => {
        const existing = curr.find(t => t.notif.id === notif.id);
        if (existing) {
          if (existing.timerId) clearTimeout(existing.timerId);
          const timerId = scheduleAutoDismiss(notif.id);
          return curr.map(t => t.notif.id === notif.id
            ? { notif, startedAt: Date.now(), timerId, leaving: false }
            : t);
        }
        /* Cap stack — drop the oldest non-leaving toast */
        const timerId = scheduleAutoDismiss(notif.id);
        const next: ActiveToast = { notif, startedAt: Date.now(), timerId, leaving: false };
        const stack = [next, ...curr];
        if (stack.length > STACK_MAX) {
          const drop = stack.pop()!;
          if (drop.timerId) clearTimeout(drop.timerId);
        }
        return stack;
      });
    });
    return () => {
      unsub();
      /* Clean up timers on unmount */
      toastsRef.current.forEach(t => { if (t.timerId) clearTimeout(t.timerId); });
    };
  }, []);

  const dismissNow = (id: string) => {
    setToasts(curr => {
      const t = curr.find(x => x.notif.id === id);
      if (t?.timerId) clearTimeout(t.timerId);
      return curr.map(x => x.notif.id === id ? { ...x, leaving: true } : x);
    });
    setTimeout(() => {
      setToasts(curr => curr.filter(t => t.notif.id !== id));
    }, 240);
  };

  const pause = (id: string) => {
    setToasts(curr => curr.map(t => {
      if (t.notif.id !== id) return t;
      if (t.timerId) clearTimeout(t.timerId);
      return { ...t, timerId: null };
    }));
  };
  const resume = (id: string) => {
    setToasts(curr => curr.map(t => {
      if (t.notif.id !== id) return t;
      if (t.leaving) return t;
      const timerId = scheduleAutoDismiss(id);
      return { ...t, timerId };
    }));
  };

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="rp-toast-stack" role="region" aria-label="Notifications">
      {toasts.map(({ notif, leaving }) => {
        const Icon = TYPE_ICON[notif.type] ?? Bell;
        return (
          <div
            key={notif.id}
            className={`rp-toast ${TYPE_TONE[notif.type] ?? 'tone-neutral'}${leaving ? ' is-leaving' : ''}`}
            role="status"
            aria-live="polite"
            onMouseEnter={() => pause(notif.id)}
            onMouseLeave={() => resume(notif.id)}
          >
            <div className="rp-toast-icon">
              <Icon size={14} aria-hidden="true" />
            </div>
            <div className="rp-toast-body">
              <div className="rp-toast-title">{notif.title}</div>
              {notif.body && <div className="rp-toast-text">{notif.body}</div>}
              {notif.to && (
                <button
                  type="button"
                  className="rp-toast-open"
                  onClick={() => {
                    notifications.markRead(notif.id);
                    dismissNow(notif.id);
                    /* Soft navigation — uses history for SPA routing */
                    if (notif.to) window.history.pushState({}, '', notif.to);
                    /* Trigger react-router's listener */
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  Open <ArrowRight size={11} aria-hidden="true" />
                </button>
              )}
            </div>
            <button
              type="button"
              className="rp-toast-close"
              aria-label="Dismiss"
              onClick={() => dismissNow(notif.id)}
            >
              <X size={12} aria-hidden="true" />
            </button>
            <div className="rp-toast-progress" aria-hidden="true" />
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
