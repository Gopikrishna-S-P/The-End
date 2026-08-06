import { useEffect, useState } from 'react';
import { visitSessionApi } from '../api/visitSessionApi';
import type { TeamStatusEntry, DistanceSummaryEntry, VisitSessionStatus } from '../types';
import { Navigation, Calendar } from 'lucide-react';

function statusDot(status: VisitSessionStatus | null): { color: string; label: string } {
  switch (status) {
    case 'STARTED':  return { color: 'var(--info)', label: 'Started' };
    case 'REACHED':  return { color: 'var(--success)', label: 'Reached' };
    case 'WAITING':  return { color: 'var(--warning)', label: 'Waiting' };
    default:         return { color: 'var(--text-tertiary)', label: 'No active visit' };
  }
}

function elapsed(from: string | null): string {
  if (!from) return '—';
  const secs = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtKm(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function TeamStatusTab() {
  const [date, setDate]       = useState(todayIso());
  const [entries, setEntries] = useState<TeamStatusEntry[]>([]);
  const [summary, setSummary] = useState<DistanceSummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const isToday = date === todayIso();

  const load = async () => {
    try {
      const [team, dist] = await Promise.all([
        visitSessionApi.getTeamStatus(date),
        visitSessionApi.getDistanceSummary(date),
      ]);
      setEntries(team);
      setSummary(dist);
    } catch { setEntries([]); setSummary([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    load();
    if (!isToday) return;
    const t = setInterval(load, 2 * 60 * 1000); // poll every 2 min, only for the live "today" view
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const totalDistance = summary.reduce((sum, s) => sum + s.totalDistanceMetres, 0);
  const totalSessions = summary.reduce((sum, s) => sum + s.sessionCount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={14} style={{ color: 'var(--ink-tertiary)' }} />
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={e => setDate(e.target.value || todayIso())}
            className="ds-input"
            style={{ height: 30, fontSize: 12.5 }}
            aria-label="Select date"
          />
          {!isToday && (
            <button type="button" className="ds-btn is-secondary is-sm" onClick={() => setDate(todayIso())}>
              Back to today
            </button>
          )}
        </div>
        {!loading && summary.length > 0 && (
          <span style={{ fontSize: 12.5, color: 'var(--ink-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Navigation size={13} /> {fmtKm(totalDistance)} total · {totalSessions} visit{totalSessions === 1 ? '' : 's'} · {summary.length} officer{summary.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="ds-empty">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="ds-empty">{isToday ? 'No field activity today' : 'No field activity on this date'}</div>
      ) : (
        <div className="ds-card" style={{ overflowX: 'auto' }}>
          <table className="ds-table">
            <thead>
              <tr>
                <th>Field Officer</th>
                <th>{isToday ? 'Status' : 'Last Status'}</th>
                <th>Active Case</th>
                <th>Time in Status</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const dot = statusDot(e.activeStatus);
                return (
                  <tr key={e.agentId}>
                    <td style={{ fontWeight: 600 }}>{e.agentName}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot.color, display: 'inline-block' }} />
                        {dot.label}
                      </span>
                    </td>
                    <td>{e.activeLoanNumber ?? '—'} {e.activeBorrowerName ? `· ${e.activeBorrowerName}` : ''}</td>
                    <td>{elapsed(e.statusSince)}</td>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Navigation size={13} style={{ color: 'var(--ink-tertiary)' }} />
                      {fmtKm(e.totalDistanceMetres)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
