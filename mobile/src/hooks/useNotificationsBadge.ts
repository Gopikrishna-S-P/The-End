import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { notificationsApi } from '@/api/notificationsApi';
import { useAuth } from '@/context/AuthContext';

const POLL_MS = 60_000;

/** Polls the unread notification count while the app is in the foreground. */
export function useNotificationsBadge(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    let cancelled = false;
    const fetchCount = async () => {
      try {
        const n = await notificationsApi.unreadCount();
        if (!cancelled) setCount(n);
      } catch {
        // Silent — badge just stays at its last known value.
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchCount();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [user]);

  return count;
}
