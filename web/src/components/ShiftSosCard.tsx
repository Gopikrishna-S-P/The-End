import { useEffect, useState, useCallback, useRef } from 'react';
import { fieldOpsApi } from '../api/fieldOpsApi';
import { useAuth } from '../AuthContext';
import { toastBus } from '../utils/toastBus';
import type { AgentShiftResponse } from '../types';
import { Play, Square, Siren, ShieldCheck, Loader2, Mic } from 'lucide-react';

/** Server rate-caps /api/v1/agent/location at 12/min; ping every 30s to stay well under that. */
const LOCATION_PING_MS = 30_000;

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

function elapsed(from: string): string {
  const secs = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * FO on-duty shift clock + panic button.
 * Wraps AgentFieldController's shifts/start, shifts/end, shifts/current,
 * sos and incidents/{id}/cancel endpoints (previously uncalled by the web app).
 */
export default function ShiftSosCard() {
  const { user } = useAuth();
  const agentId = user?.id ?? '';

  const [shift, setShift]           = useState<AgentShiftResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [confirmingSos, setConfirmingSos]       = useState(false);
  const [recordingAudio, setRecordingAudio]     = useState(false);
  const [uploadingAudio, setUploadingAudio]     = useState(false);

  const refresh = useCallback(async () => {
    if (!agentId) return;
    try {
      const s = await fieldOpsApi.currentShift(agentId);
      setShift(s);
    } catch {
      setShift(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Periodic background location ping while on an ACTIVE shift, so the
  // supervisor live-track map (GET /api/v1/agent/active) has fresh dots
  // even when the FO never opens the map itself.
  const onShiftForPing = shift?.status === 'ACTIVE';
  useEffect(() => {
    if (!onShiftForPing || !agentId) return;
    let cancelled = false;

    const ping = async () => {
      const gps = await getGps();
      if (cancelled || !gps) return;
      try {
        await fieldOpsApi.recordLocationPing({
          agentId,
          lat: gps.lat,
          lng: gps.lng,
          accuracy: gps.accuracy,
          recordedAt: new Date().toISOString(),
        });
      } catch {
        // Non-fatal — a missed ping just means a stale dot on the supervisor map.
      }
    };

    ping();
    const t = setInterval(ping, LOCATION_PING_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [onShiftForPing, agentId]);

  const handleStart = async () => {
    setBusy(true);
    try {
      const gps = await getGps();
      const s = await fieldOpsApi.startShift({ lat: gps?.lat, lng: gps?.lng });
      setShift(s);
      toastBus.success('Shift started', 'You are now on duty.');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not start shift.';
      toastBus.error(msg);
    } finally { setBusy(false); }
  };

  const handleEnd = async () => {
    setBusy(true);
    try {
      const s = await fieldOpsApi.endShift(agentId);
      setShift(s);
      toastBus.success('Shift ended', 'You are now off duty.');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not end shift.';
      toastBus.error(msg);
    } finally { setBusy(false); }
  };

  const handleSos = async () => {
    setBusy(true); setConfirmingSos(false);
    try {
      const gps = await getGps();
      const incident = await fieldOpsApi.sos({
        agentId, lat: gps?.lat, lng: gps?.lng, accuracy: gps?.accuracy,
      });
      setActiveIncidentId(incident.id);
      toastBus.error('SOS sent', 'Your supervisor has been alerted.');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not send SOS.';
      toastBus.error(msg);
    } finally { setBusy(false); }
  };

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<BlobPart[]>([]);

  /**
   * Records a short voice note and uploads it via POST /api/v1/agent/sos/audio.
   * The backend relays each uploaded clip live over /ws/sos-audio
   * (see SosAudioWebSocketHandler), consumed by the supervisor-facing SosLiveMonitor.
   */
  const handleRecordVoiceNote = async () => {
    if (!activeIncidentId || recordingAudio || uploadingAudio) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toastBus.error('Voice notes are not supported on this device/browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecordingAudio(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0 || !agentId) return;
        setUploadingAudio(true);
        try {
          await fieldOpsApi.uploadSosAudio(agentId, blob, `sos-${Date.now()}.webm`);
          toastBus.success('Voice note sent', 'Attached to your active SOS for review.');
        } catch (e: unknown) {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not upload voice note.';
          toastBus.error(msg);
        } finally { setUploadingAudio(false); }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordingAudio(true);
      // Auto-stop after 15s so a panicked tap-and-forget doesn't record indefinitely.
      setTimeout(() => { if (recorderRef.current === recorder && recorder.state === 'recording') recorder.stop(); }, 15_000);
    } catch {
      toastBus.error('Microphone access denied or unavailable.');
    }
  };

  const handleStopVoiceNote = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const handleCancelSos = async () => {
    if (!activeIncidentId) return;
    setBusy(true);
    try {
      await fieldOpsApi.cancelSos(activeIncidentId);
      setActiveIncidentId(null);
      toastBus.success('SOS cancelled');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not cancel SOS.';
      toastBus.error(msg);
    } finally { setBusy(false); }
  };

  if (loading || !agentId) return null;

  const onShift = shift?.status === 'ACTIVE';

  return (
    <div className="ds-card" style={{ borderLeft: `4px solid ${activeIncidentId ? '#ef4444' : onShift ? '#22c55e' : 'var(--border)'}`, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {activeIncidentId ? 'SOS active' : onShift ? 'On duty' : 'Off duty'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
            {onShift && shift?.startedAt ? `Shift started ${elapsed(shift.startedAt)} ago` : 'Start your shift to begin field tracking'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!onShift ? (
            <button type="button" className="ds-btn is-primary" disabled={busy} onClick={handleStart}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {busy ? <Loader2 size={14} className="ds-spin" /> : <Play size={14} />} Start Shift
            </button>
          ) : (
            <>
              <button type="button" className="ds-btn is-secondary" disabled={busy} onClick={handleEnd}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {busy ? <Loader2 size={14} className="ds-spin" /> : <Square size={14} />} End Shift
              </button>

              {activeIncidentId ? (
                <>
                  <button type="button" className="ds-btn is-secondary" disabled={uploadingAudio}
                    onClick={recordingAudio ? handleStopVoiceNote : handleRecordVoiceNote}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: recordingAudio ? '#ef4444' : undefined }}>
                    {uploadingAudio ? <Loader2 size={14} className="ds-spin" /> : <Mic size={14} />}
                    {uploadingAudio ? 'Uploading…' : recordingAudio ? 'Stop recording' : 'Voice note'}
                  </button>
                  <button type="button" className="ds-btn is-secondary" disabled={busy} onClick={handleCancelSos}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
                    {busy ? <Loader2 size={14} className="ds-spin" /> : <ShieldCheck size={14} />} Cancel SOS
                  </button>
                </>
              ) : confirmingSos ? (
                <>
                  <button type="button" className="ds-btn is-danger" disabled={busy} onClick={handleSos}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {busy ? <Loader2 size={14} className="ds-spin" /> : <Siren size={14} />} Confirm SOS
                  </button>
                  <button type="button" className="ds-btn is-secondary" disabled={busy} onClick={() => setConfirmingSos(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="ds-btn is-danger" disabled={busy} onClick={() => setConfirmingSos(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Siren size={14} /> SOS
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
