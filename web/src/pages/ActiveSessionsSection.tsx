import { useEffect, useState } from 'react';
import { Monitor, Loader2, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { authApi } from '../api';
import { toastBus } from '../utils/toastBus';
import { timeAgo } from '../components/NotifItem';
import type { AuthSessionResponse } from '../types';
import { SectionHeader } from './ProfileSettingsSectionHeader';

/** Trims a raw User-Agent string down to "Browser on OS" for display. */
function summarizeDevice(deviceInfo?: string): string {
  if (!deviceInfo) return 'Unknown device';
  const ua = deviceInfo;
  const os = /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown OS';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Unknown browser';
  return `${browser} on ${os}`;
}

export function ActiveSessionsSection() {
  const [sessions, setSessions] = useState<AuthSessionResponse[] | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    authApi.listSessions()
      .then(list => { if (alive) setSessions(list); })
      .catch(() => { if (alive) setError('Failed to load active sessions.'); });
    return () => { alive = false; };
  }, []);

  const revoke = async (id: string) => {
    setRevokingId(id);
    try {
      await authApi.revokeSession(id);
      setSessions(prev => prev?.filter(s => s.id !== id) ?? prev);
      toastBus.success('Session revoked', 'That device has been signed out.');
    } catch {
      toastBus.error('Failed to revoke session', 'Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <section className="ps-section">
      <SectionHeader icon={<Monitor size={18} />} title="Active sessions"
        sub="Devices currently signed in to your account" />
      <div className="ps-section-body">
        {error ? (
          <div className="ps-banner is-error"><AlertTriangle size={14} /><span className="ps-banner-content">{error}</span></div>
        ) : sessions === null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-tertiary)', fontSize: 13 }}>
            <Loader2 size={14} className="ds-spin" /> Loading sessions…
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>No active sessions found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                border: s.anomalyFlagged ? '1px solid var(--danger-subtle)' : '1px solid var(--border-subtle)',
                background: s.anomalyFlagged ? 'color-mix(in srgb, var(--danger) 3%, transparent)' : 'transparent',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
                      {summarizeDevice(s.deviceInfo)}
                    </span>
                    {s.current && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: 'var(--success)', background: 'color-mix(in srgb, var(--success) 12%, transparent)', padding: '2px 7px', borderRadius: 999 }}>
                        <ShieldCheck size={10} /> This device
                      </span>
                    )}
                    {s.anomalyFlagged && (
                      <span title={s.anomalyReason} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', padding: '2px 7px', borderRadius: 999 }}>
                        <AlertTriangle size={10} /> Flagged
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>
                    {s.ipAddress ?? 'Unknown IP'}{s.geoCountry ? ` · ${s.geoCountry}` : ''} · signed in {timeAgo(s.createdAt)}
                  </span>
                </div>
                {!s.current && (
                  <button type="button" onClick={() => revoke(s.id)} disabled={revokingId === s.id}
                    className="ds-table-row-action is-danger" title="Revoke this session" style={{ flexShrink: 0 }}>
                    {revokingId === s.id ? <Loader2 size={14} className="ds-spin" /> : <X size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
