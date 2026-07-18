import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { getAccessToken } from '../api/axiosInstance';
import { wsUrl, REFRESH_MS, type AgentPos, type WsStatus } from '../pages/FieldOpsUtils';
import { fieldOpsApi } from '../api/fieldOpsApi';

/**
 * REST polling fallback for the live-track WebSocket.
 *
 * GET /api/v1/agent/active (fieldOpsApi.listActive) was previously wired up
 * but never called from anywhere. It's used here so the supervisor map still
 * shows agent positions if the `ws/live-track` socket never connects.
 * AgentLiveStatusResponse has no agentName, so REST-sourced dots show as
 * "Unknown agent" until a WS update (or a future backend addition) supplies one.
 */
function usePollingFallback(orgId: string | undefined, setAgents: Dispatch<SetStateAction<Map<string, AgentPos>>>) {
  useEffect(() => {
    if (!orgId) return;
    let alive = true;

    const poll = async () => {
      try {
        const rows = await fieldOpsApi.listActive(orgId);
        if (!alive) return;
        setAgents(prev => {
          const next = new Map(prev);
          for (const row of rows) {
            if (row.lastLat == null || row.lastLng == null) continue;
            const existing = next.get(row.agentId);
            // Don't clobber a fresher WS-sourced position with a stale REST snapshot.
            if (existing && row.lastPingAt && new Date(row.lastPingAt).getTime() < new Date(existing.ts).getTime()) continue;
            next.set(row.agentId, {
              agentId: row.agentId,
              agentName: existing?.agentName,
              lat: row.lastLat,
              lng: row.lastLng,
              accuracy: row.lastAccuracy,
              ts: row.lastPingAt ?? new Date().toISOString(),
            });
          }
          return next;
        });
      } catch { /* non-fatal — keep last known state */ }
    };

    poll();
    const t = setInterval(poll, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [orgId, setAgents]);
}

export function useLiveTrack(orgId?: string): { agents: Map<string, AgentPos>; wsStatus: WsStatus } {
  const [agents,   setAgents]   = useState<Map<string, AgentPos>>(new Map());
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');

  usePollingFallback(orgId, setAgents);

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
