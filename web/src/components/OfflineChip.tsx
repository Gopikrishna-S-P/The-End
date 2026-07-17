import { useEffect, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { notifications } from '../utils/notifications';
import './OfflineChip.css';

export default function OfflineChip() {
  const online = useOnlineStatus();
  const wasOnline = useRef<boolean>(online);

  useEffect(() => {
    if (wasOnline.current === online) return;
    if (!online) {
      notifications.add({
        type: 'system',
        title: 'You\'re offline',
        body: 'Changes will sync once the connection is restored.',
      });
    } else {
      notifications.add({
        type: 'system',
        title: 'Back online',
        body: 'Connection restored — your changes will sync now.',
      });
    }
    wasOnline.current = online;
  }, [online]);

  if (online) return null;

  return (
    <span
      className="app-offline-chip"
      role="status"
      aria-live="polite"
      title="No network connection"
    >
      <span className="app-offline-icon" aria-hidden="true">
        <WifiOff size={11} />
        <Wifi size={11} className="app-offline-icon-ghost" />
      </span>
      <span className="app-offline-label">Offline</span>
    </span>
  );
}
