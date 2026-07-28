import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import {
  useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync,
} from 'expo-audio';
import { TriangleAlert, ShieldCheck, Mic } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Button, Card } from '@/components/ui';
import { agentFieldApi } from '@/api/agentFieldApi';
import { formatDurationSince } from '@/utils/date';
import { extractApiError } from '@/utils/extractApiError';

const CLIP_SECONDS = 8;

export default function SosScreen() {
  const { user } = useAuth();
  const { colors, spacing } = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [phase, setPhase] = useState<'idle' | 'triggering' | 'active' | 'ending'>('idle');
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [triggeredAt, setTriggeredAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [, forceTick] = useState(0);

  const stoppedRef = useRef(false);

  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const runAudioLoop = async (agentId: string) => {
    const perm = await requestRecordingPermissionsAsync().catch(() => null);
    if (!perm?.granted) return;

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {});
    setMicActive(true);

    const cycle = async () => {
      if (stoppedRef.current) return;
      try {
        await recorder.prepareToRecordAsync();
        recorder.record();
        await new Promise((r) => setTimeout(r, CLIP_SECONDS * 1000));
        if (stoppedRef.current) { await recorder.stop().catch(() => {}); return; }
        await recorder.stop();
        if (recorder.uri) {
          await agentFieldApi.uploadSosAudio(agentId, { uri: recorder.uri, name: `sos-${Date.now()}.m4a`, type: 'audio/m4a' }).catch(() => {});
        }
      } catch {
        // Best-effort — a failed clip doesn't stop the loop or the SOS itself.
      }
      if (!stoppedRef.current) cycle();
    };
    cycle();
  };

  const onTrigger = async () => {
    if (!user) return;
    setError(null);
    setPhase('triggering');
    stoppedRef.current = false;

    let lat: number | undefined;
    let lng: number | undefined;
    let accuracy: number | undefined;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
        if (pos) { lat = pos.coords.latitude; lng = pos.coords.longitude; accuracy = pos.coords.accuracy ?? undefined; }
      }
    } catch {
      // Location is best-effort — the SOS must still fire without it.
    }

    try {
      const incident = await agentFieldApi.triggerSos({ agentId: user.id, lat, lng, accuracy });
      setIncidentId(incident.id);
      setTriggeredAt(incident.triggeredAt);
      setPhase('active');
      runAudioLoop(user.id);
    } catch (e) {
      setError(extractApiError(e, 'Could not send the SOS alert. Check your connection and try again.'));
      setPhase('idle');
    }
  };

  const onCancel = async () => {
    if (!incidentId) return;
    setPhase('ending');
    stoppedRef.current = true;
    try {
      await recorder.stop().catch(() => {});
    } catch { /* recorder may not be active */ }
    try {
      await agentFieldApi.cancelSos(incidentId);
    } catch (e) {
      setError(extractApiError(e, 'Could not cancel the alert — your supervisor may still see it as active.'));
    }
    router.back();
  };

  useEffect(() => () => { stoppedRef.current = true; }, []);

  if (phase === 'active' || phase === 'ending') {
    return (
      <Screen scroll={false} padded={false}>
        <View style={{ flex: 1, backgroundColor: colors.error, padding: spacing.s5, justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', gap: spacing.s4, marginTop: spacing.s8 }}>
            <TriangleAlert size={56} color="#fff" />
            <Text variant="title" color="inverse" style={{ textAlign: 'center' }}>SOS Active</Text>
            <Text variant="body" color="inverse" style={{ textAlign: 'center', opacity: 0.9 }}>
              Your location is being shared live with your supervisor.
            </Text>
            {triggeredAt ? (
              <Text variant="bodyMedium" color="inverse">{formatDurationSince(triggeredAt)} elapsed</Text>
            ) : null}
            {micActive ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
                <Mic size={16} color="#fff" />
                <Text variant="caption" color="inverse">Recording audio in short clips</Text>
              </View>
            ) : null}
          </View>

          <View style={{ gap: spacing.s3 }}>
            {error ? <Text variant="caption" color="inverse">{error}</Text> : null}
            <Button label="I'm safe now — Cancel SOS" variant="secondary" onPress={onCancel} loading={phase === 'ending'} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'space-between', gap: spacing.s5 }}>
        <View style={{ alignItems: 'center', gap: spacing.s4, marginTop: spacing.s6 }}>
          <View style={{
            width: 88, height: 88, borderRadius: 44, backgroundColor: colors.errorSubtle,
            alignItems: 'center', justifyContent: 'center',
          }}
          >
            <TriangleAlert size={44} color={colors.error} />
          </View>
          <Text variant="title">Emergency SOS</Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
            This immediately alerts your supervisor with your live location and starts sharing short audio
            clips, so they can respond quickly if you're in danger.
          </Text>
        </View>

        <Card style={{ gap: spacing.s2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
            <ShieldCheck size={16} color={colors.ink3} />
            <Text variant="caption" color="secondary" style={{ flex: 1 }}>
              Only use this for genuine safety emergencies. Your supervisor is notified the moment you trigger it.
            </Text>
          </View>
        </Card>

        {error ? <Text variant="caption" color="error">{error}</Text> : null}

        <View style={{ gap: spacing.s3 }}>
          <Button label="Trigger SOS Alert" variant="danger" onPress={onTrigger} loading={phase === 'triggering'} />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
