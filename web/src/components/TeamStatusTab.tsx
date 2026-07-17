import { useEffect, useState } from 'react';
import { visitSessionApi } from '../api/visitSessionApi';
import type { TeamStatusEntry, VisitSessionStatus } from '../types';
import { Navigation } from 'lucide-react';

function statusDot(status: VisitSessionStatus | null): { color: string; label: string } {
  switch (status) {
    case 'STARTED':  return { color: '#3b82f6', label: 'Started' };
    case 'REACHED':  return { color: '#22c55e', label: 'Reached' };
    case 'WAITING':  return { color: '#f59e0b', label: 'Waiting' };
    default:         return { color: '#9ca3af', label: 'No active visit' };
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

export default function TeamStatusTab() {
  const [entries, setEntries] = useState<TeamStatusEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setEntries(await visitSessionApi.getTeamStatus());
    } catch { setEntries([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 2 * 60 * 1000); // poll every 2 min
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="ds-empty">Loading…</div>;
  if (entries.length === 0) return <div className="ds-empty">No field activity today</div>;

  return (
    <div className="ds-card" style={{ overflowX: 'auto' }}>
      <table className="ds-table">
        <thead>
          <tr>
            <th>Field Officer</th>
            <th>Status</th>
            <th>Active Case</th>
            <th>Time in Status</th>
            <th>Distance Today</th>
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
                  <Navigation size={13} style={{ color: 'var(--ds-text-subtle)' }} />
                  {fmtKm(e.totalDistanceMetres)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
