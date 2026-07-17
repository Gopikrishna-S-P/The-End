import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X, AlertCircle, MapPin } from 'lucide-react';
import { getAccessToken } from '../api/axiosInstance';

export interface Props {
  incidentId: string;
  agentId: string;
  onClose: () => void;
}

type AudioStatus = 'connecting' | 'live' | 'ended' | 'error';

function wsUrl(path: string, token: string | null): string {
  const base = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${base}/${path}${q}`;
}

export function SosLiveMonitor({ incidentId, onClose }: Props) {
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('connecting');
  const [chunkCount, setChunkCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayRef = useRef(0);
  const endedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const token = getAccessToken();
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl('ws/sos-audio', token));
    } catch {
      if (alive) { setAudioStatus('error'); setErrorMsg('Cannot open audio WebSocket.'); }
      return;
    }

    ws.onopen = () => {
      if (!alive) return;
      ws.send(JSON.stringify({ type: 'subscribe', incidentId }));
      setAudioStatus('live');
    };
    ws.onerror = () => {
      if (!alive) return;
      setAudioStatus('error');
      setErrorMsg('Audio WebSocket failed. Is Spring Boot running on port 8080?');
    };
    ws.onclose = (ev) => {
      if (!alive) return;
      if (ev.code === 1006) {
        setAudioStatus('error');
        setErrorMsg('Audio connection dropped (1006). Check server is running.');
      } else {
        setAudioStatus(p => (p === 'live' ? 'ended' : p));
      }
    };
    ws.onmessage = async (ev) => {
      if (!alive) return;
      try {
        const msg = JSON.parse(ev.data as string) as {
          type: string; chunk?: string;
          lat?: number; lng?: number; accuracy?: number; heading?: number;
        };

        if (msg.type === 'location') {
          if (msg.lat != null && msg.lng != null)
            setLiveLocation({ lat: msg.lat as number, lng: msg.lng as number });
          return;
        }
        if (msg.type === 'end') { endedRef.current = true; if (alive) setAudioStatus('ended'); return; }
        if (msg.type !== 'chunk' || !msg.chunk) return;

        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        if (!alive) return;

        const bin = atob(msg.chunk);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

        let ab: AudioBuffer;
        try { ab = await ctx.decodeAudioData(bytes.buffer.slice(0)); }
        catch { return; }
        if (!alive) return;

        const now = ctx.currentTime;
        const startAt = Math.max(now + 0.05, nextPlayRef.current);
        nextPlayRef.current = startAt + ab.duration;

        const src = ctx.createBufferSource();
        src.buffer = ab;
        src.connect(ctx.destination);
        src.start(startAt);

        setChunkCount(n => n + 1);
      } catch { /* ignore */ }
    };

    return () => {
      alive = false;
      ws.close();
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  const statusColor =
    audioStatus === 'live'  ? 'text-red-600'   :
    audioStatus === 'ended' ? 'text-gray-500'  :
    audioStatus === 'error' ? 'text-amber-600' : 'text-blue-600';

  const statusLabel =
    audioStatus === 'connecting' ? 'Connecting…'      :
    audioStatus === 'live'       ? 'LIVE — listening' :
    audioStatus === 'ended'      ? 'Stream ended'     : 'Audio error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Live SOS</p>
            <p className="text-sm font-mono text-gray-600">Live audio stream</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio status */}
        <div className="flex flex-col items-center gap-3 px-5 py-6">
          {audioStatus === 'live' ? (
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-20 w-20 rounded-full bg-red-400 opacity-30 animate-ping" />
              <div className="relative h-12 w-12 flex items-center justify-center rounded-full bg-red-600 shadow-md">
                <Mic className="w-6 h-6 text-white" />
              </div>
            </div>
          ) : audioStatus === 'error' ? (
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
          ) : (
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-gray-200">
              <MicOff className="w-6 h-6 text-gray-400" />
            </div>
          )}

          <p className={`text-base font-semibold ${statusColor}`}>{statusLabel}</p>

          {chunkCount > 0 && (
            <p className="text-xs text-gray-400">
              {chunkCount} segment{chunkCount !== 1 ? 's' : ''} · ~{chunkCount * 4}s of audio
            </p>
          )}
          {errorMsg && (
            <p className="text-xs text-amber-700 text-center bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              {errorMsg}
            </p>
          )}
          {audioStatus === 'live' && chunkCount === 0 && (
            <p className="text-xs text-gray-400 text-center">
              Audio arrives ~4 s after SOS triggered. Turn up your volume.
            </p>
          )}
          {audioStatus === 'ended' && (
            <p className="text-xs text-gray-400 text-center">
              FO ended the SOS. Recording saved for audit review.
            </p>
          )}
          {liveLocation && (
            <a
              href={`https://www.google.com/maps?q=${liveLocation.lat},${liveLocation.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
            >
              <MapPin className="w-3 h-3" />
              Live location · {liveLocation.lat.toFixed(5)}, {liveLocation.lng.toFixed(5)}
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            {audioStatus === 'live' ? 'Close (stream continues in background)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
