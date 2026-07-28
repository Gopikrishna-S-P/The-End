import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { useAuth } from '@/context/AuthContext';
import { agentFieldApi } from '@/api/agentFieldApi';
import type { AgentShiftResponse } from '@/types/agentField';

// Foreground-only tracking (per product decision): pings while the app is
// open and active, paused while backgrounded — no "Always" location
// permission or background task is requested. Well under the backend's
// 12-pings/minute rate cap (one every 5s).
const PING_INTERVAL_MS = 15_000;

export function useShiftTracking() {
  const { user } = useAuth();
  const [shift, setShift] = useState<AgentShiftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    agentFieldApi.currentShift(user.id)
      .then((s) => setShift(s && s.status === 'ACTIVE' ? s : null))
      .catch(() => setShift(null))
      .finally(() => setLoading(false));
  }, [user]);

  const sendPing = useCallback(async () => {
    if (!user) return;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const batteryLevel = await Battery.getBatteryLevelAsync().catch(() => null);
      const mocked = (pos as { mocked?: boolean }).mocked ?? false;

      await agentFieldApi.recordPing({
        agentId: user.id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? undefined,
        batteryLevel: batteryLevel != null && batteryLevel >= 0 ? batteryLevel * 100 : undefined,
        mockLocationDetected: mocked,
        recordedAt: new Date(pos.timestamp).toISOString(),
      });
    } catch {
      // Best-effort — a missed ping doesn't interrupt the FO's work.
    }
  }, [user]);

  useEffect(() => {
    const clear = () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };

    if (!shift) { clear(); return; }

    const startInterval = () => {
      clear();
      sendPing();
      intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);
    };

    if (AppState.currentState === 'active') startInterval();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startInterval();
      else clear();
    });

    return () => { clear(); sub.remove(); };
  }, [shift, sendPing]);

  const startShift = async () => {
    if (!user) return;
    setError(null);
    setStarting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat: number | undefined;
      let lng: number | undefined;
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
        if (pos) { lat = pos.coords.latitude; lng = pos.coords.longitude; }
      }
      const result = await agentFieldApi.startShift({ lat, lng });
      setShift(result);
    } catch {
      setError('Could not start your shift. Try again.');
    } finally {
      setStarting(false);
    }
  };

  const endShift = async () => {
    if (!user) return;
    setError(null);
    setEnding(true);
    try {
      const result = await agentFieldApi.endShift(user.id);
      setShift(null);
      return result;
    } catch {
      setError('Could not end your shift. Try again.');
    } finally {
      setEnding(false);
    }
  };

  return { shift, loading, starting, ending, error, startShift, endShift };
}
