import { useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { getAccessToken } from '../api/axiosInstance';
import { wsUrl } from '../pages/FieldOpsUtils';

const INTERVAL_MS = 5000;

interface Options {
  visitSessionId?: string | null;
  enabled?: boolean;
}

export function useFoLocationPublisher({ visitSessionId, enabled = true }: Options = {}) {
  const { user }    = useAuth();
  const wsRef       = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    if (!enabled || !user?.id) return;
    mountedRef.current = true;

    const agentId   = user.id;
    const agentName = [user.firstName, user.lastName].filter(Boolean).join(' ');

    const sendPosition = (ws: WebSocket) => {
      if (ws.readyState !== WebSocket.OPEN || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mountedRef.current || ws.readyState !== WebSocket.OPEN) return;
          const frame: Record<string, unknown> = {
            type:     'publish',
            agentId,
            agentName,
            lat:      pos.coords.latitude,
            lng:      pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          if (pos.coords.heading != null) frame.heading = pos.coords.heading;
          if (pos.coords.speed   != null) frame.speed   = pos.coords.speed;
          if (visitSessionId)              frame.visitSessionId = visitSessionId;

          // Battery API (Chrome/Android — best-effort, ignored on unsupported browsers)
          const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
          const send = () => ws.send(JSON.stringify(frame));
          if (nav.getBattery) {
            nav.getBattery()
              .then(b => { frame.batteryLevel = b.level; send(); })
              .catch(send);
          } else {
            send();
          }
        },
        () => { /* GPS denied or unavailable — skip tick */ },
        { timeout: 4000, maximumAge: 8000 }
      );
    };

    const connect = () => {
      if (!mountedRef.current || !getAccessToken()) return;
      const ws = new WebSocket(wsUrl('ws/live-track', getAccessToken()));
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        sendPosition(ws);
        intervalRef.current = setInterval(() => sendPosition(ws), INTERVAL_MS);
      };

      ws.onclose = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        wsRef.current = null;
        if (!mountedRef.current) return;
        retryRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (retryRef.current)    clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [enabled, user?.id, user?.firstName, user?.lastName, visitSessionId]);
}
