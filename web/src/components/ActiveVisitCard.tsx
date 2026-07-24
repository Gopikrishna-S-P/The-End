import { useEffect, useRef, useState, useCallback } from 'react';
import { visitSessionApi } from '../api/visitSessionApi';
import { toastBus } from '../utils/toastBus';
import type { VisitSession } from '../types';
import { Navigation, Clock, MapPin, X, CheckCircle, Hourglass } from 'lucide-react';
import { useFoLocationPublisher } from '../hooks/useFoLocationPublisher';

const PING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function elapsed(from: string): string {
  const secs = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

function getGps(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { timeout: 10000 },
    );
  });
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  onClosed?: () => void;
}

export default function ActiveVisitCard({ onClosed }: Props) {
  const [session, setSession] = useState<VisitSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [, setTick] = useState(0);
  const [nextPingIn, setNextPingIn] = useState(PING_INTERVAL_MS / 1000);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stream live GPS to supervisor map while session is active
  useFoLocationPublisher({
    visitSessionId: session?.id ?? null,
    enabled: !!session && session.status !== 'CLOSED' && session.status !== 'ABANDONED',
  });

  const refresh = useCallback(async () => {
    try {
      const s = await visitSessionApi.getActive();
      setSession(s);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Live elapsed time ticker — drives re-render every second
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 15-min GPS ping loop — only active while status is WAITING
  useEffect(() => {
    if (session?.status !== 'WAITING') {
      if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
      if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
      return;
    }

    setNextPingIn(PING_INTERVAL_MS / 1000);

    pingTimer.current = setInterval(async () => {
      const gps = await getGps();
      if (!gps || !session) return;
      try {
        await visitSessionApi.ping(session.id, { lat: gps.lat, lng: gps.lng, accuracy: gps.accuracy });
        refresh(); // re-fetch to get updated distanceMetres
      } catch { /* silent — best-effort ping */ }
      setNextPingIn(PING_INTERVAL_MS / 1000);
    }, PING_INTERVAL_MS);

    countdownTimer.current = setInterval(() => {
      setNextPingIn(n => Math.max(0, n - 1));
    }, 1000);

    return () => {
      if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
      if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
    };
  }, [session?.status, session?.id, refresh]);

  const act = useCallback(async (fn: () => Promise<VisitSession>) => {
    setActing(true);
    try {
      const updated = await fn();
      if (updated.status === 'CLOSED' || updated.status === 'ABANDONED') {
        onClosed?.();
        setSession(null);
      } else {
        setSession(updated);
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Action failed';
      toastBus.error(msg);
    } finally {
      setActing(false);
    }
  }, [onClosed]);

  const handleReached = async () => {
    const gps = await getGps();
    act(() => visitSessionApi.reached(session!.id, { lat: gps?.lat, lng: gps?.lng }));
  };

  const handleWaiting = async () => {
    const gps = await getGps();
    act(() => visitSessionApi.waiting(session!.id, { lat: gps?.lat, lng: gps?.lng }));
  };

  const handleClose   = () => act(() => visitSessionApi.close(session!.id));
  const handleAbandon = () => act(() => visitSessionApi.abandon(session!.id));

  if (loading || !session) return null;

  const statusFrom =
    session.status === 'WAITING' ? session.waitingSince
    : session.status === 'REACHED' ? session.reachedAt
    : session.startedAt;

  const statusColor =
    session.status === 'REACHED' ? '#22c55e'
    : session.status === 'WAITING' ? '#f59e0b'
    : '#3b82f6'; // STARTED

  return (
    <div className="ds-card" style={{ borderLeft: `4px solid ${statusColor}`, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {session.borrowerName ?? session.loanNumber}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{session.loanNumber}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, color: statusColor,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          {session.status}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13, color: 'var(--ink-tertiary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={13} /> {statusFrom ? elapsed(statusFrom) : '—'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Navigation size={13} /> {fmtDistance(session.distanceMetres)}
        </span>
        {session.status === 'WAITING' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={13} /> Next ping {formatCountdown(nextPingIn)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {session.status === 'STARTED' && (
          <button
            className="ds-btn ds-btn--primary"
            disabled={acting}
            onClick={handleReached}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <CheckCircle size={14} /> Mark Reached
          </button>
        )}
        {session.status === 'REACHED' && (
          <>
            <button
              className="ds-btn ds-btn--secondary"
              disabled={acting}
              onClick={handleWaiting}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Hourglass size={14} /> I'm Waiting
            </button>
            <button
              className="ds-btn ds-btn--primary"
              disabled={acting}
              onClick={handleClose}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle size={14} /> Close Visit
            </button>
          </>
        )}
        {session.status === 'WAITING' && (
          <button
            className="ds-btn ds-btn--primary"
            disabled={acting}
            onClick={handleClose}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <CheckCircle size={14} /> Close Visit
          </button>
        )}
        {/* Abandon is always available for STARTED / REACHED / WAITING */}
        <button
          className="ds-btn ds-btn--ghost"
          disabled={acting}
          onClick={handleAbandon}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)' }}
        >
          <X size={14} /> Abandon
        </button>
      </div>
    </div>
  );
}
