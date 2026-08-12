import { useEffect, useState } from 'react';
import { Phone, Loader2, Play } from 'lucide-react';
import { callLogApi } from '../api/callLogApi';
import { useAuth } from '../AuthContext';
import type { CallLogResponse, CallOutcome, RecordingStatus } from '../types';

const RECORDING_ROLES = ['ROLE_ORG_ADMIN', 'ROLE_MANAGER', 'ROLE_TL', 'ROLE_PLATFORM_ADMIN'];

const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDuration = (secs?: number) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  ANSWERED: 'Answered', NO_ANSWER: 'No answer', BUSY: 'Busy', WRONG_NUMBER: 'Wrong number',
  CALLBACK_REQUESTED: 'Callback requested', REFUSED: 'Refused', SWITCHED_OFF: 'Switched off',
};

const OUTCOME_VARIANT: Record<CallOutcome, string> = {
  ANSWERED: 'is-accent', NO_ANSWER: '', BUSY: '', WRONG_NUMBER: 'is-error',
  CALLBACK_REQUESTED: 'is-warn', REFUSED: 'is-error', SWITCHED_OFF: '',
};

const RECORDING_LABEL: Record<RecordingStatus, string> = {
  PENDING: 'Pending', UPLOADED: 'Recorded', FAILED: 'Upload failed', NOT_RECORDED: 'Not recorded',
};

interface Props { allocationId: string; }

export function CallHistorySection({ allocationId }: Props) {
  const { user } = useAuth();
  const canPlayRecording = user?.roles.some((r) => RECORDING_ROLES.includes(r.name)) ?? false;

  const [calls, setCalls] = useState<CallLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const play = async (callLogId: string) => {
    setPlayingId(callLogId);
    try {
      await callLogApi.openRecording(callLogId);
    } catch { /* silent — row still shows "Recorded" if this fails */ }
    finally { setPlayingId(null); }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callLogApi.getByAllocation(allocationId)
      .then(rows => { if (!cancelled) setCalls(rows); })
      .catch(() => { if (!cancelled) setCalls([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [allocationId]);

  if (loading) {
    return (
      <section className="ld-section">
        <h2 className="ld-section-label"><Phone size={12} /> Calls</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 8px', fontSize: 12, color: 'var(--ink-tertiary)' }}>
          <Loader2 size={12} className="ds-spin" /> Loading…
        </div>
      </section>
    );
  }

  if (calls.length === 0) {
    return (
      <section className="ld-section">
        <h2 className="ld-section-label"><Phone size={12} /> Calls</h2>
        <p style={{ fontSize: 12.5, color: 'var(--ink-tertiary)', fontStyle: 'italic', margin: '4px 0 8px' }}>No calls logged yet.</p>
      </section>
    );
  }

  return (
    <section className="ld-section">
      <h2 className="ld-section-label"><Phone size={12} /> Calls ({calls.length})</h2>
      <div className="ds-table-wrap" style={{ border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
        <table className="ds-table">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '8px 12px' }}>When</th>
              <th style={{ padding: '8px 12px' }}>Agent</th>
              <th className="is-right" style={{ padding: '8px 12px' }}>Duration</th>
              <th style={{ padding: '8px 12px' }}>Outcome</th>
              <th style={{ padding: '8px 12px' }}>Recording</th>
              <th style={{ padding: '8px 12px' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {calls.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDT(c.initiatedAt)}</td>
                <td style={{ padding: '8px 12px' }}>{c.agentName ?? 'Unknown agent'}</td>
                <td className="is-right" style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{fmtDuration(c.durationSeconds)}</td>
                <td style={{ padding: '8px 12px' }}>
                  {c.outcome
                    ? <span className={`ds-pill ${OUTCOME_VARIANT[c.outcome]}`}>{OUTCOME_LABEL[c.outcome]}</span>
                    : <span style={{ color: 'var(--ink-tertiary)' }}>—</span>}
                </td>
                <td style={{ padding: '8px 12px', fontSize: 12 }}>
                  {c.recordingStatus === 'UPLOADED' && canPlayRecording ? (
                    <button type="button" onClick={() => play(c.id)} disabled={playingId === c.id}
                      className="ds-btn is-secondary is-sm" style={{ height: 24, padding: '0 8px', fontSize: 11 }}>
                      {playingId === c.id ? <Loader2 size={11} className="ds-spin" /> : <Play size={11} />} Play
                    </button>
                  ) : (
                    <span style={{ color: c.recordingStatus === 'UPLOADED' ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}>
                      {c.recordingStatus ? RECORDING_LABEL[c.recordingStatus] : '—'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 12px', fontSize: 12.5, color: 'var(--ink-secondary)', maxWidth: 240 }}>{c.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!canPlayRecording && calls.some(c => c.recordingStatus === 'UPLOADED') && (
        <p style={{ fontSize: 11, color: 'var(--ink-tertiary)', margin: '6px 0 0' }}>
          Recording playback is limited to organization admins, managers, and team leads.
        </p>
      )}
    </section>
  );
}
