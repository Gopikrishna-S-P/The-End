import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { queueCount, subscribeQueueCount, trySync } from '@/utils/offlineQueue';

/** Tracks the pending offline-queue count and auto-syncs on reconnect / app foreground. */
export function useOfflineSync() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    queueCount().then(setPending);
    const unsubscribeQueue = subscribeQueueCount(setPending);

    const attemptSync = async () => {
      setSyncing(true);
      await trySync().catch(() => {});
      setSyncing(false);
    };

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) attemptSync();
    });

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') attemptSync();
    });

    attemptSync();

    return () => {
      unsubscribeQueue();
      unsubscribeNet();
      appStateSub.remove();
    };
  }, []);

  return { pending, syncing };
}
