import { useEffect, useRef, useState, useCallback } from 'react';
import { getAccessToken } from '../api/axiosInstance';
import { wsUrl } from '../pages/FieldOpsUtils';

export interface AgentDot {
  agentId: string;
  agentName: string | null;
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  batteryLevel: number | null;
  mockDetected: boolean;
  visitSessionId: string | null;
  ts: number;
  online: boolean;
}

function getToken(): string | null {
  return getAccessToken();
}

export function useLiveTrackSocket() {
  const [agents, setAgents]       = useState<Map<string, AgentDot>>(new Map());
  const [connected, setConnected] = useState(false);
  const wsRef      = useRef<WebSocket | null>(null);
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;
    const ws = new WebSocket(wsUrl('ws/live-track', getToken()));
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe' }));
    };

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'agent-update') {
          setAgents(prev => {
            const next = new Map(prev);
            next.set(msg.agentId, {
              agentId:        msg.agentId,
              agentName:      msg.agentName      ?? null,
              lat:            msg.lat,
              lng:            msg.lng,
              accuracy:       msg.accuracy       ?? 0,
              heading:        msg.heading        ?? null,
              speed:          msg.speed          ?? null,
              batteryLevel:   msg.batteryLevel   ?? null,
              mockDetected:   msg.mockDetected   ?? false,
              visitSessionId: msg.visitSessionId ?? null,
              ts:             msg.ts             ?? Date.now(),
              online:         true,
            });
            return next;
          });
        } else if (msg.type === 'agent-offline') {
          setAgents(prev => {
            const next = new Map(prev);
            const ex = next.get(msg.agentId);
            if (ex) next.set(msg.agentId, { ...ex, online: false });
            return next;
          });
        }
      } catch { /* malformed frame — ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!mountedRef.current) return;
      retryRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { agents, connected };
}
