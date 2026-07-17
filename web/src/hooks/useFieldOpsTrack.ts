import { useState, useEffect } from 'react';
import { getAccessToken } from '../api/axiosInstance';
import { wsUrl, type AgentPos, type WsStatus } from '../pages/FieldOpsUtils';

export function useLiveTrack(): { agents: Map<string, AgentPos>; wsStatus: WsStatus } {
  const [agents,   setAgents]   = useState<Map<string, AgentPos>>(new Map());
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');

  useEffect(() => {
    let alive = true;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (!alive) return;
      setWsStatus('connecting');
      const token = getAccessToken();
      try {
        ws = new WebSocket(wsUrl('ws/live-track', token));
      } catch {
        if (alive) setWsStatus('error');
        return;
      }

      ws.onopen  = () => { if (!alive) return; ws.send(JSON.stringify({ type: 'subscribe' })); setWsStatus('connected'); };
      ws.onerror = () => { if (alive) setWsStatus('error'); };
      ws.onclose = () => {
        if (!alive) return;
        setWsStatus('disconnected');
        reconnectTimer = setTimeout(connect, 5000);
      };
      ws.onmessage = (ev) => {
        if (!alive) return;
        try {
          const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
          if (msg.type === 'agent-update') {
            setAgents(prev => {
              const next = new Map(prev);
              next.set(msg.agentId as string, {
                agentId:   msg.agentId   as string,
                agentName: msg.agentName as string | undefined,
                lat:       msg.lat       as number,
                lng:       msg.lng       as number,
                accuracy:  msg.accuracy  as number | undefined,
                heading:   msg.heading   as number | undefined,
                speed:     msg.speed     as number | undefined,
                ts:        (msg.ts as string) ?? new Date().toISOString(),
              });
              return next;
            });
          } else if (msg.type === 'agent-offline') {
            setAgents(prev => {
              const next = new Map(prev);
              next.delete(msg.agentId as string);
              return next;
            });
          }
        } catch { /* ignore malformed frames */ }
      };
    };

    connect();
    return () => {
      alive = false;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return { agents, wsStatus };
}
